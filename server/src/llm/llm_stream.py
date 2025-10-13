import asyncio

class LLMStream:
    def __init__(self, query):
        self.data = [x.encode('utf-8') for x in list(query)]
        self.index = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.index < len(self.data):
            res = self.data[self.index]
            self.index += 1
            await asyncio.sleep(0.02)
            return res
        else:
            return None
