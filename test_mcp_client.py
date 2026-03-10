import asyncio
import sys
import os

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    base_dir = "/Users/deepakbatham/Documents/DocsN_all/Project/DeutschesAiTutor"
    mcp_script = os.path.join(base_dir, "notebooklm", "mcp_server.py")
    server_params = StdioServerParameters(command=sys.executable, args=[mcp_script])
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            print("Initialized")
            list_result = await session.call_tool("notebooklm_list_notebooks", arguments={})
            print(list_result)
            list_text = list_result.content[0].text
            import re
            print("List text:", list_text)
            match = re.search(r'([a-zA-Z0-9_=-]{20,})', list_text)
            if match:
                print("Found ID:", match.group(1))

if __name__ == "__main__":
    asyncio.run(main())
