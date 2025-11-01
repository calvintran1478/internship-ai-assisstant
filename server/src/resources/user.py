import falcon
import datetime
from hmac import HMAC
from hashlib import sha256
from email_validator import validate_email, EmailNotValidError
from bcrypt import hashpw, gensalt, checkpw
from base64 import urlsafe_b64encode
from repositories import user_repository
from middleware.auth_middleware import authenticate_user

class UserResource:
    async def on_post(self, req, resp):
        # Parse request body
        email, password, first_name, last_name = (await req.get_media()).split("\n")
        if email == "" or password == "" or first_name == "" or last_name == "":
            resp.status = falcon.HTTP_400
            resp.text = "Missing fields in request body"
            return

        # Check that the email is valid and normalize it
        try:
            email = validate_email(email, check_deliverability=False).normalized
        except EmailNotValidError:
            resp.status = falcon.HTTP_400
            resp.text = "Invalid email address"
            return

        # Check if a user with the email already exists
        user_exists = await user_repository.exists(req.context.conn, email)
        if user_exists:
            resp.status = falcon.HTTP_409
            resp.text = "User with email already exists"
            return

        # Hash password and register user in the database
        hashed_password = hashpw(password.encode("utf-8"), gensalt()).decode("utf-8")
        await user_repository.create(req.context.conn, email, hashed_password, first_name, last_name)

        resp.status = falcon.HTTP_201
        resp.text = f"{email}\n{first_name}\n{last_name}"

    async def on_post_login(self, req, resp):
        # Parse request body
        email, password = (await req.get_media()).split("\n")
        if email == "" or password == "":
            resp.status = falcon.HTTP_400
            resp.text = "Missing fields in request body"
            return

        # Check if user exists
        user_id, stored_password = await user_repository.get_login_password(req.context.conn, email)
        if user_id == "":
            resp.status = falcon.HTTP_409
            resp.text = "User with email not found"
            return

        # Verify user password
        if not checkpw(password.encode("utf-8"), stored_password.encode("utf-8")):
            resp.status = falcon.HTTP_401
            resp.text = "Incorrect password"
            return

        # Respond with access token
        expiration_time = int(datetime.datetime.now(datetime.UTC).timestamp()) + 259200
        access_claims = urlsafe_b64encode(user_id.encode("utf-8") + expiration_time.to_bytes(8, byteorder="big"))
        signature = urlsafe_b64encode(HMAC(b"secret", access_claims, digestmod=sha256).digest())
        access_token = access_claims + signature

        resp.status = falcon.HTTP_200
        resp.data = access_token

    @falcon.before(authenticate_user)
    async def on_get_name(self, req, resp):
        # Get user
        if req.context.user_id == None:
            return

        # Get first and last name of the user
        first_name, last_name = await user_repository.get_name(req.context.conn, req.context.user_id)

        resp.status = falcon.HTTP_200
        resp.text = f"{first_name}\n{last_name}"
