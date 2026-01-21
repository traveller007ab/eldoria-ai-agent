#!/usr/bin/env python3
"""
Eldoria Browser Launcher

Launches the PyQt5 browser as a standalone application.
Can receive URL parameters from the main app via IPC.
"""

import sys
import os
import json
import socket
import threading
from pathlib import Path

# Add browser module to path
sys.path.insert(0, str(Path(__file__).parent))

from browser.eldoria_browser import EldoriaBrowser
from PyQt5.QtWidgets import QApplication
from PyQt5.QtCore import QCoreApplication, Qt, QTimer


# IPC Configuration
IPC_PORT = 19876
IPC_BUFFER_SIZE = 4096


class EldoriaBrowserApp:
    """Application wrapper for the browser."""
    
    def __init__(self):
        self.app = QApplication(sys.argv)
        self.app.setStyle("Fusion")
        self.browser = EldoriaBrowser()
        
    def run(self):
        """Run the application."""
        self.browser.resize(1400, 900)
        self.browser.show()
        
        # Start IPC server in background thread
        self.start_ipc_server()
        
        return self.app.exec_()
        
    def start_ipc_server(self):
        """Start IPC server to receive messages from main app."""
        def server_thread():
            try:
                server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                server.bind(('127.0.0.1', IPC_PORT))
                server.listen(1)
                server.settimeout(1.0)  # Non-blocking with timeout
                
                while True:
                    try:
                        client, addr = server.accept()
                        data = client.recv(IPC_BUFFER_SIZE).decode('utf-8')
                        client.close()
                        
                        if data:
                            try:
                                message = json.loads(data)
                                self.handle_ipc_message(message)
                            except json.JSONDecodeError:
                                pass
                                
                    except socket.timeout:
                        continue
                    except Exception as e:
                        print(f"[IPC Server] Error: {e}")
                        break
                        
            except Exception as e:
                print(f"[IPC Server] Failed to start: {e}")
                
        thread = threading.Thread(target=server_thread, daemon=True)
        thread.start()
        print(f"[IPC Server] Listening on port {IPC_PORT}")
        
    def handle_ipc_message(self, message: dict):
        """Handle IPC message from main app."""
        msg_type = message.get("type")
        
        if msg_type == "navigate":
            url = message.get("url", "")
            if url:
                print(f"[IPC] Navigating to: {url}")
                # Use QTimer to schedule in main thread
                QTimer.singleShot(0, lambda: self.browser.navigate_from_pwa(url))
                
        elif msg_type == "open_tab":
            url = message.get("url", "")
            if url:
                print(f"[IPC] Opening new tab: {url}")
                QTimer.singleShot(0, lambda: self.browser.navigate_from_pwa(url))
                
        elif msg_type == "get_url":
            # Request for current URL
            url = self.browser.get_current_url()
            print(f"[IPC] Current URL: {url}")
            
        elif msg_type == "close":
            print("[IPC] Close request received")
            QTimer.singleShot(0, self.app.quit)


def main():
    """Main entry point."""
    # Create data directory
    data_dir = Path.home() / ".eldoria" / "browser"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    app = EldoriaBrowserApp()
    sys.exit(app.run())


if __name__ == "__main__":
    main()
