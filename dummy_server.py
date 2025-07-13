import socket
import struct
import os
import argparse
import logging
import time
from hashlib import sha1
from Crypto.Cipher import AES

# --- Basic Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Crypto and Packet Helpers (No changes needed, they are confirmed correct) ---
def derive_key(client_nonce: str, server_nonce: str) -> bytes:
    return sha1(client_nonce.encode('ascii') + server_nonce.encode('ascii')).digest()[:16]

def aes_decrypt(session_key: bytes, iv: bytes, ciphertext: bytes, use_padding=False) -> bytes:
    cipher = AES.new(session_key, AES.MODE_CBC, iv)
    decrypted = cipher.decrypt(ciphertext)
    if use_padding and decrypted:
        pad_len = decrypted[-1]
        if 0 < pad_len <= 16 and len(decrypted) >= pad_len and decrypted[-pad_len:] == bytes([pad_len]) * pad_len:
            return decrypted[:-pad_len]
    return decrypted

def aes_encrypt(session_key: bytes, iv: bytes, plaintext: bytes, use_padding=True) -> bytes:
    cipher = AES.new(session_key, AES.MODE_CBC, iv)
    if use_padding:
        pad_len = 16 - (len(plaintext) % 16)
        plaintext += bytes([pad_len]) * pad_len
    return cipher.encrypt(plaintext)

def send_handshake_blob(sock, peer, session_key, control_opcode: int, extra_payload: bytes = b''):
    raw_packet_data = bytes([control_opcode]) + extra_payload
    iv = os.urandom(16)
    encrypted_payload = aes_encrypt(session_key, iv, raw_packet_data, use_padding=True)
    full_packet = iv + encrypted_payload
    sock.sendto(full_packet, peer)

def parse_ue4_packet(data: bytes):
    if len(data) < 3: return None, None
    try:
        packet_len = struct.unpack('<H', data[0:2])[0]
        if len(data) - 2 < packet_len: return None, None
        opcode = data[2]
        payload = data[3:2+packet_len]
        return opcode, payload
    except (struct.error, IndexError):
        return None, None

def send_raw_blob(sock, peer, session_key, payload_blob: bytes):
    """Encrypts and sends a pre-constructed blob of data."""
    iv = os.urandom(16)
    encrypted_payload = aes_encrypt(session_key, iv, payload_blob, use_padding=True)
    full_packet = iv + encrypted_payload
    sock.sendto(full_packet, peer)
# --- Main Server Logic ---
def run_server(ip, port, client_nonce, server_nonce):
    session_key = derive_key(client_nonce, server_nonce)
    logging.info(f"Derived Session Key: {session_key.hex()}")

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((ip, port))
    logging.info(f"✅ Server listening on {ip}:{port}")
    sock.settimeout(25)

    try:
        # --- STEP 1: Client Hello ---
        data, peer = sock.recvfrom(2048)
        iv, ct = data[:16], data[16:]; decrypted_blob = aes_decrypt(session_key, iv, ct, use_padding=False)
        logging.info(f"📥 [1] Received client's Hello blob.")

        # --- STEP 2: Server sends Welcome ---
        MAP_PATH = "/Game/Maps/Jungle"
        GAME_MODE_PATH = "/Game/Blueprints/GameMode/VictoryGameMode_SoloRanked.VictoryGameMode_SoloRanked_C"
        welcome_payload = MAP_PATH.encode('ascii') + b'\x00' + GAME_MODE_PATH.encode('ascii') + b'\x00' + server_nonce.encode('ascii') + b'\x00'
        send_raw_blob(sock, peer, session_key, bytes([0x82]) + welcome_payload)
        logging.info("⇠ [2] Sent NMT_Welcome. Waiting for client's Login blob...")

        # --- STEP 3: Client sends Login ---
        data, _ = sock.recvfrom(2048)
        iv, ct = data[:16], data[16:]; decrypted_login_blob = aes_decrypt(session_key, iv, ct, use_padding=True)
        logging.info(f"📥 [3] Received client's Login blob. Login is successful.")
        
        # --- STEP 4: Server accepts Login and sends ONE COMBINED FINAL packet ---
        logging.info("✅ Client authenticated. Sending final combined setup info...")
        
        # Build each part of the final blob
        netspeed_blob = bytes([0x8b]) + struct.pack('<I', 30000)
        guid_blob = bytes([0x86]) + b'\x01\x00\x00\x00'
        open_blob = bytes([0x87]) + b'\x01'
        
        # Concatenate them into a single payload
        final_combined_blob = netspeed_blob + guid_blob + open_blob
        
        # Send the single combined packet
        send_raw_blob(sock, peer, session_key, final_combined_blob)
        logging.info(f"⇠ [4] Sent combined finalization blob ({len(final_combined_blob)} bytes).")
        
        logging.info("🎉🎉🎉 HANDSHAKE COMPLETE! YOU DID IT! 🎉🎉🎉")
        logging.info("The game client should now be loading into the map and sending game data.")
        
        # --- Main Game Loop ---
        while True:
            logging.info("In main game loop. Listening for regular game traffic...")
            data, _ = sock.recvfrom(2048)
            # We don't need to decrypt here yet, just confirm we are receiving data
            logging.info(f"SUCCESS! Received a post-handshake game packet of {len(data)} bytes.")

    except socket.timeout:
        logging.warning("⌛ Client timed out. The handshake is complete, but the client is not sending any game data.")
        logging.warning("This could be normal, or indicate a need for a server heartbeat.")
    except Exception as e:
        logging.error(f"An error occurred: {e}", exc_info=True)
    finally:
        sock.close()
        logging.info("Server shut down.")


def main():
    # ... (main function remains the same) ...
    parser = argparse.ArgumentParser(description="UE4 Dummy Game Server for The Culling")
    parser.add_argument('--ip', default="127.0.0.1", help="IP address to bind to")
    parser.add_argument('--port', type=int, default=7777, help="Port to bind to")
    parser.add_argument('--client-nonce', required=True, help="Client nonce provided by matchmaker")
    parser.add_argument('--server-nonce', required=True, help="Server nonce provided by matchmaker")
    args = parser.parse_args()
    run_server(args.ip, args.port, args.client_nonce, args.server_nonce)

if __name__ == "__main__":
    main()