import pymem
import pymem.process
import time
import os
import struct
import msvcrt

def get_iat_memcpy_address(pm: pymem.Pymem, victory_base: int) -> int:
    print("\n[*] Starting IAT scan for vcruntime140.dll!memcpy...")
    dos_header = pm.read_bytes(victory_base, 64)
    e_lfanew = struct.unpack('<I', dos_header[60:64])[0]
    nt_header_addr = victory_base + e_lfanew
    optional_header_addr = nt_header_addr + 24
    import_directory_rva = pm.read_uint(optional_header_addr + 120)
    if not import_directory_rva:
        raise Exception("Could not find the Import Directory RVA in the PE header.")
    descriptor_addr = victory_base + import_directory_rva
    
    while True:
        desc_bytes = pm.read_bytes(descriptor_addr, 20)
        original_first_thunk, _, _, name_rva, first_thunk = struct.unpack('<IIIII', desc_bytes)
        if not name_rva: break
        dll_name = pm.read_string(victory_base + name_rva)
        if dll_name.lower() == "vcruntime140.dll":
            lookup_table_rva = original_first_thunk or first_thunk
            iat_addr = victory_base + first_thunk
            i = 0
            while True:
                name_ref_rva = pm.read_longlong(victory_base + lookup_table_rva + (i * 8))
                if not name_ref_rva: break
                if not (name_ref_rva & 0x8000000000000000):
                    func_name = pm.read_string(victory_base + name_ref_rva + 2)
                    if func_name == "memcpy":
                        resolved_address = pm.read_longlong(iat_addr + (i * 8))
                        print(f"[SUCCESS] Found memcpy in IAT at: {hex(resolved_address)}")
                        return resolved_address
                i += 1
        descriptor_addr += 20
    raise Exception("Failed to find memcpy in the IAT.")

def main():
    os.system('cls' if os.name == 'nt' else 'clear')
    print("===================================================")
    print("===           The Culling Patcher v4.3          ===")
    print("===================================================")

    pm = None
    success = False
    try:
        print("Waiting for Victory.exe...")
        pm = pymem.Pymem("Victory.exe")
        print("\n[SUCCESS] Victory.exe process found!")
        
        print("\n[*] Waiting 5 seconds for modules to fully load...")
        time.sleep(5)

        base_victory = pymem.process.module_from_name(pm.process_handle, "Victory.exe").lpBaseOfDll
        print(f"[*] Victory.exe dynamic base address: {hex(base_victory)}")

        # --- ADDRESSES ---
        # Using the base from your last successful debugging session
        CURRENT_BASE = 0x7FF678AA0000
        
        # --- Addresses for YOUR new Surgical Sender Patch (inside CC70) ---
        ADDR_SENDER_ENCRYPTION_CALL   = base_victory + (0x7FF67932CE43 - CURRENT_BASE)
        ADDR_SENDER_LOOP_CALL         = base_victory + (0x7FF67932CE5D - CURRENT_BASE)
        ADDR_SENDER_FINAL_LOAD_1      = base_victory + (0x7FF67932CE6F - CURRENT_BASE)
        ADDR_SENDER_FINAL_LOAD_2      = base_victory + (0x7FF67932CE78 - CURRENT_BASE)

         # --- 1. YOUR DEFINITIVE SURGICAL SENDER PATCH ---
        print("\n--- Applying Your Proven Surgical Sender Patch ---")
        
        # NOP out the main AES encryption call
        print(f"[*] Neutralizing main encryption call at {hex(ADDR_SENDER_ENCRYPTION_CALL)}")
        pm.write_bytes(ADDR_SENDER_ENCRYPTION_CALL, b'\x90' * 5, 5)
        
        # NOP out the encryption call inside the loop
        print(f"[*] Neutralizing loop encryption call at {hex(ADDR_SENDER_LOOP_CALL)}")
        pm.write_bytes(ADDR_SENDER_LOOP_CALL, b'\x90' * 5, 5)
        
        # Reroute the final data pointers to copy the plaintext
        # print(f"[*] Rerouting final data pointer 1 at {hex(ADDR_SENDER_FINAL_LOAD_1)}")
        # pm.write_bytes(ADDR_SENDER_FINAL_LOAD_1, b'\x0F\x10\x45\x00', 4) # movups xmm0, [rbp]
        
        # print(f"[*] Rerouting final data pointer 2 at {hex(ADDR_SENDER_FINAL_LOAD_2)}")
        # pm.write_bytes(ADDR_SENDER_FINAL_LOAD_2, b'\x0F\x10\x4D\x10', 4) # movups xmm1, [rbp+10] -- Mistake in your notes, should be +16 (0x10) for the next block
        
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
        
        # --- 3. LISTEN SERVER PATCHES ---
        print("\n--- Applying Listen Server Patches ---")
        print(f"[*] Patching IsServer check at {hex(ADDR_LISTEN_SERVER_CHECK_JUMP)}...")
        pm.write_bytes(ADDR_LISTEN_SERVER_CHECK_JUMP, b'\x90' * 6, 6)
        print(f"[*] Rerouting listen success jump at {hex(ADDR_LISTEN_SUCCESS_JUMP)}...")
        jmp_offset = ADDR_JUMP_TARGET - (ADDR_LISTEN_SUCCESS_JUMP + 5)
        jmp_instruction = b'\xE9' + struct.pack('<i', jmp_offset)
        pm.write_bytes(ADDR_LISTEN_SUCCESS_JUMP, jmp_instruction, 5)
        pm.write_bytes(ADDR_LISTEN_SUCCESS_JUMP + 5, b'\x90', 1)

        print("\n[SUCCESS] All surgical and spy patches have been applied!")
        print("!!! The game will now send FORMATTED, UNENCRYPTED packets. !!!")
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