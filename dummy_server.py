# final_dummy_server_v3.py
import socket
import logging
import argparse
import time
import struct

# ===================================================================
#                      CONFIGURATION
# ===================================================================
IP = "127.0.0.1"
PORT = 7777
logging.basicConfig(level=logging.INFO, format='%(asctime)s - [SERVER] - %(levelname)s - %(message)s')

# ===================================================================
#                        HELPER FUNCTIONS
# ===================================================================

def create_ue_string_payload(text: str) -> str:
    """
    Creates a hex string payload for a standard UE FString.
    It consists of a 32-bit signed little-endian length, followed by
    the UTF-8 encoded string, including a null terminator.
    """
    text_with_null = text + '\x00'
    length = len(text_with_null)
    length_bytes = struct.pack('<i', length)
    string_bytes = text_with_null.encode('utf-8')
    return (length_bytes + string_bytes).hex()

# ===================================================================
#                            MAIN SERVER
# ===================================================================

def run_server(server_nonce_str: str):
    """
    Runs the dummy server, performing the full handshake flow including the
    final NMT_Welcome response.
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((IP, PORT))
    logging.info(f"Definitive Handshake Server v3 listening on {IP}:{PORT}")

    try:
        # === Stage 1: Receive initial client packet (NMT_Hello) ===
        client_hello, client_addr = sock.recvfrom(2048)
        logging.info(f"Received Hello from {client_addr}.")

        # === Stage 2: Send the challenge response ===
        # This is your proven [4:29] slice. DO NOT CHANGE.
        challenge_packet = client_hello[4:29]
        sock.sendto(challenge_packet, client_addr)
        logging.info("Sent Challenge.")

        # === Handshake Loop: Wait for Login, Acknowledge, then wait for Join ===
        # This loop will run until the handshake is complete or the client disconnects.
        while True:
            # Wait for any packet from the client
            packet, client_addr = sock.recvfrom(2048)

            # --- If it's the NMT_Login packet (0f, 128 bytes) ---
            if packet.startswith(b'\x0f'):
                logging.info("Received NMT_Login (0f packet).")
                
                # Respond with your proven slice to acknowledge the login. DO NOT CHANGE.
                login_ack_packet = packet[5:19]
                sock.sendto(login_ack_packet, client_addr)
                logging.info(f"Sent Login Acknowledgement.")
                continue # Go back to waiting for the next packet

            # --- If it's the NMT_Join packet (1b) ---
            # This is the client's response to our successful login acknowledgement.
            if packet.startswith(b'\x1b'):
                logging.info(f"Received NMT_Join (1b packet). Client is now ready for Welcome!")

                # It's time to send the final payload and break the loop.
                # === Stage 6: Send the FINAL NMT_Welcome Packet ===
                bunch_header_hex = "01"  # Control Bunch
                nmt_welcome_type = "02"  # NMT_Welcome

                map_url = "/Game/Maps/Jungle/Jungle_P"
                map_url_payload = create_ue_string_payload(map_url)
                
                game_mode_url = "/Game/Blueprints/GameMode/VictoryGameMode.VictoryGameMode_C"
                game_mode_payload = create_ue_string_payload(game_mode_url)

                payload = create_ue_string_payload(f"Jungle_P?bEnableBots=true?servernonce={server_nonce_str}?game={game_mode_url}")
                # TODO: Replace these with real values parsed from the login packet
                # and provided by the lobby server. For now, placeholders are fine for debugging.
                client_nonce_placeholder = 0xDEADBEEF
                client_nonce_payload = struct.pack('<I', client_nonce_placeholder).hex()
                server_nonce_placeholder = 0x12345678
                server_nonce_payload = struct.pack('<I', server_nonce_placeholder).hex()

                welcome_hex_payload = (
                    bunch_header_hex +
                    nmt_welcome_type +
                    payload                )
                
                welcome_packet = bytes.fromhex(welcome_hex_payload)
                sock.sendto(welcome_packet, client_addr)
                
                logging.info("="*50)
                logging.info("SENT FINAL NMT_WELCOME PACKET")
                logging.info(f"Packet Length: {len(welcome_packet)} bytes")
                logging.info("="*50)
                
                # The handshake is complete. Break the loop and go into an idle state.
                break

            # If it's neither Login nor Join, just log it for now.
            # This will catch the 112-byte keep-alive packets.
            logging.debug(f"Received unhandled packet (size: {len(packet)}). Waiting for Login or Join.")


        logging.info("Handshake complete. Server is now idle. Check the game client!")
        while True:
            # You can add logic here to handle in-game packets if you want.
            time.sleep(10)

    except socket.timeout:
        logging.warning("Server timed out.")
    except Exception as e:
        logging.error(f"Server error: {e}", exc_info=True)
    finally:
        sock.close()
        logging.info("Server shut down.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="The Culling - Definitive Handshake Server v3")
    parser.add_argument('--server-nonce', required=True, help="Server nonce (for future use)")
    args = parser.parse_args()
    run_server(args.server_nonce)