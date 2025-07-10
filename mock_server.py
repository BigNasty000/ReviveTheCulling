import eventlet
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS

# Initialize
app = Flask(__name__)
app.config['SECRET_KEY'] = 'a-very-secret-key-that-is-secure'
CORS(app)
socketio = SocketIO(app, async_mode='eventlet', cors_allowed_origins="*")

connected_players = {}
AUTHENTICATED_PLAYER_DATA = {
    "authenticated": True, "userID": "steam:76561197960287930", "build": "20240521",
    "avatarUrl": "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/b5/b5bd56c1527ab04f4523a26a38614561b620bd38_full.jpg",
    "redeemSystemOnline": True,
    "player": {"cullCredits": 25700, "premiumCurrency": 1250, "migrated": True},
    "stats": { "level": 999, "wins": 78, "kills": 856, "gamesPlayed": 621}}

@app.before_request
def log_http_request():
    print(f"\n--- HTTP Request ---")
    print(f"Host: {request.host}") # Log which "server" is being hit
    print(f"{request.method} {request.path}")
    print(connected_players, flush=True)
    if request.form: print(f"Form Data: {request.form.to_dict()}")

# --- LOGIN FLOW & WEBSOCKET HANDLERS ---
@app.route("/api", methods=["GET"])
def api_root_unauthenticated():
    print("Hit: Unauthenticated Root (/api)")
    # --- CHANGE FOR HTTP TEST ---
    # Generate a plain 'ws://' URL for the WebSocket
    socket_url = f"ws://{request.host}/" 
    print(f"Generated HTTP socket URL: {socket_url}")
    response_data = {
      "authenticated": False, "login": "/api/login",
      "socket": socket_url, # Provide the ws:// URL
      "matchqueue": "/api/matchqueue",
      "redeemSystemOnline": True
    }
    return jsonify(response_data)

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

@app.route("/api/authenticated_root", methods=["GET"])
def api_root_authenticated():
    print("Hit: Authenticated Root (/api/authenticated_root)")
    return jsonify(AUTHENTICATED_PLAYER_DATA)

@socketio.on('connect')
def handle_connect():
    print(f'--- WebSocket: Client connected ({request.sid}) on host {request.host} ---')
    emit('login_ready')

@socketio.on('disconnect')
def handle_disconnect():
    print(f'--- WebSocket: Client disconnected ({request.sid}) ---')
    user_id_to_remove = None
    for user_id, sid in connected_players.items():
        if sid == request.sid: user_id_to_remove = user_id
    if user_id_to_remove: del connected_players[user_id_to_remove]

@socketio.on('login')
def handle_socket_login(data):
    user_id = data.get('userID')
    print(f"--- WebSocket: Received 'login' from {user_id} ({request.sid}) on host {request.host} ---")
    if user_id: connected_players[user_id] = request.sid
    emit('auth-response')
    emit('update-queue-status', {"ffa": {"isActive": True}, "coop2": {"isActive": True}})

# --- PARTY SYSTEM PLACEHOLDERS ---
@socketio.on('group-invite')
def handle_group_invite(data):
    print(f"--- WebSocket: Received 'group-invite': {data} ---")
    # Acknowledge that the invite was "sent"
    emit('group-invite-ack')

@socketio.on('leave-group')
def handle_leave_group():
    print(f"--- WebSocket: Received 'leave-group' ---")
    # Acknowledge that the player "left" the group
    emit('left-group', {'groupID': 'some_fake_group_id'})

# --- MATCHMAKING ENDPOINT ---
@app.route("/api/matchqueue", methods=["POST"])
def api_matchqueue():
    print("--- HTTP: Received 'MatchQueueWithTicket' request ---")
    user_id = request.form.get("userid")
    if not user_id or user_id not in connected_players:
        return jsonify({"error": "Player not authenticated"}), 403
    
    player_sid = connected_players[user_id]
    socketio.start_background_task(target=process_matchmaking_for_player, sid=player_sid)
    return jsonify({"status": "success"}), 200

def process_matchmaking_for_player(sid):
    print(f"[BG Task for {sid}]: Processing matchmaking...")
    socketio.emit('join-mm-ack', room=sid)
    socketio.sleep(5)
    match_data = {
        "gameServer": "127.0.0.1:7777",
        "nonce": "nonce-client-123",
        "serverNonce": "nonce-server-456"
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
    print("Starting unified Flask-SocketIO server with multi-domain SSL certificate...")
    # import eventlet.wsgi
    # from eventlet import wrap_ssl

    # # Use the NEW multi-domain certificate files
    # cert_file = 'clientweb2.us-east-1.production.theculling.net+3.pem'
    # key_file = 'clientweb2.us-east-1.production.theculling.net+3-key.pem'

    # listener = eventlet.listen(('0.0.0.0', 443))
    # ssl_listener = wrap_ssl(listener, certfile=cert_file, keyfile=key_file, server_side=True)
    
    # eventlet.wsgi.server(ssl_listener, app, debug=True)

    # socketio.run(app, host="0.0.0.0", port=443, debug=True)

    # app.run(host="0.0.0.0", port=80, debug=True)
    app.run(host="0.0.0.0", port=443, ssl_context=("cert.pem", "key.pem"), debug=True)
