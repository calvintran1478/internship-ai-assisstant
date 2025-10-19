import falcon
import asyncpg
from repositories import user_repository
from email_validator import validate_email, EmailNotValidError
from bcrypt import hashpw, gensalt

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
        hashed_password = str(hashpw(password.encode("utf-8"), gensalt()))
        await user_repository.create(req.context.conn, email, hashed_password, first_name, last_name)

        resp.status = falcon.HTTP_201
        resp.text = f"{email}\n{first_name}\n{last_name}"
