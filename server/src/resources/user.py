import falcon
import asyncpg
from email_validator import validate_email, EmailNotValidError
from bcrypt import hashpw, gensalt
from uuid import uuid4

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
        statement = await req.context.conn.prepare("SELECT EXISTS(SELECT 1 FROM users WHERE email=$1)")
        user_exists = await statement.fetchval(email)
        if user_exists:
            resp.status = falcon.HTTP_409
            resp.text = "User with email already exists"
            return

        # Hash password and register user in the database
        hashed_password = hashpw(password.encode("utf-8"), gensalt())
        statement = await req.context.conn.prepare("INSERT INTO users (user_id, email, password, first_name, last_name) VALUES ($1, $2, $3, $4, $5)")
        await statement.fetchval(uuid4(), email, password, first_name, last_name)

        resp.status = falcon.HTTP_201
        resp.text = f"{email}\n{first_name}\n{last_name}"
