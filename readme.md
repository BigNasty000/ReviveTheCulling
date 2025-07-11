# The Culling Mock Server (TCXAV)

This project is a mock backend server for **The Culling**, designed to intercept and simulate the game’s expected API and WebSocket behavior. It allows you to spoof authentication and matchmaking processes for testing or reverse engineering.

---

## ✅ Current Progress

- **HTTPS Flask server** successfully responds to all critical HTTP endpoints:
  - `/api`
  - `/api/login`
  - `/api/authenticated_root`
  - `/api/matchqueue`
- Web server is running on **port 443** using a **self-signed SSL cert** with `eventlet`.
- AJAX/XHR requests from the game client are confirmed to hit the spoofed server and respond correctly.
- `hosts` file configured to redirect domains to `127.0.0.1`, including:

127.0.0.1 discovery.theculling.net
127.0.0.1 resources.theculling.com

127.0.0.1 clientweb2.us-east-1.production.theculling.net
127.0.0.1 clientweb.us-east-1.production.theculling.net

127.0.0.1 clientweb2.us-west-2.production.theculling.net
127.0.0.1 clientweb2.eu-central-1.production.theculling.net
127.0.0.1 clientweb.us-east-1.development.theculling.net
127.0.0.1 clientweb.us-east-1.friends.theculling.net

---

## Outstanding Issues

- WebSocket connection **is not being established**.
- No `Upgrade: websocket` requests are seen in the logs.
- No evidence of `/socket.io/` requests reaching the server.
- Downgrading `python-socketio` and `python-engineio` **did not resolve** the issue.
- Port changes to 8080 or 80 **break communication completely** — only 443 works.

---

## Key Discoveries

- The game **does connect to the spoofed server** via HTTPS.
- The mock server **successfully returns spoofed player data**.
- The WebSocket client (likely using `socket.io`) does **not initiate a connection**, even when WSS URL is returned.

---

## How to Run
I was using 3.10 in a VENV to investigate some potential websocket version missmatch but no luck.. 
Anything in the 310 requirements is good for 3.11 with upto date install..

python 3.11 or 3.10 works fine


python mock_server.py

Run the game after you've made changes to your hosts file and have the mock_server.py running. You should see the current out puts for logging in.