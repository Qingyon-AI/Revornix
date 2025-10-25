from zoneinfo import ZoneInfo
from fastmcp import FastMCP
import datetime
import random
import uuid
import base64
import string

# Initialize the MCP server with your tools
common_mcp_router = FastMCP(
    name="Common-MCP-Server"
)

@common_mcp_router.tool()
def current_time(input_timezone: str | None = None):
    "Provides the current time for a given city's timezone like Asia/Kolkata, America/New_York etc. If no timezone is provided, it returns the local time."
    current_time = datetime.datetime.now()    
    if input_timezone:
        current_time = current_time.astimezone(ZoneInfo(input_timezone))
    return f"The current time is {current_time}."

@common_mcp_router.tool()
def random_string(length: int = 8):
    "Generates a random alphanumeric string of given length (default 8)"
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

@common_mcp_router.tool()
def generate_uuid():
    "Generates a new UUID4 string"
    return str(uuid.uuid4())

@common_mcp_router.tool()
def base64_encode(input_text: str):
    "Encodes a string into Base64 format"
    encoded = base64.b64encode(input_text.encode('utf-8')).decode('utf-8')
    return encoded