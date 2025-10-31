import logging
import falcon
import falcon.asgi
from dotenv import load_dotenv
from resources.user import UserResource
from resources.chat import ChatResource
from resources.resume import ResumeResource
from handlers.text_handler import TextHandler
from middleware.async_pool_middleware import AsyncPoolMiddleware
from middleware.s3_middleware import S3Middleware

# Add error logging
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)

# Load enviornment variables
load_dotenv()

# Initialize server with default plain/text content type
app = falcon.asgi.App(media_type=falcon.MEDIA_TEXT, middleware=[AsyncPoolMiddleware(), S3Middleware()])

# Set up media handlers
text_handler = TextHandler()
app.req_options.media_handlers['text/plain'] = text_handler
app.resp_options.media_handlers['text/plain'] = text_handler

# Initialize HTTP resources
user_resource = UserResource()
chat_resource = ChatResource()
resume_resource = ResumeResource()

# Set up server routes for each resource
app.add_route("/api/v1/users", user_resource)
app.add_route("/api/v1/users/login", user_resource, suffix="login")
app.add_route("/api/v1/chat", chat_resource)
app.add_route("/api/v1/resume", resume_resource)
