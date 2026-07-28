"""Ponto de entrada para execução via ``python main.py`` ou uvicorn."""

import uvicorn

if __name__ == "__main__":
    uvicorn.run("src.infrastructure.api.app:app", host="0.0.0.0", port=8000, reload=False)
