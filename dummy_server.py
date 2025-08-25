import socket
import logging
import struct

# ===================================================================
#                      CONFIGURATION
# ===================================================================
IP = "127.0.0.1"
PORT = 7777
logging.basicConfig(level=logging.INFO, format='%(asctime)s - [GAME-SERVER] - %(levelname)s - %(message)s')


# ===================================================================
#                            MAIN SERVER
# ===================================================================
def run_server():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((IP, PORT))
    logging.info(f"Rock-Solid Handshake Server listening on {IP}:{PORT}")

    client_addr = None
    challenge_token = b'\x01' + b'\x55' * 23 + b'\x04'
    login_packet_signature = b'\x00\x00\x13\x00\x40' # The start of the client's login packet

    try:
        while True:
            packet, received_addr = sock.recvfrom(2048)
            if client_addr is None:
                client_addr = received_addr
                logging.info(f"Client connected from {client_addr}")

            # --- Step 1: Respond to Hello ---
            if (len(packet) == 25 and packet.startswith(b'\x01\x00\x00\x00')) or packet.startswith(b'\x19') and challenge_token not in packet:
                logging.info("[HELLO] Received client Hello. Sending challenge.")
                sock.sendto(challenge_token, client_addr)
                continue
            
            # --- Step 2: Receive Challenge Response & Wait for Login ---
            if (len(packet) == 25 and packet == challenge_token ) or packet[4:29] == challenge_token:
                logging.info("[CHALLENGE OK] Received correct challenge response. Waiting for Login packet.")
                # We don't need to send anything here, the client will immediately send Login.
                sock.sendto(bytes.fromhex("02001300400081018080b1fe01e601001300400081018080b1fe01"), client_addr)

                continue

            # # --- Step 3: Receive Login and SEND THE WELCOME PACKET ---
            # if login_packet_signature in packet:

            #     logging.info(f"[LOGIN] Received NMT_Login packet: {packet.hex()}")
                
            #     # Create and send the definitive welcome packet
            #     signature = b'\x00\x00\x15\x00\x40' # The start of the client's login packet
            #     # test = bytes.fromhex("040000008fa0db02")
            #     sock.sendto(bytes.fromhex("028000008001"), client_addr)
            #     logging.info("="*60)
            #     logging.info(f"[WELCOME SENT] Responded with NMT_Welcome: {welcome_packet.hex()}")
            #     logging.info(" -> THE HANDSHAKE SHOULD NOW BE COMPLETE.")
            #     logging.info(" -> The client should be loading the map.")
            #     logging.info("="*60)
            #     # After this, we just listen for subsequent packets (NMT_Join, etc.)
            #     continue

            # Log any other packets we receive post-handshake
            logging.info(f"[POST-HANDSHAKE] Received packet: {packet.hex()}")


    except Exception as e:
        # This will catch ANY crash and print it, so we know why the server died.
        logging.error(f"!!! SERVER CRASHED !!!", exc_info=True)
    finally:
        sock.close()
        logging.info("Server shut down.")

if __name__ == '__main__':
    run_server()