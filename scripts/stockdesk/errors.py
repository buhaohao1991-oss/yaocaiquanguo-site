from __future__ import annotations


class StockDeskError(RuntimeError):
    status_code = 500
    error_code = "stockdesk_error"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class ValidationError(StockDeskError):
    status_code = 400
    error_code = "validation_error"


class NotFoundError(StockDeskError):
    status_code = 404
    error_code = "not_found"


class ExternalServiceError(StockDeskError):
    status_code = 502
    error_code = "external_service_error"
