import base64
import datetime
import random
import string
import uuid
from zoneinfo import ZoneInfo

from fastmcp import FastMCP

# Initialize the MCP server with your tools
common_mcp_router = FastMCP(
    name="Common-MCP-Server"
)

@common_mcp_router.tool()
def current_time(input_timezone: str | None = None):
    """
    Get the current date and time for a specific timezone.

    Use this tool when you need an exact current timestamp instead of estimating from context.
    It is suitable for answering questions such as "what time is it in Tokyo" or for generating
    time-aware content that depends on a real timezone.

    Args:
        input_timezone: Optional IANA timezone name such as "Asia/Shanghai",
            "America/New_York", or "Europe/London". If omitted, the function returns
            the current UTC time.

    Returns:
        A human-readable string containing the current timestamp with timezone information.

    When not to use:
        - Do not use this tool to calculate historical timestamps from stored business data.
        - Do not use this tool for weather, calendar, or scheduling queries that require external context.

    Examples:
        - Get the current time in Shanghai: `input_timezone="Asia/Shanghai"`
        - Get the current time in New York: `input_timezone="America/New_York"`

    Notes:
        - The timezone must be a valid IANA timezone identifier.
        - This tool returns the current time only; it does not interpret schedules or future plans.
    """
    current_time = datetime.datetime.now(datetime.timezone.utc)
    if input_timezone:
        current_time = current_time.astimezone(ZoneInfo(input_timezone))
    return f"The current time is {current_time}."

@common_mcp_router.tool()
def random_string(length: int = 8):
    """
    Generate a random alphanumeric string.

    Use this tool when you need a lightweight non-cryptographic identifier, placeholder value,
    demo token, or sample random text consisting of uppercase letters, lowercase letters, and digits.

    Args:
        length: Desired string length. Defaults to 8.

    Returns:
        A randomly generated string containing only ASCII letters and digits.

    When not to use:
        - Do not use this tool for passwords, API secrets, or cryptographic tokens.
        - Do not use this tool when you need a stable or reproducible identifier.

    Examples:
        - Generate a short demo token: `length=8`
        - Generate a longer placeholder value: `length=24`

    Notes:
        - This is intended for convenience, not for security-sensitive secrets.
        - If you need a stable identifier, use `generate_uuid` instead.
    """
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

@common_mcp_router.tool()
def generate_uuid():
    """
    Generate a new UUID version 4 string.

    Use this tool when you need a globally unique identifier for records, request tracking,
    correlation IDs, or other uniqueness-sensitive workflows.

    Returns:
        A UUID4 string such as "550e8400-e29b-41d4-a716-446655440000".

    When not to use:
        - Do not use this tool if you need IDs that encode business meaning or ordering.
        - Do not use this tool when the identifier must match an existing record in another system.

    Examples:
        - Generate a request correlation ID
        - Generate a unique record identifier before creating a draft object

    Notes:
        - The value is randomly generated each time.
        - This tool does not persist or reserve the UUID anywhere; it only returns a fresh value.
    """
    return str(uuid.uuid4())

@common_mcp_router.tool()
def base64_encode(input_text: str):
    """
    Encode plain text into Base64.

    Use this tool when a downstream system expects Base64-encoded content, for example when building
    simple payloads, transport-safe text blobs, or encoded configuration values.

    Args:
        input_text: The original plain text to encode.

    Returns:
        A Base64-encoded string representing the UTF-8 bytes of the input text.

    When not to use:
        - Do not use this tool for encryption, hashing, or data protection.
        - Do not use this tool when the downstream system expects binary files rather than text input.

    Examples:
        - Encode a small JSON snippet: `input_text="{\"name\":\"revornix\"}"`
        - Encode plain text for transport: `input_text="hello world"`

    Notes:
        - This tool performs encoding only; it does not encrypt or protect the content.
        - The input is treated as UTF-8 text before encoding.
    """
    return base64.b64encode(input_text.encode('utf-8')).decode('utf-8')
