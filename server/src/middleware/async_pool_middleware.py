import asyncpg
import asyncio

class AsyncPoolMiddleware:
    def __init__(self):
        self.pool = None

    async def process_startup(self, scope, event):
        # Create connection pool
        self.pool = await asyncpg.create_pool(database="internship_ai_db", user="internship_ai_user")

        # Initialize database tables if needed
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS users(
                    user_id UUID PRIMARY KEY,
                    email VARCHAR UNIQUE NOT NULL,
                    password VARCHAR NOT NULL,
                    first_name VARCHAR NOT NULL,
                    last_name VARCHAR NOT NULL
                );
                """)

    async def process_shutdown(self, scope, event):
        await asyncio.wait_for(self.pool.close(), 1.0)

    async def process_request(self, req, resp):
        req.context.conn = await self.pool.acquire()

    async def process_response(self, req, resp, resource, req_succeeded):
        await self.pool.release(req.context.conn)
