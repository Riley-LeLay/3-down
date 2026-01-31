#!/usr/bin/env python3
"""Simple HTTP server to run the 3 Down card game."""

import http.server
import socketserver
import webbrowser
import os

PORT = 8000

os.chdir(os.path.dirname(os.path.abspath(__file__)))

Handler = http.server.SimpleHTTPRequestHandler

print(f"Starting server at http://localhost:{PORT}")
print("Press Ctrl+C to stop the server")

# Try to open browser automatically
try:
    webbrowser.open(f'http://localhost:{PORT}')
except:
    pass

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
