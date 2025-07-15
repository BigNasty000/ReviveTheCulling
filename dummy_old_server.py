import socket
import struct
import os
import argparse
import logging
import time
from hashlib import sha1
from Crypto.Cipher import AES

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
def run_server(ip, port, client_nonce, server_nonce):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    session_key = derive_key(client_nonce, server_nonce)
    try:
        sock.bind((ip, port))
    except OSError as e:
        logging.error("[GAME SERVER]: "+f"FATAL: Could not bind to port {port}. Error: {e}")
        return
    logging.error("[GAME SERVER]: "+f"✅ Simple UDP Server listening on {ip}:{port} for handshake.")
    sock.settimeout(5) 

    try:
        # === STAGE 1: UNENCRYPTED PROBE/DISCOVERY PHASE ===
        
        # Step 1: Client sends 1x Len=2 probe
        logging.error("[GAME SERVER]: "+"⏳ Waiting for initial client probe (Len=2)...")
        data, peer = sock.recvfrom(2048)
        logging.error("[GAME SERVER]: "+f"📥 [1] Received packet (Length: {len(data)} bytes, Hex: {data.hex()})")
        if len(data) != 2: logging.error("[GAME SERVER]: "+f"❌ ERROR: Expected 2-byte probe. Got {len(data)}. Raw: {data.hex()}"); return
        
        # Step 2: Server responds to the probe (Len=1)
        response_to_probe = b'\x01' 
        sock.sendto(response_to_probe, peer)
        logging.error("[GAME SERVER]: "+f"⇠ [2] Sent probe response. Waiting for 2x Len=4 packets...")

        # Step 3: Client sends 2x Len=4 packets
        for i in range(2):
            data, _ = sock.recvfrom(2048)
            logging.error("[GAME SERVER]: "+f"📥 [3.{i+1}] Received packet (Length: {len(data)} bytes, Hex: {data.hex()})")
            if len(data) != 4: logging.error("[GAME SERVER]: "+f"❌ ERROR: Expected 4-byte packet. Got {len(data)}. Raw: {data.hex()}"); return

            # Step 4: Server responds to each 4-byte packet with a 1-byte ACK
            response_to_4byte_packet = b'\x01'
            sock.sendto(response_to_4byte_packet, peer)
            logging.error("[GAME SERVER]: "+f"⇠ [4.{i+1}] Sent response to 4-byte packet.")

        # Step 5: Client sends 1x Len=2 ACK
        logging.error("[GAME SERVER]: "+"⏳ Waiting for Len=2 ACK after 4-byte packets...")
        data, _ = sock.recvfrom(2048)
        logging.error("[GAME SERVER]: "+f"📥 [5] Received packet (Length: {len(data)} bytes, Hex: {data.hex()})")
        if len(data) != 2: logging.error("[GAME SERVER]: "+f"❌ ERROR: Expected 2-byte ACK. Got {len(data)}. Raw: {data.hex()}"); return

        # Step 6: Server responds to Len=2 ACK with a 1-byte ACK
        response_to_2byte_ack = b'\x01'
        sock.sendto(response_to_2byte_ack, peer)
        logging.error("[GAME SERVER]: "+"⇠ [6] Sent response to 2-byte ACK.")

        # Step 7: Client sends 1x Len=14 probe
        logging.error("[GAME SERVER]: "+"⏳ Waiting for Len=14 probe...")
        data, peer = sock.recvfrom(2048)
        logging.error("[GAME SERVER]: "+f"📥 [7] Received packet (Length: {len(data)} bytes, Hex: {data.hex()})")
        if len(data) != 14: logging.error("[GAME SERVER]: "+f"❌ ERROR: Expected 14-byte probe. Got {len(data)}. Raw: {data.hex()}"); return

        # 1.  parse the nonce
        client_nonce = data[1:9]          # 8 bytes after opcode
        server_nonce = os.urandom(8)      # make your own 8-byte nonce

        # 2.  send the real 4-byte challenge
        ts = int(time.time()) & 0xFFFFFF  # 3-byte timestamp
        seq = data[9]                     # last byte in 0x5D is sequence
        cookie = struct.pack('<I', (ts<<8) | seq)  # UE4 format
        sock.sendto(cookie, peer)

        # 8. Wait for the 8-byte ChallengeResponse -------------------------------
        data, _ = sock.recvfrom(2048)
        # if len(data) != 8 or data[:4] != cookie:
        #     logging.error("[GAME SERVER]: "+"Bad ChallengeResponse"); return
        logging.error("[GAME SERVER]: "+"✔ ChallengeResponse ok")

        # 9. Finalise the stateless phase – 1-byte ChallengeAck ------------------
        sock.sendto(b'\x01', peer)

        # 10.   *Now* derive the AES key and switch to encrypted traffic
        # session_key = sha1(server_nonce + client_nonce).digest()[:16]
        logging.error("[GAME SERVER]: "+"Derived AES key %s", session_key.hex())

        # 11. Expect the 32-byte AES-CBC ClientHello next ------------------------
        data, _ = sock.recvfrom(2048)
        if len(data) != 32:
            logging.error("[GAME SERVER]: "+"Expected 32-byte ClientHello"); return
        client_hello = aes_decrypt_cbc(session_key, data)
        logging.error("[GAME SERVER]: "+"ClientHello opcode %02x", client_hello[0])
            
        try:
            decrypted_probe_blob = aes_decrypt_ecb(session_key, data) # Decrypt using ECB
            logging.error("[GAME SERVER]: "+f"✅ Decrypted 2-byte probe: {decrypted_probe_blob.hex()}")
            
            # Step 10: Server responds to the 2-byte encrypted probe (padded to 16 for ECB).
            response_to_encrypted_probe = b'\x01' # Payload
            send_encrypted_ecb_probe_response(sock, peer, session_key, response_to_encrypted_probe) # Encrypt using ECB
            logging.error("[GAME SERVER]: "+f"⇠ [10] Sent encrypted probe response. Waiting for AES ClientHello Record...")

            # Step 11: Client sends the AES-encrypted ClientHello Record (Len=32)
            logging.error("[GAME SERVER]: "+"⏳ Waiting for AES-encrypted ClientHello Record (Len=32)...")
            data, _ = sock.recvfrom(2048)
            logging.error("[GAME SERVER]: "+f"📥 [11] Received encrypted ClientHello Record (Length: {len(data)} bytes).")
            
            if len(data) != 32: # Now expecting 32 bytes for ClientHello Record
                logging.error("[GAME SERVER]: "+f"❌ ERROR: Expected 32-byte encrypted ClientHello Record, got {len(data)}. Raw: {data.hex()}")
                return
                
            decrypted_client_hello_record = aes_decrypt_cbc(session_key, data) # Decrypt using CBC
            logging.error("[GAME SERVER]: "+f"✅✅✅ CLIENTHELLO DECRYPTED! Decrypted blob (hex): {decrypted_client_hello_record.hex()}")
            
            # --- Continue the AES Encrypted NMT Handshake ---
            # As per UE4 documentation: ClientHello -> Challenge -> Login -> Welcome -> Join

            # Step 12: Server sends NMT_Challenge
            CHALLENGE_OPCODE = 0x03
            challenge_payload = build_ue4_fstring(server_nonce)
            send_encrypted_nmt_blob(sock, peer, session_key, CHALLENGE_OPCODE, challenge_payload) # Use CBC
            logging.error("[GAME SERVER]: "+"⇠ [12] Sent definitive NMT_Challenge. Waiting for client's NMT_Login...")

            # Step 13: Client responds with NMT_Login
            data, _ = sock.recvfrom(2048)
            if len(data) < 16: logging.error("[GAME SERVER]: "+f"❌ ERROR: Too short for NMT_Login. Raw: {data.hex()}"); return
            decrypted_login_blob = aes_decrypt_cbc(session_key, data)
            
            logging.error("[GAME SERVER]: "+"✅✅✅ SUCCESS: Received client's NMT_Login packet! ✅✅✅")
            logging.error("[GAME SERVER]: "+f"📥 [13] Login Packet is {len(decrypted_login_blob)} bytes long.")

            # Step 14: Server sends the "You're In" Finalization Burst
            WELCOME_OPCODE = 0x01
            MAP_PATH = "/Game/Maps/Jungle"
            GAME_MODE_PATH = "/Game/Blueprints/GameMode/VictoryGameMode_Solo.VictoryGameMode_Solo_C"
            
            map_bytes = build_ue4_fstring(MAP_PATH)
            gamemode_bytes = build_ue4_fstring(GAME_MODE_PATH)
            nonce_bytes = build_ue4_fstring(server_nonce) 
            welcome_payload = map_bytes + gamemode_bytes + nonce_bytes
            send_encrypted_nmt_blob(sock, peer, session_key, WELCOME_OPCODE, welcome_payload) # Use CBC
            logging.error("[GAME SERVER]: "+"⇠ [14a] Sent NMT_Welcome with map info.")
            
            guid_payload = bytes([0x06]) + b'\x01\x00\x00\x00' # NMT_AssignGUID
            netspeed_payload = bytes([0x04]) + struct.pack('<I', 30000) # NMT_NetSpeed
            open_payload = bytes([0x07]) # NMT_ControlChannelOpen (opcode only)
            
            send_encrypted_nmt_blob(sock, peer, session_key, 0x06, guid_payload) # NMT_AssignGUID
            send_encrypted_nmt_blob(sock, peer, session_key, 0x04, netspeed_payload) # NMT_NetSpeed
            send_encrypted_nmt_blob(sock, peer, session_key, 0x07, open_payload) # NMT_ControlChannelOpen
            
            logging.error("[GAME SERVER]: "+"✅ Full finalization burst sent. Waiting for client to send NMT_Join...")

            # Step 15: Client sends the final NMT_Join message
            data, _ = sock.recvfrom(2048)
            if len(data) < 16: logging.error("[GAME SERVER]: "+f"❌ ERROR: Too short for final NMT_Join. Raw: {data.hex()}"); return
            decrypted_join_blob = aes_decrypt_cbc(session_key, data)

            logging.error("[GAME SERVER]: "+"🎉🎉🎉 CORE HANDSHAKE COMPLETE! 🎉🎉🎉")
            logging.error("[GAME SERVER]: "+f"📥 [15] Received final NMT_Join packet (hex): {decrypted_join_blob.hex()}")
            
            # --- Main Game Loop ---
            while True:
                logging.error("[GAME SERVER]: "+"In main game loop. Client is fully connected. Waiting for game data...")
                data, _ = sock.recvfrom(2048) # Keep receiving client heartbeats/input
                logging.error("[GAME SERVER]: "+f"Received game data ({len(data)} bytes): {data.hex()}")
                time.sleep(1) # Prevent busy loop

        except Exception as aes_e:
            logging.error("[GAME SERVER]: "+f"❌ ERROR: AES Handshake stage failed: {aes_e}", exc_info=True)
            return

    except socket.timeout:
        logging.warning("⌛ TIMEOUT: Client did not respond as expected at this stage.")
    except Exception as e:
        logging.error("[GAME SERVER]: "+f"An unexpected error occurred: {e}", exc_info=True)
    finally:
        logging.error("[GAME SERVER]: "+"Server shutting down.")
        sock.close()

# --- Main entry point ---
def main():
    parser = argparse.ArgumentParser(description="The Culling - Full Handshake Server")
    parser.add_argument('--ip', default="127.0.0.1", help="IP to listen on")
    parser.add_argument('--port', type=int, default=7777, help="Port to listen on")
    parser.add_argument('--client-nonce', required=True, help="Client nonce")
    parser.add_argument('--server-nonce', required=True, help="Server nonce")
    
    args = parser.parse_args()
    run_server(args.ip, args.port, args.client_nonce, args.server_nonce)

if __name__ == "__main__":
    main()