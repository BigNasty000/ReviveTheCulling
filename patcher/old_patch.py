# auto_patcher_v21_definitive_plaintext.py
# This patch correctly disables encryption AND hijacks the parameters for sendto
# to use the original plaintext buffer (from RBP) and the original size (from R8D).
# This is the definitive version based on direct debugging feedback.

import pymem
import pymem.process
import time
import os
import msvcrt

def main():
    os.system('cls' if os.name == 'nt' else 'clear')
    print("===================================================")
    print("=== Culling Patcher v21 - Definitive Plaintext  ===")
    print("===================================================")

    # --- OFFSETS (Relative to the start of the sendTo wrapper function at ...E510) ---
    # These offsets are calculated from your provided assembly listing.
    OFFSET_ENCRYPTION_CALL = 0x42  # Offset to: call victory. ... CC70
    OFFSET_SIZE_LOAD = 0x47        # Offset to: mov r8d, dword ptr ss:[rsp+44]
    OFFSET_BUFFER_LOAD = 0x54      # Offset to: lea rdx, qword ptr ss:[rsp+48]
    
    pm = None
    success = False
    try:
        print("Waiting for Victory.exe...", end="", flush=True)
        while True:
            try:
                pm = pymem.Pymem("Victory.exe")
                print("\n[SUCCESS] Victory.exe process found!")
                break
            except pymem.exception.ProcessNotFound:
                print(".", end="", flush=True)
                time.sleep(1)
    
        print("\n[*] Game found. Waiting 5 seconds for modules to fully load...")
        time.sleep(5)

        base_victory = pymem.process.module_from_name(pm.process_handle, "Victory.exe").lpBaseOfDll
        print(f"[*] Victory.exe dynamic base address: {hex(base_victory)}")
        
        # --- DYNAMIC ADDRESS CALCULATION ---
        # Using the provided live base and function address to create a robust offset.
        # Live Base: 0x7FF62A9B0000, Function Address from dump: 0x7FF62B23E510
        FUNC_OFFSET_FROM_MODULE_BASE = 0x7FF62B23E510 - 0x7FF62A9B0000
        
        addr_sendto_func_start = base_victory + FUNC_OFFSET_FROM_MODULE_BASE
        addr_encryption_call = addr_sendto_func_start + OFFSET_ENCRYPTION_CALL
        addr_size_load = addr_sendto_func_start + OFFSET_SIZE_LOAD
        addr_buffer_load = addr_sendto_func_start + OFFSET_BUFFER_LOAD

        print(f"[*] Calculated function start address: {hex(addr_sendto_func_start)}")
        print("\n--- Applying Final Multi-Point Plaintext Patch ---")

        # --- PATCH 1: Disable Encryption Call ---
        # Replace the 5-byte CALL instruction with 5 NOPs.
        encryption_nop_patch = b'\x90' * 5
        print(f"[*] 1/3: Disabling encryption at {hex(addr_encryption_call)}")
        pm.write_bytes(addr_encryption_call, encryption_nop_patch, len(encryption_nop_patch))

        # --- PATCH 2: Prevent Size Override ---
        # The next instruction loads the size for sendto from the stack, which now contains 0.
        # We NOP this instruction to prevent R8D (which holds the correct size) from being overwritten.
        size_nop_patch = b'\x90' * 5
        print(f"[*] 2/3: Preserving original size by NOPing instruction at {hex(addr_size_load)}")
        pm.write_bytes(addr_size_load, size_nop_patch, len(size_nop_patch))

        # --- PATCH 3: Redirect Buffer Pointer to RBP (Plaintext) ---
        # Replace the instruction that loads the encrypted buffer address (from the stack)
        # with an instruction that loads the plaintext buffer address from the RBP register.
        # Original (5 bytes): lea rdx, [rsp+0x48]
        # New      (5 bytes): mov rdx, rbp + NOP + NOP
        buffer_redirect_patch = b'\x48\x89\xEA\x90\x90'
        print(f"[*] 3/3: Redirecting send buffer at {hex(addr_buffer_load)} to use plaintext from RBP.")
        pm.write_bytes(addr_buffer_load, buffer_redirect_patch, len(buffer_redirect_patch))

        CURRENT_BASE = 0x7FF678AA0000

         # --- ADDRESSES for the SURGICAL RECEIVER patch inside C750 ---
        C750_OFFSET      = (0x7FF67932C750 - CURRENT_BASE)

        
        ADDR_RECEIVER_BASE = base_victory + C750_OFFSET
        ADDR_RECEIVER_DECRYPTION_START = ADDR_RECEIVER_BASE + 0x36 # Offset of decryption block from C750 start
        ADDR_RECEIVER_CHECKSUM_JUMP    = ADDR_RECEIVER_BASE + 0x1A9 # Offset of checksum jump from C750 start
        

        # Addresses for Listen Server patches
        ADDR_LISTEN_SERVER_CHECK_JUMP = base_victory + (0x7FF67A0D2C02 - CURRENT_BASE)
        ADDR_LISTEN_SUCCESS_JUMP      = base_victory + (0x7FF67A0D2C19 - CURRENT_BASE)
        ADDR_JUMP_TARGET              = base_victory + (0x7FF67A0D2CB0 - CURRENT_BASE)
        
        # --- SURGICAL RECEIVER PATCH ---
        print("\n--- Applying Surgical Receiver Patch ---")
        
        nop_start = ADDR_RECEIVER_DECRYPTION_START
        nop_end = ADDR_RECEIVER_CHECKSUM_JUMP
        nop_size = nop_end - nop_start
        print(f"[*] Neutralizing decryption/HMAC code from {hex(nop_start)} to {hex(nop_end)}")
        pm.write_bytes(nop_start, b'\x90' * nop_size, nop_size)
        
        print(f"[*] Forcing validation to succeed at {hex(ADDR_RECEIVER_CHECKSUM_JUMP)}")
        pm.write_bytes(ADDR_RECEIVER_CHECKSUM_JUMP, b'\xEB', 1) # Change JE to JMP

        print("\n[SUCCESS] Game patched. All outgoing packets are now UNENCRYPTED plaintext.")
        print("          This should produce the correct dynamic plaintext payload.")


        
        success = True

    except Exception as e:
        print(f"\n[FATAL ERROR] An unexpected error occurred:")
        import traceback
        traceback.print_exc()

    finally:
        if pm and pm.process_handle:
            pm.close_process()
        
        if success:
            print("\n===================================================")
            print("=== Patcher has finished successfully.            ===")
            print("=== Press any key to exit, or wait for countdown. ===")
            print("===================================================")
            
            print("Automatically exiting in ", end="", flush=True)
            for i in range(5, 0, -1):
                print(f"{i}... ", end="", flush=True)
                if msvcrt.kbhit():
                    msvcrt.getch()
                    break
                time.sleep(1)
            print("\nExiting.")
        else:
            print("\n===================================================")
            print("=== Patcher has finished with an error.         ===")
            print("=== Review the error message above.             ===")
            print("=== Press any key to exit...                    ===")
            print("===================================================")
            msvcrt.getch()

if __name__ == "__main__":
    main()