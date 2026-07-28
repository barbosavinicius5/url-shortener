from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.routers import encurtamento as encurtamento_router

app = FastAPI(
    title="URL Shortener",
    description="Encurtador de URL — Factor OS",
    version="0.1.0",
)

app.include_router(encurtamento_router.router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Converte erros de validação Pydantic para o formato {detail: <mensagem>}."""
    errors = exc.errors()
    if errors:
        msg = errors[0].get("msg", "Erro de validação.")
        # Pydantic 2 prefixa com "Value error, " — removemos para manter mensagem limpa
        if msg.startswith("Value error, "):
            msg = msg[len("Value error, "):]
    else:
        msg = "Erro de validação."
    return JSONResponse(status_code=422, content={"detail": msg})
