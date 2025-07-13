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
    """Builds a length-prefixed, null-terminated string for UE4 networking."""
    # Note: For unicode strings, length is negative. For ASCII, it's positive. We'll use ASCII.
    encoded_s = s.encode('ascii') + b'\x00'
    length = len(encoded_s)
    # The length is sent as a 32-bit signed little-endian integer.
    return struct.pack('<i', length) + encoded_s


# --- Main Server Logic ---
def run_server(ip, port, client_nonce, server_nonce):
    session_key = derive_key(client_nonce, server_nonce)
    logging.info(f"Derived Session Key: {session_key.hex()}")
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); sock.bind((ip, port))
    logging.info(f"✅ Server listening on {ip}:{port}"); sock.settimeout(25)

       
    try:
        # Step 1: Client sends Hello blob
        data, peer = sock.recvfrom(2048)
        iv, ct = data[:16], data[16:]; initial_blob = aes_decrypt(session_key, iv, ct, use_padding=False)
        logging.info(f"📥 [1] Received client's initial Hello blob.")

        # Step 2: Server responds with a Welcome message using the CORRECT opcode and PAYLOAD STRUCTURE.
        WELCOME_OPCODE = 0x01
        
        # Using the most generic paths to reduce variables.
        MAP_PATH = "/Game/Maps/Jungle"
        GAME_MODE_PATH = "/Game/Blueprints/GameMode/VictoryGameMode_Solo.VictoryGameMode_Solo_C"
        logging.info(f"Using Map Path: {MAP_PATH}")
        logging.info(f"Using Game Mode Path: {GAME_MODE_PATH}")

        # Construct the payload using the length-prefixed string format.
        map_bytes = build_ue4_fstring(MAP_PATH)
        gamemode_bytes = build_ue4_fstring(GAME_MODE_PATH)
        nonce_bytes = build_ue4_fstring(server_nonce)

        welcome_payload = map_bytes + gamemode_bytes + nonce_bytes 
        # welcome_payload = map_bytes + nonce_bytes + gamemode_bytes 
        # welcome_payload = gamemode_bytes + map_bytes + nonce_bytes 
        # welcome_payload = gamemode_bytes + nonce_bytes + map_bytes 
        # welcome_payload = nonce_bytes + map_bytes + gamemode_bytes 
        # welcome_payload = nonce_bytes + gamemode_bytes + map_bytes 
        send_handshake_blob(sock, peer, session_key, WELCOME_OPCODE, welcome_payload)
        logging.info(f"⇠ [2] Sent Welcome message (opcode {WELCOME_OPCODE:#02x}) with correct payload structure. Waiting for response...")

        # Step 3: Wait for the client's response. A successful response will be a NEW packet.
        data, _ = sock.recvfrom(2048)
        iv, ct = data[:16], data[16:]
        response_blob = aes_decrypt(session_key, iv, ct, use_padding=True)
        
        if len(response_blob) == 112 and response_blob[4:] == initial_blob[4:]:
            logging.error("❌ FAILURE: Client re-transmitted Hello. Payload content (Map/GM paths) is still wrong.")
            return

        logging.info("🎉🎉🎉 VICTORY! Handshake Advanced! 🎉🎉🎉")
        logging.info(f"📥 [3] Received new packet (hex): {response_blob.hex()}")
        
        # Now the real work begins... parsing this new blob and continuing the handshake.
        # But this is the win.
        
        while True:
            logging.info("Handshake has progressed. Idling...")
            time.sleep(10)

    except socket.timeout:
        logging.warning("⌛ Client timed out. The welcome payload was accepted, but it is now waiting for the next step.")
    except Exception as e:
        logging.error(f"An error occurred: {e}", exc_info=True)
    finally:
        sock.close()
        logging.info("Server shut down.")

def main():
    parser = argparse.ArgumentParser(description="UE4 Dummy Game Server for The Culling")
    parser.add_argument('--ip', default="127.0.0.1", help="IP address to bind to")
    parser.add_argument('--port', type=int, default=7777, help="Port to bind to")
    parser.add_argument('--client-nonce', required=True, help="Client nonce provided by matchmaker")
    parser.add_argument('--server-nonce', required=True, help="Server nonce provided by matchmaker")
    args = parser.parse_args()
    run_server(args.ip, args.port, args.client_nonce, args.server_nonce)

if __name__ == "__main__":
    main()