import os

from fastapi import Header, HTTPException

API_KEY = os.getenv("API_KEY", "test-api-key")


async def get_api_key(x_api_key: str = Header(default=None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="acesso negado")
    return x_api_key