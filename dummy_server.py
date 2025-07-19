# In your dummy_server.py

import socket
import struct
import logging
import argparse
import time
import uuid

def build_ue_string(s: str) -> bytes:
    """Encodes a string in the format Unreal Engine expects: length + null-terminated ASCII."""
    if not s:
        return struct.pack('<i', 0)
    s_with_null = s + '\x00'
    return struct.pack('<i', len(s_with_null)) + s_with_null.encode('ascii')

def run_handshake_server(ip, port, server_nonce):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((ip, port))
    logging.info(f"✅ Handshake Server v6 (Bit-Flip) listening on {ip}:{port}")
    sock.settimeout(15)

    try:
        # 1. Wait for the initial Client Hello
        data, client_peer = sock.recvfrom(2048)
        logging.info(f"Received initial Hello from {client_peer}. Data: {data.hex()}")

        # 2. Build a PURE NMT_Challenge packet.
        challenge_packet = b'\x02' + build_ue_string(server_nonce)

        # --- THE KEY: Convert to a mutable type and overwrite the LAST byte ---
        challenge_packet = bytearray(challenge_packet)
        challenge_packet[-1] = 0x01 # Flip the final null terminator to a 1.

        logging.info(f"Sending BIT-FLIPPED NMT_Challenge. DATA: {challenge_packet.hex()}")
        sock.sendto(challenge_packet, client_peer)

        # 3. Wait for the Client's NMT_Login response
        logging.info("Waiting for NMT_Login from client...")
        login_data, _ = sock.recvfrom(2048)
        logging.info(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        logging.info(f"!!!!!!!!! RECEIVED NMT_LOGIN RESPONSE !!!!!!!!!")
        logging.info(f"!!!!!!!!! Data: {login_data.hex()} !!!!!!!!!!!")
        logging.info(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")

        # 4. Send the NMT_Welcome packet, also with a bit-flipped terminator
        welcome_packet = b'\x04' # NMT_Welcome ID
        welcome_packet += build_ue_string("Jungle")
        welcome_packet += build_ue_string("") # Empty redirect URL
        welcome_packet += build_ue_string(server_nonce)

        # --- Also apply the bit-flip here ---
        welcome_packet = bytearray(welcome_packet)
        welcome_packet[-1] = 0x01

        logging.info(f"Sending BIT-FLIPPED NMT_Welcome. DATA: {welcome_packet.hex()}")
        sock.sendto(welcome_packet, client_peer)
        
        logging.info("Handshake complete. Client may be loading the map...")
        # sock.sendto(b'\x10', client_peer)

        while True:
            data, _ = sock.recvfrom(2048)
            logging.info(f"Received post-handshake data: {data.hex()}")

    except socket.timeout:
        logging.warning("Server timed out waiting for client.")
    except Exception as e:
        logging.error(f"Server error: {e}", exc_info=True)
    finally:
        sock.close()

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    parser = argparse.ArgumentParser(description="The Culling - Definitive Handshake Server")
    parser.add_argument('--ip', default="127.0.0.1", help="IP to listen on")
    parser.add_argument('--port', type=int, default=7777, help="Port to listen on")
    parser.add_argument('--server-nonce', required=True, help="Server nonce from matchmaker")
    args = parser.parse_args()
    run_handshake_server(args.ip, args.port, args.server_nonce)