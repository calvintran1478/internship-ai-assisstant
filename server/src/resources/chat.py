import falcon
from middleware.auth_middleware import authenticate_user

class ChatResource:
    async def generate_stream(self, query, llm_client):
        messages = [{"role": "user", "content": query}]
        stream = llm_client.chat.stream(model="open-mistral-7b", messages=messages, stream=True)
        for chunk in stream:
            if chunk.data.choices and chunk.data.choices[0].delta.content:
                yield chunk.data.choices[0].delta.content.encode('utf-8')
        yield None

    @falcon.before(authenticate_user)
    async def on_post(self, req, resp):
        # Get user
        if req.context.user_id == None:
            return

        # Parse query
        body = await req.get_media()

        # Use LLM to generate a response
        resp.status = falcon.HTTP_201
        resp.stream = self.generate_stream(body, req.context.llm_client)
