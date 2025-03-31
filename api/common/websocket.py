from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from common.logger import info_logger

class ConnectionManager:
    def __init__(self):
        self.connections: dict[str, WebSocket] = {}

    async def connect(self, id: str, websocket: WebSocket):
        info_logger.info(f"websocker {id}连接成功")
        await websocket.accept()
        self.connections[id] = websocket

    def disconnect(self, id: str):
        self.connections.pop(id)
        
    def get_connection(self, id: str):
        return self.connections.get(id)

    async def send_personal_message(self, message: str, websocket_id: str):
        connection = self.get_connection(websocket_id)
        if connection:
            await connection.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.connections.values():
            await connection.send_text(message)
            
    async def count(self):
        return len(self.connections)

notificationManager = ConnectionManager()
chatManager = ConnectionManager()
aiManager = ConnectionManager()