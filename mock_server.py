import eventlet
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS

# Initialize Flask and SocketIO
app = Flask(__name__)
app.config['SECRET_KEY'] = 'a-very-secret-key-that-is-secure'
CORS(app) # Apply CORS to all HTTP routes
socketio = SocketIO(app, async_mode='eventlet', cors_allowed_origins="*")

# This dictionary is now essential. It will map a user's ID to their unique socket session ID.
# e.g., {'steam:76561197960287930': 'aBcDeFg12345'}
connected_players = {}

# --- Helper Data ---
AUTHENTICATED_PLAYER_DATA = {
    "authenticated": True, "userID": "steam:76561197960287930", "build": "20240521",
    "avatarUrl": "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/b5/b5bd56c1527ab04f4523a26a38614561b620bd38_full.jpg",
    "redeemSystemOnline": True,
    "player": {"cullCredits": 25700, "premiumCurrency": 1250, "migrated": True},
    "stats": { "level": 999, "wins": 78, "kills": 856, "gamesPlayed": 621 },
}


@app.before_request
def log_http_request():
    print(f"\n--- HTTP Request ---")
    print(f"{request.method} {request.path}")
    print(f"Headers: {dict(request.headers)}")
    if request.form: print(f"Form Data: {request.form.to_dict()}")

# --- STEP 1: Unauthenticated Root Endpoint ---
@app.route("/api", methods=["GET"])
def api_root_unauthenticated():
    print("Hit: Unauthenticated Root (/api)")
    # We provide the server's own IP to ensure the client connects back to us.
    # YOUR_SERVER_PRIVATE_IP = "172.31.58.55" # CHANGE THIS if your IP changes
    # YOUR_SERVER_PORT = 443
    socket_url = f"wss://{request.host}/"
    print(f"Generated socket URL: {socket_url}")
    response_data = {
      "authenticated": False, "login": "/api/login",
      "socket": socket_url, "matchqueue": "/api/matchqueue",
      "redeemSystemOnline": True
    }
    return jsonify(response_data)

# --- STEP 2: Login Endpoint ---
@app.route("/api/login", methods=["POST"])
def api_login():
    print("Hit: Login Endpoint (/api/login)")
    response_data = {
        "redirect": "/api/authenticated_root",
        "token": "fake-jwt-token-for-testing-purposes",
        "userID": request.form.get("userid", "steam:76561197960287930"),
        "build": request.form.get("build", "20240521")
    }
    return jsonify(response_data)

# --- STEP 3: Authenticated Root Endpoint ---
@app.route("/api/authenticated_root", methods=["GET"])
def api_root_authenticated():
    print("Hit: Authenticated Root (/api/authenticated_root)")
    return jsonify(AUTHENTICATED_PLAYER_DATA)

# --- WebSocket Handlers (Crucial Fixes Here) ---
@socketio.on('connect')
def handle_connect():
    print(f'--- WebSocket: Client connected ({request.sid}) ---')
    emit('login_ready')

@socketio.on('disconnect')
def handle_disconnect():
    print(f'--- WebSocket: Client disconnected ({request.sid}) ---')
    ### --- FIX --- ###
    # Clean up the player mapping when they disconnect.
    # We find the userID associated with the disconnected sid and remove it.
    user_id_to_remove = None
    for user_id, sid in connected_players.items():
        if sid == request.sid:
            user_id_to_remove = user_id
            break
    if user_id_to_remove:
        del connected_players[user_id_to_remove]
        print(f"Removed mapping for {user_id_to_remove} from connected players.")

@socketio.on('login')
def handle_socket_login(data):
    print(f"--- WebSocket: Received 'login' from {request.sid} ---")
    
    ### --- FIX --- ###
    # The client sends its userID in the login payload. We must capture it
    # and map it to the current socket session ID (request.sid).
    user_id = data.get('userID')
    if user_id:
        connected_players[user_id] = request.sid
        print(f"Successfully mapped userID '{user_id}' to sid '{request.sid}'")
    else:
        print("Warning: WebSocket login event received without a userID.")

    emit('auth-response')
    print("-> Replied with 'auth-response'. Client is now ONLINE.")
    emit('update-queue-status', {"ffa": {"isActive": True}, "coop2": {"isActive": True}})

# --- Matchmaking Endpoint (Now it will work) ---
@app.route("/api/matchqueue", methods=["POST"])
def api_matchqueue():
    print("--- HTTP: Received 'MatchQueueWithTicket' request ---")
    user_id = request.form.get("userid")
    queue_name = request.form.get("queuename")
    print(f"User '{user_id}' is queuing for '{queue_name}'")

    if not user_id or user_id not in connected_players:
        print(f"Error: User '{user_id}' not found in connected players list. Current list: {connected_players}")
        return jsonify({"error": "Player not authenticated or socket not ready"}), 403

    player_sid = connected_players[user_id]
    
    socketio.start_background_task(target=process_matchmaking_for_player, sid=player_sid)
    
    print("-> Responding with 200 OK to the HTTP request.")
    return jsonify({"status": "success", "message": "Queue request received"}), 200

def process_matchmaking_for_player(sid):
    print(f"[BG Task for {sid}]: Processing matchmaking...")
    socketio.emit('join-mm-ack', room=sid)
    print(f"[BG Task for {sid}]: Sent 'join-mm-ack'.")
    socketio.sleep(5)
    print(f"[BG Task for {sid}]: Match found! Sending 'match-ready'.")
    match_data = {
        "gameServer": "127.0.0.1:7777",
        "nonce": "a-random-client-nonce-string-123",
        "serverNonce": "a-random-server-nonce-string-456"
    }
    socketio.emit('match-ready', match_data, room=sid)

@app.route("/ReferenceServerNews.html", methods=["GET"])
def reference_old_news():
    html = "<html><body><h1>Welcome Back!</h1></body></html>"
    return html, 200

@app.route("/News.html", methods=["GET"])
def reference_new_news():
    html = "<html><body><h1>Welcome Back!</h1></body></html>"
    return html, 200

if __name__ == "__main__":
    print("Starting Flask-SocketIO server with locally-trusted SSL certificate...")
    import eventlet.wsgi
    from eventlet import wrap_ssl

    # Use the new certificate files generated by mkcert
    cert_file = 'clientweb2.us-east-1.production.theculling.net+2.pem'
    key_file = 'clientweb2.us-east-1.production.theculling.net+2-key.pem'

    listener = eventlet.listen(('0.0.0.0', 443))
    ssl_listener = wrap_ssl(listener, certfile=cert_file, keyfile=key_file, server_side=True)
    
    eventlet.wsgi.server(ssl_listener, app, debug=True)