**Function Analysis (Current Session Base: 0x7FF722010000)**

- Note: This was made mainly with chatGPT lol so it might be cheesy.
- Your base will 100% be different from mine. Use ChatGPT to find your new functions.
- To do so:
    - Take the base in this file, and the function you want to look at.
    - give ChatGPT (or any other AI) your current base, the base in this file, and the function address you want to inspect in this file, in ex/ 0x00007FF7242F5700.
        - Tell it to recalculate the function address based off your current base, and the previous base and function address
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

7. UNetDriver::TickDispatch (The "Gatekeeper")
    - Address: 0x00007FF62A089D10
    - What it Does: This is the highest-level network dispatcher that gets called by the engine's main loop every frame. It acts as a master "switchyard." It looks at the current state of a network connection and decides what general action to take next.
    - Key Action: It checks if a connection is fully open (cmp dword ptr ds:[rdx+124],1). If not, it jumps to the handshake logic block (...9E0D) which then makes the virtual calls to the UPendingNetGame object (...270, ...278, ...280) to manage the handshake. This is the true top-level manager.


10. FBitReader::Serialize (The "Bit Reader")
    - Address: 0x00007FF629156A70
    - What it Does: A low-level utility function. It's a "bitstream reader." Its job is to take a raw buffer of bytes and read individual bits and sequences of bits from it. This is where the actual parsing of packet headers and payloads happens.
    - Key Action: We identified this as the true location of the memcpy crash. A higher-level handler calls this function and tells it to read a certain number of bits. The calculation of that number is failing because our packet's header format is wrong, which leads to the bounds check (cmp eax,dword ptr ds:[rsi+C]) failing.

11. UChannel::ProcessReceivedBunches (The In-Game Data Processor)
    - Address: 0x00007FF62AEC5FF0
    - What it Does: This function is responsible for parsing "bunches"—the Unreal Engine term for packets of replicated game data like player movement, actor spawning, and RPCs.
    - Key Action: This is a red herring for the handshake. It is only called by UNetConnection::Tick after the connection is fully initialized, which our handshake never achieves.

12. vcruntime140.dll!memcpy (The Hired Muscle)
    - Address: 0x00007FFEFB8F20D0
    - What it Does: This is not game code. It is a highly optimized, low-level memory copy function from the Microsoft Visual C++ Runtime.
    - Key Action: Our hardware breakpoint landed here, which was the final, critical clue. It proved the crash wasn't because of a logical error in the handshake, but a fundamental memory error, which led us to its caller, the Bit Reader.
    Handshake Virtual Functions (Called by TickDispatch)

---
**Handshake Virtual Functions (Called by TickDispatch)**

13. UPendingNetGame::Tick (Function "270" / The "State Manager")
    - Address: 0x00007FF62AE95700
    - What it Does: This is the main "heartbeat" for the UPendingNetGame object, which manages the client-side handshake process. It is called every frame by TickDispatch as long as the connection is in a "pending" state.
    - Key Action: Its primary job is to check the current state of the handshake (e.g., initial, waiting for challenge, timed out) and decide what to do next. The giant switch statement (cmp eax,7, cmp eax,C, etc.) is what reads this state. If the state is "waiting for packet," it does nothing. If the state is "time to send next packet," it calls Function 280. If the state is "timed out," it initiates the disconnect.

14. UNetConnection::Tick (Function "278" / The Connection "Heartbeat")
    - Address: 0x00007FF62AEE5370
    - What it Does: This is a mid-level manager responsible for a single client-server connection. Its main jobs are to check for connection timeouts and to tell all of its associated "channels" to process any queued data.
    - Key Action: Contains the "Is Initialized?" flag check (cmp byte ptr ds:[rbx+438], 0). Our handshake is failing because this flag is never set correctly, causing the jne at ...5385 to be taken, which skips all channel-level packet processing.

15. UPendingNetGame::SendHandshakePacket (Function "280" / The "Messenger")
    - Address: 0x00007FF629FE87F0
    - What it Does: This function has a simple, focused role: to construct and send the client's side of a handshake packet (e.g., sending the NMT_Login packet after successfully receiving a challenge from the server).
    - Key Action: It is called by UPendingNetGame::Tick (#12) when the handshake state machine determines it's time for the client to transmit data. It does not process received data; it only sends.