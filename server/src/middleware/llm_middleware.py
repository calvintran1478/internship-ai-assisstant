import os
from mistralai import Mistral

class LLMMiddleware:
    def __init__(self):
        self.client = None

    async def process_startup(self, scope, event):
        self.client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))

    async def process_request(self, req, resp):
        req.context.llm_client = self.client
