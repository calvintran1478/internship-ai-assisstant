import os
import asyncpg
import asyncio
from pgvector.asyncpg import register_vector

class AsyncPoolMiddleware:
    def __init__(self):
        self.pool = None

    async def initialize_vector_db(self, conn):
        await register_vector(conn)

    async def process_startup(self, scope, event):
        # Enable pgvector extension
        conn = await asyncpg.connect(database=os.getenv("DB_NAME"), user=os.getenv("DB_USER"))
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        await conn.close()

        # Create connection pool
        self.pool = await asyncpg.create_pool(database=os.getenv("DB_NAME"), user=os.getenv("DB_USER"), init=self.initialize_vector_db)

        # Initialize database tables if needed
        async with self.pool.acquire() as conn:
            # Create user table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS users(
                    user_id UUID PRIMARY KEY,
                    email VARCHAR UNIQUE NOT NULL,
                    password VARCHAR NOT NULL,
                    first_name VARCHAR NOT NULL,
                    last_name VARCHAR NOT NULL
                );
                """)

            # Create resume table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS resumes(
                    user_id UUID PRIMARY KEY,
                    embedding vector(3),
                    CONSTRAINT resumes_user_id_fkey FOREIGN KEY(user_id) REFERENCES users(user_id)
                        ON DELETE CASCADE
                        ON UPDATE CASCADE
                );
                """)

    async def process_shutdown(self, scope, event):
        await asyncio.wait_for(self.pool.close(), 1.0)

    async def process_request(self, req, resp):
        req.context.conn = await self.pool.acquire()

    async def process_response(self, req, resp, resource, req_succeeded):
        await self.pool.release(req.context.conn)
