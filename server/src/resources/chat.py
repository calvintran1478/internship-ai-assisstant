import falcon
from llm.llm_stream import LLMStream

class ChatResource:
    async def on_post(self, req, resp):
        body = await req.get_media()

        resp.status = falcon.HTTP_201
        resp.stream = LLMStream(body)
