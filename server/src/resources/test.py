import falcon

class TestResource:
    async def on_post(self, req, resp):
        body = await req.get_media()

        resp.status = falcon.HTTP_201
        resp.text = body
