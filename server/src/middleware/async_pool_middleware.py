import os
import asyncpg
import asyncio

class AsyncPoolMiddleware:
    def __init__(self):
        self.pool = None

    async def process_startup(self, scope, event):
        # Create connection pool
        self.pool = await asyncpg.create_pool(os.getenv("DB_CONNECTION"))

        # Initialize database tables if needed
        async with self.pool.acquire() as conn:
            # Create user table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS users(
                    user_id UUID PRIMARY KEY,
                    email VARCHAR UNIQUE NOT NULL,
                    password VARCHAR NOT NULL,
                    first_name VARCHAR NOT NULL,
                    last_name VARCHAR NOT NULL,
                    concentration VARCHAR
                );
                """)

            # Create chat table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS chat_messages(
                    user_id UUID NOT NULL,
                    chat_id UUID NOT NULL,
                    chat_message VARCHAR NOT NULL,
                    message_number INTEGER NOT NULL,
                    UNIQUE (chat_id, message_number),
                    CONSTRAINT chat_user_id_fkey FOREIGN KEY(user_id) REFERENCES users(user_id)
                        ON DELETE CASCADE
                        ON UPDATE CASCADE
                );
                """)

    async def release_conn(self, conn):
        await self.pool.release(conn)

    async def process_shutdown(self, scope, event):
        await asyncio.wait_for(self.pool.close(), 1.0)

    async def process_request(self, req, resp):
        req.context.auto_release_conn = True
        req.context.release_conn = self.release_conn
        req.context.conn = await self.pool.acquire()

    async def process_response(self, req, resp, resource, req_succeeded):
        if req.context.auto_release_conn:
            await self.pool.release(req.context.conn)
