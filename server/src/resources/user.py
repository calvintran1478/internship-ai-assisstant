import falcon
import asyncpg
from bcrypt import hashpw, gensalt
from uuid import uuid4

class UserResource:
    async def on_post(self, req, resp):
        # Parse request body
        body = await req.get_media()
        email, password, first_name, last_name = body.split("\n")

        # Check if user with email already exists
        statement = await req.context.conn.prepare("SELECT EXISTS(SELECT 1 FROM users WHERE email=$1)")
        user_exists = await statement.fetchval(email)
        if user_exists:
            resp.status = falcon.HTTP_409
            resp.text = "User with email already exists"
            return

        # Hash password and register user in database
        hashed_password = hashpw(password.encode("utf-8"), gensalt())
        statement = await req.context.conn.prepare("INSERT INTO users (user_id, email, password, first_name, last_name) VALUES ($1, $2, $3, $4, $5)")
        await statement.fetchval(uuid4(), email, password, first_name, last_name)

        resp.status = falcon.HTTP_201
        resp.text = f"{email}\n{first_name}\n{last_name}"
