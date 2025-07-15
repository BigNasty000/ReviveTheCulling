import socket
import struct
import os
import argparse
import logging
import time

from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5, AES
from hashlib import sha1
import hmac
import hashlib
# --- Global Helpers ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def decrypt_custom_cbc(ciphertext, key):
    """
    Attempts decryption using AES-128 in a manual CBC-like mode.
    The IV for each block is the previous encrypted block.
    The first IV is all zeros.
    """
    cipher = AES.new(key, AES.MODE_ECB) # We use ECB as a primitive
    
    iv = b'\x00' * 16
    plaintext = b''
    
    for i in range(0, len(ciphertext), 16):
        block = ciphertext[i:i+16]
        decrypted_block = cipher.decrypt(block)
        plaintext_block = bytes([decrypted_block[j] ^ iv[j] for j in range(16)])
        plaintext += plaintext_block
        iv = block # The next IV is the current encrypted block
        
    return plaintext


def parse_client_packet(data: bytes):
    """
    Parses the 128-byte packet into chunks to see its structure.
    This is based on the hex dump you provided.
    """
    if len(data) != 128:
        return

    logging.info("--- Parsing 128-byte Packet Structure ---")
    
    # Let's break it into 16-byte chunks, as seen in the hex dump
    part1 = data[0:16]
    part2 = data[16:32]
    part3 = data[32:48]
    part4 = data[48:64] # This one contained the exponent
    part5 = data[64:80]
    part6 = data[80:96]
    part7 = data[96:112]
    part8 = data[112:128]

    logging.info(f"Part 1 (16 bytes): {part1.hex()}")
    logging.info(f"Part 2 (16 bytes): {part2.hex()}")
    logging.info(f"Part 3 (16 bytes): {part3.hex()}")
    logging.info(f"Part 4 (16 bytes): {part4.hex()}")
    
    # Let's try to unpack the part with the exponent
    # 'I' is a 4-byte unsigned int. We expect four of them.
    # '<' means little-endian byte order.
    try:
        p4_unpacked = struct.unpack('<IIII', part4)
        logging.info(f"Part 4 Unpacked: {[hex(x) for x in p4_unpacked]}")
        if p4_unpacked[1] == 0x10001:
            logging.info("   >>> CONFIRMED: Found public exponent 0x10001 here!")
    except Exception as e:
        logging.info(f"Could not unpack Part 4: {e}")

    logging.info(f"Part 5 (16 bytes): {part5.hex()}")
    logging.info(f"Part 6 (16 bytes): {part6.hex()}")
    logging.info(f"Part 7 (16 bytes): {part7.hex()}")
    logging.info(f"Part 8 (16 bytes): {part8.hex()}")
    logging.info("-----------------------------------------")


# The static key we found in the executable
# STATIC_KEY_STRING = b'3@#$y38$t3dsB3a%12p|-49dF23fav'
STATIC_KEY_STRING =  b"#51@#$y38$t3dsB3a%12p|-49dF23fav"
SBOX_TABLES_FILE = 'hexdump/culling_T0_table.bin'

# --- Custom AES Implementation (with a new encrypt method) ---


def run_server(ip="127.0.0.1", port=7777):
     # --- 1. Key Derivation and Crypto Setup ---
    aes_key = hashlib.md5(STATIC_KEY_STRING).digest()
    logging.info(f"Derived 16-byte AES Key: {aes_key.hex()}")

    try:
        # We will use a standard library AES for this implementation, as it's now clear
        # the problem was the key, not the algorithm itself. This is much cleaner.
        # If issues arise, we can swap back to the manual implementation.
        from Crypto.Cipher import AES
        crypto = AES.new(aes_key, AES.MODE_ECB)
        logging.info("Initialized AES-ECB cipher.")
    except Exception as e:
        logging.error(f"Crypto init failed: {e}")
        return

    # --- 2. Server Socket Setup ---
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((ip, port))
    logging.info(f"✅ Full Handshake Server listening on {ip}:{port}")
    peer = None # To store the client's address

    try:
        # ======================================================================
        # STAGE 1: Initial Challenge/Response
        # ======================================================================
        logging.info("---------- STAGE 1: Awaiting Initial Client Challenge ----------")
        encrypted_challenge, peer = sock.recvfrom(2048)
        if len(encrypted_challenge) != 128:
            raise ValueError(f"Expected 128-byte challenge, got {len(encrypted_challenge)}")
        
        logging.info(f"Received 128-byte challenge from {peer}")
        decrypted_challenge = crypto.decrypt(encrypted_challenge)
        
        # We prove we have the key by re-encrypting its challenge and sending it back.
        encrypted_response = crypto.encrypt(decrypted_challenge)
        sock.sendto(encrypted_response, peer)
        logging.info("Sent 128-byte challenge response. Authentication complete.")

        # ======================================================================
        # STAGE 2: Receive Encrypted Connect Request
        # The client now trusts us and sends the first real game packet.
        # This is the 112-byte packet you saw.
        # ======================================================================
        logging.info("---------- STAGE 2: Awaiting Encrypted Connect Request ----------")
        encrypted_connect_request, _ = sock.recvfrom(2048)
        while len(encrypted_connect_request) == 128:

            print(f"Inccoret packet: {len(encrypted_connect_request)}")
            encrypted_connect_request, _ = sock.recvfrom(2048)
            time.sleep(1)
            continue


        logging.info(f"Received {len(encrypted_connect_request)}-byte packet, likely ConnectRequest.")
        
        # All further packets are standard AES-ECB.
        decrypted_connect_request = crypto.decrypt(encrypted_connect_request)
        logging.info(f"Decrypted ConnectRequest: {decrypted_connect_request.hex()}")
        logging.info(f"Decrypted ConnectRequest: {decrypted_connect_request}")

        # NOTE: You may need to analyze the hex of this decrypted packet to see
        # what it contains (e.g., player ID, session ticket). For now, we assume
        # we just need to respond to continue the handshake.

        # ======================================================================
        # STAGE 3: Send Encrypted Connect Challenge
        # According to the expert notes, we now send back a simple challenge.
        # The notes say this should be 4 bytes plain text.
        # ======================================================================
        logging.info("---------- STAGE 3: Sending Encrypted Connect Challenge ----------")
        # Let's send a simple 4-byte challenge, e.g., b'\xDE\xAD\xBE\xEF'
        challenge_payload = b'\xDE\xAD\xBE\xEF'
        
        # The payload must be padded to a multiple of 16 for AES.
        # PKCS7 padding is standard.
        pad_len = 16 - (len(challenge_payload) % 16)
        padded_challenge = challenge_payload + bytes([pad_len]) * pad_len
        
        encrypted_challenge_response = crypto.encrypt(padded_challenge)
        sock.sendto(encrypted_challenge_response, peer)
        logging.info(f"Sent {len(encrypted_challenge_response)}-byte encrypted challenge.")
        
        # ======================================================================
        # STAGE 4: Receive Encrypted Challenge Response
        # The client must now respond to our challenge.
        # ======================================================================
        logging.info("---------- STAGE 4: Awaiting Encrypted Challenge Response ----------")
        encrypted_final_response, _ = sock.recvfrom(2048)
        logging.info(f"Received {len(encrypted_final_response)}-byte final packet.")
        
        decrypted_final_response = crypto.decrypt(encrypted_final_response)
        logging.info(f"Decrypted final response: {decrypted_final_response.hex()}")

        # ======================================================================
        # VICTORY! Handshake Complete
        # ======================================================================
        logging.info("🎉🎉🎉 FULL HANDSHAKE COMPLETE! The client is now ready for game data. 🎉🎉🎉")
        logging.info("The server should now transition to handling the main game loop.")
        
        # Keep the server alive for a bit to see if more packets arrive
        sock.settimeout(30)
        while True:
            more_data, _ = sock.recvfrom(2048)
            decrypted_more_data = crypto.decrypt(more_data)
            logging.info(f"Received subsequent game packet: LEN={len(decrypted_more_data)}: {decrypted_more_data.hex()}")


    except socket.timeout:
        logging.warning("⌛ TIMEOUT: Client did not respond to one of the handshake stages.")
    except Exception as e:
        logging.error(f"An error occurred during the handshake: {e}", exc_info=True)
    finally:
        logging.info("Server shut down.")
        sock.close()

def main():
    parser = argparse.ArgumentParser(description="The Culling - Modern Handshake Server")
    parser.add_argument('--ip', default="127.0.0.1", help="IP to listen on")
    parser.add_argument('--port', type=int, default=7777, help="Port to listen on")
    parser.add_argument('--client-nonce', required=True, help="Client nonce provided by matchmaker")
    parser.add_argument('--server-nonce', required=True, help="Server nonce provided by matchmaker")

    # This MUST be the path to your 1024-bit server private RSA key.
    parser.add_argument('--key', default='certs/private.key', help="Path to the server private RSA key file")

    args = parser.parse_args()
    run_server(args.ip, args.port)

if __name__ == "__main__":
    main()