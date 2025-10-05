from zoneinfo import ZoneInfo
from mcp.server.fastmcp import FastMCP
import datetime

# Initialize the MCP server with your tools
common_mcp_router = FastMCP(
    name="Common-MCP-Server"
)

@common_mcp_router.tool()
def time_tool(input_timezone: str | None = None):
    "Provides the current time for a given city's timezone like Asia/Kolkata, America/New_York etc. If no timezone is provided, it returns the local time."
    current_time = datetime.datetime.now()    
    if input_timezone:
        print("timezone is provided", input_timezone)
        current_time = current_time.astimezone(ZoneInfo(input_timezone))
    return f"The current time is {current_time}."

@common_mcp_router.tool()
def weather_tool(location: str):
    """Provides weather information for a given location"""
    # return f"Sorry, I couldn't find weather information for {location}."
    return f"The weather in {location} is currently 20 degrees Celsius with a 30% chance of rain."