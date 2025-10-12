
from falcon.media import BaseHandler

class TextHandler(BaseHandler):
    async def serialize_async(media, content_type) -> bytes:
        return media.encode("utf-8")

    async def deserialize_async(stream, content_type, content_length) -> bytes:
        return await stream.read()
