import random
import string
import subprocess
import time
import uuid
import eventlet
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room
from flask_cors import CORS
from socketio import WSGIApp          # ← comes from python-socketio, NOT your instance
import logging
from threading import Lock

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

# ===================================================================
#                      MATCHMAKING SERVICE
# ===================================================================

class MatchmakingService:
    def __init__(self, socketio_instance):
        self.socketio = socketio_instance
        self.queues = {
            'ffa_jungle': [],
            'ffa': [],

            'ffa_jungle_coop2': [],
            'ffa_prison': [],
            'ffa_prison_coop2': []
            # Add any other queues you find
        }
        self.lock = Lock()
        self.MATCH_SIZE = 1 # Set to 1 for easy testing
        self.ticker_task = None
        self.lobbies = {}

    def start(self):
        if self.ticker_task is None:
            self.ticker_task = self.socketio.start_background_task(target=self._ticker)
            logging.info("Matchmaking service started with a 5-second ticker.")

    def add_player_to_queue(self, user_id, queue_name):
        with self.lock:
            player_info = connected_players.get(user_id)
            if not player_info or not player_info.get('sid'):
                logging.error(f"Cannot queue user {user_id}: not fully connected.")
                return False

            player_entry = {'user_id': user_id, 'sid': player_info['sid']}
            if queue_name in self.queues:
                if any(p['user_id'] == user_id for p in self.queues[queue_name]):
                    logging.warning(f"User {user_id} already in queue '{queue_name}'.")
                    return True # Still acknowledge as success
                
                self.queues[queue_name].append(player_entry)
                logging.info(f"User {user_id} added to queue '{queue_name}'. Queue size: {len(self.queues[queue_name])}")
                
                # Immediately acknowledge the join to update the UI
                self.socketio.emit('join-mm-ack', room=player_info['sid'])
                return True
            return False

    # --- ADD THIS NEW FUNCTION ---
    def remove_player_from_all_queues(self, user_id):
        """Removes a player from any queue they might be in."""
        with self.lock:
            player_info = connected_players.get(user_id)
            if not player_info or not player_info.get('sid'):
                logging.error(f"Cannot dequeue user {user_id}: not fully connected.")
                return

            was_removed = False
            for queue_name, player_list in self.queues.items():
                # Find the player in the list and remove them
                original_length = len(player_list)
                self.queues[queue_name] = [p for p in player_list if p['user_id'] != user_id]
                if len(self.queues[queue_name]) < original_length:
                    logging.info(f"User {user_id} removed from queue '{queue_name}'.")
                    was_removed = True
            
            if was_removed:
                # Acknowledge that the player has left the queue.
                self.socketio.emit('leave-mm-ack', room=player_info['sid'])
            else:
                logging.warning(f"User {user_id} tried to leave queue but was not found in any.")
                self.socketio.emit('leave-mm-ack', room=player_info['sid'])

    def get_player_cards(self, user_ids):
        """
        Retrieves card information for a list of user IDs.
        In a real application, this would query a database.
        For now, we return dummy data.
        """
        cards_data = []
        for user_id in user_ids:
            # You can create more varied dummy data if needed
            dummy_card = {
                "userID": user_id,
                "cardID": "191059",  # A default or random card ID
                "cardLevel": 999,
                "cardRank": 5
            }
            cards_data.append(dummy_card)
        
        logging.info(f"Retrieved card data for users: {user_ids}")
        return cards_data
    
    def create_lobby(self, user_id, culling_card, map_name):
        """Creates a new custom lobby and adds the creator to it."""
        with self.lock:
            player_info = connected_players.get(user_id)
            if not player_info or not player_info.get('sid'):
                logging.error(f"Cannot create lobby for user {user_id}: not fully connected.")
                # Optionally, send a failure message back
                # self.socketio.emit('lobby-create-fail', {'reason': 'Not connected'}, room=player_info['sid'])
                return

            # Generate a unique 6-character lobby code
            lobby_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            while lobby_code in self.lobbies:
                lobby_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

            logging.info(f"Creating new lobby '{lobby_code}' for owner {user_id} on map '{map_name}'.")

            # Create the lobby data structure
            new_lobby = {
                'code': lobby_code,
                'owner': user_id,
                'mapName': map_name,
                'members': [
                    {
                        'user': user_id,
                        'cullingcard': culling_card
                        # The client-side JS will fill in other details like level/name
                    }
                ]
            }

            self.lobbies[lobby_code] = new_lobby
            
            # The player is now "in" this lobby, so we need to add them to a SocketIO room
            # so we can easily send updates to everyone in the lobby.
            player_sid = player_info['sid']
            join_room(lobby_code, sid=player_sid)
            
            # Send the 'lobby-update' event back to the creator.
            # The client's UI is listening for this event to show the lobby screen.
            self.socketio.emit('lobby-update', new_lobby, room=player_sid)
                
    def _ticker(self):
        """The main loop that runs every few seconds to process queues."""
        while True:
            self.socketio.sleep(5)
            with self.lock:
                self._broadcast_queue_updates()
                for queue_name in list(self.queues.keys()):
                    if len(self.queues[queue_name]) >= self.MATCH_SIZE:
                        self._create_match(queue_name)

    def _broadcast_queue_updates(self):
        """Sends updates about player counts to everyone in a queue."""
        for queue_name, player_list in self.queues.items():
            if player_list:
                logging.info(f"Broadcasting update for queue '{queue_name}': {len(player_list)} player(s).")
                queue_update = {'count': len(player_list)}
                for player in player_list:
                    self.socketio.emit('players-in-queue', queue_update, room=player['sid'])
                    self.socketio.emit('update-average-queue-time', 30000, room=player['sid']) # Fake 30s

    def _create_match(self, queue_name):
        """Forms a match and sends the match-ready event."""
        server_nonce_str = f"nonce-server-{uuid.uuid4()}"
        # --- KEY CHANGE: Launch the UDP server with the correct nonces ---
        # Assuming your server script is named 'game_server.py'
        if queue_name in ["ffa"]:
            subprocess.Popen([
            'python', 
            'dummy_old_server.py', 
            '--server-nonce', server_nonce_str
        ])
        else:
            subprocess.Popen([
                'python', 
                'dummy_server.py', 
                '--server-nonce', server_nonce_str
            ])

        time.sleep(2)
        match_players = self.queues[queue_name][:self.MATCH_SIZE]
        self.queues[queue_name] = self.queues[queue_name][self.MATCH_SIZE:]
        
        player_ids = [p['user_id'] for p in match_players]
        logging.info(f"MATCH FOUND for queue '{queue_name}'! Players: {player_ids}")
        
        # --- The Player Loop: Generate a UNIQUE client nonce for each player ---
        for player in match_players:
            # Generate a unique ticket for this specific player.
            client_nonce_str = f"nonce-client-{uuid.uuid4()}"
            
            logging.info(f"Assigning client_nonce {client_nonce_str} to player {player['user_id']}")

            # Tell the game server to expect this specific player with this nonce.
            # This requires a way to communicate with your subprocess. For now, we assume
            # the server will just accept any valid client nonce associated with the server nonce.

            # Construct the unique match data for this player.
            match_data = {
                "gameServer": "127.0.0.1:7777",
                "nonce": client_nonce_str,       # The unique client nonce
                "serverNonce": server_nonce_str  # The shared server nonce
            }
            
            # Send the personalized connection info to this player.
            self.socketio.emit('match-ready', match_data, room=player['sid'])

# --- Initialize the Matchmaking Service ---
matchmaking_service = MatchmakingService(socketio)



# ===================================================================
#                      API ENDPOINTS - LOGIN/MATCHMAKE
# ===================================================================
@app.before_request
def log_http_request():
    print(f"\n--- HTTP Request ---")
    print(f"Host: {request.host}") # Log which "server" is being hit
    print(f"{request.method} {request.path}")
    print(f"{request.headers}")

    print(connected_players, flush=True)
    if request.form: print(f"Form Data: {request.form.to_dict()}")


@app.route('/api/discovery/GetClientData2', methods=['GET'])
def get_client_data():
    """
    This is the newly discovered prerequisite endpoint.
    We need to return a successful response that the game can parse.
    Based on the name, it's probably expecting server IPs and settings.
    """
    logging.info("--- SUCCESS: Discovery endpoint /api/discovery/GetClientData2 was hit! ---")
    
    # We will provide a response that points the client back to our main API server.
    # The format is a guess, but it's a very strong one.
    discovery_data = {
        "status": "ok",
        "clientweb": {
            "url": "https://clientweb2.us-east-1.production.theculling.net/api"
        },
        "telemetry": {
            "url": "https://telemetry.theculling.net/data" # A placeholder
        },
        "friends": {
            "url": "https://clientweb.us-east-1.friends.theculling.net/api"
        }
    }
    return jsonify(discovery_data), 200

@app.route("/api/matchqueue", methods=["POST"])
def api_matchqueue():
    """HTTP endpoint to request joining a queue."""
    print("--- HTTP: Received 'MatchQueueWithTicket' request ---")
    data = request.form.to_dict()
    user_id = data.get("userid")
    queue_name = data.get("queueName")
    
    if not user_id or not queue_name:
        return jsonify({"error": "Missing userid or queuename"}), 400

    # Delegate the logic to our service
    matchmaking_service.add_player_to_queue(user_id, queue_name)
    
    # Immediately return a successful HTTP response
    return jsonify({"status": "QUEUED", "message": "Queue request received."}), 200




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
    # Add the socket URL to the authenticated response
    socket_url = f"wss://{request.host}/"
    final_data['socket'] = socket_url
    final_data['matchqueue'] = f"https://{request.host}/api/matchqueue"
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


# ===================================================================
#                      WEBSOCKET HANDLERS
# ===================================================================

@socketio.on('connect')
def handle_connect():
    print(f'--- WebSocket: Client connected (sid: {request.sid}) ---')
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
    if not data:
        user_id = request.sid
        data = {}
    else:
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

@socketio.on('leave-mm')
def handle_leave_matchmaking(data):
    """Handles the client's request to leave the matchmaking queue."""
    # Find the user ID associated with the current session
    sid = request.sid
    user_id = next((uid for uid, p_info in connected_players.items() if p_info.get('sid') == sid), None)

    if user_id:
        queue_name = data.get('queueName', 'unknown') # The client sends this, but we don't need it
        logging.info(f"--- WebSocket: Received 'leave-mm' from {user_id} ---")
        matchmaking_service.remove_player_from_all_queues(user_id)
    else:
        logging.warning(f"Received 'leave-mm' from an unknown session ID: {sid}")


@socketio.on('join-mm')
def handle_old_join_matchmaking(data):
    """Handles the client's request to leave the matchmaking queue."""
    # Find the user ID associated with the current session
    queue_name = data.get("queueName")
    user_id =request.sid
    if not user_id or not queue_name:
        return jsonify({"error": "Missing userid or queuename"}), 400

    # Delegate the logic to our service
    matchmaking_service.add_player_to_queue(user_id, queue_name)

@socketio.on('lobby-create')
def handle_lobby_create(data):
    """Handles a client's request to create a new custom game lobby."""
    sid = request.sid
    user_id = next((uid for uid, p_info in connected_players.items() if p_info.get('sid') == sid), None)
    
    if user_id:
        culling_card = data.get('cullingcard')
        map_name = data.get('mapName')
        
        logging.info(f"--- WebSocket: Received 'lobby-create' from {user_id} ---")
        logging.info(f"    - Card: {culling_card}, Map: {map_name}")
        
        # Delegate the work to our service
        matchmaking_service.create_lobby(user_id, culling_card, map_name)
    else:
        logging.warning(f"Received 'lobby-create' from an unknown session ID: {sid}")

@socketio.on('get-cards')
def handle_get_cards(data):
    """Handles the client's request for player Culling Card information."""
    sid = request.sid
    user_list = data.get('users', [])
    
    logging.info(f"--- WebSocket: Received 'get-cards' from {sid} for users: {user_list} ---")

    if not isinstance(user_list, list):
        logging.warning("'get-cards' request received with invalid data format.")
        return

    # Delegate the logic to our service
    cards_result = matchmaking_service.get_player_cards(user_list)
    
    # The client expects the result in a specific format
    response_payload = {
        "cards": cards_result
    }

    # Send the result back to the client that requested it
    emit('get-cards-result', response_payload, room=sid)
    logging.info(f"-> Sent 'get-cards-result' back to {sid}.")

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

@socketio.on('message')
def handle_message(data):
    logging.warning(f"Received uncaught WebSocket 'message' event: {data}")

@socketio.on('json')
def handle_unnamed_json(data):
    """
    Catches any JSON-based event sent without a specific event name.
    """
    logging.warning(f"Received uncaught 'json' event with data: {data}")

@socketio.on_error_default
def default_error_handler(e):
    """
    This catches errors within the Socket.IO server itself.
    """
    logging.error(f"A WebSocket error occurred: {e}")


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
    print(f"RAW /socket.io" , flush=True)


if __name__ == "__main__":
    print("Starting server with DEFAULT WebSocket path and SSL...")
    matchmaking_service.start()

    cert_file = 'certs/clientweb2.us-east-1.production.theculling.net+4.pem'
    key_file = 'certs/clientweb2.us-east-1.production.theculling.net+4-key.pem'

    listener = eventlet.listen(('0.0.0.0', 443))
    ssl_listener = eventlet.wrap_ssl(
        listener,
        certfile=cert_file,
        keyfile=key_file,
        server_side=True
    )

    # ✅ Pass the Flask app to eventlet.wsgi.server directly
    eventlet.wsgi.server(ssl_listener, app)



