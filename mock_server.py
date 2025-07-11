import uuid
import eventlet
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from socketio import WSGIApp          # ← comes from python-socketio, NOT your instance
import logging
logging.basicConfig(level=logging.DEBUG)

# Initialize
app = Flask(__name__)
app.config['SECRET_KEY'] = 'a-very-secret-key-that-is-secure'
CORS(app)
socketio = SocketIO(
    app,
    async_mode='eventlet',
    cors_allowed_origins="*",
    engineio_logger=True,
    logger=True,
    engineio_options={
        'allow_upgrades': True,
        'ping_timeout': 20,
        'ping_interval': 25,
        'max_http_buffer_size': 1000000,
        'compression': True,
    }
)

connected_players = {}
AUTHENTICATED_PLAYER_DATA = {
    "authenticated": True, "userID": "steam:76561197960287930", "build": "20240521",
    "avatarUrl": "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/b5/b5bd56c1527ab04f4523a26a38614561b620bd38_full.jpg",
    "redeemSystemOnline": True,
    "player": {"cullCredits": 25700, "premiumCurrency": 1250, "migrated": True},
    "stats": { "level": "999", "wins": 78, "kills": 856, "gamesPlayed": 621},
    "challenges": {"challengeMap": {}}
}


@app.before_request
def log_http_request():
    print(f"\n--- HTTP Request ---")
    print(f"Host: {request.host}") # Log which "server" is being hit
    print(f"{request.method} {request.path}")
    print(f"{request.headers}")

    print(connected_players, flush=True)
    if request.form: print(f"Form Data: {request.form.to_dict()}")

@app.route("/api", methods=["GET"])
def api_root_unauthenticated():
    base_url = f"https://{request.host}"
    print("Hit: Unauthenticated Root (/api)")
    protocol = 'wss'
    
    socket_url = f"{protocol}://{request.host}/socket.io"
    
    print(f"Generated WSS socket URL: {socket_url}")
    
    response_data = {
      "authenticated": False,
      "login": f"{base_url}/api/login",
      "socket": socket_url,
      "matchqueue": f"{base_url}/api/matchqueue",
      "redeemSystemOnline": True,
      "bIsConsole":"steam"
    }
    # return jsonify(AUTHENTICATED_PLAYER_DATA)
    return jsonify(response_data)



@app.route("/api/login", methods=["POST"])
def api_login():
    """
    Provide every key the client expects, with an absolute redirect URL.
    This is the correct, full response.
    """
    print("Hit: Login Endpoint (/api/login)")
    user_id = request.form.get("userid")
    build_version = request.form.get("build")
    base_url = f"https://{request.host}"
    redirect_url = f"{base_url}/api/authenticated_root"

    response_data = {
        "redirect": redirect_url,
        "token": "fake-jwt-token-for-testing-purposes",
        "userID": user_id,
        "build": build_version
    }
    
    print(f"-> Responding to login with full, correct payload: {response_data}")
    return jsonify(response_data)

@app.route("/api/authenticated_root", methods=["GET"])
def api_root_authenticated():
    print("Hit: Authenticated Root (/api/authenticated_root). Client should now have all data.")

    final_data = AUTHENTICATED_PLAYER_DATA.copy()
    # final_data['connectionStatus'] = 6
    final_data['authenticated'] = True

    print(f"Sending back: {final_data}", flush=True)
    return jsonify(final_data)


@app.route("/ET2/CollectData.1", methods=["POST"])
def collect_data():
    print("\n=== JS LOG ===")
    try:
        data = request.get_json(force=True)
        print(f"[JS LOG] {data.get('timestamp')} — {data.get('log')}")
    except Exception as e:
        print(f"[ERROR parsing JS log] {e}")
        print(request.get_data(as_text=True))
    return "", 200


# --- WebSocket Handlers (More robust) ---

@socketio.on('connect')
def handle_connect():
    print(f'--- WebSocket: Client connected (sid: {request.sid}) ---')
    # Don't associate user yet. Wait for login event.
    emit('login_ready')

@socketio.on('disconnect')
def handle_disconnect():
    print(f'--- WebSocket: Client disconnected (sid: {request.sid}) ---')
    user_id_to_remove = None
    for user_id, data in list(connected_players.items()):
        if data.get('sid') == request.sid:
            user_id_to_remove = user_id
            break
    if user_id_to_remove:
        del connected_players[user_id_to_remove]
        print(f"Cleaned up session for {user_id_to_remove}.")

@socketio.on('login')
def handle_socket_login(data):
    user_id = data.get('userID')
    print(f"--- WebSocket: Received 'login' for {user_id} (sid: {request.sid}) ---")
    
    # Gracefully handle reconnection.
    if user_id in connected_players and connected_players[user_id].get('sid') != request.sid:
        old_sid = connected_players[user_id].get('sid')
        print(f"User {user_id} reconnected. Old SID: {old_sid}, New SID: {request.sid}")


    connected_players[user_id] = {'sid': request.sid}
    print(f"Associated '{user_id}' with sid '{request.sid}'")
    
    emit('auth-response')
    print("-> Replied with 'auth-response'.")
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

@app.route("/api/matchqueue", methods=["POST"])
def api_matchqueue():
    """
    This is the legacy HTTP endpoint. Let's provide a structured success response
    that won't cause parsing errors on the client side.
    """
    print("--- HTTP: Received 'MatchQueueWithTicket' request ---")
    user_id = request.form.get("userid")
    queue_name = request.form.get("queuename")
    print(f"User '{user_id}' is queuing for '{queue_name}'")

    if not user_id or user_id not in connected_players:
        print(f"Error: User '{user_id}' not found or socket not ready. Current list: {connected_players}")
        return jsonify({"error": "Player not authenticated", "errorCode": "auth_failed"}), 403

    player_sid = connected_players[user_id]
    
    socketio.start_background_task(target=process_matchmaking_for_player, sid=player_sid)
    
    success_response = {
        "status": "QUEUED",
        "message": "Player successfully entered the queue.",
        "ticketId": f"q_ticket_{uuid.uuid4()}",
        "redirect": None, # Safe null for login parsers
        "token": None,    # Safe null for login parsers
        "estimatedWaitTime": 30
    }

    print(f"-> Responding to /api/matchqueue with: {success_response}")
    return jsonify(success_response), 200

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

@app.route('/socket.io/<path:remaining>', methods=['GET', 'POST'])
def catch_socketio(remaining):
    print(f"🔥 RAW /socket.io" , flush=True)


if __name__ == "__main__":
    print("Starting server with DEFAULT WebSocket path and SSL...")
    from eventlet import wrap_ssl

    cert_file = 'clientweb2.us-east-1.production.theculling.net+4.pem'
    key_file = 'clientweb2.us-east-1.production.theculling.net+4-key.pem'

    listener = eventlet.listen(('0.0.0.0', 443))
    ssl_listener = wrap_ssl(
        listener,
        certfile=cert_file,
        keyfile=key_file,
        server_side=True
    )

    wsgi_app = WSGIApp(socketio, app)
    eventlet.wsgi.server(ssl_listener, wsgi_app)



