# The Culling Mock Server (TCXAV)

This project is a mock backend server for **The Culling**, designed to intercept and simulate the game’s expected API and WebSocket behavior. It allows you to spoof authentication and matchmaking processes for testing or reverse engineering.

---

## Current Progress

- **HTTPS Flask server** successfully responds to all critical HTTP endpoints:
  - `/api`
  - `/api/login`
  - `/api/authenticated_root`
  - `/api/matchqueue`
- Web server is running on **port 443** using a **self-signed SSL cert** with `eventlet`.
- AJAX/XHR requests from the game client are confirmed to hit the spoofed server and respond correctly.
- `hosts` file configured to redirect domains to `127.0.0.1`, including:

    - 127.0.0.1 discovery.theculling.net
    - 127.0.0.1 resources.theculling.com
    - 127.0.0.1 clientweb2.us-east-1.production.theculling.net
    - 127.0.0.1 clientweb.us-east-1.production.theculling.net
    - 127.0.0.1 clientweb2.us-west-2.production.theculling.net
    - 127.0.0.1 clientweb2.eu-central-1.production.theculling.net
    - 127.0.0.1 clientweb.us-east-1.development.theculling.net
    - 127.0.0.1 clientweb.us-east-1.friends.theculling.net

---

## Outstanding Issues

- ~~WebSocket connection **is not being established**.~~
- ~~No `Upgrade: websocket` requests are seen in the logs.~~
- ~~No evidence of `/socket.io/` requests reaching the server.~~
- ~~Downgrading `python-socketio` and `python-engineio` **did not resolve** the issue.~~
- ~~Port changes to 8080 or 80 **break communication completely** — only 443 works.~~
- Ran into an internal engine call for matchmaking. We will need to pivot to use an overlay to perform a UI hijack of the buttons.

---

## Key Discoveries

- The game **does connect to the spoofed server** via HTTPS.
- The mock server **successfully returns spoofed player data**.
- ~~The WebSocket client (likely using `socket.io`) does **not initiate a connection**, even when WSS URL is returned.~~
- The game relies on some internal coherent engine calls that silently fail. Matchmaking will need to be done differently.
---

## How To unpak and repak .pak

The game paks are found at:
\SteamLibrary\steamapps\common\TheCulling\Victory\Content\Paks

- To unpak them, you will need UnrealEngine 4.15.3 (highly reccommend using this verision) or higher.
- To pak, you will most likely need 4.15.3 specifically as that is what the game used originally.

- Notes: The re-paking seems to have issues. I don't work or have ever worked on game developement, so I don't
have a concrete answer on this one. But modifying the .pak files and then re paking seems to cause game crash. 
My best guess is this happens from Unreal Engine checking the expecting bytes/bit length of the cooked in files, 
sees they are different, and reject/boots you out. 

To download UE4-4.15.3:

- Open Epic Games Launcher
- Click Unreal Engine Tab on the left
- Click Library Tab at the top (between Fab and Twinmotion)
- Click the '+' next to "Engine Versions" 
- Click the dropdown for the version just above the Install button
- Select '4.15.3'
- Click and choose where to install


Once you have UE4-4.15.3 Installed from Epic Games.
- Either add the UnrealPak.exe to your %PATH% OR navigate to "\UE\UE_4.15\Engine\Binaries\Win64"
- For EXTRACTING: 
    - UnrealPak.exe \SteamLibrary\steamapps\common\TheCulling\Victory\Content\Paks\ [NAME OF PAK TO EXTRACT FROM, ex/pakchunk0-WindowsClient].pak -Extract \SteamLibrary\steamapps\common\TheCulling\Victory\Content\MODPaks\ [NAME OF FOLDER WHERE YOU WANT EVERYTHING]

- For PAKING:
    - UnrealPak.exe \location\you\want\the\new\pak\file -Create=\folder\you\want\to\create\the\pak\with
 
---


## How to Run

python 3.11 is what this project is running


---
FIRST TIME SETUP

- py -m venv venv
- venv\Scripts\activate
- pip install -r requirements.txt

---


- venv\Scripts\activate
- python mock_server.py

Run the game after you've made changes to your hosts file and have the mock_server.py running. You should see the current out puts for logging in.
