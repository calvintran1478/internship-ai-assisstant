from uuid import uuid4

async def exists(conn, user_id, chat_id) -> bool:
    try:
        statement = await conn.prepare("SELECT EXISTS(SELECT 1 FROM chat_messages WHERE user_id=$1 AND chat_id=$2)")
        return await statement.fetchval(user_id, chat_id)
    except:
        False

async def create(conn, user_id, chat_id, message) -> None:
    statement = await conn.prepare("INSERT INTO chat_messages (user_id, chat_id, chat_message, chat_number) VALUES ($1, $2, $3, (SELECT COUNT(*) FROM chat_messages WHERE user_id=$4 AND chat_id=$5) + 1)")
    await statement.fetchval(user_id, chat_id, message, user_id, chat_id)

async def get_chat(conn, user_id, chat_id) -> list[str]:
    statement = await conn.prepare("SELECT chat_message FROM chat_messages WHERE user_id=$1 AND chat_id=$2 ORDER BY chat_number")
    return [row["chat_message"] for row in await statement.fetch(user_id, chat_id)]
