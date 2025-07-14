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
    logging.info(f"✅ Server listening on {ip}:{port}"); sock.settimeout(10)

    try:
        # === STEP 1: Client sends NMT_Hello ===
        data, peer = sock.recvfrom(2048)
        iv, ct = data[:16], data[16:]; initial_blob = aes_decrypt(session_key, iv, ct, use_padding=False)
        logging.info(f"📥 [1] Received client's Hello blob.")

        # === STEP 2: Server sends NMT_Challenge with the CORRECT payload ===
        # The payload is NOT random. It must be the server_nonce so the client can verify it.
        # We will send it as a length-prefixed string, as that is the UE4 standard.
        CHALLENGE_OPCODE = 0x03
        
        challenge_payload = build_ue4_fstring(server_nonce)
        
        logging.info(f"Sending NMT_Challenge with server_nonce: {server_nonce}")
        send_handshake_blob(sock, peer, session_key, CHALLENGE_OPCODE, challenge_payload)
        logging.info("⇠ [2] Sent definitive NMT_Challenge. Waiting for client's NMT_Login...")

        # === STEP 3: Client should now send NMT_Login ===
        data, _ = sock.recvfrom(2048)
        iv, ct = data[:16], data[16:];
        login_blob = aes_decrypt(session_key, iv, ct, use_padding=True)
        
        if len(login_blob) > 0 and login_blob == initial_blob:
             logging.error("❌ FAILURE: Client re-transmitted Hello. The Challenge was rejected.")
             return
        
        logging.info("✅✅✅ SUCCESS! Client accepted the Challenge and sent a Login packet! ✅✅✅")
        logging.info(f"📥 [3] Received Login Packet (hex): {login_blob.hex()}")
        
        # Now we would continue with the NMT_Welcome, etc.
        # Getting here is the victory.
        
    except socket.timeout:
        logging.warning("⌛ TIMEOUT: The client did not respond to our Challenge.")
        logging.warning("This means the Challenge payload structure is still wrong (e.g., needs a build ID), or the key derivation is non-standard.")
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