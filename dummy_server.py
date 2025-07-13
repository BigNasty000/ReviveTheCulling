# ue4_crypto.py
from Crypto.Cipher import AES
from hashlib import sha1
import socket, struct, time, os, argparse

def derive_key(client_nonce: bytes, server_nonce: bytes) -> bytes:
    """
    Unreal default (pre-UE5 EOS): key = SHA1(clientNonce ⧺ serverNonce)[:16]
    """
    return sha1(client_nonce + server_nonce).digest()[:16]

def aes_decrypt(session_key: bytes, iv: bytes, ciphertext: bytes) -> bytes:
    cipher = AES.new(session_key, AES.MODE_CBC, iv)
    return cipher.decrypt(ciphertext)

def aes_encrypt(session_key: bytes, iv: bytes, plaintext: bytes) -> bytes:
    cipher = AES.new(session_key, AES.MODE_CBC, iv)
    return cipher.encrypt(plaintext.ljust((len(plaintext)+15)//16 * 16, b"\0"))


UDP_IP, UDP_PORT = "127.0.0.1", 7777

CLIENT_NONCE = bytes.fromhex("900c4d30f77f0000")
SERVER_NONCE = bytes.fromhex("1a1ee64200000000")
session_key  = derive_key(CLIENT_NONCE, SERVER_NONCE)
print("Session-key:", session_key.hex())

# ───────── HELPERS ─────────
def build_packet(opcode: int, extra: bytes = b"") -> bytes:
    """[SizeLE][skip][skip][opcode] + extra"""
    body = b"\x00\x00" + bytes([opcode]) + extra
    pkt  = struct.pack("<H", len(body)) + body[2:]
    return pkt

def send_nmt(name: str, opcode: int, sock: socket.socket, peer, extra: bytes = b""):
    pkt = build_packet(opcode, extra)
    iv  = os.urandom(16)
    sock.sendto(iv + aes_encrypt(session_key, iv, pkt), peer)
    print(f"⇠ NMT_{name}")

# ───────── NMT BUILDERS ─────────
def build_join_ack():     return build_packet(0x0A, os.urandom(16))
def build_netspeed():     return build_packet(0x0B, struct.pack("<I", 10000))
def build_challenge():    return build_packet(0x02, os.urandom(8))
def build_client_ready(): return build_packet(0x0C)
def build_level_loaded(): return build_packet(0x0D)
def build_actor_open():   return build_packet(0x0E)

# ───────── MAIN LOOP ─────────
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((UDP_IP, UDP_PORT))
print(f"🔰 UE4 dummy server listening on {UDP_IP}:{UDP_PORT}")
sock.settimeout(10) # Set a timeout for recvfrom to avoid indefinite hangs

try:
    # --- Handshake Step 1: Hello ---
    data, peer = sock.recvfrom(2048)
    iv, ct = data[:16], data[16:]
    print("📥 [1] Received Client Hello")
    send_nmt("Welcome", 0x09, sock, peer)

    # --- Handshake Step 2: Join Request ---
    data, _ = sock.recvfrom(2048)
    iv, ct = data[:16], data[16:]
    print("📥 [2] Received Client JoinReq")
    send_nmt("AssignGUID", 0x05, sock, peer, b"\x01\x00\x00\x00") # Send a simple GUID

    # --- Handshake Step 3: Client Acknowledges GUID ---
    data, _ = sock.recvfrom(2048)
    iv, ct = data[:16], data[16:]
    print("📥 [3] Received GUID Acknowledgement")
    send_nmt("Join", 0x0A, sock, peer)

    # --- Handshake Step 4: Final Server Info & Challenge ---
    # After the client knows its GUID and has joined, the server sends the final info.
    send_nmt("Netspeed", 0x0B, sock, peer, build_netspeed()[3:])
    send_nmt("Challenge", 0x02, sock, peer, build_challenge()[3:])
    
    # --- Handshake Step 5: Client is Ready ---
    data, _ = sock.recvfrom(2048)
    iv, ct = data[:16], data[16:]
    print("📥 [4] Received Client Ready")
    
    # --- Handshake Complete: Tell client to load the level ---
    print("✅ Handshake complete! The game should now be loading the level.")
    send_nmt("LevelLoaded", 0x0D, sock, peer)
    # Some games need an ActorChannelOpen to spawn the player controller
    send_nmt("ActorChannelOpen", 0x0E, sock, peer)

    # ─── Heartbeat Loop ───
    print("✔ Entering main game loop. Sending heartbeats.")
    while True:
        # A real server would receive player inputs and send back world state.
        # For now, we just keep the connection alive.
        time.sleep(2)
        sock.sendto(b"\x00", peer) # A simple 1-byte keepalive might be enough
        print("~ Heartbeat sent.")

except ConnectionResetError:
    print("\n❌ Client disconnected forcefully. Handshake sequence or packet content is likely incorrect.")
except socket.timeout:
    print("\n⌛ Client timed out. Server may not have responded as expected.")
except KeyboardInterrupt:
    print("\nServer shutting down.")
