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
    # The length is a 32-bit signed integer (little-endian)
    return struct.pack('<i', len(s_with_null)) + s_with_null.encode('ascii')

def run_definitive_handshake_server(ip, port, server_nonce):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.bind((ip, port))
    except Exception as e:
        logging.error(f"!!! FAILED TO BIND TO SOCKET {ip}:{port} - {e}")
        return
    logging.info(f"✅ Definitive Handshake Server listening on {ip}:{port}")
    sock.settimeout(20)

    try:
        # === Step 0: Receive NMT_Hello (Custom ID 4) ===
        logging.info("STATE 0: WAITING FOR NMT_Hello (Custom ID 4)")
        hello_data, client_peer = sock.recvfrom(2048)
        
        if len(hello_data) == 25 and hello_data[16:20] == struct.pack('<I', 4):
            logging.info(f"Received VALID NMT_Hello from {client_peer}")
        else:
            logging.error(f"Received UNEXPECTED initial packet. Not a valid Hello. Data: {hello_data.hex()}")
            crash_packet = struct.pack('<B', 1) # '<B' is one unsigned byte. Message ID is 3.
            crash_packet += build_ue_string(server_nonce)
        
            sock.sendto(crash_packet, client_peer)
            return

        # === Step 1: Send NMT_Challenge (Custom ID 3) ===
        # The packet MUST start with the 1-byte control ID.
        # The payload will be the server nonce, formatted as a standard UE string.
        logging.info("STATE 1: SENDING NMT_Challenge (Custom ID 3) with UE String nonce")
        
        challenge_packet = struct.pack('<B', 3) # '<B' is one unsigned byte. Message ID is 3.
        challenge_packet += build_ue_string(server_nonce)
        
        sock.sendto(challenge_packet, client_peer)
        logging.info(f"SENT Challenge Packet. Full Data: {challenge_packet.hex()}")

        # === Step 2: Receive NMT_Login (Custom ID 5) ===
        logging.info("STATE 2: WAITING FOR NMT_Login (Custom ID 5)")
        login_data, _ = sock.recvfrom(2048)
        
        packet_id = struct.unpack_from('<B', login_data, 0)[0]
        if packet_id == 5:
            logging.info("Received VALID NMT_Login (ID 5)")
            # This packet's payload is likely just UE strings, let's try to parse it.
            # We don't have a parser for its key-value format, so let's just log it.
            logging.info(f"Full NMT_Login payload: {login_data.hex()}")
        else:
            logging.error(f"Expected NMT_Login (ID 5) but got ID {packet_id}. DATA: {login_data.hex()}")
            crash_packet = struct.pack('<B', 1) # '<B' is one unsigned byte. Message ID is 3.
            crash_packet += build_ue_string(server_nonce)
        
            sock.sendto(crash_packet, client_peer)
            return

        # === Step 3: Send NMT_Welcome (Custom ID 1) ===
        logging.info("STATE 3: SENDING NMT_Welcome (Custom ID 1)")
        
        welcome_packet = struct.pack('<B', 1) # Message ID for Welcome is 1
        # Payload is MapURL + RedirectURL as UE strings
        welcome_packet += build_ue_string("/Game/Maps/Island?game=TheCulling") # A more standard map path
        welcome_packet += build_ue_string("") # Empty redirect URL

        sock.sendto(welcome_packet, client_peer)
        logging.info(f"SENT Welcome Packet. Full Data: {welcome_packet.hex()}")
        
        # === Step 4 & 5: Wait for Netspeed and Join ===
        logging.info("STATE 4/5: WAITING for Netspeed and Join to confirm connection...")
        # We can just wait for any two packets to confirm the client is alive.
        netspeed_data, _ = sock.recvfrom(2048)
        logging.info(f"Received post-welcome packet 1 (Netspeed?): {netspeed_data.hex()}")
        join_data, _ = sock.recvfrom(2048)
        logging.info(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        logging.info(f"!!! Received post-welcome packet 2 (Join?): {join_data.hex()}")
        logging.info(f"!!! CONNECTION SHOULD BE ESTABLISHED !!!")
        logging.info(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")

        while True:
            time.sleep(1)

    except socket.timeout:
        logging.warning("Server timed out. Check logs to see which stage failed.")
    except Exception as e:
        logging.error(f"An error occurred: {e}", exc_info=True)
    finally:
        logging.info("Server shutting down.")
        sock.close()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    parser = argparse.ArgumentParser(description="The Culling - Definitive Handshake Server")
    parser.add_argument('--ip', default="127.0.0.1", help="IP to listen on")
    parser.add_argument('--port', type=int, default=7777, help="Port to listen on")
    parser.add_argument('--server-nonce', required=True, help="Server nonce from matchmaker")
    args = parser.parse_args()
    run_definitive_handshake_server(args.ip, args.port, args.server_nonce)