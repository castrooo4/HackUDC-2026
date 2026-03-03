from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_request, exc: RequestValidationError):
        details = jsonable_encoder(exc.errors())
        errors = [
            {
                "field": ".".join(str(part) for part in err.get("loc", [])),
                "message": err.get("msg", "Valor invalido"),
                "type": err.get("type", "validation_error"),
            }
            for err in details
        ]
        return JSONResponse(
            status_code=422,
            content={
                "detail": details,
                "message": "Datos de entrada invalidos",
                "code": "VALIDATION_ERROR",
                "errors": errors,
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_request, exc: HTTPException):
        message = _extract_message(exc.detail) or _default_message_for_status(exc.status_code)
        code = _default_code_for_status(exc.status_code)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail,
                "message": message,
                "code": code,
            },
            headers=exc.headers,
        )


def _extract_message(detail) -> str | None:
    if isinstance(detail, str):
        return detail
    if isinstance(detail, dict):
        value = detail.get("message") or detail.get("detail")
        if isinstance(value, str):
            return value
    if isinstance(detail, list) and detail:
        first = detail[0]
        if isinstance(first, dict):
            msg = first.get("msg")
            if isinstance(msg, str):
                return msg
    return None


def _default_message_for_status(status_code: int) -> str:
    defaults = {
        400: "Solicitud invalida",
        401: "No autorizado",
        403: "Acceso denegado",
        404: "Recurso no encontrado",
        409: "Conflicto de datos",
        422: "Datos invalidos",
        500: "Error interno del servidor",
    }
    return defaults.get(status_code, "Error en la solicitud")


def _default_code_for_status(status_code: int) -> str:
    defaults = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        500: "INTERNAL_ERROR",
    }
    return defaults.get(status_code, "REQUEST_ERROR")
