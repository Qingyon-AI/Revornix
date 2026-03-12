import re


def normalize_error_message(message: object) -> str:
    normalized = re.sub(r"\s+", " ", str(message or "")).strip()
    normalized = re.sub(r"^Error \d+:\s*", "", normalized)
    return normalized or "Internal server error"


class CustomException(Exception):
    def __init__(self, message: str, code: int = 500):
        self.code = code
        self.message = normalize_error_message(message)
        super().__init__(self.message)

    def __str__(self):
        return self.message
