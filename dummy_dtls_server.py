import socket
import ssl
import os
import argparse
import logging
import time

# --- Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Main Server Logic ---
def run_tls_server(ip, port, cert_file, key_file):
    # Create a standard TCP socket
    bindsocket = socket.socket()
    bindsocket.bind((ip, port))
    bindsocket.listen(5)
    logging.info(f"✅ TLS Server listening on {ip}:{port}")

    # Create an SSL context
    # This tells the server what certificate and key to use.
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    try:
        context.load_cert_chain(certfile=cert_file, keyfile=key_file)
    except FileNotFoundError:
        logging.error(f"FATAL: Could not find certificate ('{cert_file}') or key ('{key_file}').")
        logging.error("Please extract the certificate from Ghidra and generate a private key.")
        return

    logging.info("SSL context loaded successfully. Waiting for a client connection...")

    try:
        # Accept a connection
        newsocket, fromaddr = bindsocket.accept()
        logging.info(f"📥 Received a connection from {fromaddr}")

        # Wrap the socket in the SSL context. This performs the TLS handshake.
        # If the client rejects our certificate, this line will fail.
        conn = context.wrap_socket(newsocket, server_side=True)
        
        logging.info("🎉🎉🎉 TLS HANDSHAKE COMPLETE! 🎉🎉🎉")
        logging.info(f"Cipher suite used: {conn.cipher()}")
        logging.info("Client is now securely connected. Ready for application data.")

        # --- Game Loop ---
        # The client will now start sending the REAL UE4 packets over this secure stream.
        # The very first thing it sends will be the 112-byte Hello blob, but this time
        # it will be unencrypted (because TLS is handling the encryption).
        while True:
            try:
                # Read data from the secure stream
                data = conn.recv(2048)
                if not data:
                    logging.warning("Client disconnected.")
                    break
                logging.info(f"Received application data ({len(data)} bytes): {data.hex()}")
                
                # Here you would put the logic to handle the NMT packets,
                # like sending back the Welcome message etc.
                # But getting this far is the victory.

            except ssl.SSLError as e:
                logging.error(f"SSL Error in game loop: {e}")
                break
            except ConnectionResetError:
                logging.warning("Client reset the connection.")
                break

    except ssl.SSLError as e:
        logging.error(f"TLS Handshake Failed: {e}")
        logging.error("This likely means the client did not accept our certificate or the cipher suites did not match.")
    except Exception as e:
        logging.error(f"An error occurred: {e}", exc_info=True)
    finally:
        logging.info("Server shutting down.")
        bindsocket.close()


def main():
    parser = argparse.ArgumentParser(description="The Culling - TLS Handshake Server")
    parser.add_argument('--ip', default="127.0.0.1", help="IP to listen on")
    parser.add_argument('--port', type=int, default=7777, help="Port to listen on")
    
    # --- IMPORTANT ---
    # You need to provide the path to your extracted certificate and generated key
    parser.add_argument('--cert', default='server.pem', help="Path to the server certificate file")
    parser.add_argument('--key', default='private.key', help="Path to the server private key file")

    args = parser.parse_args()
    run_tls_server(args.ip, args.port, args.cert, args.key)

if __name__ == "__main__":
    main()