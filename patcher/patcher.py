# final_patcher_v3.py (Corrected Receiver, Proven Sender, Updated Addr)
import pymem
import pymem.process
import time
import os
import struct
import msvcrt

def get_iat_memcpy_address(pm: pymem.Pymem, victory_base: int) -> int:
    """Scans the IAT to find the runtime address of memcpy."""
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
    print("=== The Culling Final Patcher v3                ===")
    print("===  - Corrected & Robust Receiver Patch        ===")
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

        # --- UPDATED ADDRESSES ---
        CURRENT_BASE = 0x7FF748210000
        
        ADDR_LISTEN_SERVER_CHECK_JUMP = base_victory + (0x7FF749842C02 - CURRENT_BASE)
        ADDR_LISTEN_SUCCESS_JUMP      = base_victory + (0x7FF749842C19 - CURRENT_BASE)
        ADDR_SENDER_PATCH_POINT       = base_victory + (0x7FF748A9E540 - CURRENT_BASE)
        ADDR_RECEIVER_PATCH_POINT     = base_victory + (0x7FF748A9C750 - CURRENT_BASE)
        ADDR_JUMP_TARGET              = base_victory + (0x7FF749842CB0 - CURRENT_BASE)
        
        addr_memcpy_target = get_iat_memcpy_address(pm, base_victory)
        
        # --- 1. APPLY YOUR PROVEN SENDER PATCH ---
        print("\n--- Applying Your Proven Sender Patch ---")
        sender_patch_code = bytearray()
        sender_patch_code.extend(b'\x48\x8D\x4C\x24\x40')
        sender_patch_code.extend(b'\x48\x89\xD2')
        sender_patch_code.extend(b'\x4D\x89\xC0')
        sender_patch_code.extend(b'\x48\xB8')
        sender_patch_code.extend(addr_memcpy_target.to_bytes(8, 'little'))
        sender_patch_code.extend(b'\xFF\xD0')
        sender_patch_code.extend(b'\x44\x89\x44\x24\x2C')
        
        pm.write_bytes(ADDR_SENDER_PATCH_POINT, bytes(sender_patch_code), len(sender_patch_code))
        print(f"[*] Sender patched at {hex(ADDR_SENDER_PATCH_POINT)}")

        # --- 2. APPLY CORRECTED INTELLIGENT RECEIVER PATCH ---
        print("\n--- Applying Corrected Intelligent Receiver Patch ---")
        
        # This shellcode is a robust, direct translation of the original function's success path.
        # It correctly preserves registers and will not crash.
        # Args: RCX=output, RDX=input, R8=size
        receiver_shellcode = bytearray([
            0x57,                    # push rdi                      ; Save rdi (non-volatile)
            0x48, 0x8B, 0xF9,        # mov rdi, rcx                  ; Move output struct ptr to safe register rdi
            0x8B, 0x02,              # mov eax, dword ptr [rdx]      ; Get header/size from input buffer
            0x89, 0x47, 0x04,        # mov dword ptr [rdi+4], eax    ; Store header in output struct
            0x48, 0x8D, 0x4F, 0x08,  # lea rcx, [rdi+8]              ; Arg1 (dest) for memcpy = output payload buffer
            0x48, 0x8D, 0x52, 0x04,  # lea rdx, [rdx+4]              ; Arg2 (src) for memcpy = input payload
                                     # Arg3 (size) for memcpy is already in R8, no instruction needed.
            0x48, 0xB8, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, # mov rax, <memcpy_addr>
            0xFF, 0xD0,              # call rax
            0xC6, 0x07, 0x00,        # mov byte ptr [rdi], 0         ; Set success flag in output struct
            0x5F,                    # pop rdi                       ; Restore rdi
            0xC3                     # ret
        ])
        
        # Dynamically insert the 64-bit absolute address of memcpy
        struct.pack_into('<Q', receiver_shellcode, 19, addr_memcpy_target)

        pm.write_bytes(ADDR_RECEIVER_PATCH_POINT, bytes(receiver_shellcode), len(receiver_shellcode))
        print(f"[*] Corrected receiver shellcode injected at {hex(ADDR_RECEIVER_PATCH_POINT)}")

        # NOP out the rest of the original function to be safe
        nop_padding = b'\x90' * 500
        pm.write_bytes(ADDR_RECEIVER_PATCH_POINT + len(receiver_shellcode), nop_padding, len(nop_padding))
        print("[*] Remainder of original receiver function neutralized.")
        
        # --- 3. APPLY LISTEN SERVER PATCHES ---
        print("\n--- Applying Listen Server Patches ---")
        print(f"[*] Patching IsServer check at {hex(ADDR_LISTEN_SERVER_CHECK_JUMP)}...")
        pm.write_bytes(ADDR_LISTEN_SERVER_CHECK_JUMP, b'\x90' * 6, 6)
        print(f"[*] Rerouting listen success jump at {hex(ADDR_LISTEN_SUCCESS_JUMP)}...")
        jmp_offset = ADDR_JUMP_TARGET - (ADDR_LISTEN_SUCCESS_JUMP + 5)
        jmp_instruction = b'\xE9' + struct.pack('<i', jmp_offset)
        pm.write_bytes(ADDR_LISTEN_SUCCESS_JUMP, jmp_instruction, 5)
        pm.write_bytes(ADDR_LISTEN_SUCCESS_JUMP + 5, b'\x90', 1)

        print("\n[SUCCESS] All patches have been applied!")
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