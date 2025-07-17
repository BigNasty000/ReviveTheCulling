**Function Analysis (Current Session Base: 0x7FF722010000)**
- Note: this was made mainly with chatGPT lol so it might be cheesy.
- Your base will 100% be different from mine. Use ChatGPT to find your new functions. 
- To do so:
    - Take the base in this file (0x7FF722010000), and the function you want to look at. 
    - give ChatGPT (or any other AI) your current base, the base in this file (0x7FF722010000), and the function address you want to inspect in this file, in ex/ 0x00007FF7242F5700.
        - Tell it to recalculate the function address based off your current base, and the previous (0x7FF722010000) base and function address
    - HIGHLY recommend renaming functions in ghidra, as once you rebase your ghidra, you can still find the functions by name.


1. The High-Level Network Ticker (The "CEO")
    - Address: 0x00007FF7242F5700
    - What it Does: This is the master "heartbeat" function for the entire engine's network process. It runs every frame and decides what high-level actions to take, such as ticking the connection, checking for timeouts, or handling world travel between the menu and a server.
    - Key Action: This function is where the final decision to disconnect you and send you back to the main menu is made. It contains the virtual function calls (...270, ...278, ...280) that delegate work to the Connection Ticker.
2. The Connection Ticker (The "Manager")
    - Address: 0x00007FF724345370
    - What it Does: This function manages the state of a single player connection. It checks for incoming packets in its queue and decides which specific handler to call based on the packet's ID. This is where the main "switch" statement logic resides.
    - Key Action: This is where we found the JLE and other conditional jumps that were preventing our NMT_Welcome from being processed because certain state flags were not set correctly. This is the prime suspect for where our final debugging needs to happen.
3. The Low-Level Sender (Calls sendto)
    - Address: 0x00007FF72289E510
    - What it Does: This is the function that the game calls right before a packet goes out to the network. It takes a plaintext buffer, passes it to the encryption function, and then gives the resulting ciphertext to the sendto OS call.
    - Key Action: This is the location of our first successful patch. We modified the code starting at ...E540 to replace the call to the encryption function with a memcpy, forcing the client to send plaintext data.
4. The Encryption / Packet Wrapping Function
    - Address: 0x00007FF72289CC70
    - What it Does: This is the "black box" that performs the complex, layered cryptography. It takes a plaintext buffer, derives keys using the static string and MD5, encrypts the payload, calculates an HMAC, and assembles the final secure packet.
    - Key Action: It directly references the static key string: b"#51@#$y38$t3dsB3a%12p|-49dF23fav". Our patch successfully bypasses this entire function.
5. The Low-Level Receiver (Calls recvfrom)
    - Address: 0x00007FF72289E380
    - What it Does: This is the first function in our game's code that touches incoming network data. It calls recvfrom to get raw bytes from the OS and then passes that buffer to the decryption function.
    - Key Action: This is the location of our second successful patch. We modified the code starting at ...E439 to NOP out the call to the decryption function and set the output size correctly, allowing the raw plaintext from our server to pass through.
6. The Decryption / Packet Unwrapping Function
    - Address: 0x00007FF72289C750
    - What it Does: The counterpart to the encryption function. In the unpatched client, it would verify the HMAC and perform the complex decryption.
    - Key Action: Our patch at ...E439 in the caller function prevents this function from ever being called, neutralizing it.