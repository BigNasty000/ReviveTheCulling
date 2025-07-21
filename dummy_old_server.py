# dummy_old_server.py (v18 - Final Evidence-Based Handshake)
# This version corrects the bug that caused an 11-byte response.
# It sends a 12-byte echo and verifies the 11-byte cookie, matching the evidence.

import socket
import struct
import argparse
import logging
from hashlib import sha1

logging.basicConfig(level=logging.INFO, format='%(asctime)s - [%(levelname)s] - %(message)s')

def derive_key(cn: bytes, sn: str) -> bytes:
    """Derives the 16-byte AES session key."""
    return sha1(sn.encode('ascii') + cn).digest()[:16]

def build_ue4_fstring(s: str) -> bytes:
    """Builds a UE4-style FString (int32 length followed by null-terminated ASCII string)."""
    if not s: return struct.pack('<i', 0)
    encoded_s = s.encode('ascii') + b'\x00'
    return struct.pack('<i', len(encoded_s)) + encoded_s

def apply_pkcs7_padding(payload: bytes) -> bytes:
    """Pads the payload to be a multiple of 16 bytes using PKCS#7."""
    block_size = 16
    padding_len = block_size - (len(payload) % block_size)
    padding = bytes([padding_len]) * padding_len
    padded_payload = payload + padding
    logging.info(f"Plaintext Welcome size: {len(payload)}, Padded to: {len(padded_payload)}")
    return padded_payload

def run_server(ip, port, server_nonce_from_matchmaker):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((ip, port))
    logging.info(f"[GAME SERVER] v18 (Final Handshake) listening on {ip}:{port}")

    state = "WAITING_FOR_HELLO"
    peer = None
    challenge_cookie_to_verify = None
    sock.settimeout(300)

    while state != "SHUTDOWN":
        try:
            data, addr = sock.recvfrom(2048)
            if peer is None: peer = addr
            elif peer != addr: continue

            if state == "WAITING_FOR_HELLO":
                if len(data) >= 14 and len(data) < 32:
                    logging.info(f"✓ Received NMT_Hello: {data.hex()}")
                    
                    # THE FIX: The response MUST be the last 12 bytes of the Hello packet.
                    challenge_response = data[2:]
                    
                    # As proven by the successful capture, the cookie for the next step is the first 11 of those 12 bytes.
                    challenge_cookie_to_verify = data[2:-1]
                    
                    # Ensure we are sending 12 bytes.
                    if len(challenge_response) != 12:
                        logging.error(f"FATAL: Sliced challenge is not 12 bytes! Is {len(challenge_response)}. Aborting.")
                        state = "SHUTDOWN"
                        continue

                    sock.sendto(challenge_response, peer)
                    logging.info(f"⇢ Sent NMT_Challenge (12-byte ECHO): {challenge_response.hex()}")
                    
                    state = "WAITING_FOR_LOGIN"
                    logging.info(f"Transitioned to state: {state}")
                else:
                    logging.info(f"⇠ Got {len(data)}-byte probe. Sending stateless ACK (0x01).")
                    sock.sendto(b'\x01', peer)

            elif state == "WAITING_FOR_LOGIN":
                if len(data) == 32 and data[2:13] == challenge_cookie_to_verify:
                    logging.info(f"✓ Received NMT_Login with matching cookie: {data.hex()}")
                    
                    client_nonce_bytes = data[14:]
                    logging.info(f"✓ Parsed Client Nonce: {client_nonce_bytes.hex()}")
                    
                    session_key = derive_key(client_nonce_bytes, server_nonce_from_matchmaker)
                    logging.info(f"✓✓✓ AES Session Key Derived: {session_key.hex()} ✓✓✓")
                    
                    map_path = "/Game/Maps/Jungle_P"
                    welcome_payload = (
                        b'\x01' + # NMT_Welcome packet type
                        build_ue4_fstring(map_path) +
                        build_ue4_fstring("/Game/Blueprints/GameMode/VictoryGameMode.VictoryGameMode_C") +
                        build_ue4_fstring(server_nonce_from_matchmaker)
                    )
                    
                    padded_welcome_packet = apply_pkcs7_padding(welcome_payload)
                    sock.sendto(padded_welcome_packet, peer)
                    logging.info(f"⇢ Sent PADDED NMT_Welcome.")
                    
                    state = "GAME_LOOP"
                    logging.info(f"Handshake complete. Transitioned to state: {state}")
                else:
                    logging.warning(f"[{state}] Received unexpected packet or bad cookie. Resetting for new Hello. Data: {data.hex()}")
                    state = "WAITING_FOR_HELLO" # Reset state to allow client to retry

            elif state == "GAME_LOOP":
                logging.info(f"[GAME_LOOP] Received {len(data)} bytes.")

        except socket.timeout:
            logging.warning(f"TIMEOUT in state {state}. Shutting down.")
            state = "SHUTDOWN"
        except Exception as e:
            logging.error(f"An error occurred: {e}", exc_info=True)
            state = "SHUTDOWN"

    logging.info("[GAME SERVER] Shutting down.")
    sock.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--ip', default="127.0.0.1")
    parser.add_argument('--port', type=int, default=7777)
    parser.add_argument('--server-nonce', required=True)
    args = parser.parse_args()
    run_server(args.ip, args.port, args.server_nonce)