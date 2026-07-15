"""App-wide exception hierarchy. Old code ka BaseException-shadowing khatam."""

from http import HTTPStatus


class AppException(Exception):
    """Base — server.py mein iska ek hi handler register hota hai."""

    def __init__(self, status: HTTPStatus, message: str, error_code: str | None = None):
        self.status = status
        self.message = message
        self.error_code = error_code or status.name
        super().__init__(message)


class NotFoundError(AppException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(HTTPStatus.NOT_FOUND, message)


class UnauthorizedError(AppException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(HTTPStatus.UNAUTHORIZED, message)


class ProviderError(AppException):
    """LLM / embeddings / vectorstore provider failures."""

    def __init__(self, message: str):
        super().__init__(HTTPStatus.BAD_GATEWAY, message)
