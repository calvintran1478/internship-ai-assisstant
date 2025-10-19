import asyncpg
import asyncio

async def initialize_db():
    pool = await asyncpg.create_pool(database="internship_ai_db", user="internship_ai_user")
    async with pool.acquire() as conn:
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

asyncio.run(initialize_db())
