# patcher.py v2
import pymem
import pymem.process
import time
import os
import struct
import msvcrt

# ... (get_iat_memcpy_address function remains the same) ...
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
            print(f"[*] Found descriptor for {dll_name}")
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
    print("=== The Culling Standalone Auto-Patcher v18     ===")
    print("===  - Plaintext & Correct Listen Server Patch  ===")
    print("===================================================")

    # --- Use the base address from the EXE where you found ALL your addresses ---
    # This must be consistent for all calculations.
    OLD_BASE = 0x7FF72D3B0000
    
    # --- OFFSETS FOR LISTEN SERVER PATCHES ---
    OFFSET_LISTEN_SERVER_CHECK_JUMP = 0x7FF72E9E2C02 - OLD_BASE
    OFFSET_LISTEN_SUCCESS_JUMP = 0x7FF72E9E2C19 - OLD_BASE
    OFFSET_SENDER_PATCH_POINT = 0x7FF72DC3E540 - OLD_BASE
    OFFSET_RECEIVER_SIZE_PATCH = 0x7FF72DC3E439 - OLD_BASE
    # The start of our NOP slide is AFTER our 5-byte mov instruction
    OFFSET_RECEIVER_NOP_START = 0x7FF72DC3E43E - OLD_BASE

    # The target of our NEW jump, as discovered by your manual patch.
    ADDR_JUMP_TARGET = 0x7FF72E9E2CB0

    pm = None
    success = False
    try:
        print("Waiting for Victory.exe to launch...")
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
        
        # --- APPLY PLAINTEXT PATCHES ---
        # print("\n--- Applying Plaintext Communication Patches ---")
        print(f"[*] Victory.exe base address in game: {hex(base_victory)}")
        addr_memcpy_target = get_iat_memcpy_address(pm, base_victory)
        
        addr_sender_patch = base_victory + OFFSET_SENDER_PATCH_POINT
        addr_receiver_size = base_victory + OFFSET_RECEIVER_SIZE_PATCH
        addr_receiver_nop = base_victory + OFFSET_RECEIVER_NOP_START
        
        print("\n--- Applying Patches ---")

        print(f"[*] Writing user-verified patch to Sender at {hex(addr_sender_patch)}...")
        patch_code = bytearray()
        patch_code.extend(b'\x48\x8D\x4C\x24\x40')
        patch_code.extend(b'\x48\x89\xD2')
        patch_code.extend(b'\x4D\x89\xC0')
        patch_code.extend(b'\x48\xB8')
        patch_code.extend(addr_memcpy_target.to_bytes(8, 'little'))
        patch_code.extend(b'\xFF\xD0')
        patch_code.extend(b'\x44\x89\x44\x24\x2C')
        pm.write_bytes(addr_sender_patch, bytes(patch_code), len(patch_code))

        print(f"[*] Patching Receiver size at {hex(addr_receiver_size)}...")
        receiver_size_patch_bytes = b'\x44\x89\x44\x24\x44'
        pm.write_bytes(addr_receiver_size, receiver_size_patch_bytes, len(receiver_size_patch_bytes))

        print(f"[*] NOPing orphaned Receiver bytes at {hex(addr_receiver_nop)}...")
        # We need to fill 8 bytes from ...E43E to ...E445 inclusive
        pm.write_bytes(addr_receiver_nop, b'\x90' * 8, 8)

        print("\n[SUCCESS] Game has been patched for plaintext communication!")

        # --- APPLY LISTEN SERVER PATCHES ---
        print("\n--- Applying Listen Server Patches ---")
        addr_listen_server_check_jump = base_victory + OFFSET_LISTEN_SERVER_CHECK_JUMP
        addr_listen_success_jump = base_victory + OFFSET_LISTEN_SUCCESS_JUMP
        
        # Patch 1: Disable the jump that skips the "listen" check
        print(f"[*] Patching IsServer check at {hex(addr_listen_server_check_jump)}...")
        pm.write_bytes(addr_listen_server_check_jump, b'\x90' * 6, 6)

        # Patch 2: Change the JNE to an unconditional JMP to the SAME destination
        print(f"[*] Rerouting listen success jump at {hex(addr_listen_success_jump)}...")
        dynamic_target_addr = base_victory + (ADDR_JUMP_TARGET - OLD_BASE)
        jmp_offset = dynamic_target_addr - (addr_listen_success_jump + 5)
        jmp_instruction = b'\xE9' + struct.pack('<i', jmp_offset)
        pm.write_bytes(addr_listen_success_jump, jmp_instruction, 5)
        pm.write_bytes(addr_listen_success_jump + 5, b'\x90', 1)

        print("\n[SUCCESS] All patches have been applied!")
        success = True

    except pymem.exception.CouldNotOpenProcess:
        print("\n[FATAL ERROR] Could not open process. Please re-run this patcher as an Administrator.")
    except Exception as e:
        print(f"\n[FATAL ERROR] An unexpected error occurred:")
        import traceback
        traceback.print_exc()

    finally:
        # ... (exit logic remains the same) ...
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