TRUTHY_ENV_VALUES = {"1", "true", "yes", "on", "y"}
FALSEY_ENV_VALUES = {"0", "false", "no", "off", "n"}


def is_env_enabled(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in TRUTHY_ENV_VALUES


def is_env_disabled(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in FALSEY_ENV_VALUES
