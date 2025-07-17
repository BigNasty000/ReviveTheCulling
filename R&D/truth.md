# The Culling - Plaintext Communication Patch Guide

This document outlines the two manual patches required to be applied to `Victory.exe` at runtime using **x64dbg**. These patches will disable the client-side encryption and decryption, allowing a custom server to communicate with the game using a simple, unencrypted protocol.

---

## 🧰 Prerequisites

- A running copy of **The Culling**.
- `x64dbg` attached to the `Victory.exe` process.
- The correct **runtime base address** for `Victory.exe` for the current session.
  - All addresses in this guide are based on the `0x7FF722010000` session base.
  - You **must recalculate them** if your base address is different.

---

## 🧱 Part 1: Encryption Bypass (Client ➝ Server)

### 🎯 Goal

Modify the low-level sending function (`...e510`) to replace the call to the encryption function with a simple `memcpy`. This forces the client to send its handshake and game packets as plaintext.

### Step 1: Find the `memcpy` Address

1. In `x64dbg`, press **Ctrl+G**.
2. In the “Go to Expression” dialog, type `memcpy` and press **OK**.
3. The CPU view will jump to the `memcpy` function in the C runtime library.
4. **Note this address** (e.g., `0x00007FFA0B62C820`). You will use it in the patch.

### Step 2: Patch the Sending Function

1. Press **Ctrl+G** and go to address:  
   `0x00007FF72289E540`
2. Double-click the instruction at `...E540` to begin assembling (press space bar).
3. Enter the following assembly instructions (one by one) exactly as written, skip comments... and make sure "fill with NOPs" is checked:

```
; --- Our New In-Place Patch ---

; Set up arguments for memcpy(dest, src, size)

LEA RCX, qword ptr [RSP+40]     ; Destination buffer
MOV RDX, RDX                    ; Source buffer (redundant but logical)
MOV R8, R8                      ; Size (redundant but logical)

MOV RAX, 0x00007FFA0B62C820     ; <--- USE YOUR memcpy ADDRESS
CALL RAX

MOV dword ptr [RSP+44], R8D     ; Set expected final size
```

---

## 🧱 Part 2: Decryption Bypass (Server ➝ Client)

### 🎯 Goal

Modify the low-level receiving function (`...e380`) to skip decryption and accept plaintext packets from our server.

### Step 1: Patch the Size Calculation

1. Go to address:  
   `0x00007FF72289E439`
2. The original instruction is:

```
mov dword ptr ss:[rsp+44], 0
```

3. space bar to assemble and **replace it with**:

```
mov dword ptr [rsp+44], r8d
```

> ✅ This sets the “decrypted” size to match the received packet size.

### Step 2: NOP Out the Decryption Call

1. Go to address:  
   `0x00007FF72289E441`
2. This is the original 5-byte `CALL` to the decryption function (`...C750`).
3. Right-click the line and select:  
   **Binary → Fill with NOPs**

---

## ✅ Final Result

After applying both patches, the game client is **fully prepared for two-way unencrypted communication**. It will no longer crash or disconnect when interacting with a simple server that sends plaintext `NMT_Welcome` packets.

You are now ready to develop the game protocol logic.
