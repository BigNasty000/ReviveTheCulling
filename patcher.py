# auto_patcher.py (v13 - Final with Exit Countdown)
# This script waits for Victory.exe to launch, then automatically applies the
# user-verified, bit-perfect memory patches to enable plaintext communication.

import pymem
import pymem.process
import time
import os
import struct
import msvcrt # Used for the "press any key" functionality
from ctypes import windll, wintypes

def get_iat_memcpy_address(pm: pymem.Pymem, victory_base: int) -> int:
    """
    Scans the Import Address Table of Victory.exe to find the exact
    address of memcpy as resolved by the Windows Loader for the game process.
    """
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
    print("=== The Culling Standalone Auto-Patcher v13     ===")
    print("===================================================")

    OLD_BASE = 0x7FF722010000
    OFFSET_SENDER_PATCH_POINT = 0x7FF72289E540 - OLD_BASE
    OFFSET_RECEIVER_SIZE_PATCH = 0x7FF72289E439 - OLD_BASE
    # The start of our NOP slide is AFTER our 5-byte mov instruction
    OFFSET_RECEIVER_NOP_START = 0x7FF72289E43E - OLD_BASE
    
    pm = None
    success = False
    try:
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
        success = True

    except pymem.exception.CouldNotOpenProcess:
        print("\n[FATAL ERROR] Could not open process. Please re-run this patcher as an Administrator.")
    except Exception as e:
        print(f"\n[FATAL ERROR] An unexpected error occurred: {e}", exc_info=True)

    finally:
        if pm and pm.process_handle:
            pm.close_process()
        
        # --- NEW EXIT COUNTDOWN ---
        if success:
            print("\n===================================================")
            print("=== Patcher has finished successfully.            ===")
        else:
            print("\n===================================================")
            print("=== Patcher has finished with an error.         ===")
            
        print("=== Press any key to exit, or wait for countdown. ===")
        print("===================================================")
        
        print("Automatically exiting in ", end="", flush=True)

        for i in range(3, 0, -1):
            print(f"\n{i}... ", end="", flush=True)
            # Check for a key press 10 times over one second for responsiveness
            key_pressed = False
            for _ in range(10): 
                if msvcrt.kbhit():
                    key_pressed = True
                    break
                time.sleep(0.1)
            if key_pressed:
                break
        
        print("\nExiting.")

if __name__ == "__main__":
    main()