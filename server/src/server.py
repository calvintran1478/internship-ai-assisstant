import falcon
import falcon.asgi
from resources.test import TestResource
from handlers.text_handler import TextHandler

# Initialize server with default plain/text content type
app = falcon.asgi.App(media_type=falcon.MEDIA_TEXT)

# Set up media handlers
media_handlers = falcon.media.Handlers({ falcon.MEDIA_TEXT: TextHandler })
app.req_options.media_handlers = media_handlers
app.resp_options.media_handlers = media_handlers

# Set up server routes for each resource
test_resource = TestResource()
app.add_route("/api/v1/test", test_resource)
