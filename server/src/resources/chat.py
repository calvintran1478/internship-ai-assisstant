import os
import os.path as op
import json
import falcon
from uuid import uuid4
from middleware.auth_middleware import authenticate_user
from repositories import chat_repository
from dashscope import Generation # for qwen api calls, here we want a local qwen model
# RAG imports
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel
original_wd = os.getcwd()
os.chdir(op.join(op.dirname(__file__)))
from rag_helpers import load_corpus, build_embeddings, build_faiss_hnsw, build_chatml_prompt, RAGEngine
os.chdir(original_wd)
# RAG constants
EMBED_MODEL_NAME = "BAAI/bge-large-en-v1.5"
MODEL_NAME = "Qwen/Qwen2.5-3B-Instruct"
ADAPTER_DIR = op.join(op.dirname(__file__), "..", "rag")
JSONL_PATH = op.join(op.dirname(__file__), "..", "..", "data", "processed_data", "rag_ready_docs_20251123.jsonl")
INDEX_PATH = op.join(op.dirname(__file__), "..", "..", "data", "faiss", "faiss_index.bin")
CORPUS_PATH = op.join(op.dirname(__file__), "..", "rag", "corpus_meta.json")
QUERY_PREFIX = "Represent this sentence for searching relevant passages: "

# RAG setup
finetuned_rag = RAGEngine(
    index_path=INDEX_PATH,
    corpus_path=CORPUS_PATH,
    embed_model_name=EMBED_MODEL_NAME,
    model_name=MODEL_NAME,
)

# Fast local generation without token-by-token streaming
def generate_stream_fast(prompt, max_new_tokens=512):
    text, _ = finetuned_rag.answer(prompt, max_new_tokens=max_new_tokens)
    # Yield in one chunk (or split into fake streaming chunks if needed)
    yield text.encode("utf-8")
    yield None

@falcon.before(authenticate_user)
class ChatResource:
    def __init__(self):
        self.server_domain = os.getenv("SERVER_DOMAIN")
        # self.model = model
        # self.tokenizer = tokenizer

    async def generate_stream(self, query, conn, user_id, chat_id, release_conn):
        llm_chunks = []

        for token_bytes in generate_stream_fast(query):
            if token_bytes is None:
                break
            token = token_bytes.decode("utf-8")
            llm_chunks.append(token)
            yield token_bytes

        llm_response = "".join(llm_chunks)
        await chat_repository.create(conn, user_id, chat_id, llm_response)
        await release_conn(conn)

        yield None  # terminate stream

    async def on_post(self, req, resp):
        if req.context.user_id is None:
            return

        query = await req.get_media()
        chat_id = uuid4()

        req.context.auto_release_conn = False

        await chat_repository.create(req.context.conn, req.context.user_id, chat_id, query)

        resp.status = falcon.HTTP_201
        resp.set_header("access-control-expose-headers", "location")
        resp.set_header(
            "location",
            f"{self.server_domain}/api/v1/chat/{chat_id}"
        )

        # system_prompt = (
        #     "You are a knowledgeable and supportive career coach for MScAC students seeking internships. " 
        #     "Your role is to provide personalized guidance on technical and behavioral interview questions, resume feedback, and career advice. "
        #     "Be constructive, encouraging, and clear, offering actionable tips that help students improve their chances of securing internships. "
        #     "When answering coding questions, give explanations that teach the reasoning behind solutions, not just the answers.")
        # final_prompt = system_prompt + "\nUser: " + prompt

        resp.stream = self.generate_stream(
            query,
            req.context.conn,
            req.context.user_id,
            chat_id,
            req.context.release_conn
        )

    async def on_post_chat(self, req, resp, chat_id):
        if req.context.user_id is None:
            return

        prompt = await req.get_media()

        if not (await chat_repository.exists(req.context.conn, req.context.user_id, chat_id)):
            resp.status = falcon.HTTP_404
            resp.text = "Chat not found"
            return

        req.context.auto_release_conn = False

        await chat_repository.create(req.context.conn, req.context.user_id, chat_id, prompt)

        resp.status = falcon.HTTP_201
        system_prompt = (
            "You are a friendly AI assistant. "
            "Respond to greetings and casual chat appropriately. "
            "If the user asks a coding question, provide a clear explanation."
            )
        final_prompt = system_prompt + "\nUser: " + prompt
        resp.stream = self.generate_stream(
            final_prompt,
            req.context.conn,
            req.context.user_id,
            chat_id,
            req.context.release_conn
        )

    async def on_get(self, req, resp):
        if req.context.user_id is None:
            return

        chats = await chat_repository.get(req.context.conn, req.context.user_id)

        resp.status = falcon.HTTP_200
        resp.content_type = "application/json"
        resp.text = json.dumps(chats)

    async def on_get_chat(self, req, resp, chat_id):
        if req.context.user_id is None:
            return

        chat = await chat_repository.get_chat(req.context.conn, req.context.user_id, chat_id)

        resp.status = falcon.HTTP_200
        resp.content_type = "application/json"
        resp.text = json.dumps(chat)

    async def on_delete_chat(self, req, resp, chat_id):
        if req.context.user_id is None:
            return

        deleted = await chat_repository.delete_chat(req.context.conn, req.context.user_id, chat_id)

        if not deleted:
            resp.status = falcon.HTTP_404
            resp.text = "Chat not found"
        else:
            resp.status = falcon.HTTP_204