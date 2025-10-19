from uuid import uuid4

async def exists(conn, email) -> bool:
    statement = await conn.prepare("SELECT EXISTS(SELECT 1 FROM users WHERE email=$1)")
    return await statement.fetchval(email)

async def create(conn, email, password, first_name, last_name) -> None:
    statement = await conn.prepare("INSERT INTO users (user_id, email, password, first_name, last_name) VALUES ($1, $2, $3, $4, $5)")
    await statement.fetchval(uuid4(), email, password, first_name, last_name)
