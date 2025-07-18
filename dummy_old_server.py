import socket
import struct
import os
import argparse
import logging
import time
from hashlib import sha1
from Crypto.Cipher import AES
import gc # <--- IMPORT THE GARBAGE COLLECTOR MODULE

# --- Global Helpers ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def derive_key(cn: str, sn: str) -> bytes:
    """Derives the AES session key from client and server nonces."""
    return sha1(sn.encode('ascii') + cn.encode('ascii')).digest()[:16]

# --- AES-CBC for standard NMT packets (generates/expects IV) ---
def aes_decrypt_cbc(s_key: bytes, rx_data: bytes) -> bytes:
    """Decrypts AES-CBC data assuming IV is first 16 bytes. Handles PKCS7 unpadding."""
    if len(rx_data) < 16:
        raise ValueError("Received data too short for AES-CBC decryption (less than 16 bytes IV).")
    iv_val = rx_data[:16]
    ct_val = rx_data[16:]
    
    if len(ct_val) % 16 != 0:
        raise ValueError(f"Ciphertext length ({len(ct_val)}) is not a multiple of 16 bytes. Cannot decrypt CBC.")

    cipher = AES.new(s_key, AES.MODE_CBC, iv_val)
    decrypted = cipher.decrypt(ct_val)
    # PKCS7 Unpadding
    if decrypted:
        pad_len = decrypted[-1]
        if 0 < pad_len <= 16 and len(decrypted) >= pad_len and decrypted[-pad_len:] == bytes([pad_len]) * pad_len:
            return decrypted[:-pad_len]
    return decrypted

def aes_encrypt_cbc(s_key: bytes, tx_payload: bytes) -> bytes:
    """Encrypts AES-CBC payload. Generates IV and prepends it. Applies PKCS7 padding."""
    cipher = AES.new(s_key, AES.MODE_CBC) # IV is generated here
    iv_val = cipher.iv 
    
    # PKCS7 Padding
    pad_len = 16 - (len(tx_payload) % 16)
    padding = bytes([pad_len]) * pad_len
    encrypted_payload = cipher.encrypt(tx_payload + padding)
    
    return iv_val + encrypted_payload # Prepend IV

# --- AES-ECB for small, fixed-size packets (no IV, requires 16-byte blocks) ---
# This is for the 2-byte encrypted probes.
def aes_decrypt_ecb(s_key: bytes, rx_data: bytes) -> bytes:
    """Decrypts AES-ECB data (no IV). Assumes ciphertext is padded to 16 bytes."""
    # The client might be sending exactly 2 bytes encrypted. It must be padded to 16 for AES.
    # Our `aes_encrypt_ecb` will output 16 bytes.
    if len(rx_data) % 16 != 0:
        raise ValueError(f"Ciphertext length ({len(rx_data)}) is not a multiple of 16 bytes for ECB.")

    cipher = AES.new(s_key, AES.MODE_ECB) # No IV for ECB
    decrypted = cipher.decrypt(rx_data)
    
    # PKCS7 Unpadding - might or might not be used here. Let's try it.
    if decrypted:
        pad_len = decrypted[-1]
        if 0 < pad_len <= 16 and len(decrypted) >= pad_len and decrypted[-pad_len:] == bytes([pad_len]) * pad_len:
            return decrypted[:-pad_len]
    return decrypted

def aes_encrypt_ecb(s_key: bytes, tx_payload: bytes) -> bytes:
    """Encrypts AES-ECB payload (no IV). Applies PKCS7 padding to 16-byte blocks."""
    cipher = AES.new(s_key, AES.MODE_ECB) # No IV for ECB
    
    # PKCS7 Padding
    pad_len = 16 - (len(tx_payload) % 16)
    padding = bytes([pad_len]) * pad_len
    encrypted_payload = cipher.encrypt(tx_payload + padding)
    
    return encrypted_payload # No IV to prepend

# --- Build UE4 FString ---
def build_ue4_fstring(s: str) -> bytes:
    """Builds a length-prefixed, null-terminated ASCII string for UE4 networking."""
    encoded_s = s.encode('ascii') + b'\x00'
    length = len(encoded_s); return struct.pack('<i', length) + encoded_s

# --- Send Encrypted NMT Blob (uses CBC for standard packets) ---
def send_encrypted_nmt_blob(sock: socket.socket, peer: tuple, session_key: bytes, control_opcode: int, extra_payload: bytes = b''):
    """Sends a standard NMT packet encrypted with AES-CBC."""
    raw_packet_data = bytes([control_opcode]) + extra_payload
    encrypted_full_data = aes_encrypt_cbc(session_key, raw_packet_data)
    sock.sendto(encrypted_full_data, peer)

# --- Send Encrypted ECB Blob (for the 2-byte probe response) ---
def send_encrypted_ecb_probe_response(sock: socket.socket, peer: tuple, session_key: bytes, payload_byte: bytes):
    """Sends a very small encrypted probe response using AES-ECB (if applicable)."""
    encrypted_data = aes_encrypt_ecb(session_key, payload_byte) # Use ECB
    sock.sendto(encrypted_data, peer)


# --- Main Server Logic ---
def run_server(ip, port, server_nonce_from_matchmaker):
    """
    High-performance version: Disables the Garbage Collector to minimize latency
    during the critical handshake, aiming for consistent connections.
    """
    # =========================================================================
    #  PERFORMANCE OPTIMIZATION: Disable GC
    # =========================================================================
    gc.disable()
    logging.info("[PERFORMANCE] Garbage Collector disabled to minimize latency.")
    # =========================================================================

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    try:
        sock.bind((ip, port))
    except OSError as e:
        logging.error(f"[GAME SERVER] FATAL: Could not bind to port {port}. Error: {e}")
        return
        
    session_key = derive_key(server_nonce_from_matchmaker)
    logging.info(f"[GAME SERVER] UDP Server listening on {ip}:{port}")
    logging.info(f"[GAME SERVER] Session Key Pre-derived: {session_key.hex()}")

    # --- State Machine & Loop Breaker Variables ---
    state = "WAITING_FOR_HANDSHAKE_START"
    peer = None
    challenge_cookie = None
    probes_after_challenge = 0
    PROBE_LIMIT = 10
    sock.settimeout(5)

    # --- THE REST OF THE LOGIC IS IDENTICAL TO OUR LAST ATTEMPT ---
    while state != "SHUTDOWN":
        try:
            data, addr = sock.recvfrom(2048)

            if peer is None: peer = addr
            elif peer != addr: continue

            if state == "WAITING_FOR_HANDSHAKE_START":
                if len(data) in [2, 4]:
                    sock.sendto(b'\x01', peer)
                elif len(data) == 14:
                    logging.info("Received NMT_Hello. Sending NMT_Challenge.")
                    challenge_cookie = os.urandom(4)
                    sock.sendto(challenge_cookie, peer)
                    logging.info(f"Sent NMT_Challenge with cookie: {challenge_cookie.hex()}")
                    state = "WAITING_FOR_CHALLENGE_RESPONSE"
                    logging.info(f"Transitioned to state: {state}")

            elif state == "WAITING_FOR_CHALLENGE_RESPONSE":
                logging.info(f"[{state}] RX {len(data)} bytes: {data.hex()}")
                
                if len(data) == 32:
                    if data[:4] == challenge_cookie:
                        logging.info("GOLDEN PATH: Correct 32-byte response received and cookie matched!")
                        sock.sendto(b'\x01', peer)
                        logging.info("⇠ Sent final ACK. Proceeding to ENCRYPTED mode.")
                        state = "WAITING_FOR_ENCRYPTED_LOGIN"
                    else:
                        logging.error(f"32-byte response with BAD COOKIE. Shutting down.")
                        state = "SHUTDOWN"
                
                elif len(data) in [2, 4]:
                    probes_after_challenge += 1
                    logging.warning(f"[{state}] Received a probe when expecting challenge response. Count: {probes_after_challenge}/{PROBE_LIMIT}")
                    if probes_after_challenge >= PROBE_LIMIT:
                        logging.error("Probe limit reached. Client is stuck. Shutting down.")
                        state = "SHUTDOWN"
                    else:
                        sock.sendto(b'\x01', peer)
                else:
                    logging.warning(f"[{state}] Received unexpected packet length: {len(data)}")


            elif state == "WAITING_FOR_ENCRYPTED_LOGIN":
                logging.info(f"[{state}] RX {len(data)} bytes, attempting decryption...")
                try:
                    decrypted_login = aes_decrypt_cbc(session_key, data)
                    logging.info(f"[ENCRYPTED] Successfully decrypted NMT_Login! Payload: {decrypted_login.hex()}")
                    
                    WELCOME_OPCODE = 0x01
                    MAP_PATH = "/Game/Maps/Jungle"
                    GAME_MODE_PATH = "/Game/Blueprints/GameMode/VictoryGameMode_Solo.VictoryGameMode_Solo_C"
                    
                    map_bytes = build_ue4_fstring(MAP_PATH)
                    gamemode_bytes = build_ue4_fstring(GAME_MODE_PATH)
                    server_nonce_bytes = build_ue4_fstring(server_nonce_from_matchmaker) 
                    welcome_payload = map_bytes + gamemode_bytes + server_nonce_bytes
                    
                    send_encrypted_nmt_blob(sock, peer, session_key, WELCOME_OPCODE, welcome_payload)
                    logging.info("[ENCRYPTED] Sent NMT_Welcome.")
                    
                    send_encrypted_nmt_blob(sock, peer, session_key, 0x06, b'\x01\x00\x00\x00')
                    send_encrypted_nmt_blob(sock, peer, session_key, 0x04, struct.pack('<I', 30000))
                    send_encrypted_nmt_blob(sock, peer, session_key, 0x07)
                    logging.info("[ENCRYPTED] Sent finalization burst (GUID, NetSpeed, Open).")

                    state = "WAITING_FOR_ENCRYPTED_JOIN"
                    logging.info(f"Transitioned to state: {state}")

                except Exception as e:
                    logging.error(f"FAILED to decrypt NMT_Login packet. Raw data: {data.hex()}. Error: {e}")
                    state = "SHUTDOWN"

            elif state == "WAITING_FOR_ENCRYPTED_JOIN":
                logging.info(f"[{state}] RX {len(data)} bytes, attempting decryption...")
                try:
                    decrypted_join = aes_decrypt_cbc(session_key, data)
                    logging.info(f"[ENCRYPTED] Received final NMT_Join: {decrypted_join.hex()}")
                    
                    logging.info("CORE HANDSHAKE FULLY COMPLETE! Entering game loop.")
                    state = "GAME_LOOP"
                    logging.info(f"Transitioned to state: {state}")
                
                except Exception as e:
                    logging.error(f"FAILED to decrypt NMT_Join packet. Raw data: {data.hex()}. Error: {e}")
                    state = "SHUTDOWN"

            elif state == "GAME_LOOP":
                try:
                    decrypted_game_data = aes_decrypt_cbc(session_key, data)
                    logging.info(f"[GAME_LOOP] RX Decrypted Game Data ({len(decrypted_game_data)} bytes): {decrypted_game_data.hex()}")
                except Exception:
                    logging.warning(f"[GAME_LOOP] RX Raw (could not decrypt) Game Data ({len(data)} bytes): {data.hex()}")

        except socket.timeout:
            logging.warning(f"TIMEOUT: No packets received for 30 seconds. State: {state}. Shutting down.")
            state = "SHUTDOWN"
        except Exception as e:
            logging.error(f"An unexpected error occurred in state {state}: {e}", exc_info=True)
            state = "SHUTDOWN"

    logging.info("[GAME SERVER] Server is shutting down.")
    sock.close()
# --- Main entry point ---
def main():
    parser = argparse.ArgumentParser(description="The Culling - Full Handshake Server")
    parser.add_argument('--ip', default="127.0.0.1", help="IP to listen on")
    parser.add_argument('--port', type=int, default=7777, help="Port to listen on")
    parser.add_argument('--server-nonce', required=True, help="Server nonce")
    
    args = parser.parse_args()
    run_server(args.ip, args.port, args.server_nonce)

if __name__ == "__main__":
    main()