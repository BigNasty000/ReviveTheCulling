import socket
import struct
import os
import argparse
import logging
import time
from hashlib import sha1
from Crypto.Cipher import AES

# --- Helpers (All are confirmed correct) ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
def derive_key(client_nonce: str, server_nonce: str) -> bytes: return sha1(client_nonce.encode('ascii') + server_nonce.encode('ascii')).digest()[:16]
def aes_decrypt(session_key: bytes, iv: bytes, ciphertext: bytes, use_padding=True) -> bytes:
    cipher = AES.new(session_key, AES.MODE_CBC, iv)
    decrypted = cipher.decrypt(ciphertext)
    if use_padding and decrypted:
        pad_len = decrypted[-1]
        if 0 < pad_len <= 16 and len(decrypted) >= pad_len and decrypted[-pad_len:] == bytes([pad_len]) * pad_len: return decrypted[:-pad_len]
    return decrypted
def aes_encrypt(session_key: bytes, iv: bytes, plaintext: bytes, use_padding=True) -> bytes:
    cipher = AES.new(session_key, AES.MODE_CBC, iv)
    if use_padding:
        pad_len = 16 - (len(plaintext) % 16); plaintext += bytes([pad_len]) * pad_len
    return cipher.encrypt(plaintext)
def send_handshake_blob(sock, peer, session_key, control_opcode: int, extra_payload: bytes = b''):
    # Based on the Ghidra function, the client expects a raw opcode, not one with the 0x80 flag.
    raw_packet_data = bytes([control_opcode]) + extra_payload

    iv = os.urandom(16)
    encrypted_payload = aes_encrypt(session_key, iv, raw_packet_data, use_padding=True)
    full_packet = iv + encrypted_payload
    sock.sendto(full_packet, peer)


# --- NEW HELPER FUNCTION ---
def build_ue4_string(s: str) -> bytes:
    """Builds a length-prefixed, null-terminated string for UE4 networking."""
    encoded_s = s.encode('ascii') + b'\x00'
    length = len(encoded_s)
    # The length is sent as a 32-bit signed little-endian integer.
    return struct.pack('<i', length) + encoded_s


def build_ue4_fstring(s: str) -> bytes:
    """Builds a length-prefixed, null-terminated ASCII string."""
    encoded_s = s.encode('ascii') + b'\x00'
    length = len(encoded_s); return struct.pack('<i', length) + encoded_s

# --- Main Server Logic ---
def run_server(ip, port, client_nonce, server_nonce):
    session_key = derive_key(client_nonce, server_nonce)
    logging.info(f"Derived Session Key: {session_key.hex()}")
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); sock.bind((ip, port))
    logging.info(f"✅ Server listening on {ip}:{port}"); sock.settimeout(20)

    try:
        # === STEP 1: Client sends NMT_Hello ===
        data, peer = sock.recvfrom(2048)
        iv, ct = data[:16], data[16:];
        # We know the first packet is an unpadded blob
        initial_blob = aes_decrypt(session_key, iv, ct, use_padding=False)
        logging.info(f"📥 [1] Received client's Hello blob ({len(initial_blob)} bytes).")

        # === STEP 2: Server sends NMT_Challenge ===
        # As per the UE4 documentation and our successful test, this is the first server response.
        # The payload must be the server_nonce so the client can verify the server.
        CHALLENGE_OPCODE = 0x03
        challenge_payload = build_ue4_fstring(server_nonce)
        
        logging.info(f"Sending NMT_Challenge with server_nonce: {server_nonce}")
        send_handshake_blob(sock, peer, session_key, CHALLENGE_OPCODE, challenge_payload)
        logging.info("⇠ [2] Sent definitive NMT_Challenge. Waiting for client's NMT_Login...")

        # === STEP 3: Client responds with NMT_Login ===
        # We now expect a NEW packet from the client.
        data, _ = sock.recvfrom(2048)
        iv, ct = data[:16], data[16:];
        # Subsequent packets are padded
        login_blob = aes_decrypt(session_key, iv, ct, use_padding=True)
        
        logging.info("✅✅✅ SUCCESS: Received client's NMT_Login packet! ✅✅✅")
        logging.info(f"📥 [3] Login Packet is {len(login_blob)} bytes long.")

        # === STEP 4: Server sends the "You're In" Finalization Burst ===
        # Now that the client is authenticated, we give it everything it needs to join the level.
        
        # Packet 1: The Welcome Packet with Map/Game Info
        WELCOME_OPCODE = 0x01
        # Using your verified paths
        MAP_PATH = "/Game/Maps/Jungle"
        GAME_MODE_PATH = "/Game/Blueprints/GameMode/VictoryGameMode_Solo.VictoryGameMode_Solo_C"
        
        map_bytes = build_ue4_fstring(MAP_PATH)
        gamemode_bytes = build_ue4_fstring(GAME_MODE_PATH)
        # It's good practice to include the nonce again for the client to double-check
        nonce_bytes = build_ue4_fstring(server_nonce) 
        welcome_payload = map_bytes + gamemode_bytes + nonce_bytes
        send_handshake_blob(sock, peer, session_key, WELCOME_OPCODE, welcome_payload)
        logging.info("⇠ [4a] Sent NMT_Welcome with map info.")
        
        # Packet 2: The Final Setup Packets (GUID, NetSpeed, and Open)
        # Let's try combining these, as that is a common optimization.
        guid_payload = bytes([0x06]) + b'\x01\x00\x00\x00' # NMT_AssignGUID
        netspeed_payload = bytes([0x04]) + struct.pack('<I', 30000) # NMT_NetSpeed
        open_payload = bytes([0x07]) # NMT_ControlChannelOpen (opcode only)
        
        final_setup_blob = guid_payload + netspeed_payload + open_payload
        
        # We need a master "blob" opcode. Let's try 0x0A (NMT_Join) to wrap them.
        send_handshake_blob(sock, peer, session_key, 0x0A, final_setup_blob)
        logging.info(f"⇠ [4b] Sent final setup burst (GUID, NetSpeed, Open) wrapped in NMT_Join.")
        
        logging.info("✅ Full finalization burst sent. Waiting for client to send NMT_Join...")

         # We need a master "blob" opcode. Let's try 0x0A (NMT_Join) to wrap them.
        send_handshake_blob(sock, peer, session_key, 0x0A, final_setup_blob)
        logging.info(f"⇠ [4b] Sent final setup burst (GUID, NetSpeed, Open) wrapped in NMT_Join.")
        
        logging.info("✅ Full finalization burst sent. Waiting for client to send NMT_Join...")

        # === STEP 5: Client sends the final NMT_Join message ===
        # This confirms it has loaded the map and is spawning the player.
        data, _ = sock.recvfrom(2048)
        iv, ct = data[:16], data[16:];
        join_blob = aes_decrypt(session_key, iv, ct, use_padding=True)

        logging.info("🎉🎉🎉 VICTORY! HANDSHAKE COMPLETE! 🎉🎉🎉")
        logging.info(f"📥 [5] Received final NMT_Join packet (hex): {join_blob.hex()}")
        
        # --- Main Game Loop ---
        while True:
            logging.info("In main game loop. Client is fully connected.")
            time.sleep(10)

    except socket.timeout:
        logging.warning("⌛ TIMEOUT: The client did not respond to one of our packets.")
        logging.warning("Check which step it timed out on to identify the faulty packet.")
    except Exception as e:
        logging.error(f"An error occurred: {e}", exc_info=True)
    finally:
        sock.close()
        logging.info("Server shut down.")

def main():
    parser = argparse.ArgumentParser(description="The Culling - TLS Handshake Server")
    parser.add_argument('--ip', default="127.0.0.1", help="IP to listen on")
    parser.add_argument('--port', type=int, default=7777, help="Port to listen on")
    parser.add_argument('--client-nonce', required=True, help="Client nonce provided by matchmaker")
    parser.add_argument('--server-nonce', required=True, help="Server nonce provided by matchmaker")

    # --- IMPORTANT ---
    # You need to provide the path to your extracted certificate and generated key
    parser.add_argument('--cert', default='certs/gameserver.pem', help="Path to the server certificate file")
    parser.add_argument('--key', default='certs/gameserver.key', help="Path to the server private key file")

    args = parser.parse_args()
    run_server(args.ip, args.port, args.cert, args.key)

if __name__ == "__main__":
    main()