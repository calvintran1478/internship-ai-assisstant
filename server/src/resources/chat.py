import os
import json
import falcon
from uuid import uuid4
from middleware.auth_middleware import authenticate_user
from repositories import chat_repository

@falcon.before(authenticate_user)
class ChatResource:
    def __init__(self):
        self.server_domain = os.getenv("SERVER_DOMAIN")

    async def generate_stream(self, query, llm_client, conn, user_id, chat_id, release_conn):
        # Generate response from LLM
        llm_chunks = []
        messages = [{"role": "user", "content": query}]
        stream = llm_client.chat.stream(model="open-mistral-7b", messages=messages, stream=True)
        for chunk in stream:
            if chunk.data.choices and chunk.data.choices[0].delta.content:
                llm_chunks.append(chunk.data.choices[0].delta.content)
                yield chunk.data.choices[0].delta.content.encode('utf-8')

        # Store LLM response in database
        llm_response = "".join(llm_chunks)
        await chat_repository.create(conn, user_id, chat_id, llm_response)

        # Manually release database connection back to the connection pool
        await release_conn(conn)

        # Terminate end of LLM stream
        yield None

    async def on_post(self, req, resp):
        # Get user
        if req.context.user_id == None:
            return

        # Parse query
        prompt = await req.get_media()
        chat_id = uuid4()

        # Disable automatic release of database connection to connection pool
        req.context.auto_release_conn = False

        # Add user prompt to chat
        await chat_repository.create(req.context.conn, req.context.user_id, chat_id, prompt)

        # Use LLM to generate a response
        resp.status = falcon.HTTP_201
        resp.set_header("access-control-expose-headers", "location")
        resp.set_header("location", f"{self.server_domain}/api/v1/chat/{chat_id}")
        resp.stream = self.generate_stream(prompt, req.context.llm_client, req.context.conn, req.context.user_id, chat_id, req.context.release_conn)

    async def on_post_chat(self, req, resp, chat_id):
        # Get user
        if req.context.user_id == None:
            return

        # Parse query
        prompt = await req.get_media()

        # Check if the given chat exists
        if not (await chat_repository.exists(req.context.conn, req.context.user_id, chat_id)):
            resp.status = falcon.HTTP_404
            resp.text = "Chat not found"
            return

        # Disable automatic release of database connection to connection pool
        req.context.auto_release_conn = False

        # Add user prompt to chat
        await chat_repository.create(req.context.conn, req.context.user_id, chat_id, prompt)

        # Use LLM to generate a response
        resp.status = falcon.HTTP_201
        resp.stream = self.generate_stream(prompt, req.context.llm_client, req.context.conn, req.context.user_id, chat_id, req.context.release_conn)

    async def on_get(self, req, resp):
        # Get user
        if req.context.user_id == None:
            return

        # Fetch beginning messages and id of each chat
        chats = await chat_repository.get(req.context.conn, req.context.user_id)

        resp.status = falcon.HTTP_200
        resp.content_type = "application/json"
        resp.text = json.dumps(chats)

    async def on_get_chat(self, req, resp, chat_id):
        # Get user
        if req.context.user_id == None:
            return

        # Fetch chat conversation
        chat = await chat_repository.get_chat(req.context.conn, req.context.user_id, chat_id)

        resp.status = falcon.HTTP_200
        resp.content_type = "application/json"
        resp.text = json.dumps(chat)

    async def on_delete_chat(self, req, resp, chat_id):
        # Get user
        if req.context.user_id == None:
            return

        # Delete chat conversation
        delete_successful = await chat_repository.delete_chat(req.context.conn, req.context.user_id, chat_id)

        if not delete_successful:
            resp.status = falcon.HTTP_404
            resp.text = "Chat not found"
        else:
            resp.status = falcon.HTTP_204
