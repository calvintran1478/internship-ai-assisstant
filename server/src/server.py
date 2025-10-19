import logging
import falcon
import falcon.asgi
from resources.chat import ChatResource
from resources.user import UserResource
from handlers.text_handler import TextHandler
from middleware.async_pool_middleware import AsyncPoolMiddleware

# Add error logging
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)

# Initialize server with default plain/text content type
app = falcon.asgi.App(media_type=falcon.MEDIA_TEXT, middleware=[AsyncPoolMiddleware()])

# Set up media handlers
text_handler = TextHandler()
app.req_options.media_handlers['text/plain'] = text_handler
app.resp_options.media_handlers['text/plain'] = text_handler

# Set up server routes for each resource
user_resource = UserResource()
chat_resource = ChatResource()
app.add_route("/api/v1/users", user_resource)
app.add_route("/api/v1/chat", chat_resource)
