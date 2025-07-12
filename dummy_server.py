# dummy_server.py
import socket

HOST = '127.0.0.1'  # Listen on localhost
PORT = 7777         # The port the game will connect to

print(f"--- Dummy Game Server Started ---")
print(f"Listening for connections on {HOST}:{PORT}")

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.bind((HOST, PORT))
    s.listen()
    while True:
        conn, addr = s.accept()
        with conn:
            print(f"\n🔥🔥🔥 SUCCESS! A game client connected from {addr} 🔥🔥🔥")
            print("--- The full matchmaking loop is working! ---")
            # We don't need to do anything else, the connection proves it works.
            # We can close the connection immediately.