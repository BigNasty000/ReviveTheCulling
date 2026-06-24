#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#define WM_DO_TICK (WM_APP + 2)
#define _WINSOCK_DEPRECATED_NO_WARNINGS
#define WM_DO_HOST (WM_APP + 1)
#define NET_TICK_TIMER_ID 0x7777
 
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <stdio.h>
#include <stdint.h>
#include <string>
#include <stddef.h>
#include <vector>
#undef PlaySound
#undef DrawText
#undef GetObject
#undef UpdateResource
#undef GetMessage
#undef min
#undef max

#include "SDK.hpp"
#include <algorithm>
#include "SDK/Basic.cpp"
#include "SDK/CoreUObject_functions.cpp"
#include "SDK/Engine_functions.cpp"

using namespace SDK;

// --- PROXY EXPORTS ---
#pragma comment(lib, "Ws2_32.lib")
#pragma comment(linker, "/export:GetFileVersionInfoA=C:\\Windows\\System32\\version.dll.GetFileVersionInfoA")
#pragma comment(linker, "/export:GetFileVersionInfoByHandle=C:\\Windows\\System32\\version.dll.GetFileVersionInfoByHandle")
#pragma comment(linker, "/export:GetFileVersionInfoExA=C:\\Windows\\System32\\version.dll.GetFileVersionInfoExA")
#pragma comment(linker, "/export:GetFileVersionInfoExW=C:\\Windows\\System32\\version.dll.GetFileVersionInfoExW")
#pragma comment(linker, "/export:GetFileVersionInfoSizeA=C:\\Windows\\System32\\version.dll.GetFileVersionInfoSizeA")
#pragma comment(linker, "/export:GetFileVersionInfoSizeExA=C:\\Windows\\System32\\version.dll.GetFileVersionInfoSizeExA")
#pragma comment(linker, "/export:GetFileVersionInfoSizeExW=C:\\Windows\\System32\\version.dll.GetFileVersionInfoSizeExW")
#pragma comment(linker, "/export:GetFileVersionInfoSizeW=C:\\Windows\\System32\\version.dll.GetFileVersionInfoSizeW")
#pragma comment(linker, "/export:GetFileVersionInfoW=C:\\Windows\\System32\\version.dll.GetFileVersionInfoW")
#pragma comment(linker, "/export:VerFindFileA=C:\\Windows\\System32\\version.dll.VerFindFileA")
#pragma comment(linker, "/export:VerFindFileW=C:\\Windows\\System32\\version.dll.VerFindFileW")
#pragma comment(linker, "/export:VerInstallFileA=C:\\Windows\\System32\\version.dll.VerInstallFileA")
#pragma comment(linker, "/export:VerInstallFileW=C:\\Windows\\System32\\version.dll.VerInstallFileW")
#pragma comment(linker, "/export:VerLanguageNameA=C:\\Windows\\System32\\version.dll.VerLanguageNameA")
#pragma comment(linker, "/export:VerLanguageNameW=C:\\Windows\\System32\\version.dll.VerLanguageNameW")
#pragma comment(linker, "/export:VerQueryValueA=C:\\Windows\\System32\\version.dll.VerQueryValueA")
#pragma comment(linker, "/export:VerQueryValueW=C:\\Windows\\System32\\version.dll.VerQueryValueW")
bool HasCmdLineFlag(const wchar_t* Flag)
{
    const wchar_t* Cmd = GetCommandLineW();
    if (!Cmd || !Flag)
        return false;

    return wcsstr(Cmd, Flag) != nullptr;
}

bool IsClientPatchMode()
{
    return HasCmdLineFlag(L"-client");
}
struct FFakeString {
    const wchar_t* Data;
    int32 Num;
    int32 Max;
};

struct FFakeURL {
    FFakeString Protocol;
    FFakeString Host;
    int32 Port;
    int32 Valid;
    FFakeString Map;
    FFakeString Portal;
    FFakeString* OpData;
    int32 OpNum;
    int32 OpMax;
    FFakeString RedirectURL;
};

struct FFakeErrorString {
    wchar_t* Data;
    int32 Num;
    int32 Max;
};
static bool gInsideManualNetTick = false;
static uint64_t gLastManualNetTickMs = 0;
static int gManualNetTickCounter = 0;
WNDPROC OriginalWndProc = nullptr;
bool bIsServerBooting = false;
UNetDriver* gServerDriver = nullptr;
uintptr_t* gServerDriverVTable = nullptr;
using tTickFlush = void(__fastcall*)(void* Driver, float DeltaSeconds);

static tTickFlush gOrigSteamTickFlush = nullptr;
static constexpr size_t VT_INDEX_TICKFLUSH = 0x278 / 8; // 79
static bool gActorPumpTickFlushPatched = false;
static bool gInActorPumpTick = false;
static wchar_t gSteamAddrString[] = L"steam.1:7777";
// RVAs from your current build/session.
static constexpr uintptr_t RVA_WORLD_PTR = 0x3309C80;
static constexpr uintptr_t RVA_CONSTRUCT_OBJECT = 0x6933B0;

// 00007FF7E955FDA0 - 00007FF7E6730000 = 0x2E2FDA0
static constexpr uintptr_t RVA_STEAM_CREATE_ADDR_FIELD = 0x2E2FDA0;

// 00007FF7E8A511D0 - 00007FF7E6730000 = 0x23211D0
static constexpr uintptr_t RVA_ORIGINAL_STEAM_CREATE_ADDR = 0x23211D0;
bool gAutoTickEnabled = false;
bool gGameThreadNetTickEnabled = false;
HANDLE gAutoTickThread = nullptr;
using tCreateInternetAddr = void* (__fastcall*)(void* Subsystem, void* OutMaybe);
struct FakeNotifyObject {
    void** VTable;
};

static constexpr uintptr_t OFFSET_WorldContext_World = 0x298;
static constexpr uintptr_t OFFSET_UWorld_AuthorityGameMode = 0xF0;
static constexpr uintptr_t OFFSET_AShooterGameMode_WarmupTime = 0x598;
// 00007FF7D230E8D4 - 00007FF7D11F0000 = 0x111E8D4
// GetNetMode fallback:
//   xor eax,eax
//   ...
//   ret
static constexpr uintptr_t RVA_GETNETMODE_FALLBACK_XOR_EAX = 0x111E8D4;
static UWorld* gServerWorld = nullptr;

bool PatchBytes(uintptr_t Address, const uint8_t* Bytes, size_t Count) {
    DWORD oldProtect;
    if (!VirtualProtect((void*)Address, Count, PAGE_EXECUTE_READWRITE, &oldProtect)) {
        printf("[PATCH] VirtualProtect failed at %p: %lu\n", (void*)Address, GetLastError());
        return false;
    }

    memcpy((void*)Address, Bytes, Count);

    DWORD temp;
    VirtualProtect((void*)Address, Count, oldProtect, &temp);

    printf("[PATCH] Wrote %zu bytes at %p\n", Count, (void*)Address);
    return true;
}

void PatchAddressCompare(uintptr_t GameBase) {
    // 00007FF7E8A3E33A: mov rax, [rdx+8]
    // Replace with:       mov rax, [rdx]
    uint8_t p1[] = {
        0x48, 0x8B, 0x02,       // mov rax, qword ptr [rdx]
        0x90                    // nop
    };

    // 00007FF7E8A3E341: lea rcx, [rdx+8]
    // Replace with:       mov rcx, rdx ; nop
    uint8_t p2[] = {
        0x48, 0x8B, 0xCA,       // mov rcx, rdx
        0x90                    // nop
    };

    PatchBytes(GameBase + 0x230E33A, p1, sizeof(p1));
    PatchBytes(GameBase + 0x230E341, p2, sizeof(p2));

    printf("[PATCH] Address compare patched\n");
}

void DumpMem(const char* Name, void* Ptr, size_t Size) {
    printf("[%s] ptr=%p\n", Name, Ptr);

    if (!Ptr) {
        printf("[%s] NULL\n", Name);
        return;
    }

    uint8_t* p = (uint8_t*)Ptr;

    for (size_t i = 0; i < Size; i++) {

        if ((i % 16) == 0) {
            printf("%p  ", p + i);
        }

        printf("%02X ", p[i]);

        if ((i % 16) == 15) {
            printf("\n");
        }
    }

    printf("\n");
}

tCreateInternetAddr OriginalCreateInternetAddr = nullptr;
bool gBindPatched = false;
sockaddr_in gLastClientAddr{};
bool gHaveClientAddr = false;

SOCKET gListenSocket = INVALID_SOCKET;


using tRecvFromRaw = int (WSAAPI*)(
    SOCKET s,
    char* buf,
    int len,
    int flags,
    sockaddr* from,
    int* fromlen
    );

tRecvFromRaw OriginalRecvFromRaw = nullptr;

int WSAAPI HookedRecvFromRaw(
    SOCKET s,
    char* buf,
    int len,
    int flags,
    sockaddr* from,
    int* fromlen
) {
    int result = OriginalRecvFromRaw(s, buf, len, flags, from, fromlen);

    if (
        result > 0 &&
        s == gListenSocket &&
        from &&
        fromlen &&
        *fromlen >= sizeof(sockaddr_in)
        ) {
        gLastClientAddr = *(sockaddr_in*)from;
        gHaveClientAddr = true;

        char ipbuf[64]{};
        InetNtopA(AF_INET, &gLastClientAddr.sin_addr, ipbuf, sizeof(ipbuf));

        printf("[HOOK] Raw recvfrom captured client %s:%d\n",
            ipbuf,
            ntohs(gLastClientAddr.sin_port));
    }

    return result;
}
bool PatchIATRecvFrom() {
    HMODULE hModule = GetModuleHandle(NULL);
    if (!hModule) return false;

    uint8_t* base = (uint8_t*)hModule;
    auto dos = (IMAGE_DOS_HEADER*)base;
    auto nt = (IMAGE_NT_HEADERS*)(base + dos->e_lfanew);

    IMAGE_DATA_DIRECTORY importDir =
        nt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT];

    if (!importDir.VirtualAddress) {
        printf("[IAT] No import directory\n");
        return false;
    }

    auto importDesc = (IMAGE_IMPORT_DESCRIPTOR*)(base + importDir.VirtualAddress);

    FARPROC targetRecvFrom = GetProcAddress(GetModuleHandleA("ws2_32.dll"), "recvfrom");
    if (!targetRecvFrom) {
        printf("[IAT] Could not resolve ws2_32!recvfrom\n");
        return false;
    }

    OriginalRecvFromRaw = (tRecvFromRaw)targetRecvFrom;

    for (; importDesc->Name; importDesc++) {
        const char* dllName = (const char*)(base + importDesc->Name);

        if (_stricmp(dllName, "ws2_32.dll") != 0 &&
            _stricmp(dllName, "WS2_32.dll") != 0) {
            continue;
        }

        auto thunk = (IMAGE_THUNK_DATA*)(base + importDesc->FirstThunk);

        for (; thunk->u1.Function; thunk++) {
            void** funcPtr = (void**)&thunk->u1.Function;

            if (*funcPtr == (void*)targetRecvFrom) {
                DWORD oldProtect;
                if (!VirtualProtect(funcPtr, sizeof(void*), PAGE_EXECUTE_READWRITE, &oldProtect)) {
                    printf("[IAT] VirtualProtect failed: %lu\n", GetLastError());
                    return false;
                }

                printf("[IAT] Patching ws2_32!recvfrom IAT\n");
                printf("      IAT slot = %p\n", funcPtr);
                printf("      Old      = %p\n", *funcPtr);
                printf("      New      = %p\n", &HookedRecvFromRaw);

                *funcPtr = (void*)&HookedRecvFromRaw;

                DWORD temp;
                VirtualProtect(funcPtr, sizeof(void*), oldProtect, &temp);

                printf("[IAT] recvfrom patched successfully\n");
                return true;
            }
        }
    }

    printf("[IAT] recvfrom import slot not found\n");
    return false;
}
bool __fastcall MyBind(void* SocketObj, void* AddrObj) {
    SOCKET s = *(SOCKET*)((uint8_t*)SocketObj + 0x20);

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(7777);
    addr.sin_addr.s_addr = htonl(INADDR_ANY);

    int result = bind(s, (sockaddr*)&addr, sizeof(addr));
    int err = WSAGetLastError();

    if (result == 0) {
        gListenSocket = s;
        printf("[HOOK] Stored gListenSocket=%llu\n",
            (unsigned long long)gListenSocket);
    }

    printf("[HOOK] MyBind called\n");
    printf("       SocketObj=%p AddrObj=%p SOCKET=%llu\n",
        SocketObj, AddrObj, (unsigned long long)s);
    printf("       bind result=%d WSA=%d\n", result, err);

    return result == 0;

}

#include <windows.h>
#include <stdint.h>
#include <stdio.h>

static void DumpHexBytes(const void* Data, int Count)
{
    if (!Data || Count <= 0)
    {
        printf("[DUMPHEX] Data=%p Count=%d\n", Data, Count);
        return;
    }

    const unsigned char* p = (const unsigned char*)Data;

    printf("[DUMPHEX] %d bytes at %p\n", Count, Data);

    for (int i = 0; i < Count; i += 16)
    {
        printf("%04X  ", i);

        for (int j = 0; j < 16; j++)
        {
            if (i + j < Count)
                printf("%02X ", p[i + j]);
            else
                printf("   ");
        }

        printf(" ");

        for (int j = 0; j < 16; j++)
        {
            if (i + j < Count)
            {
                unsigned char c = p[i + j];
                printf("%c", (c >= 32 && c <= 126) ? c : '.');
            }
        }

        printf("\n");
    }
}

static void DumpCallStackSimple()
{
    void* stack[64] = {};
    USHORT frames = RtlCaptureStackBackTrace(0, 64, stack, nullptr);

    printf("[STACK] frames=%u\n", frames);

    for (USHORT i = 0; i < frames; i++)
    {
        printf("  [%02u] %p\n", i, stack[i]);
    }
}

static void LogShortSendPacket(const void* Data, int Count)
{
    if (Count <= 32)
    {
        printf("\n================ SHORT SEND ================\n");
        printf("[SHORT SEND] Count=%d\n", Count);
        DumpHexBytes(Data, Count);
        DumpCallStackSimple();
        printf("============================================\n\n");
    }

    if (Count == 9)
    {
        printf("[BREAK] Count == 9 send detected\n");
        __debugbreak();
    }
}
struct FAddrPatch_FString
{
    wchar_t* Data;
    int32_t Num;
    int32_t Max;
};

static FAddrPatch_FString* __fastcall FakeInternetAddr_ToString_Empty(
    void* ThisAddr,
    FAddrPatch_FString* OutString,
    bool bAppendPort)
{
    if (!OutString)
        return nullptr;

    // Return an empty FString.
    OutString->Data = nullptr;
    OutString->Num = 0;
    OutString->Max = 0;

    // IMPORTANT:
    // Do not printf here for now. Some call paths use RAX immediately after this
    // virtual call, and returning OutString keeps RAX correct.
    return OutString;
}


static bool IsProbablyPointer(void* P)
{
    uintptr_t V = (uintptr_t)P;
    return V > 0x10000;
}
static bool PatchInternetAddrToStringSlot(void* AddrObj, const char* Tag)
{
    if (!IsProbablyPointer(AddrObj))
        return false;

    void** VT = nullptr;

    __try {
        VT = *(void***)AddrObj;
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        printf("[ADDR PATCH] %s failed reading vtable AddrObj=%p\n",
            Tag ? Tag : "?",
            AddrObj);
        return false;
    }

    if (!IsProbablyPointer(VT))
        return false;

    void** Slot = &VT[11]; // +0x58 / 8

    void* Old = nullptr;
    __try {
        Old = *Slot;
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        printf("[ADDR PATCH] %s failed reading slot AddrObj=%p VT=%p Slot=%p\n",
            Tag ? Tag : "?",
            AddrObj,
            VT,
            Slot);
        return false;
    }

    printf("[ADDR PATCH CHECK] %s AddrObj=%p VT=%p Slot11=%p\n",
        Tag ? Tag : "?",
        AddrObj,
        VT,
        Old);

    DWORD oldProtect = 0;
    if (!VirtualProtect(Slot, sizeof(void*), PAGE_EXECUTE_READWRITE, &oldProtect))
        return false;

    *Slot = (void*)&FakeInternetAddr_ToString_Empty;

    DWORD ignored = 0;
    VirtualProtect(Slot, sizeof(void*), oldProtect, &ignored);

    printf("[ADDR PATCH] %s AddrObj=%p VT=%p Slot[11/+0x58]=%p -> %p\n",
        Tag ? Tag : "?",
        AddrObj,
        VT,
        Old,
        *Slot);

    return true;
}

bool __fastcall MySendTo(
    void* SocketObj,
    const uint8_t* Data,
    int Count,
    int* BytesSent,
    void* AddrObj
) {

    SOCKET s = *(SOCKET*)((uint8_t*)SocketObj + 0x20);

    // If we don't have a captured client yet, let the native engine handle it
    if (!gHaveClientAddr) {
        if (BytesSent) *BytesSent = -1;
        return false;
    }

    // CRITICAL: Only hijack the packet if it's coming from our Game Listen Socket!
    if (s == gListenSocket) {
        int result = sendto(
            s,
            (const char*)Data,
            Count,
            0,
            (sockaddr*)&gLastClientAddr,
            sizeof(gLastClientAddr)
        );

        if (BytesSent) *BytesSent = result;
        return result >= 0;
    }

    // If the server is trying to send a packet to Steam/Backend API, 
    // returning false lets the original engine SendTo handle it safely.
    if (BytesSent) *BytesSent = -1;
    return false;
}
bool SafeReadPtrRaw(void* Address, void** Out)
{
    if (!Address || !Out)
        return false;

    __try {
        *Out = *(void**)Address;
        return true;
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        *Out = nullptr;
        return false;
    }
}




bool __fastcall MyRecvFrom(
    void* SocketObj,
    uint8_t* Data,
    int BufferSize,
    int* BytesRead,
    void* AddrObj
) {

    SOCKET s = *(SOCKET*)((uint8_t*)SocketObj + 0x20);

    sockaddr_in from{};
    int fromLen = sizeof(from);

    int result = recvfrom(
        s,
        (char*)Data,
        BufferSize,
        0,
        (sockaddr*)&from,
        &fromLen
    );

    int dumpCount = (result < 16) ? result : 16;

    printf("[HOOK] First bytes: ");
    for (int i = 0; i < dumpCount; i++) {
        printf("%02X ", Data[i]);
    }
    printf("\n");
    printf("\n");
    int err = WSAGetLastError();

    if (result == SOCKET_ERROR) {
        if (BytesRead) *BytesRead = 0;

        if (err != WSAEWOULDBLOCK) {
            printf("[HOOK] MyRecvFrom failed result=-1 WSA=%d\n", err);
        }

        return false;
    }

    if (BytesRead) {
        *BytesRead = result;
    }

    if (result > 0) {
        gLastClientAddr = from;
        gHaveClientAddr = true;

        char ipbuf[64]{};
        InetNtopA(AF_INET, &from.sin_addr, ipbuf, sizeof(ipbuf));

        printf("[HOOK] MyRecvFrom got %d bytes from %s:%d\n",
            result,
            ipbuf,
            ntohs(from.sin_port));
    }

    return result > 0;
}


bool PatchBindFromSocket(void* SocketObj) {
    if (gBindPatched || !SocketObj) return true;

    uintptr_t* SocketVTable = *(uintptr_t**)SocketObj;
    uintptr_t* BindSlot = (uintptr_t*)((uint8_t*)SocketVTable + 0x10);

    DWORD oldProtect;
    VirtualProtect(BindSlot, sizeof(uintptr_t), PAGE_EXECUTE_READWRITE, &oldProtect);

    printf("[*] Auto-patching socket bind slot\n");
    printf("    SocketObj    = %p\n", SocketObj);
    printf("    SocketVTable = %p\n", SocketVTable);
    printf("    BindSlot     = %p\n", BindSlot);
    printf("    OldBind      = %p\n", (void*)*BindSlot);
    printf("    NewBind      = %p\n", (void*)&MyBind);

    *BindSlot = (uintptr_t)&MyBind;

    DWORD temp;
    VirtualProtect(BindSlot, sizeof(uintptr_t), oldProtect, &temp);

    gBindPatched = true;
    return true;
}
bool PatchGlobalBindSlot(uintptr_t GameBase) {
    uintptr_t BindSlot = GameBase + 0x27388D8;

    DWORD oldProtect;
    if (!VirtualProtect((void*)BindSlot, sizeof(uintptr_t), PAGE_EXECUTE_READWRITE, &oldProtect)) {
        printf("[ERROR] VirtualProtect BindSlot failed: %lu\n", GetLastError());
        return false;
    }

    printf("[*] Patching global bind slot\n");
    printf("    BindSlot = %p\n", (void*)BindSlot);
    printf("    OldBind  = %p\n", (void*)*(uintptr_t*)BindSlot);
    printf("    NewBind  = %p\n", (void*)&MyBind);

    *(uintptr_t*)BindSlot = (uintptr_t)&MyBind;
    uintptr_t SendSlot = GameBase + 0x2738910; // 00007FF7E8E68910 if base is 00007FF7E6730000

    DWORD temp;
    VirtualProtect((void*)BindSlot, sizeof(uintptr_t), oldProtect, &temp);

    printf("[SUCCESS] Global bind slot patched.\n");
    return true;
}
bool PatchGlobalSendSlot(uintptr_t GameBase) {
    uintptr_t SendSlot = GameBase + 0x2738910;

    DWORD oldProtect;
    if (!VirtualProtect((void*)SendSlot, sizeof(uintptr_t), PAGE_EXECUTE_READWRITE, &oldProtect)) {
        printf("[ERROR] VirtualProtect SendSlot failed: %lu\n", GetLastError());
        return false;
    }

    printf("[*] Patching global send slot\n");
    printf("    SendSlot = %p\n", (void*)SendSlot);
    printf("    OldSend  = %p\n", (void*)*(uintptr_t*)SendSlot);
    printf("    NewSend  = %p\n", (void*)&MySendTo);

    *(uintptr_t*)SendSlot = (uintptr_t)&MySendTo;

    DWORD temp;
    VirtualProtect((void*)SendSlot, sizeof(uintptr_t), oldProtect, &temp);

    printf("[SUCCESS] Global send slot patched.\n");
    return true;
}
bool PatchSocketBindSlot(void* SocketObj) {
    uintptr_t* VTable = *(uintptr_t**)SocketObj;
    uintptr_t* BindSlot = (uintptr_t*)((uint8_t*)VTable + 0x10);

    DWORD oldProtect;
    if (!VirtualProtect(BindSlot, sizeof(uintptr_t), PAGE_EXECUTE_READWRITE, &oldProtect)) {
        printf("[ERROR] VirtualProtect BindSlot failed: %lu\n", GetLastError());
        return false;
    }

    printf("[*] Patching socket bind slot...\n");
    printf("    SocketObj = %p\n", SocketObj);
    printf("    VTable    = %p\n", VTable);
    printf("    Old Bind  = %p\n", (void*)*BindSlot);
    printf("    New Bind  = %p\n", (void*)&MyBind);

    *BindSlot = (uintptr_t)&MyBind;

    DWORD temp;
    VirtualProtect(BindSlot, sizeof(uintptr_t), oldProtect, &temp);

    printf("[SUCCESS] Socket bind slot patched.\n");
    return true;
}
void DumpMemory16(const char* label, void* ptr) {
    if (!ptr) {
        printf("[%s] null\n", label);
        return;
    }

    printf("[%s] %p\n", label, ptr);

    __try {
        uint8_t* p = (uint8_t*)ptr;
        for (int row = 0; row < 4; row++) {
            printf("  +0x%02X: ", row * 16);
            for (int i = 0; i < 16; i++) {
                printf("%02X ", p[row * 16 + i]);
            }
            printf("\n");
        }
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        printf("  [!] Could not read memory.\n");
    }
}

void* __fastcall MyCreateInternetAddr(void* Subsystem, void* OutMaybe) {
    printf("\n[HOOK] MyCreateInternetAddr called\n");
    printf("       Subsystem = %p\n", Subsystem);
    printf("       OutMaybe  = %p\n", OutMaybe);

    void* Wrapper = nullptr;

    if (OriginalCreateInternetAddr) {
        Wrapper = OriginalCreateInternetAddr(Subsystem, OutMaybe);
    }

    printf("[HOOK] Original returned Wrapper = %p\n", Wrapper);

    if (Wrapper) {
        void* AddrObj = nullptr;
        void* RefObj = nullptr;

        __try {
            AddrObj = *(void**)Wrapper;
            RefObj = *(void**)((uint8_t*)Wrapper + 0x8);
        }
        __except (EXCEPTION_EXECUTE_HANDLER) {
            printf("[HOOK] Failed reading wrapper fields.\n");
            return Wrapper;
        }

        printf("[HOOK] Wrapper[0x00] AddrObj = %p\n", AddrObj);
        printf("[HOOK] Wrapper[0x08] RefObj  = %p\n", RefObj);

        DumpMemory16("Wrapper", Wrapper);
        DumpMemory16("AddrObj", AddrObj);
        DumpMemory16("RefObj", RefObj);

        // This is the important part.
        // The purecall is happening on FInternetAddr::ToString(true), slot +0x58.
        // Wrapper[0] is the actual FInternetAddr object in your dumps.
        //PatchInternetAddrToStringSlot(AddrObj, "CreateInternetAddr.AddrObj");


    }

    return Wrapper;
}
void PatchRealNotifyControlMessage(uintptr_t GameBase) {
    // 00007FF7E7DB5A90:
    // ret
    uint8_t patch[] = {
        0xC3
    };

    PatchBytes(GameBase + 0x1685A90, patch, sizeof(patch));
    printf("[PATCH] Real NotifyControlMessage no-op\n");
}
void PatchNullGuard_E7D8A550(uintptr_t GameBase) {
    // 00007FF7E7D8A550:
    // test rcx,rcx
    // je ret_zero
    //
    // ret_zero:
    // ret
    uint8_t patch[] = {
        0x48, 0x85, 0xC9,             // test rcx, rcx
        0x74, 0x08,                   // je +8
        0x55,                         // push rbp
        0x48, 0x83, 0xEC, 0x50,       // sub rsp,50
        0xE9, 0xF7, 0xFF, 0xFF, 0xFF, // jmp E7D8A556
        0xC3                          // ret
    };

    PatchBytes(GameBase + 0x165A550, patch, sizeof(patch));
    printf("[PATCH] Null guard for E7D8A550\n");
}
void PatchNetspeedNoCrash(uintptr_t GameBase) {
    uint8_t patch[] = {
        0x33, 0xD2, // xor edx,edx
        0x90        // nop
    };

    PatchBytes(GameBase + 0x1685EE8, patch, sizeof(patch));
    printf("[PATCH] NMT_Netspeed null max-rate read bypassed\n");
}
void PatchRealNotifyControlForceServer(uintptr_t GameBase) {
    uint8_t patch[] = {
        0x48, 0x8B, 0xF2,              // mov rsi, rdx
        0x4C, 0x8B, 0xE9,              // mov r13, rcx
        0xE9, 0xD4, 0x01, 0x00, 0x00,  // jmp E7DB5C99
        0x90, 0x90, 0x90
    };

    PatchBytes(GameBase + 0x1685ABA, patch, sizeof(patch));
    printf("[PATCH] NotifyControlMessage forced server branch before null check\n");
}

bool PatchCreateAddrSlot(uintptr_t GameBase) {
    uintptr_t FieldAddress = GameBase + RVA_STEAM_CREATE_ADDR_FIELD;
    uintptr_t OriginalFn = GameBase + RVA_ORIGINAL_STEAM_CREATE_ADDR;

    OriginalCreateInternetAddr = (tCreateInternetAddr)OriginalFn;

    printf("[*] Patching CreateInternetAddr slot...\n");
    printf("    FieldAddress = %p\n", (void*)FieldAddress);
    printf("    OriginalFn   = %p\n", (void*)OriginalFn);
    printf("    HookFn       = %p\n", (void*)&MyCreateInternetAddr);

    __try {
        uintptr_t Current = *(uintptr_t*)FieldAddress;
        printf("    Current slot = %p\n", (void*)Current);
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        printf("[ERROR] Could not read CreateInternetAddr slot.\n");
        return false;
    }

    DWORD OldProtect = 0;

    if (!VirtualProtect((void*)FieldAddress, sizeof(uintptr_t), PAGE_EXECUTE_READWRITE, &OldProtect)) {
        printf("[ERROR] VirtualProtect failed: %lu\n", GetLastError());
        return false;
    }

    *(uintptr_t*)FieldAddress = (uintptr_t)&MyCreateInternetAddr;

    DWORD Temp = 0;
    VirtualProtect((void*)FieldAddress, sizeof(uintptr_t), OldProtect, &Temp);

    printf("[SUCCESS] CreateInternetAddr slot patched.\n");
    return true;
}

void PrintErrorString(void* ErrorBuffer) {
    FFakeErrorString* Err = (FFakeErrorString*)ErrorBuffer;

    if (Err && Err->Data) {
        printf("[ENGINE ERROR MESSAGE]: %ls\n", Err->Data);
    }
    else {
        printf("[ENGINE ERROR MESSAGE]: <empty/null>\n");
    }
}

void DumpURLLayout(FFakeURL* URL) {
    printf("\n[*] Fake FURL layout diagnostics:\n");
    printf("    sizeof(FFakeURL) = 0x%X\n", (unsigned int)sizeof(FFakeURL));
    printf("    Port offset      = 0x%X | value=%d\n", (unsigned int)offsetof(FFakeURL, Port), URL->Port);
    printf("    Valid offset     = 0x%X | value=%d\n", (unsigned int)offsetof(FFakeURL, Valid), URL->Valid);

    printf("\n[*] Raw URL memory dump:\n");
    for (int i = 0; i < 0x80; i += 4) {
        printf("    URL + 0x%02X = %08X\n", i, *(uint32_t*)((uint8_t*)URL + i));
    }
}

bool NopBytes(uintptr_t Address, size_t Count) {
    DWORD oldProtect;
    if (!VirtualProtect((void*)Address, Count, PAGE_EXECUTE_READWRITE, &oldProtect)) {
        printf("[ERROR] VirtualProtect NOP failed: %lu\n", GetLastError());
        return false;
    }

    memset((void*)Address, 0x90, Count);

    DWORD temp;
    VirtualProtect((void*)Address, Count, oldProtect, &temp);

    printf("[PATCH] NOP'd %zu bytes at %p\n", Count, (void*)Address);
    return true;
}

static UWorld* gAttachedWorld = nullptr;
static UNetDriver* gAttachedDriver = nullptr;

static void PrintWorldDriverSlots(const char* Tag, UWorld* World)
{
    if (!World) {
        printf("[NET ATTACH] %s World=NULL\n", Tag);
        return;
    }

    __try {
        printf("[NET ATTACH] %s World=%p SDK World->NetDriver=%p +0x38=%p\n",
            Tag,
            World,
            World->NetDriver,
            *(void**)((uint8_t*)World + 0x38));
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        printf("[NET ATTACH] %s failed reading world slots\n", Tag);
    }
}
// 00007FF7D230E8D4 - 00007FF7D11F0000 = 0x111E8D4
void PatchGetNetModeFallbackToDedicated(uintptr_t GameBase)
{
    // Original at D230E8D4:
    //   33 C0    xor eax,eax      ; NM_Standalone / 0
    //
    // Patch:
    //   B0 01    mov al,1         ; NM_DedicatedServer / 1
    //
    // This makes broken/no-netdriver fallback behave dedicated instead of standalone.
    uint8_t patch[] = {
        0xB0, 0x01
    };

    uintptr_t addr = GameBase + RVA_GETNETMODE_FALLBACK_XOR_EAX;

    PatchBytes(addr, patch, sizeof(patch));

    printf("[SERVER MODE] GetNetMode fallback patched: Standalone -> DedicatedServer at %p\n",
        (void*)addr);
}
void PatchGetNetModeFallbackToListen(uintptr_t GameBase)
{
    // At 00007FF7D230E8D4:
    // Original: 33 C0    xor eax,eax   ; return NM_Standalone / 0
    //
    // Patch:    B0 02    mov al,2      ; return NM_ListenServer / 2
    //
    // This works because this fallback path reaches here with RAX already zero.
    uint8_t patch[] = {
        0xB0, 0x02
    };

    uintptr_t addr = GameBase + RVA_GETNETMODE_FALLBACK_XOR_EAX;

    PatchBytes(addr, patch, sizeof(patch));

    printf("[PATCH] GetNetMode fallback patched: Standalone -> ListenServer at %p\n",
        (void*)addr);
}



struct BoolCandidate {
    uintptr_t addr;
    uint8_t value;
    int refs;
};

bool IsReadablePtr(void* p)
{
    MEMORY_BASIC_INFORMATION mbi{};
    if (!VirtualQuery(p, &mbi, sizeof(mbi)))
        return false;

    if (mbi.State != MEM_COMMIT)
        return false;

    DWORD protect = mbi.Protect & 0xFF;
    return protect == PAGE_READONLY ||
        protect == PAGE_READWRITE ||
        protect == PAGE_WRITECOPY ||
        protect == PAGE_EXECUTE_READ ||
        protect == PAGE_EXECUTE_READWRITE ||
        protect == PAGE_EXECUTE_WRITECOPY;
}

void PatchBool(uintptr_t addr, uint8_t value, const char* name)
{
    if (!addr)
        return;

    DWORD oldProtect = 0;
    if (!VirtualProtect((void*)addr, 1, PAGE_EXECUTE_READWRITE, &oldProtect)) {
        printf("[SERVER MODE] Failed VirtualProtect %s at %p err=%lu\n",
            name, (void*)addr, GetLastError());
        return;
    }

    uint8_t oldValue = *(uint8_t*)addr;
    *(uint8_t*)addr = value;

    DWORD temp = 0;
    VirtualProtect((void*)addr, 1, oldProtect, &temp);

    printf("[SERVER MODE] %s %p: %u -> %u\n",
        name, (void*)addr, oldValue, value);
}
void ScanBoolGetterCandidates(uintptr_t GameBase)
{
    auto dos = (IMAGE_DOS_HEADER*)GameBase;
    auto nt = (IMAGE_NT_HEADERS*)(GameBase + dos->e_lfanew);

    uintptr_t imageStart = GameBase;
    uintptr_t imageEnd = GameBase + nt->OptionalHeader.SizeOfImage;

    printf("[SERVER MODE] Scanning bool getter candidates...\n");

    int printed = 0;

    for (uintptr_t p = imageStart; p + 8 < imageEnd; p++) {
        uint8_t* b = (uint8_t*)p;

        // 0F B6 05 xx xx xx xx C3
        // movzx eax, byte ptr [rip+disp32]
        // ret
        if (b[0] == 0x0F && b[1] == 0xB6 && b[2] == 0x05 && b[7] == 0xC3) {
            int32_t disp = *(int32_t*)(p + 3);
            uintptr_t target = p + 7 + disp;

            if (target < imageStart || target >= imageEnd)
                continue;

            if (!IsReadablePtr((void*)target))
                continue;

            uint8_t value = *(uint8_t*)target;

            if (value > 1)
                continue;

            printf("[SERVER MODE] bool getter at %p -> global %p value=%u\n",
                (void*)p,
                (void*)target,
                value);

            printed++;

            if (printed >= 80) {
                printf("[SERVER MODE] Stopping at 80 candidates.\n");
                break;
            }
        }
    }

    printf("[SERVER MODE] Bool getter scan complete. printed=%d\n", printed);
}
static constexpr uintptr_t RVA_SERVER_MODE_CANDIDATE = 0x30F560C; // 00007FF7D42E560C
static constexpr uintptr_t RVA_COMMANDLINE_INIT_DO_NOT_TOUCH = 0x30F5646; // 00007FF7D42E5646

void PatchGlobalBoolByte(uintptr_t Address, uint8_t Value, const char* Name)
{
    DWORD oldProtect = 0;

    if (!VirtualProtect((void*)Address, 1, PAGE_EXECUTE_READWRITE, &oldProtect)) {
        printf("[SERVER GLOBALS] VirtualProtect failed for %s at %p err=%lu\n",
            Name, (void*)Address, GetLastError());
        return;
    }

    uint8_t oldValue = *(uint8_t*)Address;
    *(uint8_t*)Address = Value;

    DWORD temp = 0;
    VirtualProtect((void*)Address, 1, oldProtect, &temp);

    printf("[SERVER GLOBALS] %s %p: %u -> %u\n",
        Name, (void*)Address, oldValue, Value);
}


void DumpNetDriverFields(uintptr_t NetDriver)
{
    if (!NetDriver)
        return;

    printf("\n========== NETDRIVER FIELD DUMP ==========\n");
    printf("NetDriver = %p\n", (void*)NetDriver);
    printf("VTable    = %p\n", *(void**)NetDriver);

    for (int off = 0x00; off <= 0x500; off += 0x8) {
        uintptr_t val = *(uintptr_t*)(NetDriver + off);

        if (val) {
            printf("[NetDriver+%03X] = %p\n", off, (void*)val);
        }
    }

    printf("========== END NETDRIVER FIELD DUMP ==========\n\n");
}
void ForceWorldNetDriver(uintptr_t World, uintptr_t NetDriver)
{
    if (!World || !NetDriver)
        return;

    uintptr_t* WorldNetDriver = (uintptr_t*)(World + 0x38);

    if (*WorldNetDriver != NetDriver) {
        printf("[FINALIZE] World->NetDriver %p -> %p\n",
            (void*)*WorldNetDriver,
            (void*)NetDriver);

        *WorldNetDriver = NetDriver;
    }
}

void FinalizeManualListenDriver(uintptr_t World, uintptr_t NetDriver)
{
    printf("\n========== FINALIZE MANUAL LISTEN ==========\n");
    printf("[FINALIZE] World     = %p\n", (void*)World);
    printf("[FINALIZE] NetDriver = %p\n", (void*)NetDriver);

    ForceWorldNetDriver(World, NetDriver);

    printf("[FINALIZE] World+0x38 now = %p\n", *(void**)(World + 0x38));
    printf("========== END FINALIZE ==========\n\n");
}
void DumpPointerFields(const char* Label, uintptr_t Base, int MaxOffset)
{
    if (!Base)
        return;

    printf("\n========== %s POINTER DUMP ==========\n", Label);
    printf("%s = %p\n", Label, (void*)Base);
    printf("VTable = %p\n", *(void**)Base);

    for (int off = 0x00; off <= MaxOffset; off += 0x8) {
        uintptr_t val = *(uintptr_t*)(Base + off);

        if (val) {
            printf("[%s+%03X] = %p\n", Label, off, (void*)val);
        }
    }

    printf("========== END %s DUMP ==========\n\n", Label);
}
void DumpWorldCritical(uintptr_t World)
{
    printf("\n========== WORLD CRITICAL ==========\n");
    printf("World = %p\n", (void*)World);
    printf("[World+0x038] NetDriver?       = %p\n", *(void**)(World + 0x38));
    printf("[World+0x0B8] NetDriver/Context?= %p\n", *(void**)(World + 0xB8));
    printf("[World+0x0F0] AuthorityGameMode = %p\n", *(void**)(World + 0xF0));
    printf("[World+0x948] NextURL FString?  = %p / %p\n",
        *(void**)(World + 0x948),
        *(void**)(World + 0x950));
    printf("========== END WORLD CRITICAL ==========\n\n");
}

bool SafeReadPtr(uintptr_t Address, uintptr_t* Out)
{
    __try {
        *Out = *(uintptr_t*)Address;
        return true;
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        printf("[SAFE READ] Failed to read pointer at %p\n", (void*)Address);
        return false;
    }
}

bool LooksLikeGameplayWorld(uintptr_t World)
{
    if (!World)
        return false;

    uintptr_t VTable = 0;
    uintptr_t GameMode = 0;

    if (!SafeReadPtr(World + 0x00, &VTable))
        return false;

    if (!SafeReadPtr(World + 0xF0, &GameMode))
        return false;

    return VTable && GameMode;
}

bool SafeReadVoidPtr(uintptr_t Address, void** Out)
{
    uintptr_t Temp = 0;

    if (!SafeReadPtr(Address, &Temp)) {
        if (Out) *Out = nullptr;
        return false;
    }

    if (Out) *Out = (void*)Temp;
    return true;
}

void SearchQwordInObject(const char* Label, uintptr_t Base, size_t Size, uintptr_t Needle)
{
    if (!Base || !Needle)
        return;

    printf("\n[SEARCH] %s Base=%p Size=0x%zX Needle=%p\n",
        Label,
        (void*)Base,
        Size,
        (void*)Needle);

    int Hits = 0;

    for (size_t off = 0; off + 8 <= Size; off += 8) {
        uintptr_t Val = 0;

        if (!SafeReadPtr(Base + off, &Val))
            continue;

        if (Val == Needle) {
            printf("[SEARCH HIT] %s +0x%zX = %p\n",
                Label,
                off,
                (void*)Val);
            Hits++;
        }
    }

    printf("[SEARCH] %s hits=%d\n", Label, Hits);
}
bool ObjectContainsPtr(uintptr_t Base, size_t Size, uintptr_t Needle)
{
    if (!Base || !Needle)
        return false;

    for (size_t off = 0; off + 8 <= Size; off += 8) {
        uintptr_t Val = 0;

        if (!SafeReadPtr(Base + off, &Val))
            continue;

        if (Val == Needle)
            return true;
    }

    return false;
}
void DumpActorChannelFields(UObject* ChannelObj, uintptr_t PC, uintptr_t Pawn, uintptr_t Conn)
{
    if (!ChannelObj)
        return;

    uintptr_t Channel = (uintptr_t)ChannelObj;

    printf("\n========== ACTOR CHANNEL FIELDS ==========\n");
    printf("[ACTORCHAN] Channel = %p\n", ChannelObj);
    printf("[ACTORCHAN] Name    = %s\n", ChannelObj->GetFullName().c_str());

    for (int off = 0x00; off <= 0x180; off += 8)
    {
        void* Val = nullptr;

        if (!SafeReadVoidPtr(Channel + off, &Val))
            continue;

        uintptr_t V = (uintptr_t)Val;

        if (V <= 0x10000)
            continue;

        printf("[ACTORCHAN] +0x%03X = %p", off, Val);

        if (V == PC)
            printf(" <== PC");

        if (V == Pawn)
            printf(" <== Pawn");

        if (V == Conn)
            printf(" <== Conn");

        if (off == 0x28)
            printf(" [likely Connection]");

        if (off == 0x68)
            printf(" [likely Actor]");

        printf("\n");
    }

    printf("==========================================\n\n");
}

void DumpChannelsReferencing(uintptr_t PC, uintptr_t Pawn, uintptr_t Conn)
{
    printf("\n========== CHANNEL REFERENCE DUMP ==========\n");
    printf("[CHANNEL SCAN] PC   = %p\n", (void*)PC);
    printf("[CHANNEL SCAN] Pawn = %p\n", (void*)Pawn);
    printf("[CHANNEL SCAN] Conn = %p\n", (void*)Conn);

    int Printed = 0;

    for (int i = 0; i < UObject::GObjects->Num(); i++)
    {
        UObject* Obj = UObject::GObjects->GetByIndex(i);

        if (!Obj || !Obj->Class)
            continue;

        std::string ClassName = Obj->Class->GetFullName();
        std::string ObjName = Obj->GetFullName();

        if (ClassName.find("Channel") == std::string::npos &&
            ObjName.find("Channel") == std::string::npos)
        {
            continue;
        }

        uintptr_t ObjAddr = (uintptr_t)Obj;

        bool HasPC = ObjectContainsPtr(ObjAddr, 0x800, PC);
        bool HasPawn = ObjectContainsPtr(ObjAddr, 0x800, Pawn);
        bool HasConn = ObjectContainsPtr(ObjAddr, 0x800, Conn);

        if (!HasPC && !HasPawn && !HasConn)
            continue;

        printf("\n[CHANNEL] Obj=%p\n", Obj);
        printf("          Class=%s\n", ClassName.c_str());
        printf("          Name =%s\n", ObjName.c_str());
        printf("          HasPC=%d HasPawn=%d HasConn=%d\n",
            HasPC ? 1 : 0,
            HasPawn ? 1 : 0,
            HasConn ? 1 : 0);

        SearchQwordInObject("Channel", ObjAddr, 0x800, PC);
        SearchQwordInObject("Channel", ObjAddr, 0x800, Pawn);
        SearchQwordInObject("Channel", ObjAddr, 0x800, Conn);

        if (ClassName.find("ActorChannel") != std::string::npos)
        {
            DumpActorChannelFields(Obj, PC, Pawn, Conn);
        }

        Printed++;
    }

    printf("\n[CHANNEL SCAN] printed=%d\n", Printed);
    printf("========== END CHANNEL REFERENCE DUMP ==========\n\n");
}
void DumpNetConnections()
{
    printf("\n========== NET CONNECTION DUMP ==========\n");

    for (int i = 0; i < UObject::GObjects->Num(); i++) {
        UObject* Obj = UObject::GObjects->GetByIndex(i);

        if (!Obj || !Obj->Class)
            continue;

        std::string Name = Obj->GetFullName();

        if (Name.find("NetConnection") == std::string::npos)
            continue;


        printf("[NETCONN] %p | %s\n", Obj, Name.c_str());

        for (int off = 0; off <= 0x300; off += 8) {
            void* Val = nullptr;

            if (!SafeReadVoidPtr((uintptr_t)Obj + off, &Val))
                continue;

            if ((uintptr_t)Val > 0x10000) {
                printf("          +0x%03X = %p\n", off, Val);
            }
        }
    }

    printf("========== END NET CONNECTION DUMP ==========\n\n");
}
bool LooksReadableMemory(uintptr_t Ptr)
{
    MEMORY_BASIC_INFORMATION mbi{};
    if (!VirtualQuery((void*)Ptr, &mbi, sizeof(mbi)))
        return false;

    if (mbi.State != MEM_COMMIT)
        return false;

    DWORD protect = mbi.Protect & 0xFF;

    return protect == PAGE_READONLY ||
        protect == PAGE_READWRITE ||
        protect == PAGE_WRITECOPY ||
        protect == PAGE_EXECUTE_READ ||
        protect == PAGE_EXECUTE_READWRITE ||
        protect == PAGE_EXECUTE_WRITECOPY;
}

void ScanTArraysForPointer(const char* Label, uintptr_t Base, size_t Size, uintptr_t Needle)
{
    printf("\n========== TARRAY SCAN: %s ==========\n", Label);
    printf("[TARRAY] Base=%p Size=0x%zX Needle=%p\n",
        (void*)Base,
        Size,
        (void*)Needle);

    int totalHits = 0;

    for (size_t off = 0; off + 16 <= Size; off += 8) {
        uintptr_t Data = 0;
        uintptr_t PackedNumMax = 0;

        if (!SafeReadPtr(Base + off, &Data))
            continue;

        if (!SafeReadPtr(Base + off + 8, &PackedNumMax))
            continue;

        int32_t Num = (int32_t)(PackedNumMax & 0xFFFFFFFF);
        int32_t Max = (int32_t)((PackedNumMax >> 32) & 0xFFFFFFFF);

        if (!Data || Num < 0 || Max < 0 || Num > Max || Num > 2048 || Max > 4096)
            continue;

        if (!LooksReadableMemory(Data))
            continue;

        for (int i = 0; i < Num; i++) {
            uintptr_t Val = 0;

            if (!SafeReadPtr(Data + (i * 8), &Val))
                continue;

            if (Val == Needle) {
                printf("[TARRAY HIT] %s +0x%zX Data=%p Num=%d Max=%d Index=%d Value=%p\n",
                    Label,
                    off,
                    (void*)Data,
                    Num,
                    Max,
                    i,
                    (void*)Val);

                totalHits++;
            }
        }
    }

    printf("[TARRAY] totalHits=%d\n", totalHits);
    printf("========== END TARRAY SCAN ==========\n\n");
}
void DumpTArrayObjectsAt(const char* Label, uintptr_t ArrayAddr)
{
    uintptr_t Data = 0;
    uintptr_t Packed = 0;

    if (!SafeReadPtr(ArrayAddr, &Data))
        return;

    if (!SafeReadPtr(ArrayAddr + 8, &Packed))
        return;

    int32_t Num = (int32_t)(Packed & 0xFFFFFFFF);
    int32_t Max = (int32_t)((Packed >> 32) & 0xFFFFFFFF);

    printf("\n[TARRAY OBJECTS] %s Array=%p Data=%p Num=%d Max=%d\n",
        Label,
        (void*)ArrayAddr,
        (void*)Data,
        Num,
        Max);

    if (!Data || Num < 0 || Num > 128 || Max < Num)
        return;

    for (int i = 0; i < Num; i++) {
        uintptr_t Val = 0;

        if (!SafeReadPtr(Data + i * 8, &Val))
            continue;

        UObject* Obj = (UObject*)Val;

        if (!Obj || !Obj->Class) {
            printf("  [%d] %p\n", i, (void*)Val);
            continue;
        }

        std::string ClassName = Obj->Class->GetFullName();
        std::string ObjName = Obj->GetFullName();

        printf("  [%d] %p | %s | %s\n",
            i,
            Obj,
            ClassName.c_str(),
            ObjName.c_str());
    }
}
void DumpPlayerControllers()
{
    if (!gServerWorld) {
        printf("[PC DUMP] gServerWorld is null\n");
        return;
    }

    printf("\n========== PLAYER CONTROLLER DUMP ==========\n");
    printf("[PC DUMP] World=%p\n", gServerWorld);

    ULevel* Level = gServerWorld->PersistentLevel;
    if (!Level) {
        printf("[PC DUMP] PersistentLevel is null\n");
        return;
    }

    printf("[PC DUMP] PersistentLevel=%p ActorCount=%d\n",
        Level,
        Level->Actors.Num());

    for (int i = 0; i < Level->Actors.Num(); i++) {
        AActor* Actor = Level->Actors[i];
        if (!Actor || !Actor->Class)
            continue;

        std::string ClassName = Actor->Class->GetFullName();
        std::string ObjName = Actor->GetFullName();

        if (ClassName.find("PlayerController") != std::string::npos ||
            ObjName.find("PlayerController") != std::string::npos ||
            ObjName.find("VictoryPlayerController") != std::string::npos)
        {
            printf("[PC DUMP] Actor[%d] = %p\n", i, Actor);
            printf("          Class = %s\n", ClassName.c_str());
            printf("          Name  = %s\n", ObjName.c_str());



            APawn* Pawn = ((APlayerController*)Actor)->Pawn;
            printf("          Pawn  = %p\n", Pawn);

            APlayerController* PC = (APlayerController*)Actor;

            printf("          Player = %p\n", PC->Player);
            printf("          Pawn  = %p\n", PC->Pawn);
            void* Conn = PC->NetConnection;

            if (ObjName.find("VictoryPlayerController_C_1") != std::string::npos) {
                printf("\n[PC_1 DEEP CHECK]\n");

                SearchQwordInObject("PC_1 object for Pawn_1", (uintptr_t)PC, 0x900, (uintptr_t)PC->Pawn);

                if (Conn) {
                    SearchQwordInObject("PC_1 NetConnection for PC_1", (uintptr_t)Conn, 0x1200, (uintptr_t)PC);
                    SearchQwordInObject("PC_1 NetConnection for Pawn_1", (uintptr_t)Conn, 0x1200, (uintptr_t)PC->Pawn);
                    SearchQwordInObject("Conn for PC_1", (uintptr_t)Conn, 0x2000, (uintptr_t)PC);
                    SearchQwordInObject("Conn for Pawn_1", (uintptr_t)Conn, 0x2000, (uintptr_t)PC->Pawn);
                    SearchQwordInObject("Driver for Conn", (uintptr_t)gServerDriver, 0x3000, (uintptr_t)Conn);
                    DumpChannelsReferencing((uintptr_t)PC, (uintptr_t)PC->Pawn, (uintptr_t)Conn);
                    printf("          NetConnection = %p\n", Conn);

                    if (ObjName.find("VictoryPlayerController_C_1") != std::string::npos) {
                        printf("\n[PC_1 DEEP CHECK]\n");

                        uintptr_t PCAddr = (uintptr_t)PC;
                        uintptr_t PawnAddr = (uintptr_t)PC->Pawn;
                        uintptr_t ConnAddr = (uintptr_t)Conn;

                        printf("[PC_1 DEEP CHECK] PC   = %p\n", (void*)PCAddr);
                        printf("[PC_1 DEEP CHECK] Pawn = %p\n", (void*)PawnAddr);
                        printf("[PC_1 DEEP CHECK] Conn = %p\n", (void*)ConnAddr);

                        SearchQwordInObject("PC_1 object for Pawn_1", PCAddr, 0x900, PawnAddr);
                        ScanTArraysForPointer("gServerDriver for Conn", (uintptr_t)gServerDriver, 0x5000, ConnAddr);
                        ScanTArraysForPointer("Conn for Control/Actor Channels", ConnAddr, 0x1200, (uintptr_t)PC);
                        ScanTArraysForPointer("Conn for Pawn", ConnAddr, 0x1200, PawnAddr);
                        DumpTArrayObjectsAt("Conn +0xA0", ConnAddr + 0xA0);
                        DumpTArrayObjectsAt("Conn +0xB0", ConnAddr + 0xB0);
                        DumpTArrayObjectsAt("Conn +0x170", ConnAddr + 0x170);
                        DumpTArrayObjectsAt("Conn +0x180", ConnAddr + 0x180);

                        UObject* ConnObj = (UObject*)ConnAddr;

                        if (ConnObj && ConnObj->Class) {
                            printf("[CONN CLASS] ConnObj=%p\n", ConnObj);
                            printf("[CONN CLASS] Class=%s\n", ConnObj->Class->GetFullName().c_str());
                            printf("[CONN CLASS] Name=%s\n", ConnObj->GetFullName().c_str());
                        }

                        if (ConnAddr) {
                            SearchQwordInObject("LIVE Conn for PC_1", ConnAddr, 0x3000, PCAddr);
                            SearchQwordInObject("LIVE Conn for Pawn_1", ConnAddr, 0x3000, PawnAddr);
                            SearchQwordInObject("Driver for Conn", (uintptr_t)gServerDriver, 0x5000, ConnAddr);

                            DumpPointerFields("LIVE CONNECTION", ConnAddr, 0x600);

                            DumpChannelsReferencing(PCAddr, PawnAddr, ConnAddr);
                        }
                    }

                }
            }


            printf("          Raw+0x408 = %p\n", *(void**)((uint8_t*)PC + 0x408));
            printf("          Raw+0x418 = %p\n", *(void**)((uint8_t*)PC + 0x418));
            printf("          Raw+0x478 = %p\n", *(void**)((uint8_t*)PC + 0x478));
            printf("          NetConnection = %p\n", PC->NetConnection);

            if (Pawn) {
                printf("          PawnName = %s\n", Pawn->GetFullName().c_str());
            }
        }
    }

    printf("========== END PLAYER CONTROLLER DUMP ==========\n\n");
}

void DumpReplicationClassPointers()
{
    uintptr_t GameBase = (uintptr_t)GetModuleHandle(NULL);

    UClass* ActorChannelClass =
        UObject::FindObject<UClass>("Class Engine.ActorChannel");

    UClass* ControlChannelClass =
        UObject::FindObject<UClass>("Class Engine.ControlChannel");

    UClass* VoiceChannelClass =
        UObject::FindObject<UClass>("Class Engine.VoiceChannel");

    UClass* IpConnectionClass =
        UObject::FindObject<UClass>("Class OnlineSubsystemUtils.IpConnection");

    printf("\n========== REPLICATION CLASS POINTERS ==========\n");
    printf("GameBase               = %p\n", (void*)GameBase);
    printf("StaticConstructObject  = %p\n", (void*)(GameBase + RVA_CONSTRUCT_OBJECT));
    printf("ActorChannel Class     = %p\n", ActorChannelClass);
    printf("ControlChannel Class   = %p\n", ControlChannelClass);
    printf("VoiceChannel Class     = %p\n", VoiceChannelClass);
    printf("IpConnection Class     = %p\n", IpConnectionClass);
    printf("gServerDriver          = %p\n", gServerDriver);
    printf("gServerWorld           = %p\n", gServerWorld);
    printf("===============================================\n\n");
}

void DumpNetDriverRegistrationState(const char* Tag, UNetDriver* Driver, UWorld* World)
{
    printf("\n========== NETDRIVER REGISTRATION: %s ==========\n", Tag ? Tag : "?");
    printf("World                        = %p\n", World);
    printf("Driver                       = %p\n", Driver);

    if (!World || !Driver) {
        printf("World or Driver null\n");
        printf("===============================================\n\n");
        return;
    }

    printf("World->NetDriver             = %p\n", World->NetDriver);
    printf("World +0x38                  = %p\n", *(void**)((uint8_t*)World + 0x38));

    printf("Driver->World                = %p\n", Driver->World);
    printf("Driver->ServerConnection     = %p\n", Driver->ServerConnection);
    printf("Driver->ClientConnections.Num= %d\n", Driver->ClientConnections.Num());
    printf("Driver->NetConnectionClass   = %p\n", Driver->NetConnectionClass);
    printf("Driver->RoleProperty         = %p\n", Driver->RoleProperty);
    printf("Driver->RemoteRoleProperty   = %p\n", Driver->RemoteRoleProperty);

    uint32_t* RawName = (uint32_t*)&Driver->NetDriverName;
    printf("Driver->NetDriverName raw    = %08X %08X\n", RawName[0], RawName[1]);

    printf("===============================================\n\n");
}

struct FWorldProbeInfo
{
    void* NetDriver;
    void* GameMode;
    ULevel* Level;
    int ActorCount;
    bool bReadable;
};

FWorldProbeInfo ProbeWorld(UWorld* W)
{
    FWorldProbeInfo Info{};
    Info.NetDriver = nullptr;
    Info.GameMode = nullptr;
    Info.Level = nullptr;
    Info.ActorCount = -1;
    Info.bReadable = false;

    if (!W)
        return Info;

    __try {
        Info.NetDriver = *(void**)((uint8_t*)W + 0x38);
        Info.GameMode = *(void**)((uint8_t*)W + 0xF0);
        Info.Level = W->PersistentLevel;
        Info.ActorCount = Info.Level ? Info.Level->Actors.Num() : -1;
        Info.bReadable = true;
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        Info.bReadable = false;
    }

    return Info;
}
void DumpAllWorldCandidates()
{

    for (int i = 0; i < UObject::GObjects->Num(); i++) {
        UObject* Obj = UObject::GObjects->GetByIndex(i);

        if (!Obj || !Obj->Class)
            continue;

        std::string ClassName = Obj->Class->GetFullName();
        std::string ObjName = Obj->GetFullName();

        if (ClassName.find("World") == std::string::npos &&
            ObjName.find("World ") == std::string::npos)
            continue;

        UWorld* W = (UWorld*)Obj;
        FWorldProbeInfo Info = ProbeWorld(W);



    }

}
UWorld* GetBestServerWorld(uintptr_t GameBase)
{
    UWorld* Best = nullptr;
    int BestScore = -999999;

    for (int i = 0; i < UObject::GObjects->Num(); i++) {
        UObject* Obj = UObject::GObjects->GetByIndex(i);

        if (!Obj || !Obj->Class)
            continue;

        std::string ClassName = Obj->Class->GetFullName();
        std::string ObjName = Obj->GetFullName();

        if (ClassName.find("World") == std::string::npos &&
            ObjName.find("World ") == std::string::npos)
            continue;

        UWorld* W = (UWorld*)Obj;
        FWorldProbeInfo Info = ProbeWorld(W);

        if (!Info.bReadable)
            continue;

        int Score = 0;

        if (ObjName.find("/Game/Maps/") != std::string::npos)
            Score += 100;

        if (ObjName.find("Jungle_P") != std::string::npos)
            Score += 1000;

        if (ObjName.find("FrontEnd") != std::string::npos)
            Score -= 1000;

        if (Info.GameMode)
            Score += 500;

        if (Info.Level && Info.ActorCount > 0)
            Score += Info.ActorCount;





        if (Score > BestScore) {
            BestScore = Score;
            Best = W;
        }
    }


    return Best;
}
struct FRawTArray
{
    void* Data;
    int32_t Num;
    int32_t Max;
    bool bReadable;
};



FRawTArray ReadRawTArrayAt(void* Base, size_t Offset)
{
    FRawTArray Out{};
    Out.Data = nullptr;
    Out.Num = 0;
    Out.Max = 0;
    Out.bReadable = false;

    if (!Base)
        return Out;

    uint8_t* Addr = (uint8_t*)Base + Offset;

    __try {
        Out.Data = *(void**)Addr;
        Out.Num = *(int32_t*)(Addr + 0x08);
        Out.Max = *(int32_t*)(Addr + 0x0C);
        Out.bReadable = true;
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        Out.bReadable = false;
    }

    return Out;
}
void DumpWorldLevelCollections(UWorld* World)
{
    printf("\n========== LEVEL COLLECTION DUMP ==========\n");
    printf("World = %p\n", World);

    if (!World) {
        printf("[LEVELCOLL] World null\n");
        printf("===========================================\n\n");
        return;
    }

    void* WorldPersistentLevel = nullptr;
    void* WorldNetDriver = nullptr;
    void* WorldGameState = nullptr;
    void* WorldAuthorityGameMode = nullptr;

    SafeReadPtrRaw((uint8_t*)World + 0x30, &WorldPersistentLevel); // PersistentLevel
    SafeReadPtrRaw((uint8_t*)World + 0x38, &WorldNetDriver);       // NetDriver
    SafeReadPtrRaw((uint8_t*)World + 0xF0, &WorldAuthorityGameMode);
    SafeReadPtrRaw((uint8_t*)World + 0xF8, &WorldGameState);

    printf("World->PersistentLevel = %p\n", WorldPersistentLevel);
    printf("World->NetDriver       = %p\n", WorldNetDriver);
    printf("World->AuthorityGM     = %p\n", WorldAuthorityGameMode);
    printf("World->GameState       = %p\n", WorldGameState);

    FRawTArray Collections = ReadRawTArrayAt(World, 0x120);

    printf("LevelCollections Data=%p Num=%d Max=%d Readable=%d\n",
        Collections.Data,
        Collections.Num,
        Collections.Max,
        Collections.bReadable ? 1 : 0);

    if (!Collections.bReadable || !Collections.Data || Collections.Num <= 0 || Collections.Num > 16) {
        printf("[LEVELCOLL] unreadable/suspicious\n");
        printf("===========================================\n\n");
        return;
    }

    const int32_t Stride = 0x80;

    for (int i = 0; i < Collections.Num; i++) {
        uint8_t* Elem = (uint8_t*)Collections.Data + (i * Stride);

        void* GameState = nullptr;
        void* NetDriver = nullptr;
        void* DemoNetDriver = nullptr;
        void* PersistentLevel = nullptr;

        SafeReadPtrRaw(Elem + 0x08, &GameState);
        SafeReadPtrRaw(Elem + 0x10, &NetDriver);
        SafeReadPtrRaw(Elem + 0x18, &DemoNetDriver);
        SafeReadPtrRaw(Elem + 0x20, &PersistentLevel);

        printf("\n[LEVELCOLL %d] Elem=%p\n", i, Elem);
        printf("  GameState       = %p%s\n", GameState, GameState == WorldGameState ? "  <== World GameState" : "");
        printf("  NetDriver       = %p%s\n", NetDriver, NetDriver == WorldNetDriver ? "  <== World NetDriver" : "");
        printf("  DemoNetDriver   = %p\n", DemoNetDriver);
        printf("  PersistentLevel = %p%s\n", PersistentLevel, PersistentLevel == WorldPersistentLevel ? "  <== World PersistentLevel" : "");
    }

    printf("===========================================\n\n");
}


static constexpr uintptr_t RVA_UNetDriver_SetWorld = 0x143DF20;

using tSetWorld = void(__fastcall*)(void* Driver, void* World);

void AttachDriverWithSetWorld(void* Driver, void* World)
{
    uintptr_t GameBase = (uintptr_t)GetModuleHandleW(nullptr);
    auto SetWorld = (tSetWorld)(GameBase + RVA_UNetDriver_SetWorld);

    printf("[SETWORLD] GameBase=%p RVA=%p Fn=%p Driver=%p World=%p\n",
        (void*)GameBase,
        (void*)RVA_UNetDriver_SetWorld,
        (void*)SetWorld,
        Driver,
        World);

    // For the first clean test, do not manually set Driver->World before this.
    SetWorld(Driver, World);

    // SetWorld sets Driver->World, Driver->Notify, tick delegates, NetworkObjects.
    // It does NOT set UWorld::NetDriver, so still set the world-side pointer:
    *(void**)((uint8_t*)World + 0x38) = Driver;

    printf("[SETWORLD] after World->NetDriver=%p Driver->World=%p Driver->Notify=%p\n",
        *(void**)((uint8_t*)World + 0x38),
        *(void**)((uint8_t*)Driver + 0xA0),
        *(void**)((uint8_t*)Driver + 0xE8));

    printf("[SETWORLD CHECK] TickDispatchHandle=%llX\n", *(uint64_t*)((uint8_t*)Driver + 0x3D0));
    printf("[SETWORLD CHECK] TickFlushHandle=%llX\n", *(uint64_t*)((uint8_t*)Driver + 0x3D8));
    printf("[SETWORLD CHECK] PostTickFlushHandle=%llX\n", *(uint64_t*)((uint8_t*)Driver + 0x3E0));
    printf("[SETWORLD CHECK] NetworkObjects=%p\n", *(void**)((uint8_t*)Driver + 0x3F0));
}
using tTickDispatch = void(__fastcall*)(void* Driver, float DeltaSeconds);

tTickDispatch OriginalTickDispatch = nullptr;


static constexpr int32_t VTABLE_LoadMap_Index = 0x3D0 / 8; // 122

using LoadMapFn = bool(__fastcall*)(void* Engine, void* WorldContext, void* URL, void* PendingNetGame, void* Error);

static LoadMapFn gOriginalLoadMap = nullptr;
static void** gLoadMapVTable = nullptr;
static void* gCachedWorldContext = nullptr;
static void* gLastLoadMapUrl = nullptr;


void PatchWorldLevelCollections(UWorld* World, void* Driver) {
    if (!World || !Driver) return;

    FRawTArray Collections = ReadRawTArrayAt(World, 0x120); // Your offset
    if (!Collections.bReadable || !Collections.Data || Collections.Num <= 0) return;

    const int32_t Stride = 0x80;
    for (int i = 0; i < Collections.Num; i++) {
        uint8_t* Elem = (uint8_t*)Collections.Data + (i * Stride);

        void** NetDriverSlot = (void**)(Elem + 0x10);
        void** DemoNetDriverSlot = (void**)(Elem + 0x18); // Optional, but safe to clear

        printf("[LEVELCOLL PATCH] Collection %d: NetDriver %p -> %p\n", i, *NetDriverSlot, Driver);
        *NetDriverSlot = Driver;
    }
}
struct FNameRaw
{
    uint32_t ComparisonIndex;
    uint32_t Number;
};

static_assert(sizeof(FNameRaw) == 0x8, "FNameRaw must be 8 bytes");

static const char* BoolStr(bool b)
{
    return b ? "true" : "false";
}


constexpr uintptr_t RVA_FNAME_CTOR_W = 0x5B0E60;

using tFNameCtorW = void(__fastcall*)(FNameRaw* This, const wchar_t* Name);

static FNameRaw MakeFNameW(const wchar_t* Name)
{
    uintptr_t GameBase = (uintptr_t)GetModuleHandleW(nullptr);

    auto FNameCtor = (tFNameCtorW)(GameBase + RVA_FNAME_CTOR_W);

    FNameRaw Out{};
    FNameCtor(&Out, Name);

    printf("[FNAME] MakeFNameW(%ws) => Index=%08X Number=%08X Packed=%016llX\n",
        Name,
        Out.ComparisonIndex,
        Out.Number,
        *(uint64_t*)&Out);

    return Out;
}

struct FNamedNetDriver_Hack
{
    UNetDriver* NetDriver; // 0x00
    uint8_t Pad[0x8];      // 0x08
};

struct TArray_FNamedNetDriver_Hack
{
    FNamedNetDriver_Hack* Data; // 0x00
    int32 Num;                  // 0x08
    int32 Max;                  // 0x0C
};

static FNamedNetDriver_Hack gManualNamedNetDriverEntry{};
static bool gManualActiveNetDriverPatched = false;

static void* gOldActiveNetDriversData = nullptr;
static int32 gOldActiveNetDriversNum = 0;
static int32 gOldActiveNetDriversMax = 0;

static void RegisterManualNetDriverInWorldContext(void* WorldContext, UNetDriver* Driver, UWorld* ExpectedWorld)
{
    printf("\n========== REGISTER MANUAL NETDRIVER ==========\n");

    if (!WorldContext || !Driver)
    {
        printf("[ACTIVE NETDRIVERS] skipped WorldContext=%p Driver=%p\n", WorldContext, Driver);
        printf("================================================\n\n");
        return;
    }

    void* WCWorld = nullptr;

    __try
    {
        WCWorld = *(void**)((uint8_t*)WorldContext + 0x298);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[ACTIVE NETDRIVERS] failed reading WorldContext+0x298\n");
        printf("================================================\n\n");
        return;
    }

    printf("[ACTIVE NETDRIVERS] WorldContext=%p\n", WorldContext);
    printf("[ACTIVE NETDRIVERS] WCWorld=%p ExpectedWorld=%p\n", WCWorld, ExpectedWorld);

    if (ExpectedWorld && WCWorld != ExpectedWorld)
    {
        printf("[ACTIVE NETDRIVERS] WARNING: WorldContext world does not match expected world. Not patching.\n");
        printf("================================================\n\n");
        return;
    }

    auto* Arr = (TArray_FNamedNetDriver_Hack*)((uint8_t*)WorldContext + 0x248);

    printf("[ACTIVE NETDRIVERS] before Data=%p Num=%d Max=%d\n",
        Arr->Data,
        Arr->Num,
        Arr->Max);

    // Backup original state once so we can restore if needed later.
    if (!gManualActiveNetDriverPatched)
    {
        gOldActiveNetDriversData = Arr->Data;
        gOldActiveNetDriversNum = Arr->Num;
        gOldActiveNetDriversMax = Arr->Max;
    }

    // Use whatever NetDriverName the driver currently has.
    // This SHOULD be GameNetDriver. Do not set it to World->Name.
    gManualNamedNetDriverEntry.NetDriver = Driver;
    memset(gManualNamedNetDriverEntry.Pad, 0, sizeof(gManualNamedNetDriverEntry.Pad));

    //uint32_t* RawName = (uint32_t*)&gManualNamedNetDriverEntry.NetDriverName;

    //printf("[ACTIVE NETDRIVERS] entry NameRaw=%08X %08X NetDriver=%p\n",
    //    RawName[0],
    //    RawName[1],
    //    gManualNamedNetDriverEntry.NetDriver);

    // Diagnostic patch:
    // Point ActiveNetDrivers at our static entry.
    //
    // This avoids allocator mismatch for the test, but do not map-travel after this
    // unless we add restore logic before LoadMap.
    Arr->Data = &gManualNamedNetDriverEntry;
    Arr->Num = 1;
    Arr->Max = 1;

    gManualActiveNetDriverPatched = true;

    printf("[ACTIVE NETDRIVERS] after Data=%p Num=%d Max=%d\n",
        Arr->Data,
        Arr->Num,
        Arr->Max);

    printf("================================================\n\n");
}

static void DumpActiveNetDrivers(void* WorldContext, UWorld* ExpectedWorld, const char* Tag)
{
    printf("\n[ActiveNetDrivers:%s]\n", Tag ? Tag : "?");

    if (!WorldContext)
    {
        printf("  WorldContext = NULL\n");
        return;
    }

    void* WCWorld = nullptr;

    __try
    {
        WCWorld = *(void**)((uint8_t*)WorldContext + 0x298);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("  Failed reading WorldContext+0x298\n");
        return;
    }

    printf("  WorldContext=%p\n", WorldContext);
    printf("  WorldContext+0x298 World=%p ExpectedWorld=%p\n", WCWorld, ExpectedWorld);

    if (ExpectedWorld && WCWorld && WCWorld != ExpectedWorld)
    {
        printf("  WARNING: cached WorldContext does not match current World\n");
    }

    TArray_FNamedNetDriver_Hack* Arr = nullptr;

    __try
    {
        Arr = (TArray_FNamedNetDriver_Hack*)((uint8_t*)WorldContext + 0x248);
        printf("  ActiveNetDrivers Array=%p Data=%p Num=%d Max=%d\n",
            Arr, Arr->Data, Arr->Num, Arr->Max);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("  Failed reading ActiveNetDrivers at WorldContext+0x248\n");
        return;
    }

    if (!Arr->Data)
    {
        printf("  ActiveNetDrivers.Data = NULL\n");
        return;
    }

    if (Arr->Num < 0 || Arr->Num > 32)
    {
        printf("  ActiveNetDrivers.Num looks bad: %d\n", Arr->Num);
        return;
    }

    for (int32 i = 0; i < Arr->Num; i++)
    {
        __try
        {
            FNamedNetDriver_Hack& E = Arr->Data[i];

            //printf("  [%d] NameIndex=%d NameNumber=%d NetDriver=%p\n",
            //    i,
            //    E.NetDriver,
            //    E.NetDriverName.ComparisonIndex,
            //    E.NetDriverName.Number
            //    );
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            printf("  [%d] failed to read entry\n", i);
        }
    }
}

static constexpr uintptr_t RVA_LoadMap = 0x1BD3B80;

using LoadMapFn = bool(__fastcall*)(void* Engine, void* WorldContext, void* URL, void* PendingNetGame, void* Error);
static LoadMapFn OriginalLoadMap = nullptr;


static void* FindGameEngineObject()
{
    if (!UObject::GObjects)
    {
        printf("[ENGINE FIND] GObjects is null\n");
        return nullptr;
    }

    printf("\n========== FIND GAME ENGINE ==========\n");

    void* Best = nullptr;

    for (int i = 0; i < UObject::GObjects->Num(); i++)
    {
        UObject* Obj = UObject::GObjects->GetByIndex(i);

        if (!Obj || !Obj->Class)
            continue;

        std::string ClassName;
        std::string ObjName;



        ClassName = Obj->Class->GetFullName();
        ObjName = Obj->GetFullName();



        bool bLooksLikeEngine =
            ClassName.find("GameEngine") != std::string::npos ||
            ClassName.find("Engine.GameEngine") != std::string::npos ||
            ObjName.find("GameEngine") != std::string::npos ||
            ObjName.find("GameEngine_0") != std::string::npos;

        if (!bLooksLikeEngine)
            continue;

        printf("[ENGINE CANDIDATE] Obj=%p\n", Obj);
        printf("                   Class=%s\n", ClassName.c_str());
        printf("                   Name =%s\n", ObjName.c_str());

        // Prefer the transient runtime engine instance.
        if (ObjName.find("GameEngine_0") != std::string::npos)
        {
            Best = Obj;
            break;
        }

        if (!Best)
            Best = Obj;
    }

    printf("[ENGINE FIND] Best=%p\n", Best);
    printf("========== END FIND GAME ENGINE ==========\n\n");

    return Best;
}


static constexpr uintptr_t RVA_BAD_FINTERNETADDR_TOSTRING_SLOT = 0x2675D88;

static bool gPatchedGameModeCDOs = false;

static constexpr uintptr_t OFFSET_WarmupTime = 0x0598;
static constexpr uintptr_t OFFSET_EarlyShutdownPlayers = 0x0660;
static constexpr uintptr_t OFFSET_MatchWarmupTime = 0x06B0;

static void PatchInt32(void* Obj, uintptr_t Offset, int32_t Value)
{
    if (!Obj)
        return;

    int32_t* Ptr = reinterpret_cast<int32_t*>(
        reinterpret_cast<uint8_t*>(Obj) + Offset
        );

    *Ptr = Value;
}

static void PatchOneGameModeCDO(void* Obj, const char* Name)
{
    if (!Obj || !Name)
        return;

    int32_t oldWarmup = *reinterpret_cast<int32_t*>(
        reinterpret_cast<uint8_t*>(Obj) + OFFSET_WarmupTime
        );

    int32_t oldMatchWarmup = *reinterpret_cast<int32_t*>(
        reinterpret_cast<uint8_t*>(Obj) + OFFSET_MatchWarmupTime
        );

    int32_t oldEarlyShutdown = *reinterpret_cast<int32_t*>(
        reinterpret_cast<uint8_t*>(Obj) + OFFSET_EarlyShutdownPlayers
        );

    printf("[CDO PATCH] %s %p\n", Name, Obj);
    printf("[CDO PATCH] old WarmupTime=%d MatchWarmupTime=%d EarlyShutdownPlayers=%d\n",
        oldWarmup,
        oldMatchWarmup,
        oldEarlyShutdown);

    PatchInt32(Obj, OFFSET_WarmupTime, 60);
    PatchInt32(Obj, OFFSET_MatchWarmupTime, 60);
    PatchInt32(Obj, OFFSET_EarlyShutdownPlayers, 3);

    int32_t newWarmup = *reinterpret_cast<int32_t*>(
        reinterpret_cast<uint8_t*>(Obj) + OFFSET_WarmupTime
        );

    int32_t newMatchWarmup = *reinterpret_cast<int32_t*>(
        reinterpret_cast<uint8_t*>(Obj) + OFFSET_MatchWarmupTime
        );

    int32_t newEarlyShutdown = *reinterpret_cast<int32_t*>(
        reinterpret_cast<uint8_t*>(Obj) + OFFSET_EarlyShutdownPlayers
        );

    printf("[CDO PATCH] new WarmupTime=%d MatchWarmupTime=%d EarlyShutdownPlayers=%d\n",
        newWarmup,
        newMatchWarmup,
        newEarlyShutdown);
}
static bool gPatchedShooterGameModeCDO = false;
static bool gPatchedVictoryGameModeCDO = false;

static void PatchGameModeCDOsOnce()
{
    if (gPatchedShooterGameModeCDO && gPatchedVictoryGameModeCDO)
        return;

    if (!UObject::GObjects)
        return;

    for (int i = 0; i < UObject::GObjects->Num(); i++)
    {
        UObject* Obj = UObject::GObjects->GetByIndex(i);

        if (!Obj || !Obj->Class)
            continue;

        std::string FullName = Obj->GetFullName();

        if (!gPatchedShooterGameModeCDO &&
            FullName.find("Default__ShooterGameMode") != std::string::npos)
        {
            PatchOneGameModeCDO(Obj, FullName.c_str());
            gPatchedShooterGameModeCDO = true;
            continue;
        }

        if (!gPatchedVictoryGameModeCDO &&
            FullName.find("Default__VictoryGameMode_C") != std::string::npos)
        {
            PatchOneGameModeCDO(Obj, FullName.c_str());
            gPatchedVictoryGameModeCDO = true;
            continue;
        }
    }

    if (gPatchedShooterGameModeCDO || gPatchedVictoryGameModeCDO)
    {
        printf("[CDO PATCH] status ShooterCDO=%d VictoryCDO=%d\n",
            gPatchedShooterGameModeCDO ? 1 : 0,
            gPatchedVictoryGameModeCDO ? 1 : 0);
    }
}
static constexpr uintptr_t RVA_LOCAL_TOSTRING_CALLSITE = 0x22E5AC8;
// 00007FF6A2875AC8 - 00007FF6A0590000 = 0x22E5AC8
//
// Original:
//   48 8B 01          mov rax, [rcx]
//   FF 50 58          call qword ptr [rax+58]
//   48 63 7D A0       movsxd rdi, dword ptr [rbp-60]
//
// Patch:
//   E8 xx xx xx xx    call FakeInternetAddr_ToString_Empty
//   48 63 7D A0       movsxd rdi, dword ptr [rbp-60]
//   90                nop

static bool gPatchedSteamNetConnectionCDO = false;

void PatchSteamNetConnectionCDOOnce()
{
    if (gPatchedSteamNetConnectionCDO)
        return;

    if (!UObject::GObjects)
        return;

    for (int i = 0; i < UObject::GObjects->Num(); i++)
    {
        UObject* Obj = UObject::GObjects->GetByIndex(i);

        if (!Obj || !Obj->Class)
            continue;

        std::string FullName = Obj->GetFullName();

        if (FullName.find("Default__SteamNetConnection") == std::string::npos)
            continue;

        printf("[STEAM PASS] Found SteamNetConnection CDO: %p | %s\n",
            Obj,
            FullName.c_str());

        USteamNetConnection* SteamCDO = reinterpret_cast<USteamNetConnection*>(Obj);

        printf("[STEAM PASS] old bIsPassthrough=%d\n",
            SteamCDO->bIsPassthrough ? 1 : 0);

        SteamCDO->bIsPassthrough = true;

        printf("[STEAM PASS] new bIsPassthrough=%d\n",
            SteamCDO->bIsPassthrough ? 1 : 0);

        gPatchedSteamNetConnectionCDO = true;
        return;
    }

    // Do not spam this every tick.
    static int MissCounter = 0;
    MissCounter++;

    if ((MissCounter % 300) == 0)
    {
        printf("[STEAM PASS] Default__SteamNetConnection not found yet\n");
    }
}
void* AllocNearAddress(uintptr_t Target, size_t Size)
{
    SYSTEM_INFO si{};
    GetSystemInfo(&si);

    uintptr_t Granularity = si.dwAllocationGranularity; // usually 0x10000
    uintptr_t Min = 0x10000;

    uintptr_t MaxDistance = 0x70000000; // stay safely inside rel32 range

    uintptr_t Base = Target & ~(Granularity - 1);

    for (uintptr_t Distance = 0; Distance < MaxDistance; Distance += Granularity)
    {
        uintptr_t Down = 0;
        uintptr_t Up = 0;

        if (Base > Distance + Min)
            Down = Base - Distance;

        Up = Base + Distance;

        if (Down)
        {
            void* p = VirtualAlloc(
                (void*)Down,
                Size,
                MEM_COMMIT | MEM_RESERVE,
                PAGE_EXECUTE_READWRITE
            );

            if (p)
            {
                printf("[ALLOC NEAR] allocated DOWN %p near %p distance=0x%llX\n",
                    p,
                    (void*)Target,
                    (unsigned long long)((Target > (uintptr_t)p) ? Target - (uintptr_t)p : (uintptr_t)p - Target));

                return p;
            }
        }

        if (Up)
        {
            void* p = VirtualAlloc(
                (void*)Up,
                Size,
                MEM_COMMIT | MEM_RESERVE,
                PAGE_EXECUTE_READWRITE
            );

            if (p)
            {
                printf("[ALLOC NEAR] allocated UP %p near %p distance=0x%llX\n",
                    p,
                    (void*)Target,
                    (unsigned long long)((Target > (uintptr_t)p) ? Target - (uintptr_t)p : (uintptr_t)p - Target));

                return p;
            }
        }
    }

    printf("[ALLOC NEAR] failed near %p\n", (void*)Target);
    return nullptr;
}
static constexpr uintptr_t RVA_UWorld_Listen = 0x143E6F0;
void DumpActiveNetDriversSimple(const char* Tag)
{
    printf("\n========== ACTIVE NETDRIVERS SIMPLE: %s ==========\n",
        Tag ? Tag : "?");

    printf("[ACTIVE SIMPLE] gCachedWorldContext = %p\n", gCachedWorldContext);
    printf("[ACTIVE SIMPLE] gServerWorld        = %p\n", gServerWorld);
    printf("[ACTIVE SIMPLE] gServerDriver       = %p\n", gServerDriver);

    if (!gCachedWorldContext)
    {
        printf("[ACTIVE SIMPLE] No cached WorldContext\n");
        printf("==================================================\n\n");
        return;
    }

    void* WCWorld = nullptr;

    __try
    {
        WCWorld = *(void**)((uint8_t*)gCachedWorldContext + 0x298);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[ACTIVE SIMPLE] Could not read WorldContext+0x298\n");
        printf("==================================================\n\n");
        return;
    }

    printf("[ACTIVE SIMPLE] WorldContext+0x298 World = %p %s\n",
        WCWorld,
        WCWorld == gServerWorld ? "<== MATCH" : "<== MISMATCH");

    struct FNamedNetDriverEntry_Simple
    {
        UNetDriver* NetDriver; // 0x00
        uint8_t Pad[0x8];      // 0x08
    };

    FNamedNetDriverEntry_Simple* Data = nullptr;
    int32_t Num = 0;
    int32_t Max = 0;

    __try
    {
        Data = *(FNamedNetDriverEntry_Simple**)((uint8_t*)gCachedWorldContext + 0x248);
        Num = *(int32_t*)((uint8_t*)gCachedWorldContext + 0x250);
        Max = *(int32_t*)((uint8_t*)gCachedWorldContext + 0x254);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[ACTIVE SIMPLE] Could not read ActiveNetDrivers array\n");
        printf("==================================================\n\n");
        return;
    }

    printf("[ACTIVE SIMPLE] ActiveNetDrivers Data=%p Num=%d Max=%d\n",
        Data,
        Num,
        Max);

    if (!Data || Num <= 0 || Num > 16)
    {
        printf("[ACTIVE SIMPLE] ActiveNetDrivers empty/suspicious\n");
        printf("==================================================\n\n");
        return;
    }

    for (int i = 0; i < Num; i++)
    {
        UNetDriver* D = nullptr;

        __try
        {
            D = Data[i].NetDriver;
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            D = nullptr;
        }

        printf("[ACTIVE SIMPLE] [%d] NetDriver=%p %s\n",
            i,
            D,
            D == gServerDriver ? "<== MATCH gServerDriver" : "");
    }

    printf("==================================================\n\n");
}

static bool IsGoodWorldContextScanPage(const MEMORY_BASIC_INFORMATION& Mbi)
{
    if (Mbi.State != MEM_COMMIT)
        return false;

    if (Mbi.Protect & PAGE_GUARD)
        return false;

    if (Mbi.Protect & PAGE_NOACCESS)
        return false;

    DWORD P = Mbi.Protect & 0xFF;

    return
        P == PAGE_READWRITE ||
        P == PAGE_WRITECOPY ||
        P == PAGE_EXECUTE_READWRITE ||
        P == PAGE_EXECUTE_WRITECOPY;
}

static bool ValidateWorldContextCandidate(void* Candidate, UWorld* ExpectedWorld)
{
    if (!Candidate || !ExpectedWorld)
        return false;

    __try
    {
        void* WCWorld = *(void**)((uint8_t*)Candidate + 0x298);

        if (WCWorld != ExpectedWorld)
            return false;

        auto* Arr = (TArray_FNamedNetDriver_Hack*)((uint8_t*)Candidate + 0x248);

        if (Arr->Num < 0 || Arr->Num > 32)
            return false;

        if (Arr->Max < 0 || Arr->Max > 64)
            return false;

        if (Arr->Num > Arr->Max)
            return false;

        printf("[WORLDCONTEXT SCAN] Candidate=%p\n", Candidate);
        printf("  +0x298 World=%p MATCH\n", WCWorld);
        printf("  +0x248 ActiveNetDrivers Data=%p Num=%d Max=%d\n",
            Arr->Data,
            Arr->Num,
            Arr->Max);

        return true;
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        return false;
    }
}

void* FindWorldContextByWorldPointer(UWorld* ExpectedWorld)
{
    printf("\n========== FIND WORLDCONTEXT BY WORLD ==========\n");
    printf("[WORLDCONTEXT SCAN] ExpectedWorld=%p\n", ExpectedWorld);

    if (!ExpectedWorld)
    {
        printf("[WORLDCONTEXT SCAN] ExpectedWorld null\n");
        printf("================================================\n\n");
        return nullptr;
    }

    SYSTEM_INFO Si{};
    GetSystemInfo(&Si);

    uint8_t* Addr = (uint8_t*)Si.lpMinimumApplicationAddress;
    uint8_t* MaxAddr = (uint8_t*)Si.lpMaximumApplicationAddress;

    int Candidates = 0;

    while (Addr < MaxAddr)
    {
        MEMORY_BASIC_INFORMATION Mbi{};

        if (!VirtualQuery(Addr, &Mbi, sizeof(Mbi)))
        {
            Addr += 0x1000;
            continue;
        }

        uint8_t* Base = (uint8_t*)Mbi.BaseAddress;
        uint8_t* End = Base + Mbi.RegionSize;

        if (IsGoodWorldContextScanPage(Mbi))
        {
            for (uint8_t* P = Base; P + sizeof(void*) <= End; P += sizeof(void*))
            {
                void* Value = nullptr;

                __try
                {
                    Value = *(void**)P;
                }
                __except (EXCEPTION_EXECUTE_HANDLER)
                {
                    continue;
                }

                if (Value != ExpectedWorld)
                    continue;

                // WorldContext.World is expected at +0x298.
                void* Candidate = P - 0x298;

                if (ValidateWorldContextCandidate(Candidate, ExpectedWorld))
                {
                    Candidates++;

                    printf("[WORLDCONTEXT SCAN] FOUND candidate #%d = %p\n",
                        Candidates,
                        Candidate);

                    printf("================================================\n\n");
                    return Candidate;
                }
            }
        }

        Addr = End;
    }

    printf("[WORLDCONTEXT SCAN] No valid WorldContext found\n");
    printf("================================================\n\n");

    return nullptr;
}
void ResolveAndRegisterWorldContext(UWorld* World, UNetDriver* Driver, const char* Tag)
{
    printf("\n========== RESOLVE + REGISTER WORLDCONTEXT: %s ==========\n",
        Tag ? Tag : "?");

    printf("[WC REGISTER] World=%p Driver=%p gCachedWorldContext=%p\n",
        World,
        Driver,
        gCachedWorldContext);

    if (!World || !Driver)
    {
        printf("[WC REGISTER] Missing World or Driver\n");
        printf("=========================================================\n\n");
        return;
    }

    if (!gCachedWorldContext)
    {
        gCachedWorldContext = FindWorldContextByWorldPointer(World);
    }

    if (!gCachedWorldContext)
    {
        printf("[WC REGISTER] FAILED: could not find WorldContext\n");
        printf("=========================================================\n\n");
        return;
    }

    printf("[WC REGISTER] Using WorldContext=%p\n", gCachedWorldContext);

    RegisterManualNetDriverInWorldContext(
        gCachedWorldContext,
        Driver,
        World
    );

    DumpActiveNetDriversSimple("after ResolveAndRegisterWorldContext");

    printf("=========================================================\n\n");
}
void SearchQwordQuiet(const char* Label, uintptr_t Base, size_t Size, uintptr_t Needle)
{
    printf("\n[QWORD SCAN] %s Base=%p Size=0x%zX Needle=%p\n",
        Label ? Label : "?",
        (void*)Base,
        Size,
        (void*)Needle);

    if (!Base || !Needle)
    {
        printf("[QWORD SCAN] skipped null base/needle\n");
        return;
    }

    int Hits = 0;

    for (size_t Off = 0; Off + sizeof(uintptr_t) <= Size; Off += sizeof(uintptr_t))
    {
        uintptr_t Val = 0;

        __try
        {
            Val = *(uintptr_t*)(Base + Off);
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            continue;
        }

        if (Val == Needle)
        {
            printf("[QWORD HIT] %s +0x%zX = %p\n",
                Label ? Label : "?",
                Off,
                (void*)Val);

            Hits++;
        }
    }

    printf("[QWORD SCAN] %s hits=%d\n",
        Label ? Label : "?",
        Hits);
}

APlayerController* FindRemotePlayerControllerForNetObjectDump()
{
    if (!gServerWorld || !gServerWorld->PersistentLevel)
        return nullptr;

    ULevel* Level = gServerWorld->PersistentLevel;

    for (int i = 0; i < Level->Actors.Num(); i++)
    {
        AActor* Actor = Level->Actors[i];

        if (!Actor || !Actor->Class)
            continue;

        std::string Name;


        Name = Actor->GetFullName();



        if (Name.find("VictoryPlayerController_C") == std::string::npos &&
            Name.find("PlayerController") == std::string::npos)
        {
            continue;
        }

        APlayerController* PC = (APlayerController*)Actor;

        void* Conn = nullptr;


        Conn = PC->NetConnection ? (void*)PC->NetConnection : (void*)PC->Player;


        if (!Conn)
            continue;

        UObject* ConnObj = (UObject*)Conn;

        std::string ConnName;

        if (ConnObj && ConnObj->Class)
            ConnName = ConnObj->GetFullName();


        if (ConnName.find("SteamNetConnection") != std::string::npos ||
            ConnName.find("NetConnection") != std::string::npos)
        {
            return PC;
        }
    }

    return nullptr;
}

static const char* SafeName(UObject* Obj)
{
    static thread_local std::string Name;

    if (!Obj)
        return "null";


    if (!Obj->Class)
        return "<no class>";

    Name = Obj->GetFullName();
    return Name.c_str();

}
bool TryGetObjectFullName(UObject* Obj, std::string& OutName)
{
    OutName.clear();

    if (!Obj)
        return false;


    if (!Obj->Class)
        return false;

    OutName = Obj->GetFullName();
    return true;

}
void DumpRemotePawnNetworkObjectMembership()
{
    printf("\n========== REMOTE PAWN NETWORKOBJECT MEMBERSHIP ==========\n");

    if (!gServerWorld || !gServerDriver)
    {
        printf("[NETOBJ] Missing gServerWorld/gServerDriver\n");
        printf("==========================================================\n\n");
        return;
    }

    APlayerController* PC = FindRemotePlayerControllerForNetObjectDump();

    if (!PC)
    {
        printf("[NETOBJ] No remote PlayerController found\n");
        printf("==========================================================\n\n");
        return;
    }

    APawn* Pawn = nullptr;
    void* Conn = nullptr;
    APlayerState* PS = nullptr;

    __try
    {
        Pawn = PC->Pawn;
        Conn = PC->NetConnection ? (void*)PC->NetConnection : (void*)PC->Player;
        PS = PC->PlayerState;
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[NETOBJ] Exception reading PC fields\n");
        printf("==========================================================\n\n");
        return;
    }

    printf("[NETOBJ] PC     = %p | %s\n", PC, SafeName(PC));
    printf("[NETOBJ] Pawn   = %p | %s\n", Pawn, SafeName(Pawn));
    printf("[NETOBJ] PS     = %p | %s\n", PS, SafeName(PS));
    printf("[NETOBJ] Conn   = %p | %s\n", Conn, SafeName((UObject*)Conn));
    printf("[NETOBJ] Driver = %p\n", gServerDriver);

    void* NetworkObjects = nullptr;

    __try
    {
        NetworkObjects = *(void**)((uint8_t*)gServerDriver + 0x3F0);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        NetworkObjects = nullptr;
    }

    printf("[NETOBJ] Driver+0x3F0 NetworkObjects = %p\n", NetworkObjects);

    if (!NetworkObjects)
    {
        printf("[NETOBJ] NetworkObjects is null\n");
        printf("==========================================================\n\n");
        return;
    }

    // Scan the NetworkObjects structure for direct references.
    // Size is intentionally broad but quiet.
    SearchQwordQuiet("NetworkObjects for PC", (uintptr_t)NetworkObjects, 0x20000, (uintptr_t)PC);
    SearchQwordQuiet("NetworkObjects for Pawn", (uintptr_t)NetworkObjects, 0x20000, (uintptr_t)Pawn);
    SearchQwordQuiet("NetworkObjects for PS", (uintptr_t)NetworkObjects, 0x20000, (uintptr_t)PS);

    // Also scan the driver itself for sanity.
    SearchQwordQuiet("Driver for PC", (uintptr_t)gServerDriver, 0x8000, (uintptr_t)PC);
    SearchQwordQuiet("Driver for Pawn", (uintptr_t)gServerDriver, 0x8000, (uintptr_t)Pawn);
    SearchQwordQuiet("Driver for PS", (uintptr_t)gServerDriver, 0x8000, (uintptr_t)PS);
    SearchQwordQuiet("Driver for Conn", (uintptr_t)gServerDriver, 0x8000, (uintptr_t)Conn);

    if (PC && Pawn && Conn)
    {
        DumpChannelsReferencing(
            (uintptr_t)PC,
            (uintptr_t)Pawn,
            (uintptr_t)Conn
        );
    }

    printf("========== END REMOTE PAWN NETWORKOBJECT MEMBERSHIP ==========\n\n");
}
bool HasActorChannelFor(UNetConnection* Conn, AActor* WantedActor)
{
    if (!Conn || !WantedActor)
        return false;

    for (int i = 0; i < UObject::GObjects->Num(); i++)
    {
        UObject* Obj = UObject::GObjects->GetByIndex(i);

        if (!Obj || !Obj->Class)
            continue;

        std::string ClassName;
        std::string ObjName;

        ClassName = Obj->Class->GetFullName();
        ObjName = Obj->GetFullName();


        if (ClassName.find("ActorChannel") == std::string::npos &&
            ObjName.find("ActorChannel") == std::string::npos)
        {
            continue;
        }

        uintptr_t ObjAddr = (uintptr_t)Obj;

        bool HasConn = false;
        bool HasActor = false;

        // From your dumps:
        // Channel +0x28 = Connection
        // ActorChannel +0x68 = Actor

        void* ChannelConn = *(void**)(ObjAddr + 0x28);
        void* ChannelActor = *(void**)(ObjAddr + 0x68);

        HasConn = (ChannelConn == Conn);
        HasActor = (ChannelActor == WantedActor);


        if (HasConn && HasActor)
            return true;
    }

    return false;
}
bool LooksLikeUFunction(UFunction* Fn)
{
    if (!Fn)
        return false;

    if (!Fn->Class)
        return false;

    std::string Name = Fn->GetFullName();

    if (Name.find("Function ") == std::string::npos)
        return false;

    volatile int32_t Flags = *(int32_t*)((uint8_t*)Fn + 0x98);
    (void)Flags;

    return true;

}

using tProcessEventRaw = void(__fastcall*)(UObject* Obj, UFunction* Function, void* Params);
struct FSafe_SetReplicates_Params
{
    bool bInReplicates;
};
using tProcessEventRaw = void(__fastcall*)(UObject* Obj, UFunction* Function, void* ParamBlock);

bool CallProcessEventRaw(UObject* Obj, UFunction* Fn, void* ParamBlock)
{
    if (!Obj || !Fn)
    {
        //printf("[RAW PE] Obj or Fn null Obj=%p Fn=%p\n", Obj, Fn);
        return false;
    }

    void** VTable = *(void***)Obj;

    if (!VTable)
    {
        //printf("[RAW PE] Obj vtable null Obj=%p\n", Obj);
        return false;
    }

    // From your wrapper disassembly:
    // call qword ptr [rax+0x1D0]
    auto ProcessEventFn = (tProcessEventRaw)VTable[0x1D0 / 8];

    if (!ProcessEventFn)
    {
        //printf("[RAW PE] ProcessEventFn null Obj=%p Fn=%p\n", Obj, Fn);
        return false;
    }

    //printf("[RAW PE] Calling ProcessEvent Obj=%p Fn=%p Params=%p PE=%p\n",
    //    Obj,
    //    Fn,
    //    ParamBlock,
    //    ProcessEventFn);

    ProcessEventFn(Obj, Fn, ParamBlock);

    //printf("[RAW PE] ProcessEvent returned Obj=%p Fn=%p\n", Obj, Fn);

    return true;
}
bool SafeProcessEventNoParams(UObject* Obj, const char* FunctionFullName)
{
    if (!Obj || !FunctionFullName)
        return false;

    UFunction* Fn = UObject::FindObject<UFunction>(FunctionFullName);

    if (!Fn)
    {
        //printf("[SAFE PE] Could not find %s\n", FunctionFullName);
        return false;
    }

    //printf("[SAFE PE] Calling %s Obj=%p Fn=%p\n",
    //    FunctionFullName,
    //    Obj,
    //    Fn);

    return CallProcessEventRaw(Obj, Fn, nullptr);
}
bool IsReadableAddress(const void* Ptr, size_t Size = 8)
{
    if (!Ptr)
        return false;

    MEMORY_BASIC_INFORMATION Mbi{};

    if (!VirtualQuery(Ptr, &Mbi, sizeof(Mbi)))
        return false;

    if (Mbi.State != MEM_COMMIT)
        return false;

    if (Mbi.Protect & PAGE_NOACCESS)
        return false;

    if (Mbi.Protect & PAGE_GUARD)
        return false;

    uintptr_t Start = (uintptr_t)Ptr;
    uintptr_t End = Start + Size;
    uintptr_t RegionEnd = (uintptr_t)Mbi.BaseAddress + Mbi.RegionSize;

    return End <= RegionEnd;
}
static constexpr uintptr_t RVA_GEnginePtr = 0x3307B48;
static constexpr uintptr_t RVA_GetWorldContextFromWorld = 0x163D220;
using tGetWorldContextFromWorld = void* (__fastcall*)(void* GEngine, UWorld* World);
// ============================================================
// DIAGNOSTIC HELPERS ONLY
// ============================================================

bool SafeReadInt32Raw(void* Addr, int32_t* Out)
{
    if (!Addr || !Out)
        return false;

    __try
    {
        *Out = *(int32_t*)Addr;
        return true;
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        return false;
    }
}

bool SafeReadUInt8Raw(void* Addr, uint8_t* Out)
{
    if (!Addr || !Out)
        return false;

    __try
    {
        *Out = *(uint8_t*)Addr;
        return true;
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        return false;
    }
}

bool SafeReadFloatRaw(void* Addr, float* Out)
{
    if (!Addr || !Out)
        return false;

    __try
    {
        *Out = *(float*)Addr;
        return true;
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        return false;
    }
}

bool SafeReadPtrAt(void* Base, size_t Offset, void** Out)
{
    if (!Base || !Out)
        return false;

    return SafeReadPtrRaw((uint8_t*)Base + Offset, Out);
}

void PrintObjectNameBrief(const char* Label, void* Obj)
{
    if (!Label)
        Label = "<null-label>";

    if (!Obj)
    {
        printf("%s = null\n", Label);
        return;
    }

    std::string Name;

    if (TryGetObjectFullName((UObject*)Obj, Name))
    {
        printf("%s = %p | %s\n", Label, Obj, Name.c_str());
    }
    else
    {
        printf("%s = %p | <name failed>\n", Label, Obj);
    }
}
void* GetNativeWorldContextForWorld(UWorld* World)
{
    if (!World)
    {
        printf("[NATIVE WC] World null\n");
        return nullptr;
    }

    uintptr_t Base = (uintptr_t)GetModuleHandleW(nullptr);

    static constexpr uintptr_t RVA_GEnginePtr = 0x3307B48;
    static constexpr uintptr_t RVA_GetWorldContextFromWorld = 0x163D220;

    void** GEnginePtr = (void**)(Base + RVA_GEnginePtr);
    auto GetWorldContextFromWorld =
        (tGetWorldContextFromWorld)(Base + RVA_GetWorldContextFromWorld);

    printf("[NATIVE WC] Base=%p\n", (void*)Base);
    printf("[NATIVE WC] GEnginePtr=%p RVA=0x%llX\n",
        GEnginePtr,
        (unsigned long long)RVA_GEnginePtr);

    printf("[NATIVE WC] GetWC=%p RVA=0x%llX\n",
        GetWorldContextFromWorld,
        (unsigned long long)RVA_GetWorldContextFromWorld);

    if (!IsReadableAddress(GEnginePtr, sizeof(void*)))
    {
        printf("[NATIVE WC] GEnginePtr is not readable: %p\n", GEnginePtr);
        return nullptr;
    }

    void* GEngine = *GEnginePtr;

    printf("[NATIVE WC] GEngine=%p World=%p\n", GEngine, World);

    if (!GEngine)
    {
        printf("[NATIVE WC] GEngine null\n");
        return nullptr;
    }

    if (!IsReadableAddress((void*)GetWorldContextFromWorld, 1))
    {
        printf("[NATIVE WC] GetWorldContextFromWorld address is not readable/executable-ish: %p\n",
            GetWorldContextFromWorld);
        return nullptr;
    }

    void* WC = GetWorldContextFromWorld(GEngine, World);

    printf("[NATIVE WC] Returned WorldContext=%p\n", WC);

    return WC;
}

void PatchNativeWorldContextActiveNetDrivers(void* WorldContext)
{
    if (!WorldContext)
    {
        printf("[NATIVE WC PATCH] WorldContext null\n");
        return;
    }

    if (!gServerDriver)
    {
        printf("[NATIVE WC PATCH] gServerDriver null\n");
        return;
    }

    uint8_t* WC = (uint8_t*)WorldContext;

    void** DataPtr = (void**)(WC + 0x248);
    int32_t* NumPtr = (int32_t*)(WC + 0x250);
    int32_t* MaxPtr = (int32_t*)(WC + 0x254);

    printf("\n========== NATIVE WC ACTIVE NETDRIVERS PATCH ==========\n");
    printf("[NATIVE WC PATCH] WC      = %p\n", WorldContext);
    printf("[NATIVE WC PATCH] before Data=%p Num=%d Max=%d\n",
        *DataPtr,
        *NumPtr,
        *MaxPtr);

    gManualNamedNetDriverEntry.NetDriver = gServerDriver;
    memset(gManualNamedNetDriverEntry.Pad, 0, sizeof(gManualNamedNetDriverEntry.Pad));

    *DataPtr = &gManualNamedNetDriverEntry;
    *NumPtr = 1;
    *MaxPtr = 1;

    printf("[NATIVE WC PATCH] Entry   = %p\n", &gManualNamedNetDriverEntry);
    printf("[NATIVE WC PATCH] Driver  = %p\n", gServerDriver);
    printf("[NATIVE WC PATCH] after  Data=%p Num=%d Max=%d\n",
        *DataPtr,
        *NumPtr,
        *MaxPtr);

    printf("[NATIVE WC PATCH] first entry NetDriver=%p\n",
        gManualNamedNetDriverEntry.NetDriver);

    printf("=======================================================\n\n");
}
void EnsureNativeWorldContextHasNetDriver()
{
    if (!gServerWorld || !gServerDriver)
    {
        printf("[NATIVE WC PATCH] Missing World or Driver World=%p Driver=%p\n",
            gServerWorld,
            gServerDriver);
        return;
    }

    void* NativeWC = GetNativeWorldContextForWorld(gServerWorld);

    if (!NativeWC)
    {
        printf("[NATIVE WC PATCH] NativeWC lookup failed\n");
        return;
    }

    gCachedWorldContext = NativeWC;

    PatchNativeWorldContextActiveNetDrivers(NativeWC);


}
bool SafeSetReplicates(AActor* Actor, bool bReplicates)
{
    if (!Actor)
        return false;

    UFunction* Fn = UObject::FindObject<UFunction>(
        "Function Engine.Actor.SetReplicates"
    );

    if (!Fn)
    {
        printf("[SAFE SetReplicates] Could not find Function Engine.Actor.SetReplicates\n");
        return false;
    }

    FSafe_SetReplicates_Params ParamBlock{};
    ParamBlock.bInReplicates = bReplicates;

    printf("[SAFE SetReplicates] Actor=%p bReplicates=%d Fn=%p\n",
        Actor,
        bReplicates ? 1 : 0,
        Fn);

    return CallProcessEventRaw(
        (UObject*)Actor,
        Fn,
        &ParamBlock
    );
}

void DumpRemoteConnectionRelevancyState()
{
    printf("\n========== REMOTE CONNECTION RELEVANCY STATE ==========\n");

    APlayerController* PC = FindRemotePlayerControllerForNetObjectDump();

    if (!PC)
    {
        printf("[RELEVANCY] No remote PC\n");
        printf("=======================================================\n\n");
        return;
    }

    APawn* Pawn = nullptr;
    void* Conn = nullptr;
    AActor* PawnOwner = nullptr;
    AActor* ConnViewTarget = nullptr;
    AActor* ConnOwningActor = nullptr;

    __try
    {
        Pawn = PC->Pawn;
        Conn = PC->NetConnection ? (void*)PC->NetConnection : (void*)PC->Player;

        if (Pawn)
        {
            PawnOwner = Pawn->Owner;
        }

        if (Conn)
        {
            ConnViewTarget = *(AActor**)((uint8_t*)Conn + 0x88);
            ConnOwningActor = *(AActor**)((uint8_t*)Conn + 0x90);
        }
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[RELEVANCY] Exception reading fields\n");
        printf("=======================================================\n\n");
        return;
    }

    printf("[RELEVANCY] PC              = %p | %s\n", PC, SafeName((UObject*)PC));
    printf("[RELEVANCY] Pawn            = %p | %s\n", Pawn, SafeName((UObject*)Pawn));
    printf("[RELEVANCY] Conn            = %p | %s\n", Conn, SafeName((UObject*)Conn));
    printf("[RELEVANCY] Pawn->Owner     = %p | %s %s\n",
        PawnOwner,
        SafeName((UObject*)PawnOwner),
        PawnOwner == (AActor*)PC ? "<== PC" : "");

    printf("[RELEVANCY] Conn+0x88 ViewTarget  = %p | %s %s\n",
        ConnViewTarget,
        SafeName((UObject*)ConnViewTarget),
        ConnViewTarget == (AActor*)Pawn ? "<== Pawn" : "");

    printf("[RELEVANCY] Conn+0x90 OwningActor = %p | %s %s\n",
        ConnOwningActor,
        SafeName((UObject*)ConnOwningActor),
        ConnOwningActor == (AActor*)PC ? "<== PC" : "");

    if (Pawn)
    {
        uint8_t Flags84 = 0;
        uint8_t Flags85 = 0;
        uint8_t Flags86 = 0;
        uint8_t Role = 0;
        uint8_t RemoteRole = 0;

        __try
        {
            Flags84 = *(uint8_t*)((uint8_t*)Pawn + 0x84);
            Flags85 = *(uint8_t*)((uint8_t*)Pawn + 0x85);
            Flags86 = *(uint8_t*)((uint8_t*)Pawn + 0x86);
            RemoteRole = *(uint8_t*)((uint8_t*)Pawn + 0x90);
            Role = *(uint8_t*)((uint8_t*)Pawn + 0x118);
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
        }

        printf("[RELEVANCY] Pawn Flags84 = 0x%02X\n", Flags84);
        printf("[RELEVANCY] Pawn Flags85 = 0x%02X\n", Flags85);
        printf("[RELEVANCY] Pawn Flags86 = 0x%02X\n", Flags86);
        printf("[RELEVANCY] Pawn Role=%u RemoteRole=%u\n", Role, RemoteRole);

        printf("[RELEVANCY] bOnlyRelevantToOwner bit? check Flags84\n");
        printf("[RELEVANCY] bAlwaysRelevant bit?     check Flags84\n");
        printf("[RELEVANCY] bReplicates bit 0x08?    %d\n", (Flags86 & 0x08) ? 1 : 0);
    }

    bool bHasPawnChannel = false;

    if (Conn && Pawn)
    {
        bHasPawnChannel = HasActorChannelFor((UNetConnection*)Conn, Pawn);
    }

    printf("[RELEVANCY] HasPawnChannel = %d\n", bHasPawnChannel ? 1 : 0);

    printf("=======================================================\n\n");
}
static uintptr_t gLivingPawnRepairPawn = 0;
static int gLivingPawnRepairStage = 0;
static int gLivingPawnRepairWaitTicks = 0;
static uint64_t gLivingPawnRepairLastMs = 0;
static bool gLivingPawnRepairRestartSent = false;
static uint8_t SafeReadActorByte(AActor* Actor, int Offset)
{
    if (!Actor)
        return 0;

    uint8_t Value = 0;

    __try
    {
        Value = *(uint8_t*)((uint8_t*)Actor + Offset);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        Value = 0;
    }

    return Value;
}

static bool IsActorTearOff(AActor* Actor)
{
    // From our observed AActor flags:
    // Flags84 0x40 appears to become bTearOff during death.
    uint8_t Flags84 = SafeReadActorByte(Actor, 0x84);
    return (Flags84 & 0x40) != 0;
}
void ResetLivingPawnRepairForPawn(APawn* Pawn)
{
    gLivingPawnRepairPawn = (uintptr_t)Pawn;
    gLivingPawnRepairStage = 0;
    gLivingPawnRepairWaitTicks = 0;
    gLivingPawnRepairRestartSent = false;

    printf("\n========== LIVING PAWN EXPORT REPAIR RESET ==========\n");
    printf("[LIVING REPAIR] New Pawn=%p | %s\n",
        Pawn,
        SafeName((UObject*)Pawn));
    printf("=====================================================\n\n");
}
struct FActor_SetReplicates_Params
{
    bool bInReplicates;
};
void EnsureNativeWorldContextHasNetDriver_Once()
{
    static void* LastPatchedWC = nullptr;
    static UNetDriver* LastPatchedDriver = nullptr;

    if (!gServerWorld || !gServerDriver)
    {
        printf("[NATIVE WC ENSURE] Missing World or Driver World=%p Driver=%p\n",
            gServerWorld,
            gServerDriver);
        return;
    }

    void* NativeWC = GetNativeWorldContextForWorld(gServerWorld);

    if (!NativeWC)
    {
        printf("[NATIVE WC ENSURE] NativeWC lookup failed\n");
        return;
    }

    if (NativeWC == LastPatchedWC && gServerDriver == LastPatchedDriver)
    {
        return;
    }

    PatchNativeWorldContextActiveNetDrivers(NativeWC);

    gCachedWorldContext = NativeWC;

    LastPatchedWC = NativeWC;
    LastPatchedDriver = gServerDriver;
}
void DumpDriverNetworkObjectsForPawn(AActor* Pawn)
{
    if (!gServerDriver || !Pawn)
    {
        printf("[NETOBJ DUMP] skipped Driver=%p Pawn=%p\n", gServerDriver, Pawn);
        return;
    }

    void* NetworkObjects = *(void**)((uint8_t*)gServerDriver + 0x3F0);

    printf("\n========== NETWORK OBJECTS PAWN SEARCH ==========\n");
    printf("[NETOBJ DUMP] Driver         = %p\n", gServerDriver);
    printf("[NETOBJ DUMP] NetworkObjects = %p\n", NetworkObjects);
    printf("[NETOBJ DUMP] Pawn           = %p\n", Pawn);

    if (!NetworkObjects)
    {
        printf("[NETOBJ DUMP] NetworkObjects null\n");
        printf("=================================================\n\n");
        return;
    }

    SearchQwordInObject(
        "NetworkObjects for Pawn",
        (uintptr_t)NetworkObjects,
        0x20000,
        (uintptr_t)Pawn
    );

    printf("=================================================\n\n");
}
void DumpPawnReplicationRelevancyState(APlayerController* PC, APawn* Pawn, void* Conn)
{
    printf("\n========== PAWN REPLICATION RELEVANCY STATE ==========\n");
    printf("[RELEVANCY] PC     = %p\n", PC);
    printf("[RELEVANCY] Pawn   = %p\n", Pawn);
    printf("[RELEVANCY] Conn   = %p\n", Conn);
    printf("[RELEVANCY] Driver = %p\n", gServerDriver);

    if (Conn)
    {
        void* ConnViewTarget = *(void**)((uint8_t*)Conn + 0x88);
        void* ConnOwningActor = *(void**)((uint8_t*)Conn + 0x90);

        printf("[RELEVANCY] Conn +0x88 ViewTarget  = %p%s%s\n",
            ConnViewTarget,
            ConnViewTarget == PC ? " <== PC" : "",
            ConnViewTarget == Pawn ? " <== Pawn" : "");

        printf("[RELEVANCY] Conn +0x90 OwningActor = %p%s%s\n",
            ConnOwningActor,
            ConnOwningActor == PC ? " <== PC" : "",
            ConnOwningActor == Pawn ? " <== Pawn" : "");
    }

    if (Pawn)
    {
        uint8_t Flags84 = *(uint8_t*)((uint8_t*)Pawn + 0x84);
        uint8_t Flags86 = *(uint8_t*)((uint8_t*)Pawn + 0x86);
        uint64_t PawnNetDriverName = *(uint64_t*)((uint8_t*)Pawn + 0x88);

        printf("[RELEVANCY] Pawn Flags84 = 0x%02X\n", Flags84);
        printf("[RELEVANCY] Pawn Flags86 = 0x%02X\n", Flags86);
        printf("[RELEVANCY] Pawn NetDriverName +0x88 = 0x%llX\n",
            (unsigned long long)PawnNetDriverName);
        printf("[RELEVANCY] Pawn +0x1E0 not treated as Owner anymore; skipping unsafe field\n");

    }

    if (gServerDriver)
    {
        uint64_t DriverNetDriverName = *(uint64_t*)((uint8_t*)gServerDriver + 0xE0);
        void* NetworkObjects = *(void**)((uint8_t*)gServerDriver + 0x3F0);

        printf("[RELEVANCY] Driver NetDriverName +0xE0 = 0x%llX\n",
            (unsigned long long)DriverNetDriverName);

        printf("[RELEVANCY] Driver NetworkObjects +0x3F0 = %p\n",
            NetworkObjects);
    }

    printf("======================================================\n\n");
}
void PrintObjectNameSafe(const char* Label, void* Ptr)
{
    if (!Ptr)
    {
        printf("%s = null\n", Label);
        return;
    }

    UObject* Obj = (UObject*)Ptr;

    if (!Obj->Class)
    {
        printf("%s = %p | no class\n", Label, Ptr);
        return;
    }

    printf("%s = %p | %s\n",
        Label,
        Ptr,
        Obj->GetFullName().c_str());
}

void RepairPawnOwnerAndViewTarget(APlayerController* PC, APawn* Pawn, void* Conn)
{
    printf("\n========== REPAIR CONN VIEWTARGET ONLY ==========\n");
    printf("[VIEW FIX] PC   = %p\n", PC);
    printf("[VIEW FIX] Pawn = %p\n", Pawn);
    printf("[VIEW FIX] Conn = %p\n", Conn);

    if (!PC || !Pawn || !Conn)
    {
        printf("[VIEW FIX] skipped missing PC/Pawn/Conn\n");
        printf("=================================================\n\n");
        return;
    }

    void** ConnViewTargetSlot = (void**)((uint8_t*)Conn + 0x88);
    void** ConnOwningActorSlot = (void**)((uint8_t*)Conn + 0x90);

    void* OldViewTarget = *ConnViewTargetSlot;
    void* OldOwningActor = *ConnOwningActorSlot;

    PrintObjectNameSafe("[VIEW FIX] Old Conn.ViewTarget", OldViewTarget);
    PrintObjectNameSafe("[VIEW FIX] Old Conn.OwningActor", OldOwningActor);

    if (*ConnOwningActorSlot != PC)
    {
        printf("[VIEW FIX] Conn.OwningActor %p -> %p\n", *ConnOwningActorSlot, PC);
        *ConnOwningActorSlot = PC;
    }

    if (*ConnViewTargetSlot != Pawn)
    {
        printf("[VIEW FIX] Conn.ViewTarget %p -> %p\n", *ConnViewTargetSlot, Pawn);
        *ConnViewTargetSlot = Pawn;
    }

    PrintObjectNameSafe("[VIEW FIX] New Conn.ViewTarget", *ConnViewTargetSlot);
    PrintObjectNameSafe("[VIEW FIX] New Conn.OwningActor", *ConnOwningActorSlot);

    printf("=================================================\n\n");
}
struct FSafe_ClientRestart_Params
{
    APawn* NewPawn;
};

void DumpActorNetBytes(const char* Label, void* Actor)
{
    if (!Actor)
    {
        printf("%s = null\n", Label);
        return;
    }

    UObject* Obj = (UObject*)Actor;

    printf("%s = %p", Label, Actor);

    if (Obj && Obj->Class)
    {
        printf(" | %s", Obj->GetFullName().c_str());
    }

    uint8_t* A = (uint8_t*)Actor;

    printf("\n");
    printf("    +0x80..+0x8F = ");
    for (int i = 0; i < 0x10; i++)
    {
        printf("%02X ", A[0x80 + i]);
    }
    printf("\n");

    printf("    +0x84=0x%02X +0x85=0x%02X +0x86=0x%02X +0x87=0x%02X NetDriverName(+0x88)=0x%llX\n",
        A[0x84],
        A[0x85],
        A[0x86],
        A[0x87],
        (unsigned long long)(*(uint64_t*)(A + 0x88)));
}
bool SafeClientRestart(APlayerController* PC, APawn* Pawn)
{
    if (!PC || !Pawn)
    {
        printf("[SAFE ClientRestart] skipped PC=%p Pawn=%p\n", PC, Pawn);
        return false;
    }

    UFunction* Fn = UObject::FindObject<UFunction>("Function Engine.PlayerController.ClientRestart");

    if (!Fn)
    {
        printf("[SAFE ClientRestart] Could not find Function Engine.PlayerController.ClientRestart\n");
        return false;
    }

    FSafe_ClientRestart_Params Params{};
    Params.NewPawn = Pawn;

    printf("[SAFE ClientRestart] Calling ClientRestart PC=%p Pawn=%p Fn=%p\n",
        PC, Pawn, Fn);

    bool Ok = CallProcessEventRaw((UObject*)PC, Fn, &Params);

    printf("[SAFE ClientRestart] returned Ok=%d\n", Ok ? 1 : 0);

    return Ok;
}
static bool gLivingPawnRepairEnabled = true;
static bool gLivingPawnRepairInProgress = false;
static void* gWatchPawn = nullptr;
void DumpPawnCompareState(const char* Label, void* Pawn)
{
    if (!Pawn)
    {
        printf("%s Pawn=null\n", Label);
        return;
    }

    printf("\n========== %s ==========\n", Label);

    PrintObjectNameSafe("[PAWN CMP] Pawn", Pawn);

    DumpActorNetBytes("[PAWN CMP] NetBytes", Pawn);

    void* OwnerLike = *(void**)((uint8_t*)Pawn + 0x98);
    void* ControllerLike = *(void**)((uint8_t*)Pawn + 0x438);

    PrintObjectNameSafe("[PAWN CMP] +0x98 OwnerLike", OwnerLike);
    PrintObjectNameSafe("[PAWN CMP] +0x438 ControllerLike", ControllerLike);

    printf("=================================\n\n");
}
bool HasPawnChannelForConnection(void* Conn, void* Pawn)
{
    if (!Conn || !Pawn)
    {
        printf("[HAS PAWN CHANNEL] skipped Conn=%p Pawn=%p\n", Conn, Pawn);
        return false;
    }

    uintptr_t ConnAddr = (uintptr_t)Conn;

    // UNetConnection::OpenChannels appears to be TArray at Conn + 0x68.
    void** OpenChannelsData = *(void***)(ConnAddr + 0x68);
    int32_t OpenChannelsNum = *(int32_t*)(ConnAddr + 0x70);
    int32_t OpenChannelsMax = *(int32_t*)(ConnAddr + 0x74);

    printf("[HAS PAWN CHANNEL] Conn=%p Pawn=%p OpenChannels Data=%p Num=%d Max=%d\n",
        Conn,
        Pawn,
        OpenChannelsData,
        OpenChannelsNum,
        OpenChannelsMax);

    if (!OpenChannelsData || OpenChannelsNum <= 0 || OpenChannelsNum > 1024)
    {
        printf("[HAS PAWN CHANNEL] invalid OpenChannels array\n");
        return false;
    }

    for (int32_t i = 0; i < OpenChannelsNum; i++)
    {
        void* Channel = OpenChannelsData[i];

        if (!Channel)
            continue;

        uintptr_t ChannelAddr = (uintptr_t)Channel;

        void* ChannelConn = *(void**)(ChannelAddr + 0x28);
        void* ChannelActor = *(void**)(ChannelAddr + 0x68);

        printf("[HAS PAWN CHANNEL] [%d] Channel=%p ConnField=%p ActorField=%p",
            i,
            Channel,
            ChannelConn,
            ChannelActor);

        if (ChannelConn == Conn)
            printf(" <ConnMatch>");

        if (ChannelActor == Pawn)
            printf(" <PawnMatch>");

        printf("\n");

        if (ChannelActor)
        {
            PrintObjectNameSafe("    [HAS PAWN CHANNEL] ActorFieldName", ChannelActor);
            DumpActorNetBytes("    [NETBYTE] ChannelActor", ChannelActor);

        }
        if (ChannelActor)
        {
            UObject* Obj = (UObject*)ChannelActor;
            std::string Name = Obj->GetFullName();

            if (Name.find("PlayerPawn_C") != std::string::npos)
            {
                printf("\n!!!!!!!!!! PLAYERPAWN CHANNEL FOUND !!!!!!!!!!\n");

                DumpPawnCompareState("[PAWN CMP] Channel Pawn", ChannelActor);
                DumpPawnCompareState("[PAWN CMP] Missing Target Pawn", gWatchPawn);

                printf("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n\n");
            }
        }

        if (ChannelConn == Conn && ChannelActor == Pawn)
        {
            printf("[HAS PAWN CHANNEL] FOUND pawn channel at index %d Channel=%p\n",
                i,
                Channel);
            return true;
        }
    }

    printf("[HAS PAWN CHANNEL] no pawn channel found\n");
    return false;
}
struct FSafe_SetOwner_Params
{
    AActor* NewOwner;
};

bool SafeSetOwner(AActor* Actor, AActor* NewOwner)
{
    if (!Actor || !NewOwner)
    {
        printf("[SAFE SetOwner] skipped Actor=%p NewOwner=%p\n", Actor, NewOwner);
        return false;
    }

    UFunction* Fn = UObject::FindObject<UFunction>("Function Engine.Actor.SetOwner");

    if (!Fn)
    {
        printf("[SAFE SetOwner] Function Engine.Actor.SetOwner not found. Skipping.\n");
        return false;
    }

    FSafe_SetOwner_Params Params{};
    Params.NewOwner = NewOwner;

    printf("[SAFE SetOwner] Calling SetOwner Actor=%p NewOwner=%p Fn=%p\n",
        Actor,
        NewOwner,
        Fn);

    bool Ok = CallProcessEventRaw((UObject*)Actor, Fn, &Params);

    printf("[SAFE SetOwner] returned Ok=%d\n", Ok ? 1 : 0);

    return Ok;
}
struct FViewTargetTransitionParams_Hack
{
    float BlendTime;
    uint8_t BlendFunction;
    uint8_t Pad0[3];
    float BlendExp;
    uint32_t bLockOutgoing;
};

struct FSafe_SetViewTargetWithBlend_Params
{
    AActor* NewViewTarget;     // 0x00
    float BlendTime;           // 0x08
    uint8_t BlendFunc;         // 0x0C
    uint8_t Pad0[3];           // 0x0D
    float BlendExp;            // 0x10
    bool bLockOutgoing;        // 0x14
    uint8_t Pad1[3];           // 0x15
};

bool SafeSetViewTargetWithBlend(APlayerController* PC, AActor* NewViewTarget)
{
    if (!PC || !NewViewTarget)
    {
        printf("[SAFE SetViewTargetWithBlend] skipped PC=%p Target=%p\n",
            PC, NewViewTarget);
        return false;
    }

    UFunction* Fn = UObject::FindObject<UFunction>(
        "Function Engine.PlayerController.SetViewTargetWithBlend"
    );

    if (!Fn)
    {
        printf("[SAFE SetViewTargetWithBlend] Function Engine.PlayerController.SetViewTargetWithBlend not found. Skipping.\n");
        return false;
    }

    FSafe_SetViewTargetWithBlend_Params Params{};
    Params.NewViewTarget = NewViewTarget;
    Params.BlendTime = 0.0f;
    Params.BlendFunc = 0;
    Params.BlendExp = 0.0f;
    Params.bLockOutgoing = false;

    printf("[SAFE SetViewTargetWithBlend] Calling PC=%p Target=%p Fn=%p\n",
        PC, NewViewTarget, Fn);

    bool Ok = CallProcessEventRaw((UObject*)PC, Fn, &Params);

    printf("[SAFE SetViewTargetWithBlend] returned Ok=%d\n", Ok ? 1 : 0);

    return Ok;
}
struct FSafe_SetNetDormancy_Params
{
    uint8_t NewDormancy;
};
bool SafeSetNetDormancy(AActor* Actor, uint8_t Dormancy)
{
    if (!Actor)
    {
        printf("[SAFE SetNetDormancy] skipped Actor=null\n");
        return false;
    }

    UFunction* Fn = UObject::FindObject<UFunction>(
        "Function Engine.Actor.SetNetDormancy"
    );

    if (!Fn)
    {
        printf("[SAFE SetNetDormancy] Function Engine.Actor.SetNetDormancy not found. Skipping.\n");
        return false;
    }

    FSafe_SetNetDormancy_Params Params{};
    Params.NewDormancy = Dormancy;

    printf("[SAFE SetNetDormancy] Calling Actor=%p Dormancy=%u Fn=%p\n",
        Actor,
        (unsigned)Dormancy,
        Fn);

    bool Ok = CallProcessEventRaw((UObject*)Actor, Fn, &Params);

    printf("[SAFE SetNetDormancy] returned Ok=%d\n", Ok ? 1 : 0);

    return Ok;
}
static void* gWatchConn = nullptr;
static int32_t gLastOpenChannelsNum = -1;
bool SafeSetOwnerMaybeNull(AActor* Actor, AActor* NewOwner)
{
    if (!Actor)
    {
        printf("[SAFE SetOwnerMaybeNull] skipped Actor=null NewOwner=%p\n", NewOwner);
        return false;
    }

    UFunction* Fn = UObject::FindObject<UFunction>("Function Engine.Actor.SetOwner");

    if (!Fn)
    {
        printf("[SAFE SetOwnerMaybeNull] Function Engine.Actor.SetOwner not found. Skipping.\n");
        return false;
    }

    FSafe_SetOwner_Params Params{};
    Params.NewOwner = NewOwner;

    printf("[SAFE SetOwnerMaybeNull] Calling SetOwner Actor=%p NewOwner=%p Fn=%p\n",
        Actor, NewOwner, Fn);

    bool Ok = CallProcessEventRaw((UObject*)Actor, Fn, &Params);

    printf("[SAFE SetOwnerMaybeNull] returned Ok=%d\n", Ok ? 1 : 0);

    return Ok;
}
void WatchOpenChannelsDelta()
{
    if (!gWatchConn)
        return;

    uint8_t* ConnBytes = (uint8_t*)gWatchConn;

    void** Data = *(void***)(ConnBytes + 0x68);
    int32_t Num = *(int32_t*)(ConnBytes + 0x70);
    int32_t Max = *(int32_t*)(ConnBytes + 0x74);

    if (Num < 0 || Num > 2048)
        return;

    if (gLastOpenChannelsNum == -1)
    {
        gLastOpenChannelsNum = Num;
        printf("[CHAN WATCH] initial OpenChannels Data=%p Num=%d Max=%d\n", Data, Num, Max);
        return;
    }

    if (Num == gLastOpenChannelsNum)
        return;

    void* CurViewTarget = *(void**)((uint8_t*)gWatchConn + 0x88);
    void* CurOwningActor = *(void**)((uint8_t*)gWatchConn + 0x90);

    PrintObjectNameSafe("[CHAN WATCH] Conn.ViewTarget", CurViewTarget);
    PrintObjectNameSafe("[CHAN WATCH] Conn.OwningActor", CurOwningActor);

    printf("\n========== OPEN CHANNELS DELTA ==========\n");
    printf("[CHAN WATCH] Conn=%p Data=%p Num %d -> %d Max=%d\n",
        gWatchConn,
        Data,
        gLastOpenChannelsNum,
        Num,
        Max);

    if (Data && Num > 0 && Num <= 2048)
    {
        int32_t Start = gLastOpenChannelsNum;
        if (Start < 0)
            Start = 0;

        for (int32_t i = Start; i < Num; i++)
        {
            void* Channel = Data[i];

            if (!Channel)
            {
                printf("[CHAN WATCH] [%d] Channel=null\n", i);
                continue;
            }

            void* ChannelConn = *(void**)((uint8_t*)Channel + 0x28);
            void* ChannelActor = *(void**)((uint8_t*)Channel + 0x68);

            printf("[CHAN WATCH] [%d] Channel=%p ConnField=%p ActorField=%p",
                i,
                Channel,
                ChannelConn,
                ChannelActor);
            if (ChannelActor == gWatchPawn)
            {
                printf("\n!!!!!!!!!! PAWN CHANNEL APPEARED !!!!!!!!!!\n");
                printf("[CHAN WATCH] Index=%d Channel=%p Pawn=%p\n", i, Channel, gWatchPawn);
                printf("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n\n");


            }
            if (ChannelConn == gWatchConn)
                printf(" <ConnMatch>");

            printf("\n");

            if (ChannelActor)
            {
                PrintObjectNameSafe("    [CHAN WATCH] Actor", ChannelActor);
                DumpActorNetBytes("    [CHAN WATCH] NetBytes", ChannelActor);
            }
            if (ChannelActor)
            {
                UObject* Obj = (UObject*)ChannelActor;
                std::string Name = Obj->GetFullName();

                if (Name.find("PlayerPawn_C") != std::string::npos)
                {
                    printf("\n!!!!!!!!!! PLAYERPAWN CHANNEL FOUND !!!!!!!!!!\n");

                    DumpPawnCompareState("[PAWN CMP] Channel Pawn", ChannelActor);
                    DumpPawnCompareState("[PAWN CMP] Missing Target Pawn", gWatchPawn);

                    printf("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n\n");
                }
            }
        }
    }

    printf("=========================================\n\n");

    gLastOpenChannelsNum = Num;
}
struct FSafe_ViewTargetTransitionParams
{
    float BlendTime;       // 0x00
    uint8_t BlendFunction; // 0x04
    uint8_t Pad0[3];       // 0x05
    float BlendExp;        // 0x08
    bool bLockOutgoing;    // 0x0C
    uint8_t Pad1[3];       // 0x0D
};

struct FSafe_ClientSetViewTarget_Params
{
    AActor* A;
    FSafe_ViewTargetTransitionParams TransitionParams;
};

bool SafeClientSetViewTarget(APlayerController* PC, AActor* Target)
{
    if (!PC || !Target)
    {
        printf("[SAFE ClientSetViewTarget] skipped PC=%p Target=%p\n", PC, Target);
        return false;
    }

    UFunction* Fn = UObject::FindObject<UFunction>(
        "Function Engine.PlayerController.ClientSetViewTarget"
    );

    if (!Fn)
    {
        printf("[SAFE ClientSetViewTarget] Function Engine.PlayerController.ClientSetViewTarget not found. Skipping.\n");
        return false;
    }

    FSafe_ClientSetViewTarget_Params Params{};
    Params.A = Target;
    Params.TransitionParams.BlendTime = 0.0f;
    Params.TransitionParams.BlendFunction = 0;
    Params.TransitionParams.BlendExp = 0.0f;
    Params.TransitionParams.bLockOutgoing = false;

    printf("[SAFE ClientSetViewTarget] Calling PC=%p Target=%p Fn=%p\n",
        PC,
        Target,
        Fn);

    PrintObjectNameSafe("[SAFE ClientSetViewTarget] PC", PC);
    PrintObjectNameSafe("[SAFE ClientSetViewTarget] Target", Target);

    bool Ok = CallProcessEventRaw((UObject*)PC, Fn, &Params);

    printf("[SAFE ClientSetViewTarget] returned Ok=%d\n", Ok ? 1 : 0);

    return Ok;
}
APlayerController* ResolvePCFromPawn(APawn* Pawn)
{
    if (!Pawn)
        return nullptr;

    APlayerController* PC = nullptr;

    __try
    {
        PC = *(APlayerController**)((uint8_t*)Pawn + 0x438);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        PC = nullptr;
    }

    PrintObjectNameSafe("[RESOLVE PC] Pawn", Pawn);
    PrintObjectNameSafe("[RESOLVE PC] Pawn+0x438", PC);

    return PC;
}
void TestClientSetViewTargetToPawn()
{
    printf("\n========== TEST CLIENT SET VIEWTARGET TO PAWN ==========\n");

    APawn* Pawn = (APawn*)gWatchPawn;

    APlayerController* PC = ResolvePCFromPawn(Pawn);

    if (!PC)
    {
        printf("[VIEW TEST] Could not resolve PC from Pawn+0x438\n");
        return;
    }

    if (!PC || !Pawn || !gWatchConn)
    {
        printf("[VIEW RPC TEST] missing PC/Pawn/Conn\n");
        printf("========================================================\n\n");
        return;
    }

    bool HasChannel = HasPawnChannelForConnection(gWatchConn, Pawn);

    printf("[VIEW RPC TEST] HasPawnChannel=%d\n", HasChannel ? 1 : 0);

    if (!HasChannel)
    {
        printf("[VIEW RPC TEST] Not sending pawn view target because pawn has no actor channel.\n");
        printf("========================================================\n\n");
        return;
    }

    SafeClientSetViewTarget(PC, (AActor*)Pawn);

    printf("========================================================\n\n");
}
bool SafeServerRestartPlayer(APlayerController* PC)
{
    if (!PC)
    {
        printf("[SAFE ServerRestartPlayer] skipped PC=null\n");
        return false;
    }

    UFunction* Fn = UObject::FindObject<UFunction>(
        "Function Engine.PlayerController.ServerRestartPlayer"
    );

    if (!Fn)
    {
        printf("[SAFE ServerRestartPlayer] Function Engine.PlayerController.ServerRestartPlayer not found\n");
        return false;
    }

    printf("[SAFE ServerRestartPlayer] Calling PC=%p Fn=%p\n", PC, Fn);
    PrintObjectNameSafe("[SAFE ServerRestartPlayer] PC", PC);

    bool Ok = CallProcessEventRaw((UObject*)PC, Fn, nullptr);

    printf("[SAFE ServerRestartPlayer] returned Ok=%d\n", Ok ? 1 : 0);

    return Ok;
}
struct FSafe_ClientGotoState_Params
{
    FNameRaw NewState;
};

bool SafeClientGotoState(APlayerController* PC, const wchar_t* StateName)
{
    if (!PC || !StateName)
    {
        printf("[SAFE ClientGotoState] skipped PC=%p StateName=%p\n", PC, StateName);
        return false;
    }

    UFunction* Fn = UObject::FindObject<UFunction>(
        "Function Engine.PlayerController.ClientGotoState"
    );

    if (!Fn)
    {
        printf("[SAFE ClientGotoState] Function Engine.PlayerController.ClientGotoState not found\n");
        return false;
    }

    FSafe_ClientGotoState_Params Params{};
    Params.NewState = MakeFNameW(StateName);

    printf("[SAFE ClientGotoState] Calling PC=%p State=%ws Fn=%p\n",
        PC,
        StateName,
        Fn);

    PrintObjectNameSafe("[SAFE ClientGotoState] PC", PC);

    bool Ok = CallProcessEventRaw((UObject*)PC, Fn, &Params);

    printf("[SAFE ClientGotoState] returned Ok=%d\n", Ok ? 1 : 0);

    return Ok;
}
void DumpRealActorReplicationFields(const char* Label, AActor* Actor)
{
    if (!Actor)
        return;

    uint8_t* Base = (uint8_t*)Actor;

    float NetCullDistanceSquared = *(float*)(Base + 0x12C);
    int32_t NetTag = *(int32_t*)(Base + 0x130);
    float NetUpdateTime = *(float*)(Base + 0x134);
    float NetUpdateFrequency = *(float*)(Base + 0x138);
    float MinNetUpdateFrequency = *(float*)(Base + 0x13C);
    float NetPriority = *(float*)(Base + 0x140);
    float LastNetUpdateTime = *(float*)(Base + 0x144);

    printf("\n========== REAL ACTOR REPLICATION FIELDS: %s ==========\n", Label);
    PrintObjectNameSafe("[REAL REPL] Actor", Actor);

    printf("[REAL REPL] +0x084 flags = 0x%02X\n", Base[0x84]);
    printf("[REAL REPL] +0x085 flags = 0x%02X\n", Base[0x85]);
    printf("[REAL REPL] +0x086 flags = 0x%02X\n", Base[0x86]);

    printf("[REAL REPL] NetCullDistanceSquared +0x12C = %f\n", NetCullDistanceSquared);
    printf("[REAL REPL] NetTag                 +0x130 = %d\n", NetTag);
    printf("[REAL REPL] NetUpdateTime          +0x134 = %f\n", NetUpdateTime);
    printf("[REAL REPL] NetUpdateFrequency     +0x138 = %f\n", NetUpdateFrequency);
    printf("[REAL REPL] MinNetUpdateFrequency  +0x13C = %f\n", MinNetUpdateFrequency);
    printf("[REAL REPL] NetPriority            +0x140 = %f\n", NetPriority);
    printf("[REAL REPL] LastNetUpdateTime      +0x144 = %f\n", LastNetUpdateTime);

    printf("=======================================================\n\n");
}
void ForcePawnRealReplicationScheduling(AActor* Actor)
{
    if (!Actor)
        return;

    uint8_t* Base = (uint8_t*)Actor;

    printf("\n========== FORCE REAL PAWN REPLICATION SCHEDULING ==========\n");
    PrintObjectNameSafe("[FORCE REAL REPL] Actor", Actor);

    DumpRealActorReplicationFields("BEFORE", Actor);

    // +0x84 flags from SDK:
    // 0x08 = bOnlyRelevantToOwner
    // 0x10 = bAlwaysRelevant
    // 0x20 = bReplicateMovement
    // 0x40 = bTearOff
    Base[0x84] |= 0x10;   // bAlwaysRelevant = true
    Base[0x84] |= 0x20;   // bReplicateMovement = true
    Base[0x84] &= ~0x08;  // bOnlyRelevantToOwner = false
    Base[0x84] &= ~0x40;  // bTearOff = false

    // +0x85 flags from SDK:
    // 0x01 = bPendingNetUpdate
    // 0x02 = bNetLoadOnClient
    // 0x04 = bNetUseOwnerRelevancy
    Base[0x85] |= 0x01;   // bPendingNetUpdate = true
    Base[0x85] |= 0x02;   // bNetLoadOnClient = true
    Base[0x85] &= ~0x04;  // bNetUseOwnerRelevancy = false

    // Based on our previous observed SetReplicates test:
    // +0x86 bReplicates appears to include bit 0x08.
    Base[0x86] |= 0x08;   // bReplicates = true

    // Real replication scheduling fields from SDK.
    *(float*)(Base + 0x12C) = 999999999999.0f; // NetCullDistanceSquared
    *(float*)(Base + 0x134) = 0.0f;            // NetUpdateTime
    *(float*)(Base + 0x138) = 1000.0f;         // NetUpdateFrequency
    *(float*)(Base + 0x13C) = 1000.0f;         // MinNetUpdateFrequency
    *(float*)(Base + 0x140) = 10000.0f;        // NetPriority
    *(float*)(Base + 0x144) = 0.0f;            // LastNetUpdateTime

    DumpRealActorReplicationFields("AFTER", Actor);

    SafeProcessEventNoParams(
        (UObject*)Actor,
        "Function Engine.Actor.FlushNetDormancy"
    );

    SafeProcessEventNoParams(
        (UObject*)Actor,
        "Function Engine.Actor.ForceNetUpdate"
    );

    printf("============================================================\n\n");
}
void DumpActorRoles(const char* Label, AActor* Actor)
{
    if (!Actor)
        return;

    uint8_t* Base = (uint8_t*)Actor;

    uint8_t Flags84 = Base[0x84];
    uint8_t RemoteRole = Base[0x90];
    uint8_t Role = Base[0x118];

    printf("\n========== ACTOR ROLES: %s ==========\n", Label);
    PrintObjectNameSafe("[ROLES] Actor", Actor);

    printf("[ROLES] +0x84 Flags      = 0x%02X\n", Flags84);
    printf("[ROLES] bExchangedRoles? = %d\n", (Flags84 & 0x80) ? 1 : 0);
    printf("[ROLES] RemoteRole +0x90 = %u\n", RemoteRole);
    printf("[ROLES] Role       +0x118= %u\n", Role);

    printf("Role enum guess:\n");
    printf("  0 = ROLE_None\n");
    printf("  1 = ROLE_SimulatedProxy\n");
    printf("  2 = ROLE_AutonomousProxy\n");
    printf("  3 = ROLE_Authority\n");

    printf("=====================================\n\n");
}
void ForcePawnServerAuthorityRoles(APawn* Pawn)
{
    if (!Pawn)
        return;

    uint8_t* Base = (uint8_t*)Pawn;

    printf("\n========== FORCE PAWN SERVER AUTHORITY ROLES ==========\n");
    DumpActorRoles("BEFORE FORCE ROLES", (AActor*)Pawn);

    // ENetRole in UE4:
    // 0 = None
    // 1 = SimulatedProxy
    // 2 = AutonomousProxy
    // 3 = Authority

    Base[0x118] = 3; // Role = ROLE_Authority
    Base[0x90] = 2; // RemoteRole = ROLE_AutonomousProxy

    DumpActorRoles("AFTER FORCE ROLES", (AActor*)Pawn);

    SafeProcessEventNoParams(
        (UObject*)Pawn,
        "Function Engine.Actor.FlushNetDormancy"
    );

    SafeProcessEventNoParams(
        (UObject*)Pawn,
        "Function Engine.Actor.ForceNetUpdate"
    );

    printf("=======================================================\n\n");
}
static constexpr uintptr_t RVA_AACTOR_SET_REPLICATES = 0x1128690;
static constexpr uintptr_t RVA_UWORLD_ADD_NETWORK_ACTOR = 0x167CAE0;
static constexpr uintptr_t RVA_UWORLD_REMOVE_NETWORK_ACTOR = 0x16888F0;
static constexpr uintptr_t RVA_NETWORKOBJECTLIST_REMOVE = 0x12FFD30;
using tWorldNetworkActorFn = void(__fastcall*)(void* World, void* Actor);
static constexpr uintptr_t RVA_UNETCONNECTION_CREATE_CHANNEL = 0x142D660; // 00007FF6A19BD660
static constexpr uintptr_t RVA_UACTORCHANNEL_SET_CHANNEL_ACTOR = 0x12E0D70; // 00007FF6A1870D70
using tCreateChannel = void* (__fastcall*)(void* Conn, int32_t ChannelType, bool bOpenedLocally, int32_t ChannelIndex);
using tSetChannelActor = void(__fastcall*)(void* Channel, void* Actor);
static constexpr uintptr_t RVA_UACTORCHANNEL_REPLICATE_ACTOR = 0x12DCF30; // 00007FF6A186CF30

using tReplicateActor = bool(__fastcall*)(void* Channel);
bool ManualReplicatePawnChannel(void* Channel)
{
    if (!Channel)
    {
        printf("[MANUAL REPLICATE] skipped Channel=null\n");
        return false;
    }

    uintptr_t GameBase = (uintptr_t)GetModuleHandleW(nullptr);
    auto ReplicateActor =
        (tReplicateActor)(GameBase + RVA_UACTORCHANNEL_REPLICATE_ACTOR);

    printf("\n========== MANUAL PAWN CHANNEL REPLICATE ==========\n");
    printf("[MANUAL REPLICATE] Channel=%p ReplicateActor=%p\n",
        Channel, ReplicateActor);

    bool Result = false;

    __try
    {
        Result = ReplicateActor(Channel);
        printf("[MANUAL REPLICATE] ReplicateActor returned %d\n", Result ? 1 : 0);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[MANUAL REPLICATE] ReplicateActor threw SEH exception\n");
        Result = false;
    }

    printf("===================================================\n\n");
    return Result;
}
void ManualOpenPawnActorChannel(void* Conn, AActor* Pawn)
{
    if (!Conn || !Pawn)
    {
        printf("[MANUAL CHANNEL] skipped Conn=%p Pawn=%p\n", Conn, Pawn);
        return;
    }

    uintptr_t GameBase = (uintptr_t)GetModuleHandleW(nullptr);

    auto CreateChannel =
        (tCreateChannel)(GameBase + RVA_UNETCONNECTION_CREATE_CHANNEL);

    auto SetChannelActor =
        (tSetChannelActor)(GameBase + RVA_UACTORCHANNEL_SET_CHANNEL_ACTOR);

    printf("\n========== MANUAL PAWN ACTOR CHANNEL TEST ==========\n");
    printf("[MANUAL CHANNEL] Conn=%p Pawn=%p\n", Conn, Pawn);
    printf("[MANUAL CHANNEL] CreateChannel=%p SetChannelActor=%p\n",
        CreateChannel, SetChannelActor);

    void* Channel = nullptr;

    __try
    {
        // ChannelType 2 = Actor channel, based on observed native callsites.
        // bOpenedLocally=true, ChannelIndex=-1 = auto allocate.
        void* Channel = CreateChannel(Conn, 2, true, -1);

        if (Channel)
        {
            SetChannelActor(Channel, Pawn);

            ManualReplicatePawnChannel(Channel);

            SafeProcessEventNoParams((UObject*)Pawn, "Function Engine.Actor.ForceNetUpdate");
        }
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[MANUAL CHANNEL] CreateChannel threw SEH exception\n");
        Channel = nullptr;
    }

    printf("[MANUAL CHANNEL] Channel=%p\n", Channel);

    if (!Channel)
    {
        printf("[MANUAL CHANNEL] CreateChannel returned null\n");
        printf("====================================================\n\n");
        return;
    }

    __try
    {
        SetChannelActor(Channel, Pawn);
        printf("[MANUAL CHANNEL] SetChannelActor returned\n");
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[MANUAL CHANNEL] SetChannelActor threw SEH exception\n");
    }

    __try
    {
        printf("[MANUAL CHANNEL] Channel +0x44 type  = %d\n", *(int32_t*)((uint8_t*)Channel + 0x44));
        printf("[MANUAL CHANNEL] Channel +0x68 actor = %p\n", *(void**)((uint8_t*)Channel + 0x68));
        printf("[MANUAL CHANNEL] Channel +0x28 conn  = %p\n", *(void**)((uint8_t*)Channel + 0x28));
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[MANUAL CHANNEL] Channel dump threw SEH exception\n");
    }

    SafeProcessEventNoParams((UObject*)Pawn, "Function Engine.Actor.ForceNetUpdate");

    printf("====================================================\n\n");
}
void HardReregisterPawnNetworkObject(UWorld* World, AActor* Actor)
{
    if (!World || !Actor)
    {
        printf("[HARD REREG] skipped World=%p Actor=%p\n", World, Actor);
        return;
    }

    uintptr_t GameBase = (uintptr_t)GetModuleHandleW(nullptr);

    auto RemoveNetworkActor =
        (tWorldNetworkActorFn)(GameBase + RVA_UWORLD_REMOVE_NETWORK_ACTOR);

    auto AddNetworkActor =
        (tWorldNetworkActorFn)(GameBase + RVA_UWORLD_ADD_NETWORK_ACTOR);

    printf("\n========== HARD REREGISTER PAWN NETWORKOBJECT ==========\n");
    PrintObjectNameSafe("[HARD REREG] Actor", Actor);
    printf("[HARD REREG] World=%p\n", World);
    printf("[HARD REREG] RemoveNetworkActor=%p\n", RemoveNetworkActor);
    printf("[HARD REREG] AddNetworkActor=%p\n", AddNetworkActor);

    DumpRealActorReplicationFields("BEFORE HARD REREG", Actor);
    DumpActorRoles("BEFORE HARD REREG", Actor);

    printf("[HARD REREG] Calling RemoveNetworkActor(World, Actor)\n");

    __try
    {
        RemoveNetworkActor(World, Actor);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[HARD REREG] RemoveNetworkActor threw SEH exception\n");
    }

    printf("[HARD REREG] Re-forcing actor-side replication state\n");

    ForcePawnRealReplicationScheduling(Actor);

    printf("[HARD REREG] Calling AddNetworkActor(World, Actor)\n");

    __try
    {
        AddNetworkActor(World, Actor);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[HARD REREG] AddNetworkActor threw SEH exception\n");
    }

    SafeProcessEventNoParams(
        (UObject*)Actor,
        "Function Engine.Actor.FlushNetDormancy"
    );

    SafeProcessEventNoParams(
        (UObject*)Actor,
        "Function Engine.Actor.ForceNetUpdate"
    );

    DumpRealActorReplicationFields("AFTER HARD REREG", Actor);
    DumpActorRoles("AFTER HARD REREG", Actor);

    printf("=========================================================\n\n");
}
void DumpSpecificActorChannelState(
    void* Conn,
    AActor* PCActor,
    AActor* PawnActor,
    AActor* ExtraActor
)
{
    printf("\n========== SPECIFIC ACTOR CHANNEL STATE ==========\n");
    printf("[CHAN STATE] Conn  = %p | %s\n", Conn, SafeName((UObject*)Conn));

    printf("[CHAN STATE] PC    = %p | %s | HasChannel=%d\n",
        PCActor,
        SafeName((UObject*)PCActor),
        HasActorChannelFor((UNetConnection*)Conn, PCActor) ? 1 : 0);

    printf("[CHAN STATE] Pawn  = %p | %s | HasChannel=%d\n",
        PawnActor,
        SafeName((UObject*)PawnActor),
        HasActorChannelFor((UNetConnection*)Conn, PawnActor) ? 1 : 0);

    if (ExtraActor)
    {
        printf("[CHAN STATE] Extra = %p | %s | HasChannel=%d\n",
            ExtraActor,
            SafeName((UObject*)ExtraActor),
            HasActorChannelFor((UNetConnection*)Conn, ExtraActor) ? 1 : 0);
    }

    printf("==================================================\n\n");
}
static constexpr uintptr_t RVA_SERVER_REPLICATE_ACTORS_OR_TICKFLUSH = 0x1305110; // 00007FF6A1895110

using tServerReplicateActorsOrTickFlush = void(__fastcall*)(void* Driver, float DeltaSeconds);

void TryCallNativeServerReplicationOnce()
{
    if (!gServerDriver)
    {
        printf("[NATIVE REPL TICK] gServerDriver null\n");
        return;
    }

    uintptr_t GameBase = (uintptr_t)GetModuleHandleW(nullptr);

    auto Fn =
        (tServerReplicateActorsOrTickFlush)(GameBase + RVA_SERVER_REPLICATE_ACTORS_OR_TICKFLUSH);

    printf("\n========== TRY NATIVE SERVER REPLICATION ONCE ==========\n");
    printf("[NATIVE REPL TICK] Driver=%p Fn=%p\n", gServerDriver, Fn);

    __try
    {
        Fn(gServerDriver, 0.033f);
        printf("[NATIVE REPL TICK] call returned\n");
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[NATIVE REPL TICK] SEH exception\n");
    }

    printf("========================================================\n\n");
}
using tServerReplicateActors = int32_t(__fastcall*)(void* Driver, float DeltaSeconds);

static constexpr uintptr_t RVA_SERVER_REPLICATE_ACTORS = 0x1305110; // 00007FF6A1895110

void TryCallServerReplicateActors_NoPatches()
{
    if (!gServerDriver)
    {
        printf("[SRA TEST] gServerDriver null\n");
        return;
    }

    uintptr_t Base = (uintptr_t)GetModuleHandleW(nullptr);
    auto Fn = (tServerReplicateActors)(Base + RVA_SERVER_REPLICATE_ACTORS);

    printf("\n========== TRY SERVER REPLICATE ACTORS - NO PATCHES ==========\n");
    printf("[SRA TEST] Driver=%p | %s\n", gServerDriver, SafeName((UObject*)gServerDriver));

    __try
    {
        int32_t Result = Fn(gServerDriver, 1.0f / 30.0f);
        printf("[SRA TEST] returned %d\n", Result);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[SRA TEST] SEH exception\n");
    }

    printf("==============================================================\n\n");
}
void DumpTickFlushServerGate()
{
    printf("\n========== TICKFLUSH SERVER GATE ==========\n");

    if (!gServerDriver)
    {
        printf("[TICK GATE] gServerDriver null\n");
        printf("===========================================\n\n");
        return;
    }

    uint8_t* D = (uint8_t*)gServerDriver;

    void* ServerConnection = *(void**)(D + 0x70);
    void** ClientData = *(void***)(D + 0x78);
    int32_t ClientNum = *(int32_t*)(D + 0x80);
    int32_t ClientMax = *(int32_t*)(D + 0x84);

    printf("[TICK GATE] Driver           = %p | %s\n",
        gServerDriver,
        SafeName((UObject*)gServerDriver));

    printf("[TICK GATE] +0x70 ServerConn = %p | %s\n",
        ServerConnection,
        SafeName((UObject*)ServerConnection));

    printf("[TICK GATE] +0x78 ClientData = %p\n", ClientData);
    printf("[TICK GATE] +0x80 ClientNum  = %d\n", ClientNum);
    printf("[TICK GATE] +0x84 ClientMax  = %d\n", ClientMax);

    printf("[TICK GATE] IsServer(source) = %s\n",
        ServerConnection == nullptr ? "TRUE" : "FALSE");

    if (ClientData && ClientNum > 0)
    {
        void* FirstConn = ClientData[0];
        printf("[TICK GATE] FirstConn        = %p | %s\n",
            FirstConn,
            SafeName((UObject*)FirstConn));

        if (FirstConn)
        {
            printf("[TICK GATE] FirstConn State +0x124 = %d\n",
                *(int32_t*)((uint8_t*)FirstConn + 0x124));

            printf("[TICK GATE] FirstConn ViewTarget +0x88 = %p | %s\n",
                *(void**)((uint8_t*)FirstConn + 0x88),
                SafeName((UObject*)*(void**)((uint8_t*)FirstConn + 0x88)));

            printf("[TICK GATE] FirstConn OwningActor +0x90 = %p | %s\n",
                *(void**)((uint8_t*)FirstConn + 0x90),
                SafeName((UObject*)*(void**)((uint8_t*)FirstConn + 0x90)));
        }
    }

    printf("===========================================\n\n");
}
void DumpConnectionControllerFields(void* Conn, APlayerController* ExpectedPC)
{
    printf("\n========== CONNECTION CONTROLLER FIELDS ==========\n");

    if (!Conn)
    {
        printf("[CONN PC] Conn null\n");
        printf("==================================================\n\n");
        return;
    }

    uint8_t* C = (uint8_t*)Conn;

    void* MaybePlayerController = *(void**)(C + 0x30);
    void* ViewTarget = *(void**)(C + 0x88);
    void* OwningActor = *(void**)(C + 0x90);

    printf("[CONN PC] Conn              = %p | %s\n", Conn, SafeName((UObject*)Conn));

    printf("[CONN PC] +0x30 PlayerCtrl? = %p | %s %s\n",
        MaybePlayerController,
        SafeName((UObject*)MaybePlayerController),
        MaybePlayerController == ExpectedPC ? "<== PC" : "");

    printf("[CONN PC] +0x88 ViewTarget  = %p | %s\n",
        ViewTarget,
        SafeName((UObject*)ViewTarget));

    printf("[CONN PC] +0x90 OwningActor = %p | %s %s\n",
        OwningActor,
        SafeName((UObject*)OwningActor),
        OwningActor == ExpectedPC ? "<== PC" : "");

    printf("==================================================\n\n");
}
void RepairConnectionControllerAndViewTarget(APlayerController* PC, APawn* Pawn, void* Conn)
{
    printf("\n========== REPAIR CONNECTION CONTROLLER + VIEWTARGET ==========\n");

    if (!PC || !Pawn || !Conn)
    {
        printf("[CONN REPAIR] missing PC/Pawn/Conn\n");
        printf("================================================================\n\n");
        return;
    }

    uint8_t* C = (uint8_t*)Conn;

    void** PlayerControllerSlot = (void**)(C + 0x30);
    void** ViewTargetSlot = (void**)(C + 0x88);
    void** OwningActorSlot = (void**)(C + 0x90);

    printf("[CONN REPAIR] PC   = %p | %s\n", PC, SafeName((UObject*)PC));
    printf("[CONN REPAIR] Pawn = %p | %s\n", Pawn, SafeName((UObject*)Pawn));
    printf("[CONN REPAIR] Conn = %p | %s\n", Conn, SafeName((UObject*)Conn));

    printf("[CONN REPAIR] old +0x30 PlayerController = %p | %s\n",
        *PlayerControllerSlot,
        SafeName((UObject*)*PlayerControllerSlot));

    printf("[CONN REPAIR] old +0x88 ViewTarget       = %p | %s\n",
        *ViewTargetSlot,
        SafeName((UObject*)*ViewTargetSlot));

    printf("[CONN REPAIR] old +0x90 OwningActor      = %p | %s\n",
        *OwningActorSlot,
        SafeName((UObject*)*OwningActorSlot));

    if (*PlayerControllerSlot != PC)
    {
        printf("[CONN REPAIR] +0x30 PlayerController %p -> %p\n",
            *PlayerControllerSlot,
            PC);
        *PlayerControllerSlot = PC;
    }

    if (*OwningActorSlot != PC)
    {
        printf("[CONN REPAIR] +0x90 OwningActor %p -> %p\n",
            *OwningActorSlot,
            PC);
        *OwningActorSlot = PC;
    }

    if (*ViewTargetSlot != Pawn)
    {
        printf("[CONN REPAIR] +0x88 ViewTarget %p -> %p\n",
            *ViewTargetSlot,
            Pawn);
        *ViewTargetSlot = Pawn;
    }

    printf("[CONN REPAIR] new +0x30 PlayerController = %p | %s\n",
        *PlayerControllerSlot,
        SafeName((UObject*)*PlayerControllerSlot));

    printf("[CONN REPAIR] new +0x88 ViewTarget       = %p | %s\n",
        *ViewTargetSlot,
        SafeName((UObject*)*ViewTargetSlot));

    printf("[CONN REPAIR] new +0x90 OwningActor      = %p | %s\n",
        *OwningActorSlot,
        SafeName((UObject*)*OwningActorSlot));

    printf("================================================================\n\n");
}
bool CallFlushNetDormancy(AActor* Actor)
{
    if (!Actor)
        return false;

    return SafeProcessEventNoParams(
        (UObject*)Actor,
        "Function Engine.Actor.FlushNetDormancy"
    );
}

bool CallForceNetUpdate(AActor* Actor)
{
    if (!Actor)
        return false;

    return SafeProcessEventNoParams(
        (UObject*)Actor,
        "Function Engine.Actor.ForceNetUpdate"
    );
}
using tActorReplicationHelper = uint8_t(__fastcall*)(void* Actor);

static constexpr uintptr_t RVA_ACTOR_REPLICATION_HELPER = 0x209E10; // 00007FF6A0799E10

void TryNativeActorReplicationHelperForPawn()
{
    printf("\n========== TRY NATIVE ACTOR REPLICATION HELPER ==========\n");

    APlayerController* PC = FindRemotePlayerControllerForNetObjectDump();

    if (!PC)
    {
        printf("[ACTOR REP HELPER] no remote PC\n");
        printf("=========================================================\n\n");
        return;
    }

    APawn* Pawn = PC->Pawn;
    void* Conn = PC->NetConnection ? (void*)PC->NetConnection : (void*)PC->Player;

    printf("[ACTOR REP HELPER] PC   = %p | %s\n", PC, SafeName((UObject*)PC));
    printf("[ACTOR REP HELPER] Pawn = %p | %s\n", Pawn, SafeName((UObject*)Pawn));
    printf("[ACTOR REP HELPER] Conn = %p | %s\n", Conn, SafeName((UObject*)Conn));

    if (!Pawn || !Conn)
    {
        printf("[ACTOR REP HELPER] missing Pawn/Conn\n");
        printf("=========================================================\n\n");
        return;
    }

    RepairConnectionControllerAndViewTarget(PC, Pawn, Conn);
    ForcePawnServerAuthorityRoles(Pawn);
    CallFlushNetDormancy(Pawn);
    CallForceNetUpdate(Pawn);

    printf("[ACTOR REP HELPER] Before helper pawn channel:\n");
    HasPawnChannelForConnection(Conn, Pawn);

    uintptr_t Base = (uintptr_t)GetModuleHandleW(nullptr);
    auto Fn = (tActorReplicationHelper)(Base + RVA_ACTOR_REPLICATION_HELPER);

    __try
    {
        uint8_t Ret = Fn(Pawn);
        printf("[ACTOR REP HELPER] returned %u\n", Ret);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[ACTOR REP HELPER] SEH exception\n");
    }

    printf("[ACTOR REP HELPER] After helper pawn channel:\n");
    HasPawnChannelForConnection(Conn, Pawn);

    printf("=========================================================\n\n");
}
using tActorReplicationHelper_0799E10 = uint8_t(__fastcall*)(void* Actor);

static constexpr uintptr_t RVA_ACTOR_REPLICATION_HELPER_0799E10 = 0x209E10; // 00007FF6A0799E10

void TryActorReplicationHelper0799E10(AActor* Actor)
{
    printf("\n========== TRY ACTOR REPLICATION HELPER 0799E10 ==========\n");

    if (!Actor)
    {
        printf("[0799E10] Actor null\n");
        printf("==========================================================\n\n");
        return;
    }

    uintptr_t Base = (uintptr_t)GetModuleHandleW(nullptr);
    auto Fn = (tActorReplicationHelper_0799E10)(Base + RVA_ACTOR_REPLICATION_HELPER_0799E10);

    printf("[0799E10] Actor = %p | %s\n", Actor, SafeName((UObject*)Actor));
    printf("[0799E10] Fn    = %p\n", Fn);

    __try
    {
        uint8_t Ret = Fn(Actor);
        printf("[0799E10] returned %u\n", Ret);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[0799E10] SEH exception\n");
    }

    printf("==========================================================\n\n");
}
void DumpPCPawnReferences(APlayerController* PC, APawn* Pawn)
{
    printf("\n========== PC PAWN REFERENCE SCAN ==========\n");

    if (!PC || !Pawn)
    {
        printf("[PC SCAN] missing PC/Pawn\n");
        printf("============================================\n\n");
        return;
    }

    printf("[PC SCAN] PC   = %p | %s\n", PC, SafeName((UObject*)PC));
    printf("[PC SCAN] Pawn = %p | %s\n", Pawn, SafeName((UObject*)Pawn));

    SearchQwordInObject("PC for Pawn pointer", (uintptr_t)PC, 0x1200, (uintptr_t)Pawn);

    printf("============================================\n\n");
}
void ScanObjectForClassName(const char* Label, void* BaseObj, size_t Size, const char* ClassSubstring)
{
    printf("\n========== SCAN %s FOR CLASS '%s' ==========\n",
        Label ? Label : "?",
        ClassSubstring ? ClassSubstring : "?");

    if (!BaseObj || !ClassSubstring)
    {
        printf("[CLASS SCAN] missing BaseObj/ClassSubstring\n");
        printf("============================================\n\n");
        return;
    }

    uint8_t* B = (uint8_t*)BaseObj;

    int Hits = 0;

    for (size_t Off = 0; Off + 8 <= Size; Off += 8)
    {
        void* Candidate = nullptr;

        Candidate = *(void**)(B + Off);


        if (!Candidate)
            continue;

        UObject* Obj = (UObject*)Candidate;

        if (Obj->Class)
        {
            std::string Name = Obj->GetFullName();

            if (Name.find(ClassSubstring) != std::string::npos)
            {
                printf("[CLASS SCAN HIT] +0x%zX = %p | %s\n",
                    Off,
                    Candidate,
                    Name.c_str());
                Hits++;
            }
        }

    }

    printf("[CLASS SCAN] hits=%d\n", Hits);
    printf("============================================\n\n");
}
bool IsReadableMemory(const void* Ptr, size_t Size)
{
    if (!Ptr || Size == 0)
        return false;

    MEMORY_BASIC_INFORMATION mbi{};
    if (!VirtualQuery(Ptr, &mbi, sizeof(mbi)))
        return false;

    if (mbi.State != MEM_COMMIT)
        return false;

    if (mbi.Protect & PAGE_NOACCESS)
        return false;

    if (mbi.Protect & PAGE_GUARD)
        return false;

    uintptr_t Start = (uintptr_t)Ptr;
    uintptr_t End = Start + Size;
    uintptr_t RegionEnd = (uintptr_t)mbi.BaseAddress + mbi.RegionSize;

    return End <= RegionEnd;
}

bool SafeReadPtr(void* Address, void** OutValue)
{
    if (!OutValue)
        return false;

    *OutValue = nullptr;

    if (!IsReadableMemory(Address, sizeof(void*)))
        return false;

    __try
    {
        *OutValue = *(void**)Address;
        return true;
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        *OutValue = nullptr;
        return false;
    }
}
void* FindPlayerCameraManagerByOwnerScan(APlayerController* PC)
{
    if (!PC)
        return nullptr;

    uint8_t* B = (uint8_t*)PC;

    printf("\n========== FIND PLAYER CAMERA MANAGER BY OWNER ==========\n");
    printf("[PCM FIND] PC = %p | %s\n", PC, SafeName((UObject*)PC));

    for (size_t Off = 0; Off < 0x2000; Off += 8)
    {
        void* Candidate = nullptr;

        if (!SafeReadPtr(B + Off, &Candidate))
            continue;

        if (!Candidate)
            continue;

        // Candidate must be readable at +0x400 because APlayerCameraManager::PCOwner lives there.
        void* PCOwner = nullptr;
        if (!SafeReadPtr((uint8_t*)Candidate + 0x400, &PCOwner))
            continue;

        if (PCOwner != PC)
            continue;

        printf("[PCM FIND HIT] PC+0x%zX = %p | %s\n",
            Off,
            Candidate,
            SafeName((UObject*)Candidate));

        printf("[PCM FIND HIT] Candidate+0x400 PCOwner = %p | %s\n",
            PCOwner,
            SafeName((UObject*)PCOwner));

        printf("==========================================================\n\n");

        return Candidate;
    }

    printf("[PCM FIND] no PlayerCameraManager candidate found\n");
    printf("==========================================================\n\n");

    return nullptr;
}
void DumpPlayerCameraManagerViewTarget(APlayerController* PC, APawn* Pawn)
{
    printf("\n========== PLAYER CAMERA MANAGER VIEWTARGET ==========\n");

    if (!PC)
    {
        printf("[PCM VT] PC null\n");
        printf("======================================================\n\n");
        return;
    }

    void* PCM = FindPlayerCameraManagerByOwnerScan(PC);

    if (!PCM)
    {
        printf("[PCM VT] no PCM found\n");
        printf("======================================================\n\n");
        return;
    }

    void* CurrentTarget = nullptr;
    void* PendingTarget = nullptr;

    SafeReadPtr((uint8_t*)PCM + 0x0EB0, &CurrentTarget);
    SafeReadPtr((uint8_t*)PCM + 0x13E0, &PendingTarget);

    printf("[PCM VT] PC            = %p | %s\n", PC, SafeName((UObject*)PC));
    printf("[PCM VT] Pawn          = %p | %s\n", Pawn, SafeName((UObject*)Pawn));
    printf("[PCM VT] PCM           = %p | %s\n", PCM, SafeName((UObject*)PCM));

    printf("[PCM VT] ViewTarget.Target +0x0EB0        = %p | %s %s\n",
        CurrentTarget,
        SafeName((UObject*)CurrentTarget),
        CurrentTarget == Pawn ? "<== Pawn" : "");

    printf("[PCM VT] PendingViewTarget.Target +0x13E0 = %p | %s %s\n",
        PendingTarget,
        SafeName((UObject*)PendingTarget),
        PendingTarget == Pawn ? "<== Pawn" : "");

    printf("======================================================\n\n");
}
void RepairConnViewTargetFromPlayerCameraManager(APlayerController* PC, void* Conn)
{
    printf("\n========== REPAIR CONN VIEWTARGET FROM PCM ==========\n");

    if (!PC || !Conn)
    {
        printf("[CONN VT PCM] missing PC/Conn\n");
        printf("=====================================================\n\n");
        return;
    }

    void* PCM = *(void**)((uint8_t*)PC + 0x498);

    if (!PCM)
    {
        printf("[CONN VT PCM] PC+0x498 PCM is null\n");
        printf("=====================================================\n\n");
        return;
    }

    void* PCMViewTarget = *(void**)((uint8_t*)PCM + 0x0EB0);

    printf("[CONN VT PCM] PC  = %p | %s\n", PC, SafeName((UObject*)PC));
    printf("[CONN VT PCM] PCM = %p | %s\n", PCM, SafeName((UObject*)PCM));
    printf("[CONN VT PCM] PCM ViewTarget.Target = %p | %s\n",
        PCMViewTarget,
        SafeName((UObject*)PCMViewTarget));

    void** ConnViewTarget = (void**)((uint8_t*)Conn + 0x88);

    printf("[CONN VT PCM] old Conn+0x88 = %p | %s\n",
        *ConnViewTarget,
        SafeName((UObject*)*ConnViewTarget));

    if (PCMViewTarget)
    {
        *ConnViewTarget = PCMViewTarget;
    }

    printf("[CONN VT PCM] new Conn+0x88 = %p | %s\n",
        *ConnViewTarget,
        SafeName((UObject*)*ConnViewTarget));

    printf("=====================================================\n\n");
}
void DumpConnectionReadinessInputs(void* Conn, void* Driver)
{
    printf("\n========== CONNECTION READINESS INPUTS ==========\n");

    if (!Conn || !Driver)
    {
        printf("[READY] missing Conn/Driver\n");
        printf("=================================================\n\n");
        return;
    }

    void* PlayerController = *(void**)((uint8_t*)Conn + 0x30);
    void* ViewTarget = *(void**)((uint8_t*)Conn + 0x88);
    void* OwningActor = *(void**)((uint8_t*)Conn + 0x90);
    int32_t State = *(int32_t*)((uint8_t*)Conn + 0x124);
    float DriverTime = *(float*)((uint8_t*)Driver + 0xF0);

    printf("[READY] Conn             = %p | %s\n", Conn, SafeName((UObject*)Conn));
    printf("[READY] Driver           = %p | %s\n", Driver, SafeName((UObject*)Driver));

    printf("[READY] Conn+0x30 PC      = %p | %s\n",
        PlayerController, SafeName((UObject*)PlayerController));

    printf("[READY] Conn+0x88 VT      = %p | %s\n",
        ViewTarget, SafeName((UObject*)ViewTarget));

    printf("[READY] Conn+0x90 Owner   = %p | %s\n",
        OwningActor, SafeName((UObject*)OwningActor));

    printf("[READY] Conn+0x124 State  = %d\n", State);
    printf("[READY] Driver+0xF0 Time  = %f\n", DriverTime);

    printf("=================================================\n\n");
}
void DumpConnFloatCandidatesNearDriverTime(void* Conn, void* Driver)
{
    printf("\n========== CONN FLOAT CANDIDATES NEAR DRIVER TIME ==========\n");

    if (!Conn || !Driver)
    {
        printf("[CONN FLOAT] missing Conn/Driver\n");
        printf("============================================================\n\n");
        return;
    }

    float DriverTime = *(float*)((uint8_t*)Driver + 0xF0);

    printf("[CONN FLOAT] Conn       = %p | %s\n", Conn, SafeName((UObject*)Conn));
    printf("[CONN FLOAT] Driver     = %p | %s\n", Driver, SafeName((UObject*)Driver));
    printf("[CONN FLOAT] DriverTime = %f\n", DriverTime);
    printf("[CONN FLOAT] Ready threshold: LastReceiveTime > %f\n", DriverTime - 1.5f);

    for (size_t Off = 0; Off < 0x800; Off += 4)
    {
        float V = 0.0f;

        __try
        {
            V = *(float*)((uint8_t*)Conn + Off);
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            continue;
        }

        if (!isfinite(V))
            continue;

        float Age = DriverTime - V;

        // Print plausible timestamps near current driver time.
        if (V > 0.0f && Age > -5.0f && Age < 30.0f)
        {
            printf("[CONN FLOAT] +0x%03zX = %f  Age=%f %s\n",
                Off,
                V,
                Age,
                Age < 1.5f ? "<READY CANDIDATE>" : "<STALE CANDIDATE>");
        }
    }

    printf("============================================================\n\n");
}
void DumpWorldDriverBackReferences()
{
    printf("\n========== WORLD DRIVER BACK-REFERENCE SCAN ==========\n");

    if (!gServerDriver)
    {
        printf("[WORLD DRIVER] gServerDriver null\n");
        printf("======================================================\n\n");
        return;
    }

    uint8_t* D = (uint8_t*)gServerDriver;
    void* World = *(void**)(D + 0xA0);

    printf("[WORLD DRIVER] Driver = %p | %s\n",
        gServerDriver,
        SafeName((UObject*)gServerDriver));

    printf("[WORLD DRIVER] Driver+0xA0 World = %p | %s\n",
        World,
        SafeName((UObject*)World));

    if (World)
    {
        SearchQwordInObject(
            "World for Driver pointer",
            (uintptr_t)World,
            0x4000,
            (uintptr_t)gServerDriver
        );
    }

    printf("======================================================\n\n");
}
using tActorReplicationHelper_0799E10 = uint8_t(__fastcall*)(void* Actor);

uint8_t CallActorHelper0799E10(void* Actor)
{
    if (!Actor)
        return 0;

    uintptr_t Base = (uintptr_t)GetModuleHandleW(nullptr);
    auto Fn = (tActorReplicationHelper_0799E10)(Base + RVA_ACTOR_REPLICATION_HELPER_0799E10);

    uint8_t Ret = 0;

    __try
    {
        Ret = Fn(Actor);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[0799E10 PUMP] SEH exception Actor=%p | %s\n",
            Actor,
            SafeName((UObject*)Actor));
        Ret = 0;
    }

    return Ret;
}
bool ConnHasActorChannel(void* Conn, void* Actor)
{
    if (!Conn || !Actor)
        return false;

    uint8_t* C = (uint8_t*)Conn;

    void** Channels = *(void***)(C + 0x68);
    int32_t NumChannels = *(int32_t*)(C + 0x70);

    if (!Channels || NumChannels <= 0 || NumChannels > 4096)
        return false;

    for (int32_t i = 0; i < NumChannels; i++)
    {
        void* Ch = Channels[i];
        if (!Ch)
            continue;

        void* ChActor = nullptr;

        __try
        {
            ChActor = *(void**)((uint8_t*)Ch + 0x68);
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            continue;
        }

        if (ChActor == Actor)
            return true;
    }

    return false;
}

bool ActorMissingChannelForAnyClient(void* Driver, void* Actor)
{
    if (!Driver || !Actor)
        return false;

    uint8_t* D = (uint8_t*)Driver;

    void** ClientData = *(void***)(D + 0x78);
    int32_t ClientNum = *(int32_t*)(D + 0x80);

    if (!ClientData || ClientNum <= 0 || ClientNum > 64)
        return false;

    for (int32_t i = 0; i < ClientNum; i++)
    {
        void* Conn = ClientData[i];
        if (!Conn)
            continue;

        int32_t State = *(int32_t*)((uint8_t*)Conn + 0x124);
        if (State != 3)
            continue;

        if (!ConnHasActorChannel(Conn, Actor))
            return true;
    }

    return false;
}
bool ShouldPumpActorByName(const char* Name)
{
    if (!Name || !Name[0])
        return false;

    //// Core network/player actors
    //if (strstr(Name, "ShooterGameState")) return true;
    //if (strstr(Name, "GameState")) return true;
    //if (strstr(Name, "VictoryPlayerController")) return true;
    //if (strstr(Name, "PlayerController")) return true;
    //if (strstr(Name, "VictoryPlayerState")) return true;
    //if (strstr(Name, "PlayerState")) return true;
    if (strstr(Name, "PlayerPawn")) return true;

    // Actual gameplay/interactables
    //if (strstr(Name, "Door")) return true;
    //if (strstr(Name, "Gate")) return true;
    //if (strstr(Name, "Barrier")) return true;
    //if (strstr(Name, "Pod")) return true;
    //if (strstr(Name, "Cage")) return true;
    //if (strstr(Name, "Cell")) return true;
    //if (strstr(Name, "Contain")) return true;
    //if (strstr(Name, "Release")) return true;
    //if (strstr(Name, "Booth")) return true;
    //if (strstr(Name, "Button")) return true;
    //if (strstr(Name, "Interact")) return true;

    // Items/weapons
    //if (strstr(Name, "Weapon")) return true;
    //if (strstr(Name, "Item")) return true;
    //if (strstr(Name, "Pickup")) return true;
    //if (strstr(Name, "Inventory")) return true;
    //if (strstr(Name, "Loot")) return true;
    //if (strstr(Name, "Chest")) return true;

    // Combat
    //if (strstr(Name, "Projectile")) return true;
    //if (strstr(Name, "Trap")) return true;

    return false;
}
bool ShouldAlwaysPumpActorByName(const char* Name)
{
    if (!Name || !Name[0])
        return false;

    //// These need ongoing updates.
    //if (strstr(Name, "ShooterGameState")) return true;
    //if (strstr(Name, "GameState")) return true;
    if (strstr(Name, "PlayerPawn")) return true;
    //if (strstr(Name, "VictoryPlayerState")) return true;
    //if (strstr(Name, "PlayerState")) return true;

    //// Dynamic gameplay actors
    //if (strstr(Name, "Door")) return true;
    //if (strstr(Name, "Gate")) return true;
    //if (strstr(Name, "Barrier")) return true;
    //if (strstr(Name, "Pod")) return true;
    //if (strstr(Name, "Cage")) return true;
    //if (strstr(Name, "Cell")) return true;
    //if (strstr(Name, "Contain")) return true;
    //if (strstr(Name, "Release")) return true;
    //if (strstr(Name, "Booth")) return true;
    //if (strstr(Name, "Button")) return true;
    //if (strstr(Name, "Interact")) return true;

    //if (strstr(Name, "Weapon")) return true;
    //if (strstr(Name, "Item")) return true;
    //if (strstr(Name, "Pickup")) return true;
    //if (strstr(Name, "Inventory")) return true;
    //if (strstr(Name, "Projectile")) return true;
    //if (strstr(Name, "Trap")) return true;

    return false;
}
bool PointerLooksReadable(const void* Ptr, size_t Size)
{
    if (!Ptr || Size == 0)
        return false;

    MEMORY_BASIC_INFORMATION mbi{};
    if (!VirtualQuery(Ptr, &mbi, sizeof(mbi)))
        return false;

    if (mbi.State != MEM_COMMIT)
        return false;

    if (mbi.Protect & PAGE_NOACCESS)
        return false;

    if (mbi.Protect & PAGE_GUARD)
        return false;

    uintptr_t Start = (uintptr_t)Ptr;
    uintptr_t End = Start + Size;
    uintptr_t RegionEnd = (uintptr_t)mbi.BaseAddress + mbi.RegionSize;

    return End <= RegionEnd;
}

bool PtrLooksLikeGameVTable(void* Ptr)
{
    if (!Ptr)
        return false;

    MEMORY_BASIC_INFORMATION mbi{};

    if (!VirtualQuery(Ptr, &mbi, sizeof(mbi)))
        return false;

    void* Base = GetModuleHandleW(nullptr);

    return mbi.AllocationBase == Base;
}

bool LooksLikeUObjectPtr(void* Obj)
{
    if (!Obj)
        return false;

    if (!PointerLooksReadable(Obj, 0x30))
        return false;

    void* VTable = nullptr;

    __try
    {
        VTable = *(void**)Obj;
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        return false;
    }

    if (!PtrLooksLikeGameVTable(VTable))
        return false;

    // UObject::Class is usually at +0x10 in UE4 object layout.
    void* ClassPtr = nullptr;

    __try
    {
        ClassPtr = *(void**)((uint8_t*)Obj + 0x10);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        return false;
    }

    if (!ClassPtr || !PointerLooksReadable(ClassPtr, 0x30))
        return false;

    return true;
}

bool LooksLikeActorArrayAt(void* Level, size_t Offset)
{
    if (!Level)
        return false;

    uint8_t* L = (uint8_t*)Level;

    void** Data = nullptr;
    int32_t Num = 0;
    int32_t Max = 0;

    __try
    {
        Data = *(void***)(L + Offset);
        Num = *(int32_t*)(L + Offset + 0x08);
        Max = *(int32_t*)(L + Offset + 0x0C);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        return false;
    }

    if (!Data || Num <= 0 || Max < Num || Num > 20000 || Max > 30000)
        return false;

    if (!PointerLooksReadable(Data, sizeof(void*) * std::min<int32_t>(Num, 8)))
        return false;

    int Good = 0;
    int Checked = 0;

    for (int32_t i = 0; i < Num && Checked < 16; i++)
    {
        void* Obj = nullptr;

        __try
        {
            Obj = Data[i];
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            continue;
        }

        if (!Obj)
            continue;

        Checked++;

        if (LooksLikeUObjectPtr(Obj))
            Good++;
    }

    return Good >= 2;
}

size_t FindLevelActorArrayOffset(void* Level)
{
    if (!Level)
        return 0;

    for (size_t Off = 0x70; Off < 0x300; Off += 8)
    {
        if (LooksLikeActorArrayAt(Level, Off))
        {
            printf("[ACTOR PUMP] Found likely ULevel Actors array at Level+0x%zX\n", Off);
            return Off;
        }
    }

    printf("[ACTOR PUMP] Could not find ULevel Actors array\n");
    return 0;
}
static std::vector<void*> gPumpActors;
static size_t gPumpCursor = 0;
static size_t gLevelActorArrayOffset = 0;

void RefreshPumpActorList()
{
    gPumpActors.clear();

    if (!gServerWorld)
    {
        printf("[ACTOR PUMP] gServerWorld null\n");
        return;
    }

    ULevel* Level = gServerWorld->PersistentLevel;

    if (!Level)
    {
        printf("[ACTOR PUMP] PersistentLevel null\n");
        return;
    }

    int32_t ActorNum = 0;


    ActorNum = Level->Actors.Num();


    printf("[ACTOR PUMP] PersistentLevel=%p ActorNum=%d\n", Level, ActorNum);

    if (ActorNum <= 0 || ActorNum > 20000)
        return;

    for (int32_t i = 0; i < ActorNum; i++)
    {
        AActor* Actor = nullptr;


        Actor = Level->Actors[i];


        if (!Actor || !Actor->Class)
            continue;

        std::string FullName;


        FullName = Actor->GetFullName();



        if (!ShouldPumpActorByName(FullName.c_str()))
            continue;

        gPumpActors.push_back(Actor);
    }

    printf("[ACTOR PUMP] Candidate actors=%zu\n", gPumpActors.size());

    for (size_t i = 0; i < gPumpActors.size() && i < 30; i++)
    {
        std::string FullName = "<name failed>";


        FullName = ((AActor*)gPumpActors[i])->GetFullName();


        printf("[ACTOR PUMP] Candidate[%zu] %p | %s\n",
            i,
            gPumpActors[i],
            FullName.c_str());
    }
}
void PumpActorsWith0799E10(int MaxCallsPerTick)
{
    if (!gServerDriver)
        return;

    if (gPumpActors.empty())
        return;

    int Calls = 0;
    int MissingChannelCalls = 0;
    int AlwaysPumpCalls = 0;

    for (int tries = 0; tries < (int)gPumpActors.size() && Calls < MaxCallsPerTick; tries++)
    {
        if (gPumpCursor >= gPumpActors.size())
            gPumpCursor = 0;

        void* Actor = gPumpActors[gPumpCursor++];

        if (!Actor)
            continue;

        std::string FullName;

        if (!TryGetObjectFullName((UObject*)Actor, FullName))
            continue;

        if (!ShouldPumpActorByName(FullName.c_str()))
            continue;

        bool bMissingChannel = ActorMissingChannelForAnyClient(gServerDriver, Actor);
        bool bAlwaysPump = ShouldAlwaysPumpActorByName(FullName.c_str());

        // Old behavior only pumped missing-channel actors.
        // New behavior keeps dynamic actors alive too.
        if (!bMissingChannel && !bAlwaysPump)
            continue;


        CallFlushNetDormancy((AActor*)Actor);
        CallForceNetUpdate((AActor*)Actor);


        uint8_t Ret = CallActorHelper0799E10(Actor);

        if (bMissingChannel)
            MissingChannelCalls++;

        if (bAlwaysPump)
            AlwaysPumpCalls++;

        Calls++;
    }

    static int LogCounter = 0;

    // Log only occasionally.
    if ((LogCounter++ % 120) == 0)
    {
        printf("[ACTOR PUMP] Candidates=%zu Calls=%d MissingChannelCalls=%d AlwaysPumpCalls=%d Cursor=%zu\n",
            gPumpActors.size(),
            Calls,
            MissingChannelCalls,
            AlwaysPumpCalls,
            gPumpCursor);
    }
}
void __fastcall HookedSteamTickFlush_ActorPump(void* Driver, float DeltaSeconds)
{
    if (gInActorPumpTick)
    {
        if (gOrigSteamTickFlush)
            gOrigSteamTickFlush(Driver, DeltaSeconds);
        return;
    }

    gInActorPumpTick = true;

    // Always preserve the real SteamNetDriver TickFlush behavior.
    if (gOrigSteamTickFlush)
    {
        gOrigSteamTickFlush(Driver, DeltaSeconds);
    }

    if (Driver == gServerDriver)
    {
        uint8_t* D = (uint8_t*)Driver;

        void** ClientData = nullptr;
        int32_t ClientNum = 0;

        __try
        {
            ClientData = *(void***)(D + 0x78);
            ClientNum = *(int32_t*)(D + 0x80);
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            gInActorPumpTick = false;
            return;
        }

        bool bHasOpenClient = false;

        if (ClientData && ClientNum > 0 && ClientNum < 64)
        {
            for (int32_t i = 0; i < ClientNum; i++)
            {
                void* Conn = ClientData[i];
                if (!Conn)
                    continue;

                int32_t State = 0;

                __try
                {
                    State = *(int32_t*)((uint8_t*)Conn + 0x124);
                }
                __except (EXCEPTION_EXECUTE_HANDLER)
                {
                    continue;
                }

                if (State == 3)
                {
                    bHasOpenClient = true;
                    break;
                }
            }
        }

        if (bHasOpenClient)
        {
            static int RefreshCounter = 0;

            if ((RefreshCounter++ % 300) == 0)
            {
                RefreshPumpActorList();
            }

            PumpActorsWith0799E10(5);
        }
    }

    gInActorPumpTick = false;
}
void DumpActorsMatchingTerms()
{
    printf("\n========== ACTOR NAME TERM SCAN ==========\n");

    if (!gServerWorld || !gServerWorld->PersistentLevel)
    {
        printf("[TERM SCAN] Missing world/level\n");
        printf("==========================================\n\n");
        return;
    }

    ULevel* Level = gServerWorld->PersistentLevel;
    int32_t ActorNum = Level->Actors.Num();

    const char* Terms[] = {
        "Pod",
        "Cage",
        "Cell",
        "Contain",
        "Release",
        "Door",
        "Gate",
        "Barrier",
        "Booth",
        "Button",
        "Match",
        "Warmup",
        "Start",
        "Spawn",
        "Drop",
        "Lobby",
        "PlayerPawn",
        "PlayerState",
        "GameState"
    };

    for (int32_t i = 0; i < ActorNum; i++)
    {
        AActor* Actor = nullptr;

        Actor = Level->Actors[i];


        if (!Actor)
            continue;

        std::string FullName;

        if (!TryGetObjectFullName((UObject*)Actor, FullName))
            continue;

        for (const char* Term : Terms)
        {
            if (strstr(FullName.c_str(), Term))
            {
                printf("[TERM SCAN] Actor[%d] %p | %s\n",
                    i,
                    Actor,
                    FullName.c_str());
                break;
            }
        }
    }

    printf("==========================================\n\n");
}
bool PatchSteamNetDriverTickFlushActorPump(void* Driver)
{
    printf("\n========== PATCH STEAMNETDRIVER TICKFLUSH ACTOR PUMP ==========\n");

    if (!Driver)
    {
        printf("[ACTOR PUMP PATCH] Driver null\n");
        printf("================================================================\n\n");
        return false;
    }

    void** VTable = nullptr;

    __try
    {
        VTable = *(void***)Driver;
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[ACTOR PUMP PATCH] Failed reading driver vtable\n");
        printf("================================================================\n\n");
        return false;
    }

    if (!VTable)
    {
        printf("[ACTOR PUMP PATCH] VTable null\n");
        printf("================================================================\n\n");
        return false;
    }

    void** Slot = &VTable[VT_INDEX_TICKFLUSH];

    void* CurrentTarget = nullptr;

    __try
    {
        CurrentTarget = *Slot;
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[ACTOR PUMP PATCH] Failed reading TickFlush slot\n");
        printf("================================================================\n\n");
        return false;
    }

    printf("[ACTOR PUMP PATCH] Driver = %p | %s\n",
        Driver,
        SafeName((UObject*)Driver));

    printf("[ACTOR PUMP PATCH] VTable         = %p\n", VTable);
    printf("[ACTOR PUMP PATCH] Slot[%zu]      = %p\n", VT_INDEX_TICKFLUSH, Slot);
    printf("[ACTOR PUMP PATCH] Current target = %p\n", CurrentTarget);
    printf("[ACTOR PUMP PATCH] New target     = %p\n", &HookedSteamTickFlush_ActorPump);

    if (CurrentTarget == (void*)&HookedSteamTickFlush_ActorPump)
    {
        printf("[ACTOR PUMP PATCH] Already patched\n");
        printf("================================================================\n\n");
        return true;
    }

    // Capture the original Steam TickFlush only once.
    // Expected original should be around 00007FF6A28C5370 in your build.
    if (!gOrigSteamTickFlush)
    {
        gOrigSteamTickFlush = (tTickFlush)CurrentTarget;
        printf("[ACTOR PUMP PATCH] Captured original Steam TickFlush = %p\n",
            gOrigSteamTickFlush);
    }

    DWORD OldProtect = 0;

    if (!VirtualProtect(Slot, sizeof(void*), PAGE_EXECUTE_READWRITE, &OldProtect))
    {
        printf("[ACTOR PUMP PATCH] VirtualProtect failed err=%lu\n", GetLastError());
        printf("================================================================\n\n");
        return false;
    }

    *Slot = (void*)&HookedSteamTickFlush_ActorPump;

    DWORD Dummy = 0;
    VirtualProtect(Slot, sizeof(void*), OldProtect, &Dummy);
    FlushInstructionCache(GetCurrentProcess(), Slot, sizeof(void*));

    gActorPumpTickFlushPatched = true;

    printf("[ACTOR PUMP PATCH] Patched. VTable[%zu] now = %p\n",
        VT_INDEX_TICKFLUSH,
        VTable[VT_INDEX_TICKFLUSH]);

    printf("================================================================\n\n");

    return true;
}
void __fastcall HookedTickFlushTrace(void* Driver, float DeltaSeconds)
{
    static uint64_t TickCount = 0;
    TickCount++;

    if ((TickCount % 300) == 0)
    {
        printf("\n========== TICKFLUSH TRACE ==========\n");
        printf("[TICKFLUSH] Driver=%p Delta=%f TickCount=%llu\n",
            Driver,
            DeltaSeconds,
            TickCount);

        printf("[TICKFLUSH] gServerDriver=%p gServerWorld=%p\n",
            gServerDriver,
            gServerWorld);

        UNetDriver* NetDriver = (UNetDriver*)Driver;

        if (NetDriver)
        {
            printf("[TICKFLUSH] SDK Driver->World=%p\n",
                NetDriver->World);

            printf("[TICKFLUSH] SDK ServerConnection=%p\n",
                NetDriver->ServerConnection);

            printf("[TICKFLUSH] SDK ClientConnections.Num=%d\n",
                NetDriver->ClientConnections.Num());

            printf("[TICKFLUSH] SDK NetConnectionClass=%p\n",
                NetDriver->NetConnectionClass);

            printf("[TICKFLUSH] SDK RoleProperty=%p RemoteRoleProperty=%p\n",
                NetDriver->RoleProperty,
                NetDriver->RemoteRoleProperty);

            for (int i = 0; i < NetDriver->ClientConnections.Num(); i++)
            {
                UNetConnection* Conn = NetDriver->ClientConnections[i];

                printf("[TICKFLUSH]   ClientConn[%d]=%p\n", i, Conn);

                if (!Conn)
                    continue;

                void* PC = nullptr;
                void* OpenChannelsData = nullptr;
                int32_t OpenChannelsNum = -1;
                int32_t OpenChannelsMax = -1;
                int32_t State = -1;

                SafeReadPtrRaw((uint8_t*)Conn + 0x30, &PC);
                SafeReadPtrRaw((uint8_t*)Conn + 0x68, &OpenChannelsData);

                __try
                {
                    OpenChannelsNum = *(int32_t*)((uint8_t*)Conn + 0x70);
                    OpenChannelsMax = *(int32_t*)((uint8_t*)Conn + 0x74);
                    State = *(int32_t*)((uint8_t*)Conn + 0x124);
                }
                __except (EXCEPTION_EXECUTE_HANDLER)
                {
                }

                printf("[TICKFLUSH]     PC=%p State=%d OpenChannels Data=%p Num=%d Max=%d\n",
                    PC,
                    State,
                    OpenChannelsData,
                    OpenChannelsNum,
                    OpenChannelsMax);
            }

            void* NetworkObjects = nullptr;
            SafeReadPtrRaw((uint8_t*)Driver + 0x3F0, &NetworkObjects);

            printf("[TICKFLUSH] Raw +0x3F0 NetworkObjects=%p\n",
                NetworkObjects);
        }

        printf("=====================================\n\n");
    }

    if (gOrigSteamTickFlush)
    {
        gOrigSteamTickFlush(Driver, DeltaSeconds);
    }
}
using tFullReplicationFlush = void(__fastcall*)(void* Driver, float DeltaSeconds);

static tFullReplicationFlush gFullReplicationFlush = nullptr;
static bool gEnableFullReplicationFlush = false;
static bool gInsideFullReplicationFlush = false;

// Fill this with the RVA/address of the full flush wrapper that previously caused 5110 to hit.
// Do NOT use 0x1305110 here.
static constexpr uintptr_t RVA_FULL_REPLICATION_FLUSH_THAT_CALLS_5110 = 0xDEADBEEF;
using tFullTickFlushWrapper = void(__fastcall*)(void* Driver, float DeltaSeconds);

static constexpr uintptr_t RVA_FULL_TICKFLUSH_WRAPPER_THAT_CALLS_5110 = 0x1306390;

static tFullTickFlushWrapper gFullTickFlushWrapper = nullptr;
static bool gEnableFullTickFlushWrapper = false;
static bool gInsideFullTickFlushWrapper = false;
bool IsRemoteClientConnectionReadyForFullFlush()
{
    if (!gServerDriver)
        return false;

    UNetDriver* Driver = (UNetDriver*)gServerDriver;

    if (Driver->ClientConnections.Num() <= 0)
        return false;

    UNetConnection* Conn = Driver->ClientConnections[0];

    if (!Conn)
        return false;

    void* PC = nullptr;
    int32_t State = -1;
    int32_t OpenChannelsNum = -1;

    SafeReadPtrRaw((uint8_t*)Conn + 0x30, &PC);

    __try
    {
        State = *(int32_t*)((uint8_t*)Conn + 0x124);
        OpenChannelsNum = *(int32_t*)((uint8_t*)Conn + 0x70);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        return false;
    }

    if (!PC)
        return false;

    if (State != 3)
        return false;

    if (OpenChannelsNum < 4)
        return false;

    return true;
}
void CallFullTickFlushWrapperIfReady(void* Driver, float DeltaSeconds)
{
    if (!gEnableFullTickFlushWrapper)
        return;

    if (!Driver || Driver != gServerDriver)
        return;

    if (gInsideFullTickFlushWrapper)
        return;

    if (!IsRemoteClientConnectionReadyForFullFlush())
    {
        static int WaitLogCounter = 0;

        if ((WaitLogCounter++ % 300) == 0)
        {
            printf("[FULL TICKFLUSH] Waiting for remote client readiness\n");
        }

        return;
    }

    uintptr_t Base = (uintptr_t)GetModuleHandleW(nullptr);

    if (!gFullTickFlushWrapper)
    {
        gFullTickFlushWrapper =
            (tFullTickFlushWrapper)(Base + RVA_FULL_TICKFLUSH_WRAPPER_THAT_CALLS_5110);

        printf("[FULL TICKFLUSH] Wrapper=%p Base=%p RVA=0x%llX Expected5110=%p\n",
            gFullTickFlushWrapper,
            (void*)Base,
            (unsigned long long)RVA_FULL_TICKFLUSH_WRAPPER_THAT_CALLS_5110,
            (void*)(Base + 0x1305110));
    }

    uint8_t* D = (uint8_t*)Driver;

    uint8_t Gate941 = 0xFF;

    __try
    {
        Gate941 = *(uint8_t*)(D + 0x941);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[FULL TICKFLUSH] Failed reading +0x941\n");
        return;
    }

    static uint64_t CallCount = 0;
    CallCount++;

    if ((CallCount % 60) == 0)
    {
        printf("[FULL TICKFLUSH] Calling wrapper Driver=%p Delta=%f Count=%llu Gate941=0x%02X\n",
            Driver,
            DeltaSeconds,
            CallCount,
            Gate941);
    }

    gInsideFullTickFlushWrapper = true;

    __try
    {
        gFullTickFlushWrapper(Driver, DeltaSeconds);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[FULL TICKFLUSH] SEH exception inside wrapper\n");
    }

    gInsideFullTickFlushWrapper = false;
}

void __fastcall HookedSteamTickFlush_WithFullReplication(void* Driver, float DeltaSeconds)
{
    if (gInActorPumpTick)
    {
        if (gOrigSteamTickFlush)
            gOrigSteamTickFlush(Driver, DeltaSeconds);

        return;
    }

    gInActorPumpTick = true;

    // Keep Steam transport/maintenance alive.
    if (gOrigSteamTickFlush)
    {
        gOrigSteamTickFlush(Driver, DeltaSeconds);
    }

    // Then run the full base replication wrapper.
    CallFullTickFlushWrapperIfReady(Driver, DeltaSeconds);

    gInActorPumpTick = false;
}
void DumpNetDriverVTableTargets(void* Driver)
{
    if (!Driver)
    {
        printf("[VTABLE SCAN] Driver null\n");
        return;
    }

    uintptr_t Base = (uintptr_t)GetModuleHandleW(nullptr);

    uintptr_t Target6330 = Base + 0x1306330;
    uintptr_t Target6360 = Base + 0x1306360;
    uintptr_t Target6390 = Base + 0x1306390;
    uintptr_t Target5110 = Base + 0x1305110;

    void** VTable = nullptr;

    if (!SafeReadPtrRaw(Driver, (void**)&VTable) || !VTable)
    {
        printf("[VTABLE SCAN] Could not read vtable\n");
        return;
    }

    printf("\n========== NETDRIVER VTABLE SCAN ==========\n");
    printf("[VTABLE SCAN] Driver=%p VTable=%p Base=%p\n", Driver, VTable, (void*)Base);
    printf("[VTABLE SCAN] Target6330=%p Target6360=%p Target6390=%p Target5110=%p\n",
        (void*)Target6330,
        (void*)Target6360,
        (void*)Target6390,
        (void*)Target5110);

    for (int i = 0; i < 140; i++)
    {
        void* Fn = nullptr;

        if (!SafeReadPtrRaw(&VTable[i], &Fn) || !Fn)
            continue;

        uintptr_t RVA = (uintptr_t)Fn - Base;

        bool Interesting =
            ((uintptr_t)Fn == Target6330) ||
            ((uintptr_t)Fn == Target6360) ||
            ((uintptr_t)Fn == Target6390) ||
            ((uintptr_t)Fn == Target5110) ||
            (RVA >= 0x1304000 && RVA <= 0x1307000);

        if (Interesting)
        {
            printf("[VTABLE SCAN] [%03d] Fn=%p RVA=0x%llX",
                i,
                Fn,
                (unsigned long long)RVA);

            if ((uintptr_t)Fn == Target6330) printf("  <-- 1306330 wrapper");
            if ((uintptr_t)Fn == Target6360) printf("  <-- 1306360 wrapper");
            if ((uintptr_t)Fn == Target6390) printf("  <-- 1306390 full wrapper");
            if ((uintptr_t)Fn == Target5110) printf("  <-- 1305110 ServerReplicateActors");

            printf("\n");
        }
    }

    printf("===========================================\n\n");
}
using tServerReplicateActors = int32_t(__fastcall*)(void* Driver, float DeltaSeconds);

void DumpReplicationStateBrief(const char* Tag, void* Driver)
{
    if (!Driver)
        return;

    uint8_t* D = (uint8_t*)Driver;

    void* NetObjects = nullptr;
    void* Conn = nullptr;
    int32_t ClientNum = -1;
    int32_t ConnState = -1;
    int32_t OpenChannelsNum = -1;
    void* PC = nullptr;
    void* Pawn408 = nullptr;
    void* ViewTarget = nullptr;
    void* OwningActor = nullptr;

    SafeReadPtrRaw(D + 0x3F0, &NetObjects);

    __try
    {
        ClientNum = *(int32_t*)(D + 0x80);

        void** ClientData = *(void***)(D + 0x78);

        if (ClientData && ClientNum > 0)
            Conn = ClientData[0];

        if (Conn)
        {
            ConnState = *(int32_t*)((uint8_t*)Conn + 0x124);
            OpenChannelsNum = *(int32_t*)((uint8_t*)Conn + 0x70);
            PC = *(void**)((uint8_t*)Conn + 0x30);
            ViewTarget = *(void**)((uint8_t*)Conn + 0x88);
            OwningActor = *(void**)((uint8_t*)Conn + 0x90);

            if (PC)
                Pawn408 = *(void**)((uint8_t*)PC + 0x408);
        }
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
    }

    int32_t NetObj_08 = -1;
    int32_t NetObj_28 = -1;
    int32_t NetObj_34 = -1;

    if (NetObjects)
    {
        __try
        {
            NetObj_08 = *(int32_t*)((uint8_t*)NetObjects + 0x08);
            NetObj_28 = *(int32_t*)((uint8_t*)NetObjects + 0x28);
            NetObj_34 = *(int32_t*)((uint8_t*)NetObjects + 0x34);
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
        }
    }

    printf("[REPL STATE:%s] Driver=%p Conn=%p ClientNum=%d State=%d OpenChannels=%d\n",
        Tag,
        Driver,
        Conn,
        ClientNum,
        ConnState,
        OpenChannelsNum);

    printf("[REPL STATE:%s] PC=%p Pawn408=%p ViewTarget=%p OwningActor=%p\n",
        Tag,
        PC,
        Pawn408,
        ViewTarget,
        OwningActor);

    printf("[REPL STATE:%s] NetworkObjects=%p +08=%d +28=%d +34=%d\n",
        Tag,
        NetObjects,
        NetObj_08,
        NetObj_28,
        NetObj_34);
}
static bool gEnableMissingSRA = true;
static bool gInsideMissingSRA = false;
static double gLastSRATime = 0.0;
bool ConnectionHasActorChannel(void* Conn, void* TargetActor)
{
    if (!Conn || !TargetActor)
        return false;

    void** OpenChannelsData = nullptr;
    int32_t OpenChannelsNum = 0;

    __try
    {
        OpenChannelsData = *(void***)((uint8_t*)Conn + 0x68);
        OpenChannelsNum = *(int32_t*)((uint8_t*)Conn + 0x70);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        return false;
    }

    if (!OpenChannelsData || OpenChannelsNum <= 0)
        return false;

    for (int i = 0; i < OpenChannelsNum; i++)
    {
        void* Ch = nullptr;
        void* Actor = nullptr;

        __try
        {
            Ch = OpenChannelsData[i];

            if (Ch)
                Actor = *(void**)((uint8_t*)Ch + 0x68);
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            continue;
        }

        if (Actor == TargetActor)
            return true;
    }

    return false;
}
bool SafeProcessEventWithParams(UObject* Obj, const char* FunctionFullName, void* Params)
{
    if (!Obj)
    {
        printf("[PROCESS EVENT] Obj null for %s\n",
            FunctionFullName ? FunctionFullName : "<null>");
        return false;
    }

    if (!FunctionFullName)
    {
        printf("[PROCESS EVENT] FunctionFullName null\n");
        return false;
    }

    UFunction* Fn = UObject::FindObject<UFunction>(FunctionFullName);

    if (!Fn)
    {
        printf("[PROCESS EVENT] Function not found: %s\n", FunctionFullName);
        return false;
    }

    CallProcessEventRaw(Obj, Fn, Params);


    return true;
}

bool IsServerReplicationReady(void* Driver)
{
    if (!Driver || Driver != gServerDriver)
        return false;

    UNetDriver* NetDriver = (UNetDriver*)Driver;

    // IsServer() == ServerConnection == nullptr
    if (NetDriver->ServerConnection != nullptr)
        return false;

    if (NetDriver->ClientConnections.Num() <= 0)
        return false;

    UNetConnection* Conn = NetDriver->ClientConnections[0];

    if (!Conn)
        return false;

    void* PC = nullptr;
    int32_t State = -1;
    int32_t OpenChannelsNum = -1;

    SafeReadPtrRaw((uint8_t*)Conn + 0x30, &PC);

    __try
    {
        State = *(int32_t*)((uint8_t*)Conn + 0x124);
        OpenChannelsNum = *(int32_t*)((uint8_t*)Conn + 0x70);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        return false;
    }

    if (!PC)
        return false;

    if (State != 3)
        return false;

    if (OpenChannelsNum < 4)
        return false;

    return true;
}
bool CallClientRestartOnPC(void* PC, void* Pawn)
{
    if (!PC || !Pawn)
        return false;

    struct
    {
        void* NewPawn;
    } Params;

    Params.NewPawn = Pawn;

    printf("[CLIENT FINALIZE] Calling ClientRestart PC=%p Pawn=%p\n",
        PC,
        Pawn);

    bool Ok = SafeProcessEventWithParams(
        (UObject*)PC,
        "Function Engine.PlayerController.ClientRestart",
        &Params
    );

    printf("[CLIENT FINALIZE] ClientRestart returned %d\n", Ok ? 1 : 0);

    return Ok;
}
struct ClientRestartRecord
{
    void* Conn;
    void* Pawn;
};
bool CallNoParamFunction(void* Obj, const char* FunctionName)
{
    if (!Obj || !FunctionName)
        return false;

    printf("[NO PARAM CALL] Calling %s Obj=%p\n", FunctionName, Obj);

    bool Ok = SafeProcessEventWithParams(
        (UObject*)Obj,
        FunctionName,
        nullptr
    );

    printf("[NO PARAM CALL] %s returned %d\n",
        FunctionName,
        Ok ? 1 : 0);

    return Ok;
}

bool CallBoolFunction(void* Obj, const char* FunctionName, bool Value)
{
    if (!Obj || !FunctionName)
        return false;

    struct
    {
        bool bValue;
    } Params;

    Params.bValue = Value;

    printf("[BOOL CALL] Calling %s Obj=%p Value=%d\n",
        FunctionName,
        Obj,
        Value ? 1 : 0);

    bool Ok = SafeProcessEventWithParams(
        (UObject*)Obj,
        FunctionName,
        &Params
    );

    printf("[BOOL CALL] %s returned %d\n",
        FunctionName,
        Ok ? 1 : 0);

    return Ok;
}

bool CallEnableInput(void* Actor, void* PC)
{
    if (!Actor || !PC)
        return false;

    struct
    {
        void* PlayerController;
    } Params;

    Params.PlayerController = PC;

    printf("[INPUT UNLOCK] Calling Actor.EnableInput Actor=%p PC=%p\n",
        Actor,
        PC);

    bool Ok = SafeProcessEventWithParams(
        (UObject*)Actor,
        "Function Engine.Actor.EnableInput",
        &Params
    );

    printf("[INPUT UNLOCK] EnableInput returned %d\n", Ok ? 1 : 0);

    return Ok;
}

bool CallSetCinematicModeFalse(void* PC)
{
    if (!PC)
        return false;

    struct
    {
        bool bInCinematicMode;
        bool bHidePlayer;
        bool bAffectsHUD;
        bool bAffectsMovement;
        bool bAffectsTurning;
    } Params;

    memset(&Params, 0, sizeof(Params));

    Params.bInCinematicMode = false;
    Params.bHidePlayer = false;
    Params.bAffectsHUD = false;
    Params.bAffectsMovement = true;
    Params.bAffectsTurning = true;

    printf("[INPUT UNLOCK] Calling SetCinematicMode false PC=%p\n", PC);

    bool Ok = SafeProcessEventWithParams(
        (UObject*)PC,
        "Function Engine.PlayerController.SetCinematicMode",
        &Params
    );

    printf("[INPUT UNLOCK] SetCinematicMode returned %d\n", Ok ? 1 : 0);

    return Ok;
}
void TryUnlockClientMovementAndReady(void* PC, void* Pawn)
{
    if (!PC || !Pawn)
        return;

    printf("[INPUT UNLOCK] Begin PC=%p Pawn=%p\n", PC, Pawn);

    // Clear basic controller input locks.
    CallBoolFunction(PC, "Function Engine.Controller.SetIgnoreMoveInput", false);
    CallNoParamFunction(PC, "Function Engine.Controller.ResetIgnoreMoveInput");

    CallBoolFunction(PC, "Function Engine.Controller.SetIgnoreLookInput", false);
    CallNoParamFunction(PC, "Function Engine.Controller.ResetIgnoreLookInput");

    // Clear cinematic movement lock if the game used it.
    CallSetCinematicModeFalse(PC);

    // Make sure the pawn accepts input from this controller.
    CallEnableInput(Pawn, PC);

    // The game-specific ready path. Some of these may fail; that is fine.
    // The log will tell us which name exists.
    CallNoParamFunction(PC, "Function Victory.VictoryPlayerController.SetClientReadyForMatch");
    CallNoParamFunction(PC, "Function VictoryPlayerController.SetClientReadyForMatch");
    CallNoParamFunction(PC, "Function VictoryPlayerController_C.SetClientReadyForMatch");
    CallNoParamFunction(PC, "Function Engine.PlayerController.SetClientReadyForMatch");

    // Possible server-RPC naming variants.
    CallNoParamFunction(PC, "Function Victory.VictoryPlayerController.ServerSetClientReadyForMatch");
    CallNoParamFunction(PC, "Function VictoryPlayerController.ServerSetClientReadyForMatch");
    CallNoParamFunction(PC, "Function VictoryPlayerController_C.ServerSetClientReadyForMatch");

    printf("[INPUT UNLOCK] End PC=%p Pawn=%p\n", PC, Pawn);
}
bool GetPCAndPawnFromConnection(void* Conn, void** OutPC, void** OutPawn)
{
    if (OutPC)
        *OutPC = nullptr;

    if (OutPawn)
        *OutPawn = nullptr;

    if (!Conn)
        return false;

    void* PC = nullptr;
    void* Pawn = nullptr;

    __try
    {
        PC = *(void**)((uint8_t*)Conn + 0x30);

        if (PC)
            Pawn = *(void**)((uint8_t*)PC + 0x408);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        return false;
    }

    if (OutPC)
        *OutPC = PC;

    if (OutPawn)
        *OutPawn = Pawn;

    return PC != nullptr;
}
using tActorChannelReplicateActor = bool(__fastcall*)(void* Channel);

static constexpr uintptr_t RVA_ACTOR_CHANNEL_REPLICATE_ACTOR = 0x12DCF30;

void PulseReplicatePawnChannelsForAllClients(void* Driver)
{
    if (!Driver)
        return;

    UNetDriver* NetDriver = (UNetDriver*)Driver;

    int32_t ConnNum = NetDriver->ClientConnections.Num();

    if (ConnNum <= 0)
        return;

    uintptr_t Base = (uintptr_t)GetModuleHandleW(nullptr);

    auto ReplicateActor =
        (tActorChannelReplicateActor)(Base + RVA_ACTOR_CHANNEL_REPLICATE_ACTOR);

    constexpr int MaxClients = 16;

    void* Pawns[MaxClients] = {};
    int PawnCount = 0;

    // Gather all player pawns.
    for (int32_t i = 0; i < ConnNum && PawnCount < MaxClients; i++)
    {
        UNetConnection* Conn = NetDriver->ClientConnections[i];

        if (!Conn)
            continue;

        void* PC = nullptr;
        void* Pawn = nullptr;

        if (!GetPCAndPawnFromConnection(Conn, &PC, &Pawn))
            continue;

        if (!Pawn)
            continue;

        Pawns[PawnCount++] = Pawn;
    }

    if (PawnCount <= 0)
        return;

    // For every connection, replicate every player pawn channel it has.
    for (int32_t ConnIndex = 0; ConnIndex < ConnNum; ConnIndex++)
    {
        UNetConnection* Conn = NetDriver->ClientConnections[ConnIndex];

        if (!Conn)
            continue;

        void** OpenChannelsData = nullptr;
        int32_t OpenChannelsNum = 0;

        __try
        {
            OpenChannelsData = *(void***)((uint8_t*)Conn + 0x68);
            OpenChannelsNum = *(int32_t*)((uint8_t*)Conn + 0x70);
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            continue;
        }

        if (!OpenChannelsData || OpenChannelsNum <= 0)
            continue;

        for (int32_t ChIndex = 0; ChIndex < OpenChannelsNum; ChIndex++)
        {
            void* Ch = nullptr;
            void* Actor = nullptr;

            __try
            {
                Ch = OpenChannelsData[ChIndex];

                if (Ch)
                    Actor = *(void**)((uint8_t*)Ch + 0x68);
            }
            __except (EXCEPTION_EXECUTE_HANDLER)
            {
                continue;
            }

            if (!Ch || !Actor)
                continue;

            bool IsPlayerPawn = false;

            for (int p = 0; p < PawnCount; p++)
            {
                if (Actor == Pawns[p])
                {
                    IsPlayerPawn = true;
                    break;
                }
            }

            if (!IsPlayerPawn)
                continue;

            __try
            {
                ReplicateActor(Ch);
            }
            __except (EXCEPTION_EXECUTE_HANDLER)
            {
                printf("[PULSE PAWN REPL] Exception Conn[%d] Ch=%p Actor=%p\n",
                    ConnIndex,
                    Ch,
                    Actor);
            }
        }
    }
}
void TryClientRestartForAllClientsWhenReady(void* Driver)
{
    if (!Driver)
        return;

    static ClientRestartRecord Restarted[16] = {};
    static int RestartedCount = 0;

    UNetDriver* NetDriver = (UNetDriver*)Driver;

    int32_t ConnNum = NetDriver->ClientConnections.Num();

    for (int32_t i = 0; i < ConnNum; i++)
    {
        UNetConnection* Conn = NetDriver->ClientConnections[i];

        if (!Conn)
            continue;

        void* PC = nullptr;
        void* Pawn = nullptr;

        if (!GetPCAndPawnFromConnection(Conn, &PC, &Pawn))
            continue;

        if (!PC || !Pawn)
            continue;

        if (!ConnectionHasActorChannel(Conn, Pawn))
            continue;

        bool AlreadySent = false;

        for (int r = 0; r < RestartedCount; r++)
        {
            if (Restarted[r].Conn == Conn && Restarted[r].Pawn == Pawn)
            {
                AlreadySent = true;
                break;
            }
        }

        if (AlreadySent)
            continue;

        printf("[CLIENT RESTART] Conn[%d]=%p PC=%p Pawn=%p has own pawn channel, sending ClientRestart\n",
            i,
            Conn,
            PC,
            Pawn);

        bool Ok = CallClientRestartOnPC(PC, Pawn);

        printf("[CLIENT RESTART] Conn[%d] result=%d\n",
            i,
            Ok ? 1 : 0);

        if (Ok && RestartedCount < 16)
        {
            Restarted[RestartedCount].Conn = Conn;
            Restarted[RestartedCount].Pawn = Pawn;
            RestartedCount++;
        }
    }
}
void EnsureConnectionViewTargetForSRA(void* Driver)
{
    if (!Driver)
        return;

    uint8_t* D = (uint8_t*)Driver;

    void* Conn = nullptr;
    void* PC = nullptr;
    void* Pawn = nullptr;
    void* ViewTarget = nullptr;
    void* OwningActor = nullptr;

    __try
    {
        int32_t ClientNum = *(int32_t*)(D + 0x80);
        void** ClientData = *(void***)(D + 0x78);

        if (!ClientData || ClientNum <= 0)
            return;

        Conn = ClientData[0];

        if (!Conn)
            return;

        PC = *(void**)((uint8_t*)Conn + 0x30);

        if (PC)
            Pawn = *(void**)((uint8_t*)PC + 0x408);

        ViewTarget = *(void**)((uint8_t*)Conn + 0x88);
        OwningActor = *(void**)((uint8_t*)Conn + 0x90);

        // OwningActor should be the PC.
        if (!OwningActor && PC)
        {
            *(void**)((uint8_t*)Conn + 0x90) = PC;
            OwningActor = PC;
        }

        // ViewTarget should not be null. Prefer pawn if it exists.
        if (!ViewTarget)
        {
            void* NewViewTarget = Pawn ? Pawn : PC;

            if (NewViewTarget)
            {
                *(void**)((uint8_t*)Conn + 0x88) = NewViewTarget;

                static bool Logged = false;

                if (!Logged)
                {
                    printf("[SRA VIEWTARGET] Conn=%p PC=%p Pawn=%p ViewTarget NULL -> %p OwningActor=%p\n",
                        Conn,
                        PC,
                        Pawn,
                        NewViewTarget,
                        OwningActor);

                    Logged = true;
                }
            }
        }
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[SRA VIEWTARGET] Exception while fixing ViewTarget\n");
    }
}
using tActorReplicationHelper_0799E10 = uint8_t(__fastcall*)(void* Actor);


void DumpPawnReplicationState(const char* Tag, void* Driver)
{
    if (!Driver)
        return;

    UNetDriver* NetDriver = (UNetDriver*)Driver;

    if (NetDriver->ClientConnections.Num() <= 0)
        return;

    UNetConnection* Conn = NetDriver->ClientConnections[0];

    if (!Conn)
        return;

    void* PC = nullptr;
    void* Pawn = nullptr;
    void* Owner = nullptr;

    uint8_t RemoteRole = 0xFF;
    uint8_t Role = 0xFF;
    float NetUpdateTime = -1.0f;
    float LastNetUpdateTime = -1.0f;


    PC = *(void**)((uint8_t*)Conn + 0x30);

    if (PC)
        Pawn = *(void**)((uint8_t*)PC + 0x408);

    if (Pawn)
    {
        RemoteRole = *(uint8_t*)((uint8_t*)Pawn + 0x90);
        Owner = *(void**)((uint8_t*)Pawn + 0x98);
        Role = *(uint8_t*)((uint8_t*)Pawn + 0x118);
        NetUpdateTime = *(float*)((uint8_t*)Pawn + 0x134);
        LastNetUpdateTime = *(float*)((uint8_t*)Pawn + 0x144);
    }

    std::string PawnName;
    std::string OwnerName;

    if (Pawn)
        TryGetObjectFullName((UObject*)Pawn, PawnName);

    if (Owner)
        TryGetObjectFullName((UObject*)Owner, OwnerName);

    printf("\n========== PAWN REP STATE: %s ==========\n", Tag ? Tag : "<null>");
    printf("[PAWN REP] Conn=%p PC=%p Pawn=%p\n", Conn, PC, Pawn);
    printf("[PAWN REP] PawnName=%s\n", PawnName.c_str());
    printf("[PAWN REP] Role+118=%u RemoteRole+90=%u Owner+98=%p\n",
        Role,
        RemoteRole,
        Owner);
    printf("[PAWN REP] OwnerName=%s\n", OwnerName.c_str());
    printf("[PAWN REP] NetUpdateTime+134=%f LastNetUpdateTime+144=%f\n",
        NetUpdateTime,
        LastNetUpdateTime);
    printf("[PAWN REP] HasPawnChannel=%d\n",
        ConnectionHasActorChannel(Conn, Pawn) ? 1 : 0);
    printf("========================================\n\n");
}
void DumpOpenChannelsBrief(const char* Tag, void* Conn)
{
    if (!Conn)
    {
        printf("[CHANNEL DUMP:%s] Conn null\n", Tag ? Tag : "<null>");
        return;
    }

    void** OpenChannelsData = nullptr;
    int32_t OpenChannelsNum = 0;


    OpenChannelsData = *(void***)((uint8_t*)Conn + 0x68);
    OpenChannelsNum = *(int32_t*)((uint8_t*)Conn + 0x70);


    printf("\n========== CHANNEL DUMP: %s ==========\n", Tag ? Tag : "<null>");
    printf("[CHANNEL DUMP] Conn=%p Data=%p Num=%d\n",
        Conn,
        OpenChannelsData,
        OpenChannelsNum);

    if (!OpenChannelsData || OpenChannelsNum <= 0)
    {
        printf("======================================\n\n");
        return;
    }

    for (int i = 0; i < OpenChannelsNum; i++)
    {
        void* Ch = nullptr;
        void* Actor = nullptr;


        Ch = OpenChannelsData[i];

        if (Ch)
            Actor = *(void**)((uint8_t*)Ch + 0x68);


        std::string ActorName;

        if (Actor && TryGetObjectFullName((UObject*)Actor, ActorName))
        {
            printf("[CHANNEL DUMP] [%d] Ch=%p Actor=%p %s\n",
                i,
                Ch,
                Actor,
                ActorName.c_str());
        }
        else
        {
            printf("[CHANNEL DUMP] [%d] Ch=%p Actor=%p\n",
                i,
                Ch,
                Actor);
        }
    }

    printf("======================================\n\n");
}

void EnsureAllConnectionViewTargetsForSRA(void* Driver)
{
    if (!Driver)
        return;

    UNetDriver* NetDriver = (UNetDriver*)Driver;

    int32_t Num = NetDriver->ClientConnections.Num();

    for (int32_t i = 0; i < Num; i++)
    {
        UNetConnection* Conn = NetDriver->ClientConnections[i];

        if (!Conn)
            continue;

        void* PC = nullptr;
        void* Pawn = nullptr;

        if (!GetPCAndPawnFromConnection(Conn, &PC, &Pawn))
            continue;

        __try
        {
            void* ViewTarget = *(void**)((uint8_t*)Conn + 0x88);
            void* OwningActor = *(void**)((uint8_t*)Conn + 0x90);

            if (!OwningActor && PC)
            {
                *(void**)((uint8_t*)Conn + 0x90) = PC;
                OwningActor = PC;
            }

            if (!ViewTarget)
            {
                void* NewViewTarget = Pawn ? Pawn : PC;

                if (NewViewTarget)
                {
                    *(void**)((uint8_t*)Conn + 0x88) = NewViewTarget;

                    printf("[SRA VIEWTARGET] Conn[%d]=%p PC=%p Pawn=%p ViewTarget NULL -> %p OwningActor=%p\n",
                        i,
                        Conn,
                        PC,
                        Pawn,
                        NewViewTarget,
                        OwningActor);
                }
            }
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            printf("[SRA VIEWTARGET] Exception Conn[%d]=%p\n", i, Conn);
        }
    }
}
void RepairAllPawnReplicationStatesForTest(void* Driver)
{
    if (!Driver)
        return;

    UNetDriver* NetDriver = (UNetDriver*)Driver;

    int32_t Num = NetDriver->ClientConnections.Num();

    for (int32_t i = 0; i < Num; i++)
    {
        UNetConnection* Conn = NetDriver->ClientConnections[i];

        if (!Conn)
            continue;

        void* PC = nullptr;
        void* Pawn = nullptr;

        if (!GetPCAndPawnFromConnection(Conn, &PC, &Pawn))
            continue;

        if (!PC || !Pawn)
            continue;

        __try
        {
            uint8_t* A = (uint8_t*)Pawn;

            uint8_t RemoteRole = *(uint8_t*)(A + 0x90);
            void* Owner = *(void**)(A + 0x98);
            uint8_t Role = *(uint8_t*)(A + 0x118);

            bool Changed = false;

            if (Role == 0)
            {
                *(uint8_t*)(A + 0x118) = 3; // ROLE_Authority
                Changed = true;
            }

            if (RemoteRole == 0)
            {
                *(uint8_t*)(A + 0x90) = 2; // ROLE_AutonomousProxy
                Changed = true;
            }

            if (!Owner)
            {
                *(void**)(A + 0x98) = PC;
                Changed = true;
            }

            if (Changed)
            {
                printf("[PAWN REPAIR] Conn[%d]=%p PC=%p Pawn=%p Role %u->%u RemoteRole %u->%u Owner %p->%p\n",
                    i,
                    Conn,
                    PC,
                    Pawn,
                    Role,
                    *(uint8_t*)(A + 0x118),
                    RemoteRole,
                    *(uint8_t*)(A + 0x90),
                    Owner,
                    *(void**)(A + 0x98));
            }
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            printf("[PAWN REPAIR] Exception Conn[%d]=%p\n", i, Conn);
        }
    }
}
using tActorReplicationHelper_0799E10 = uint8_t(__fastcall*)(void* Actor);

void TryForcePawnChannelsForAllClients(void* Driver)
{
    if (!Driver)
        return;

    static uint64_t LastAttemptMs = 0;

    uint64_t Now = GetTickCount64();

    // Throttle; otherwise this will spam constantly while channels are being built.
    if (Now - LastAttemptMs < 500)
        return;

    LastAttemptMs = Now;

    UNetDriver* NetDriver = (UNetDriver*)Driver;

    int32_t ConnNum = NetDriver->ClientConnections.Num();

    if (ConnNum <= 0)
        return;

    constexpr int MaxClients = 16;

    void* Conns[MaxClients] = {};
    void* PCs[MaxClients] = {};
    void* Pawns[MaxClients] = {};

    int ValidCount = 0;

    for (int32_t i = 0; i < ConnNum && ValidCount < MaxClients; i++)
    {
        UNetConnection* Conn = NetDriver->ClientConnections[i];

        if (!Conn)
            continue;

        void* PC = nullptr;
        void* Pawn = nullptr;

        if (!GetPCAndPawnFromConnection(Conn, &PC, &Pawn))
            continue;

        if (!PC || !Pawn)
            continue;

        Conns[ValidCount] = Conn;
        PCs[ValidCount] = PC;
        Pawns[ValidCount] = Pawn;
        ValidCount++;
    }

    if (ValidCount <= 0)
        return;

    uintptr_t Base = (uintptr_t)GetModuleHandleW(nullptr);

    auto Helper =
        (tActorReplicationHelper_0799E10)(Base + RVA_ACTOR_REPLICATION_HELPER_0799E10);

    for (int PawnIndex = 0; PawnIndex < ValidCount; PawnIndex++)
    {
        void* Pawn = Pawns[PawnIndex];

        if (!Pawn)
            continue;

        bool MissingSomeConnection = false;

        for (int ConnIndex = 0; ConnIndex < ValidCount; ConnIndex++)
        {
            void* Conn = Conns[ConnIndex];

            if (!ConnectionHasActorChannel(Conn, Pawn))
            {
                MissingSomeConnection = true;
                break;
            }
        }

        if (!MissingSomeConnection)
            continue;

        std::string PawnName;

        if (Pawn)
            TryGetObjectFullName((UObject*)Pawn, PawnName);

        printf("[FORCE PAWN CHANNEL] PawnIndex=%d Pawn=%p %s MissingSomeConnection=1 Fn=%p\n",
            PawnIndex,
            Pawn,
            PawnName.c_str(),
            Helper);

        uint8_t Result = 0;

        Result = Helper(Pawn);




        printf("[FORCE PAWN CHANNEL] Result=%u Pawn=%p\n",
            Result,
            Pawn);

        for (int ConnIndex = 0; ConnIndex < ValidCount; ConnIndex++)
        {
            void* Conn = Conns[ConnIndex];

            printf("[FORCE PAWN CHANNEL]   Conn[%d]=%p HasPawnChannel=%d\n",
                ConnIndex,
                Conn,
                ConnectionHasActorChannel(Conn, Pawn) ? 1 : 0);
        }
    }
}
void CheckPawnChannelAfterSRA(void* Driver)
{
    if (!Driver)
        return;

    UNetDriver* NetDriver = (UNetDriver*)Driver;

    if (NetDriver->ClientConnections.Num() <= 0)
        return;

    UNetConnection* Conn = NetDriver->ClientConnections[0];

    if (!Conn)
        return;

    void* PC = nullptr;
    void* Pawn = nullptr;
    int32_t OpenChannelsNum = -1;

    __try
    {
        OpenChannelsNum = *(int32_t*)((uint8_t*)Conn + 0x70);

        PC = *(void**)((uint8_t*)Conn + 0x30);

        if (PC)
            Pawn = *(void**)((uint8_t*)PC + 0x408);
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[PAWN CHANNEL] Exception reading PC/Pawn\n");
        return;
    }

    bool HasPawnChannel = ConnectionHasActorChannel(Conn, Pawn);

    static uint64_t CheckCount = 0;
    CheckCount++;

    if ((CheckCount % 30) == 0 || HasPawnChannel)
    {
        printf("[PAWN CHANNEL] Check=%llu Conn=%p OpenChannels=%d PC=%p Pawn=%p HasPawnChannel=%d\n",
            CheckCount,
            Conn,
            OpenChannelsNum,
            PC,
            Pawn,
            HasPawnChannel ? 1 : 0);
    }

    static bool LoggedPawnChannel = false;

    if (HasPawnChannel && !LoggedPawnChannel)
    {
        printf("[PAWN CHANNEL] Pawn actor channel exists! Conn=%p PC=%p Pawn=%p\n",
            Conn,
            PC,
            Pawn);

        LoggedPawnChannel = true;
    }
}
void RepairPawnReplicationStateForTest(void* Driver)
{
    if (!Driver)
        return;

    UNetDriver* NetDriver = (UNetDriver*)Driver;

    if (NetDriver->ClientConnections.Num() <= 0)
        return;

    UNetConnection* Conn = NetDriver->ClientConnections[0];

    if (!Conn)
        return;

    void* PC = nullptr;
    void* Pawn = nullptr;

    __try
    {
        PC = *(void**)((uint8_t*)Conn + 0x30);

        if (PC)
            Pawn = *(void**)((uint8_t*)PC + 0x408);

        if (!PC || !Pawn)
            return;

        uint8_t* A = (uint8_t*)Pawn;

        uint8_t RemoteRole = *(uint8_t*)(A + 0x90);
        void* Owner = *(void**)(A + 0x98);
        uint8_t Role = *(uint8_t*)(A + 0x118);

        bool Changed = false;

        // Server-side actor should be Authority.
        if (Role == 0)
        {
            *(uint8_t*)(A + 0x118) = 3; // ROLE_Authority
            Changed = true;
        }

        // A possessed pawn should replicate to owning client.
        // AutonomousProxy is usually 2; SimulatedProxy is usually 1.
        if (RemoteRole == 0)
        {
            *(uint8_t*)(A + 0x90) = 2; // ROLE_AutonomousProxy
            Changed = true;
        }

        // Owner should be the PlayerController.
        if (!Owner)
        {
            *(void**)(A + 0x98) = PC;
            Changed = true;
        }

        if (Changed)
        {
            printf("[PAWN REPAIR] PC=%p Pawn=%p Role %u->%u RemoteRole %u->%u Owner %p->%p\n",
                PC,
                Pawn,
                Role,
                *(uint8_t*)(A + 0x118),
                RemoteRole,
                *(uint8_t*)(A + 0x90),
                Owner,
                *(void**)(A + 0x98));
        }
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[PAWN REPAIR] Exception\n");
    }
}
bool CallPossessOnController(void* PC, void* Pawn)
{
    if (!PC || !Pawn)
        return false;

    struct
    {
        void* InPawn;
    } Params;

    Params.InPawn = Pawn;

    printf("[POSSESS FIX] Trying Engine.Controller.Possess PC=%p Pawn=%p\n",
        PC,
        Pawn);

    bool Ok = SafeProcessEventWithParams(
        (UObject*)PC,
        "Function Engine.Controller.Possess",
        &Params
    );

    if (Ok)
    {
        printf("[POSSESS FIX] Engine.Controller.Possess returned OK\n");
        return true;
    }

    printf("[POSSESS FIX] Engine.Controller.Possess failed, trying Engine.PlayerController.Possess\n");

    Ok = SafeProcessEventWithParams(
        (UObject*)PC,
        "Function Engine.PlayerController.Possess",
        &Params
    );

    if (Ok)
    {
        printf("[POSSESS FIX] Engine.PlayerController.Possess returned OK\n");
        return true;
    }

    printf("[POSSESS FIX] Possess calls failed\n");
    return false;
}
bool CallActorBoolFunction(void* Actor, const char* FunctionName, bool Value)
{
    if (!Actor || !FunctionName)
        return false;

    struct
    {
        bool bValue;
    } Params;

    Params.bValue = Value;

    printf("[ACTOR BOOL] Calling %s Actor=%p Value=%d\n",
        FunctionName,
        Actor,
        Value ? 1 : 0);

    bool Ok = SafeProcessEventWithParams(
        (UObject*)Actor,
        FunctionName,
        &Params
    );

    printf("[ACTOR BOOL] %s returned %d\n",
        FunctionName,
        Ok ? 1 : 0);

    return Ok;
}

bool CallActorVoidFunction(void* Actor, const char* FunctionName)
{
    if (!Actor || !FunctionName)
        return false;

    printf("[ACTOR VOID] Calling %s Actor=%p\n",
        FunctionName,
        Actor);

    bool Ok = SafeProcessEventWithParams(
        (UObject*)Actor,
        FunctionName,
        nullptr
    );

    printf("[ACTOR VOID] %s returned %d\n",
        FunctionName,
        Ok ? 1 : 0);

    return Ok;
}

bool CallSetOwnerOnActor(void* Actor, void* NewOwner)
{
    if (!Actor || !NewOwner)
        return false;

    struct
    {
        void* NewOwner;
    } Params;

    Params.NewOwner = NewOwner;

    printf("[OWNER FIX] Trying Engine.Actor.SetOwner Actor=%p NewOwner=%p\n",
        Actor,
        NewOwner);

    bool Ok = SafeProcessEventWithParams(
        (UObject*)Actor,
        "Function Engine.Actor.SetOwner",
        &Params
    );

    printf("[OWNER FIX] SetOwner returned %d\n", Ok ? 1 : 0);

    return Ok;
}
void TryNormalizePawnReplicationForServer(void* Driver)
{
    if (!Driver)
        return;

    UNetDriver* NetDriver = (UNetDriver*)Driver;

    int32_t ConnNum = NetDriver->ClientConnections.Num();

    if (ConnNum <= 0)
        return;

    static uint64_t LastRunMs = 0;
    uint64_t Now = GetTickCount64();

    // Run about twice per second while testing.
    if (Now - LastRunMs < 500)
        return;

    LastRunMs = Now;

    for (int32_t i = 0; i < ConnNum; i++)
    {
        UNetConnection* Conn = NetDriver->ClientConnections[i];

        if (!Conn)
            continue;

        void* PC = nullptr;
        void* Pawn = nullptr;

        if (!GetPCAndPawnFromConnection(Conn, &PC, &Pawn))
            continue;

        if (!PC || !Pawn)
            continue;

        bool HasPawnChannel = ConnectionHasActorChannel(Conn, Pawn);

        if (HasPawnChannel)
            continue;

        void* Owner = nullptr;
        uint8_t Role = 0xFF;
        uint8_t RemoteRole = 0xFF;

        __try
        {
            Owner = *(void**)((uint8_t*)Pawn + 0x98);
            RemoteRole = *(uint8_t*)((uint8_t*)Pawn + 0x90);
            Role = *(uint8_t*)((uint8_t*)Pawn + 0x118);
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
        }

        printf("[PAWN NORMALIZE] Conn[%d]=%p PC=%p Pawn=%p HasChannel=%d Owner=%p Role=%u RemoteRole=%u\n",
            i,
            Conn,
            PC,
            Pawn,
            HasPawnChannel ? 1 : 0,
            Owner,
            Role,
            RemoteRole);

        // Make sure owner is correct.
        if (Owner != PC)
        {
            CallSetOwnerOnActor(Pawn, PC);

            __try
            {
                Owner = *(void**)((uint8_t*)Pawn + 0x98);
            }
            __except (EXCEPTION_EXECUTE_HANDLER)
            {
            }

            printf("[PAWN NORMALIZE] Owner after SetOwner=%p ExpectedPC=%p\n",
                Owner,
                PC);
        }

        // Make sure Role/RemoteRole are sane.
        __try
        {
            if (*(uint8_t*)((uint8_t*)Pawn + 0x118) == 0)
                *(uint8_t*)((uint8_t*)Pawn + 0x118) = 3; // ROLE_Authority

            if (*(uint8_t*)((uint8_t*)Pawn + 0x90) == 0)
                *(uint8_t*)((uint8_t*)Pawn + 0x90) = 2; // ROLE_AutonomousProxy
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
        }

        // These are the important new calls.
        CallActorBoolFunction(Pawn, "Function Engine.Actor.SetReplicates", true);
        CallActorBoolFunction(Pawn, "Function Engine.Actor.SetReplicateMovement", true);

        // Wake it up / mark dirty.
        CallActorVoidFunction(Pawn, "Function Engine.Actor.ForceNetUpdate");

        // Optional; if function exists, this can help if pawn is dormant.
        CallActorVoidFunction(Pawn, "Function Engine.Actor.FlushNetDormancy");
    }
}
void TryPossessConnectionPawnsForServer(void* Driver)
{
    if (!Driver)
        return;

    UNetDriver* NetDriver = (UNetDriver*)Driver;

    int32_t ConnNum = NetDriver->ClientConnections.Num();

    if (ConnNum <= 0)
        return;

    struct PossessRecord
    {
        void* PC;
        void* Pawn;
    };

    static PossessRecord Done[16] = {};
    static int DoneCount = 0;

    for (int32_t i = 0; i < ConnNum; i++)
    {
        UNetConnection* Conn = NetDriver->ClientConnections[i];

        if (!Conn)
            continue;

        void* PC = nullptr;
        void* Pawn = nullptr;
        void* Owner = nullptr;
        uint8_t Role = 0xFF;
        uint8_t RemoteRole = 0xFF;

        if (!GetPCAndPawnFromConnection(Conn, &PC, &Pawn))
            continue;

        if (!PC || !Pawn)
            continue;

        __try
        {
            Owner = *(void**)((uint8_t*)Pawn + 0x98);
            RemoteRole = *(uint8_t*)((uint8_t*)Pawn + 0x90);
            Role = *(uint8_t*)((uint8_t*)Pawn + 0x118);
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            continue;
        }

        bool AlreadyDone = false;

        for (int d = 0; d < DoneCount; d++)
        {
            if (Done[d].PC == PC && Done[d].Pawn == Pawn)
            {
                AlreadyDone = true;
                break;
            }
        }

        if (AlreadyDone)
            continue;

        printf("[POSSESS FIX] Conn[%d]=%p PC=%p Pawn=%p Owner=%p Role=%u RemoteRole=%u\n",
            i,
            Conn,
            PC,
            Pawn,
            Owner,
            Role,
            RemoteRole);

        // The current important bad case:
        // PC has Pawn, but Pawn owner is null.
        if (Owner == PC)
        {
            printf("[POSSESS FIX] Conn[%d] Pawn already owned by PC\n", i);

            if (DoneCount < 16)
            {
                Done[DoneCount].PC = PC;
                Done[DoneCount].Pawn = Pawn;
                DoneCount++;
            }

            continue;
        }

        bool Ok = CallPossessOnController(PC, Pawn);

        void* NewOwner = nullptr;

        __try
        {
            NewOwner = *(void**)((uint8_t*)Pawn + 0x98);
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
        }

        printf("[POSSESS FIX] Conn[%d] PossessOk=%d OwnerBefore=%p OwnerAfterPossess=%p\n",
            i,
            Ok ? 1 : 0,
            Owner,
            NewOwner);

        // Possess was callable, but in this build it may early-out or not set owner.
        // Try SetOwner directly.
        if (NewOwner != PC)
        {
            printf("[OWNER FIX] Pawn owner still not PC after Possess. Trying SetOwner.\n");

            bool OwnerOk = CallSetOwnerOnActor(Pawn, PC);

            void* OwnerAfterSetOwner = nullptr;

            __try
            {
                OwnerAfterSetOwner = *(void**)((uint8_t*)Pawn + 0x98);
            }
            __except (EXCEPTION_EXECUTE_HANDLER)
            {
            }

            printf("[OWNER FIX] SetOwnerOk=%d OwnerAfterSetOwner=%p ExpectedPC=%p\n",
                OwnerOk ? 1 : 0,
                OwnerAfterSetOwner,
                PC);

            NewOwner = OwnerAfterSetOwner;
        }

        // Last diagnostic fallback: raw owner write.
        // This is a test. If this makes SRA open the pawn channel, we know ownership was the blocker.
        if (NewOwner != PC)
        {
            printf("[OWNER FIX] SetOwner did not update owner. Raw-writing Pawn+0x98 Owner for test.\n");

            __try
            {
                *(void**)((uint8_t*)Pawn + 0x98) = PC;
                NewOwner = *(void**)((uint8_t*)Pawn + 0x98);
            }
            __except (EXCEPTION_EXECUTE_HANDLER)
            {
                printf("[OWNER FIX] Raw owner write exception\n");
            }

            printf("[OWNER FIX] Raw OwnerAfter=%p ExpectedPC=%p\n",
                NewOwner,
                PC);
        }

        if (NewOwner == PC)
        {
            printf("[OWNER FIX] Pawn is now owned by PC. SRA should be able to open pawn channel.\n");

            if (DoneCount < 16)
            {
                Done[DoneCount].PC = PC;
                Done[DoneCount].Pawn = Pawn;
                DoneCount++;
            }
        }
        else
        {
            printf("[OWNER FIX] Pawn owner still not PC. Pawn channel probably still blocked.\n");
        }
    }
}


bool CallSetViewTargetWithBlend(void* PC, void* Target)
{
    if (!PC || !Target)
        return false;

    struct
    {
        void* NewViewTarget;
        float BlendTime;
        uint8_t BlendFunc;
        float BlendExp;
        bool bLockOutgoing;
    } Params;

    memset(&Params, 0, sizeof(Params));

    Params.NewViewTarget = Target;
    Params.BlendTime = 0.0f;
    Params.BlendFunc = 0;
    Params.BlendExp = 0.0f;
    Params.bLockOutgoing = false;

    printf("[CLIENT FINALIZE] Calling SetViewTargetWithBlend PC=%p Target=%p\n",
        PC,
        Target);

    bool Ok = SafeProcessEventWithParams(
        (UObject*)PC,
        "Function Engine.PlayerController.SetViewTargetWithBlend",
        &Params
    );

    printf("[CLIENT FINALIZE] SetViewTargetWithBlend returned %d\n", Ok ? 1 : 0);

    return Ok;
}

struct ClientRestartSequence
{
    void* PC = nullptr;
    void* Pawn = nullptr;
    uint64_t StartMs = 0;
    int Phase = 0;
    bool Done = false;
};

static ClientRestartSequence gRestartSeqs[16] = {};
static int gRestartSeqCount = 0;

ClientRestartSequence* GetOrCreateRestartSeq(void* PC, void* Pawn)
{
    if (!PC || !Pawn)
        return nullptr;

    for (int i = 0; i < gRestartSeqCount; i++)
    {
        if (gRestartSeqs[i].PC == PC && gRestartSeqs[i].Pawn == Pawn)
            return &gRestartSeqs[i];
    }

    if (gRestartSeqCount >= 16)
        return nullptr;

    ClientRestartSequence* Seq = &gRestartSeqs[gRestartSeqCount++];

    Seq->PC = PC;
    Seq->Pawn = Pawn;
    Seq->StartMs = GetTickCount64();
    Seq->Phase = 0;
    Seq->Done = false;

    return Seq;
}
bool CallClientRetryClientRestartOnPC(void* PC, void* Pawn)
{
    if (!PC || !Pawn)
        return false;

    struct
    {
        void* NewPawn;
    } Params;

    Params.NewPawn = Pawn;

    printf("[CLIENT FINALIZE] Calling ClientRetryClientRestart PC=%p Pawn=%p\n",
        PC,
        Pawn);

    bool Ok = SafeProcessEventWithParams(
        (UObject*)PC,
        "Function Engine.PlayerController.ClientRetryClientRestart",
        &Params
    );

    printf("[CLIENT FINALIZE] ClientRetryClientRestart returned %d\n", Ok ? 1 : 0);

    return Ok;
}
bool RunClientRestartSequence(void* PCVoid, void* PawnVoid)
{
    if (!PCVoid || !PawnVoid)
        return false;

    ClientRestartSequence* Seq = GetOrCreateRestartSeq(PCVoid, PawnVoid);

    if (!Seq)
        return false;

    if (Seq->Done)
        return true;

    uint64_t Now = GetTickCount64();
    uint64_t Elapsed = Now - Seq->StartMs;

    if (Seq->Phase == 0)
    {
        printf("[RESTART SEQ] Phase 0: safe ClientRestart PC=%p Pawn=%p\n",
            PCVoid,
            PawnVoid);

        CallClientRestartOnPC(PCVoid, PawnVoid);

        Seq->Phase = 1;
        Seq->StartMs = Now;
        return false;
    }

    if (Seq->Phase == 1 && Elapsed >= 250)
    {
        printf("[RESTART SEQ] Phase 1: safe ClientRetryClientRestart PC=%p Pawn=%p\n",
            PCVoid,
            PawnVoid);

        CallClientRetryClientRestartOnPC(PCVoid, PawnVoid);

        Seq->Phase = 2;
        Seq->StartMs = Now;
        return false;
    }

    if (Seq->Phase == 2 && Elapsed >= 250)
    {
        printf("[RESTART SEQ] Phase 2: final safe ClientRestart PC=%p Pawn=%p\n",
            PCVoid,
            PawnVoid);

        CallClientRestartOnPC(PCVoid, PawnVoid);

        Seq->Phase = 3;
        Seq->Done = true;

        printf("[RESTART SEQ] Done PC=%p Pawn=%p\n",
            PCVoid,
            PawnVoid);

        return true;
    }

    return false;
}
void TryFinalizeClientPawnAfterChannel(void* Driver)
{
    if (!Driver)
        return;

    UNetDriver* NetDriver = (UNetDriver*)Driver;

    int32_t ConnNum = NetDriver->ClientConnections.Num();

    if (ConnNum <= 0)
        return;

    struct FinalizeRecord
    {
        void* PC;
        void* Pawn;
    };

    static FinalizeRecord Done[16] = {};
    static int DoneCount = 0;

    for (int32_t i = 0; i < ConnNum; i++)
    {
        UNetConnection* Conn = NetDriver->ClientConnections[i];

        if (!Conn)
            continue;

        void* PC = nullptr;
        void* Pawn = nullptr;

        if (!GetPCAndPawnFromConnection(Conn, &PC, &Pawn))
            continue;

        if (!PC || !Pawn)
            continue;

        bool AlreadyDone = false;

        for (int d = 0; d < DoneCount; d++)
        {
            if (Done[d].PC == PC && Done[d].Pawn == Pawn)
            {
                AlreadyDone = true;
                break;
            }
        }

        if (AlreadyDone)
            continue;

        bool HasPawnChannel = ConnectionHasActorChannel(Conn, Pawn);

        printf("[CLIENT FINALIZE] Conn[%d]=%p PC=%p Pawn=%p HasPawnChannel=%d\n",
            i,
            Conn,
            PC,
            Pawn,
            HasPawnChannel ? 1 : 0);

        // Important: do not send ClientRestart before the pawn has a channel.
        if (!HasPawnChannel)
            continue;

        CallSetViewTargetWithBlend(PC, Pawn);

        bool RestartSeqDone = RunClientRestartSequence(PC, Pawn);

        TryUnlockClientMovementAndReady(PC, Pawn);

        if (!RestartSeqDone)
        {
            printf("[CLIENT FINALIZE] Conn[%d] restart sequence still running\n", i);
            continue;
        }

        // Natural PC state transition test.
        SafeClientGotoState((APlayerController*)PC, L"Playing");

        if (DoneCount < 16)
        {
            Done[DoneCount].PC = PC;
            Done[DoneCount].Pawn = Pawn;
            DoneCount++;
        }

        printf("[CLIENT FINALIZE] Done for Conn[%d]\n", i);
    }
}

void TryRunMissingServerReplicateActors(void* Driver, float DeltaSeconds)
{
    if (!gEnableMissingSRA)
        return;

    if (gInsideMissingSRA)
        return;

    if (!IsServerReplicationReady(Driver))
        return;

    uintptr_t Base = (uintptr_t)GetModuleHandleW(nullptr);
    auto ServerReplicateActors =
        (tServerReplicateActors)(Base + RVA_SERVER_REPLICATE_ACTORS);

    // Throttle to ~30 Hz so we do not hammer replication twice per render frame.
    double Now = 0.0;

    __try
    {
        LARGE_INTEGER Counter;
        LARGE_INTEGER Freq;

        QueryPerformanceCounter(&Counter);
        QueryPerformanceFrequency(&Freq);

        Now = (double)Counter.QuadPart / (double)Freq.QuadPart;
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        Now = 0.0;
    }

    if (Now > 0.0 && gLastSRATime > 0.0)
    {
        double Delta = Now - gLastSRATime;

        if (Delta < (1.0 / 30.0))
            return;
    }

    gLastSRATime = Now;

    static uint64_t Count = 0;
    Count++;

    if ((Count % 30) == 0)
    {
        printf("[MISSING SRA] Calling ServerReplicateActors Driver=%p Delta=%f Count=%llu Fn=%p\n",
            Driver,
            DeltaSeconds,
            Count,
            ServerReplicateActors);
    }

    gInsideMissingSRA = true;

    EnsureAllConnectionViewTargetsForSRA(Driver);
    //TryPossessConnectionPawnsForServer(Driver);
    //TryNormalizePawnReplicationForServer(Driver);
    //RepairAllPawnReplicationStatesForTest(Driver);

    int32_t Updated = ServerReplicateActors(Driver, DeltaSeconds);

    UNetDriver* NetDriver = (UNetDriver*)Driver;

    if (NetDriver && NetDriver->ClientConnections.Num() > 0)
    {
        UNetConnection* Conn = NetDriver->ClientConnections[0];

        static int32_t LastOpenChannelsNum = -1;

        int32_t OpenChannelsNum = -1;

        __try
        {
            OpenChannelsNum = *(int32_t*)((uint8_t*)Conn + 0x70);
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
        }

        if (OpenChannelsNum != LastOpenChannelsNum)
        {
            LastOpenChannelsNum = OpenChannelsNum;

            printf("[CHANNEL WATCH] OpenChannels changed to %d\n", OpenChannelsNum);
            DumpOpenChannelsBrief("CHANNELS_CHANGED", Conn);
            DumpPawnReplicationState("CHANNELS_CHANGED", Driver);
        }

        TryForcePawnChannelsForAllClients(Driver);
        //PulseReplicatePawnChannelsForAllClients(Driver);
        //TryClientRestartForAllClientsWhenReady(Driver);
        TryFinalizeClientPawnAfterChannel(Driver);
    }

    gInsideMissingSRA = false;
}
struct FSafe_HandleStartingNewPlayer_Params
{
    APlayerController* NewPlayer;
};

bool SafeHandleStartingNewPlayer(UObject* GameMode, APlayerController* PC)
{
    if (!GameMode || !PC)
    {
        printf("[SAFE HandleStartingNewPlayer] skipped GameMode=%p PC=%p\n",
            GameMode, PC);
        return false;
    }

    UFunction* Fn = UObject::FindObject<UFunction>(
        "Function Engine.GameModeBase.HandleStartingNewPlayer"
    );

    if (!Fn)
    {
        Fn = UObject::FindObject<UFunction>(
            "Function Engine.GameMode.HandleStartingNewPlayer"
        );
    }

    if (!Fn)
    {
        printf("[SAFE HandleStartingNewPlayer] function not found\n");
        return false;
    }

    FSafe_HandleStartingNewPlayer_Params Params{};
    Params.NewPlayer = PC;

    printf("[SAFE HandleStartingNewPlayer] Calling GameMode=%p PC=%p Fn=%p\n",
        GameMode, PC, Fn);

    PrintObjectNameSafe("[SAFE HandleStartingNewPlayer] GameMode", GameMode);
    PrintObjectNameSafe("[SAFE HandleStartingNewPlayer] PC", PC);

    bool Ok = CallProcessEventRaw((UObject*)GameMode, Fn, &Params);

    printf("[SAFE HandleStartingNewPlayer] returned Ok=%d\n", Ok ? 1 : 0);

    return Ok;
}
using tGetWorldContextFromWorld = void* (__fastcall*)(void* GEngine, UWorld* World);
UObject* ResolveAuthorityGameMode()
{
    if (!gServerWorld)
    {
        printf("[RESOLVE GAMEMODE] gServerWorld null\n");
        return nullptr;
    }

    UObject* GameMode = nullptr;

    __try
    {
        GameMode = (UObject*)gServerWorld->AuthorityGameMode;
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        GameMode = nullptr;
    }

    PrintObjectNameSafe("[RESOLVE GAMEMODE] AuthorityGameMode", GameMode);

    return GameMode;
}
struct FSafe_RestartPlayer_Params
{
    AController* NewPlayer;
};

bool SafeRestartPlayer(UObject* GameMode, AController* Controller)
{
    if (!GameMode || !Controller)
    {
        printf("[SAFE RestartPlayer] skipped GameMode=%p Controller=%p\n",
            GameMode, Controller);
        return false;
    }

    UFunction* Fn = UObject::FindObject<UFunction>(
        "Function Engine.GameModeBase.RestartPlayer"
    );

    if (!Fn)
    {
        Fn = UObject::FindObject<UFunction>(
            "Function Engine.GameMode.RestartPlayer"
        );
    }

    if (!Fn)
    {
        printf("[SAFE RestartPlayer] function not found\n");
        return false;
    }

    FSafe_RestartPlayer_Params Params{};
    Params.NewPlayer = Controller;

    printf("[SAFE RestartPlayer] Calling GameMode=%p Controller=%p Fn=%p\n",
        GameMode, Controller, Fn);

    PrintObjectNameSafe("[SAFE RestartPlayer] GameMode", GameMode);
    PrintObjectNameSafe("[SAFE RestartPlayer] Controller", Controller);

    bool Ok = CallProcessEventRaw((UObject*)GameMode, Fn, &Params);

    printf("[SAFE RestartPlayer] returned Ok=%d\n", Ok ? 1 : 0);

    return Ok;
}
struct NaturalStartRecord
{
    void* PC = nullptr;
    bool TriedHandleStartingNewPlayer = false;
    bool TriedRestartPlayer = false;
    uint64_t FirstSeenMs = 0;
};

static NaturalStartRecord gNaturalStartRecords[16] = {};
static int gNaturalStartRecordCount = 0;

NaturalStartRecord* GetNaturalStartRecord(void* PC)
{
    if (!PC)
        return nullptr;

    for (int i = 0; i < gNaturalStartRecordCount; i++)
    {
        if (gNaturalStartRecords[i].PC == PC)
            return &gNaturalStartRecords[i];
    }

    if (gNaturalStartRecordCount >= 16)
        return nullptr;

    NaturalStartRecord* Rec = &gNaturalStartRecords[gNaturalStartRecordCount++];

    Rec->PC = PC;
    Rec->TriedHandleStartingNewPlayer = false;
    Rec->TriedRestartPlayer = false;
    Rec->FirstSeenMs = GetTickCount64();

    return Rec;
}
void TryNaturalGameModeStartForConnection(void* Conn)
{
    if (!Conn)
        return;

    void* PC = nullptr;
    void* PawnBefore = nullptr;

    if (!GetPCAndPawnFromConnection(Conn, &PC, &PawnBefore))
        return;

    if (!PC)
        return;

    NaturalStartRecord* Rec = GetNaturalStartRecord(PC);

    if (!Rec)
        return;

    // Give the PC a short moment to fully exist after NMT_Join.
    uint64_t Now = GetTickCount64();

    if (Now - Rec->FirstSeenMs < 500)
        return;

    UObject* GameMode = ResolveAuthorityGameMode();

    if (!GameMode)
    {
        printf("[NATURAL START] No AuthorityGameMode yet\n");
        return;
    }

    printf("\n========== NATURAL GAMEMODE START ==========\n");
    PrintObjectNameBrief("[NATURAL START] GameMode", GameMode);
    PrintObjectNameBrief("[NATURAL START] PC", PC);
    PrintObjectNameBrief("[NATURAL START] PawnBefore", PawnBefore);

    if (!Rec->TriedHandleStartingNewPlayer)
    {
        printf("[NATURAL START] Calling HandleStartingNewPlayer\n");

        SafeHandleStartingNewPlayer(
            GameMode,
            (APlayerController*)PC
        );

        Rec->TriedHandleStartingNewPlayer = true;
    }

    void* PawnAfterHandle = nullptr;
    void* DummyPC = nullptr;
    GetPCAndPawnFromConnection(Conn, &DummyPC, &PawnAfterHandle);

    PrintObjectNameBrief("[NATURAL START] PawnAfterHandleStartingNewPlayer", PawnAfterHandle);

    if (!Rec->TriedRestartPlayer)
    {
        printf("[NATURAL START] Calling GameMode.RestartPlayer\n");

        SafeRestartPlayer(
            GameMode,
            (AController*)PC
        );

        Rec->TriedRestartPlayer = true;
    }

    void* PawnAfterRestart = nullptr;
    GetPCAndPawnFromConnection(Conn, &DummyPC, &PawnAfterRestart);

    PrintObjectNameBrief("[NATURAL START] PawnAfterRestartPlayer", PawnAfterRestart);

    printf("============================================\n\n");
}
void TryNaturalGameModeStartForServer(void* Driver)
{
    if (!Driver)
        return;

    UNetDriver* NetDriver = (UNetDriver*)Driver;

    int32_t ConnNum = NetDriver->ClientConnections.Num();

    if (ConnNum <= 0)
        return;

    for (int32_t i = 0; i < ConnNum; i++)
    {
        UNetConnection* Conn = NetDriver->ClientConnections[i];

        if (!Conn)
            continue;

        TryNaturalGameModeStartForConnection(Conn);
    }
}

void __fastcall HookedSteamTickFlush_WithServerReplication(void* Driver, float DeltaSeconds)
{
    // 1. Always run the real Steam tick.
    if (gOrigSteamTickFlush)
    {
        gOrigSteamTickFlush(Driver, DeltaSeconds);
    }
    //TryNaturalGameModeStartForServer(Driver);
    // 2. Then restore the missing server replication call.
    TryRunMissingServerReplicateActors(Driver, DeltaSeconds);
}

bool PatchNetDriverTickFlushTrace(void* Driver)
{
    if (!Driver)
    {
        printf("[TICKFLUSH PATCH] Driver null\n");
        return false;
    }

    void** VTable = nullptr;

    if (!SafeReadPtrRaw(Driver, (void**)&VTable))
    {
        printf("[TICKFLUSH PATCH] Failed reading driver vtable\n");
        return false;
    }

    if (!VTable)
    {
        printf("[TICKFLUSH PATCH] VTable null\n");
        return false;
    }

    void** Slot = &VTable[VT_INDEX_TICKFLUSH];

    void* Old = nullptr;

    if (!SafeReadPtrRaw(Slot, &Old))
    {
        printf("[TICKFLUSH PATCH] Failed reading slot\n");
        return false;
    }

    if (Old == (void*)&HookedSteamTickFlush_WithServerReplication)
    {
        printf("[TICKFLUSH PATCH] Already patched to missing-SRA hook\n");
        return true;
    }

    // Only store the original if this slot still points at the real game function.
    // Do not accidentally store one of our own hooks as the "original".
    gOrigSteamTickFlush = (tTickFlush)Old;

    DWORD OldProtect = 0;

    if (!VirtualProtect(Slot, sizeof(void*), PAGE_EXECUTE_READWRITE, &OldProtect))
    {
        printf("[TICKFLUSH PATCH] VirtualProtect failed err=%lu\n", GetLastError());
        return false;
    }

    *Slot = (void*)&HookedSteamTickFlush_WithServerReplication;

    DWORD Temp = 0;
    VirtualProtect(Slot, sizeof(void*), OldProtect, &Temp);

    FlushInstructionCache(GetCurrentProcess(), Slot, sizeof(void*));

    printf("[TICKFLUSH PATCH] Patched slot %zu\n", VT_INDEX_TICKFLUSH);
    printf("[TICKFLUSH PATCH] Driver=%p VTable=%p Slot=%p\n",
        Driver,
        VTable,
        Slot);

    printf("[TICKFLUSH PATCH] Old=%p New=%p Orig=%p\n",
        Old,
        &HookedSteamTickFlush_WithServerReplication,
        gOrigSteamTickFlush);

    return true;
}


void DumpConnectionReality(const char* Tag, int32_t Index, void* Conn)
{
    if (!Conn)
    {
        printf("[NET REALITY:%s] Conn[%d] = null\n", Tag, Index);
        return;
    }

    void* PC = nullptr;
    void* Pawn = nullptr;
    void* ViewTarget = nullptr;
    void* OwningActor = nullptr;
    int32_t State = -1;
    int32_t OpenChannelsNum = -1;

    SafeReadPtrAt(Conn, 0x30, &PC);
    SafeReadPtrAt(Conn, 0x88, &ViewTarget);
    SafeReadPtrAt(Conn, 0x90, &OwningActor);
    SafeReadInt32Raw((uint8_t*)Conn + 0x124, &State);
    SafeReadInt32Raw((uint8_t*)Conn + 0x70, &OpenChannelsNum);

    if (PC)
    {
        SafeReadPtrAt(PC, 0x408, &Pawn);
    }

    printf("[NET REALITY:%s] Conn[%d]=%p State=%d OpenChannels=%d\n",
        Tag,
        Index,
        Conn,
        State,
        OpenChannelsNum);

    PrintObjectNameBrief("  PC", PC);
    PrintObjectNameBrief("  Pawn", Pawn);
    PrintObjectNameBrief("  ViewTarget", ViewTarget);
    PrintObjectNameBrief("  OwningActor", OwningActor);

    if (Pawn)
    {
        uint8_t RemoteRole = 0xFF;
        uint8_t Role = 0xFF;
        void* Owner = nullptr;

        SafeReadUInt8Raw((uint8_t*)Pawn + 0x90, &RemoteRole);
        SafeReadPtrAt(Pawn, 0x98, &Owner);
        SafeReadUInt8Raw((uint8_t*)Pawn + 0x118, &Role);

        printf("  Pawn Role+118=%u RemoteRole+90=%u Owner+98=%p\n",
            Role,
            RemoteRole,
            Owner);

        PrintObjectNameBrief("  Pawn Owner", Owner);
    }
}
bool SafeCallBoolReturn(void* Obj, const char* FunctionName, bool* OutValue)
{
    if (!Obj || !FunctionName || !OutValue)
        return false;

    struct
    {
        bool ReturnValue;
    } Params;

    memset(&Params, 0, sizeof(Params));

    bool Ok = SafeProcessEventWithParams(
        (UObject*)Obj,
        FunctionName,
        &Params
    );

    *OutValue = Params.ReturnValue;

    printf("[SAFE BOOL RETURN] %s Obj=%p Ok=%d Return=%d\n",
        FunctionName,
        Obj,
        Ok ? 1 : 0,
        Params.ReturnValue ? 1 : 0);

    return Ok;
}

bool SafeCallObjectReturn(void* Obj, const char* FunctionName, void** OutObject)
{
    if (!Obj || !FunctionName || !OutObject)
        return false;

    struct
    {
        void* ReturnValue;
    } Params;

    memset(&Params, 0, sizeof(Params));

    bool Ok = SafeProcessEventWithParams(
        (UObject*)Obj,
        FunctionName,
        &Params
    );

    *OutObject = Params.ReturnValue;

    printf("[SAFE OBJ RETURN] %s Obj=%p Ok=%d Return=%p\n",
        FunctionName,
        Obj,
        Ok ? 1 : 0,
        Params.ReturnValue);

    return Ok;
}

bool SafeCallFloatReturn(void* Obj, const char* FunctionName, float* OutValue)
{
    if (!Obj || !FunctionName || !OutValue)
        return false;

    struct
    {
        float ReturnValue;
    } Params;

    memset(&Params, 0, sizeof(Params));

    bool Ok = SafeProcessEventWithParams(
        (UObject*)Obj,
        FunctionName,
        &Params
    );

    *OutValue = Params.ReturnValue;

    printf("[SAFE FLOAT RETURN] %s Obj=%p Ok=%d Return=%f\n",
        FunctionName,
        Obj,
        Ok ? 1 : 0,
        Params.ReturnValue);

    return Ok;
}

void DumpClientLocalPlayerBinding(void* Driver)
{
    if (!Driver)
        return;

    printf("\n========== CLIENT LOCAL PLAYER BINDING ==========\n");

    PrintObjectNameBrief("[CLIENT BINDING] Driver", Driver);

    void* ServerConnection = nullptr;

    SafeReadPtrAt(Driver, 0x70, &ServerConnection);

    PrintObjectNameBrief("[CLIENT BINDING] ServerConnection(+0x70)", ServerConnection);

    if (!ServerConnection)
    {
        printf("[CLIENT BINDING] No ServerConnection. This does not look like a client net driver.\n");
        printf("=================================================\n\n");
        return;
    }

    void* PC = nullptr;
    void* Pawn = nullptr;

    GetPCAndPawnFromConnection(ServerConnection, &PC, &Pawn);

    PrintObjectNameBrief("[CLIENT BINDING] Conn PC(+0x30)", PC);
    PrintObjectNameBrief("[CLIENT BINDING] PC Pawn(+0x408)", Pawn);

    void* ConnViewTarget = nullptr;
    void* ConnOwningActor = nullptr;

    SafeReadPtrAt(ServerConnection, 0x88, &ConnViewTarget);
    SafeReadPtrAt(ServerConnection, 0x90, &ConnOwningActor);

    PrintObjectNameBrief("[CLIENT BINDING] Conn ViewTarget(+0x88)", ConnViewTarget);
    PrintObjectNameBrief("[CLIENT BINDING] Conn OwningActor(+0x90)", ConnOwningActor);

    if (!PC)
    {
        printf("[CLIENT BINDING] PC is null. This strongly suggests HandleClientPlayer/local PC setup did not happen.\n");
        printf("=================================================\n\n");
        return;
    }

    bool bIsLocalController = false;

    SafeCallBoolReturn(
        PC,
        "Function Engine.Controller.IsLocalController",
        &bIsLocalController
    );

    printf("[CLIENT BINDING] Controller.IsLocalController = %d\n",
        bIsLocalController ? 1 : 0);

    void* PawnFromFunction = nullptr;

    SafeCallObjectReturn(
        PC,
        "Function Engine.Controller.GetPawn",
        &PawnFromFunction
    );

    PrintObjectNameBrief("[CLIENT BINDING] Controller.GetPawn()", PawnFromFunction);

    if (!Pawn)
        Pawn = PawnFromFunction;

    if (Pawn)
    {
        bool bPawnLocallyControlled = false;

        SafeCallBoolReturn(
            Pawn,
            "Function Engine.Pawn.IsLocallyControlled",
            &bPawnLocallyControlled
        );

        printf("[CLIENT BINDING] Pawn.IsLocallyControlled = %d\n",
            bPawnLocallyControlled ? 1 : 0);

        void* ControllerFromPawn = nullptr;

        SafeCallObjectReturn(
            Pawn,
            "Function Engine.Pawn.GetController",
            &ControllerFromPawn
        );

        PrintObjectNameBrief("[CLIENT BINDING] Pawn.GetController()", ControllerFromPawn);

        void* MovementComp = nullptr;

        SafeCallObjectReturn(
            Pawn,
            "Function Engine.Pawn.GetMovementComponent",
            &MovementComp
        );

        PrintObjectNameBrief("[CLIENT BINDING] Pawn.GetMovementComponent()", MovementComp);

        if (MovementComp)
        {
            bool bMoveIgnored = false;
            float MaxSpeed = -1.0f;

            SafeCallBoolReturn(
                MovementComp,
                "Function Engine.PawnMovementComponent.IsMoveInputIgnored",
                &bMoveIgnored
            );

            SafeCallFloatReturn(
                MovementComp,
                "Function Engine.MovementComponent.GetMaxSpeed",
                &MaxSpeed
            );

            printf("[CLIENT BINDING] MoveIgnored=%d MaxSpeed=%f\n",
                bMoveIgnored ? 1 : 0,
                MaxSpeed);
        }
    }
    else
    {
        printf("[CLIENT BINDING] Pawn is null from both PC+0x408 and GetPawn().\n");
    }

    printf("=================================================\n\n");
}

void DumpNetRealityForWorld(const char* Tag, void* World)
{
    if (!Tag)
        Tag = "<null-tag>";

    printf("\n================ NET REALITY: %s ================\n", Tag);

    PrintObjectNameBrief("World", World);

    if (!World)
    {
        printf("==================================================\n\n");
        return;
    }

    // UWorld->NetDriver at +0x38
    void* Driver = nullptr;
    SafeReadPtrAt(World, 0x38, &Driver);

    PrintObjectNameBrief("World->NetDriver(+0x38)", Driver);

    if (!Driver)
    {
        printf("[NET REALITY:%s] No NetDriver on this world\n", Tag);
        printf("==================================================\n\n");
        return;
    }

    void* ServerConnection = nullptr;
    void* ClientData = nullptr;
    int32_t ClientNum = -1;
    int32_t ClientMax = -1;
    void* DriverWorld = nullptr;
    void* NotifyRaw = nullptr;
    void* NetworkObjects = nullptr;

    SafeReadPtrAt(Driver, 0x70, &ServerConnection);
    SafeReadPtrAt(Driver, 0x78, &ClientData);
    SafeReadInt32Raw((uint8_t*)Driver + 0x80, &ClientNum);
    SafeReadInt32Raw((uint8_t*)Driver + 0x84, &ClientMax);
    SafeReadPtrAt(Driver, 0xA0, &DriverWorld);

    // Do NOT name-print this. It may not be a UObject-safe pointer in this build.
    SafeReadPtrAt(Driver, 0xA8, &NotifyRaw);

    SafeReadPtrAt(Driver, 0x3F0, &NetworkObjects);

    PrintObjectNameBrief("Driver->ServerConnection(+0x70)", ServerConnection);

    printf("Driver->ClientConnections Data=%p Num=%d Max=%d\n",
        ClientData,
        ClientNum,
        ClientMax);

    PrintObjectNameBrief("Driver->World(+0xA0)", DriverWorld);

    printf("Driver->NotifyRaw(+0xA8)=%p\n", NotifyRaw);
    printf("Driver->NetworkObjects(+0x3F0)=%p\n", NetworkObjects);

    if (NetworkObjects)
    {
        int32_t NetObj08 = -1;
        int32_t NetObj28 = -1;
        int32_t NetObj34 = -1;

        SafeReadInt32Raw((uint8_t*)NetworkObjects + 0x08, &NetObj08);
        SafeReadInt32Raw((uint8_t*)NetworkObjects + 0x28, &NetObj28);
        SafeReadInt32Raw((uint8_t*)NetworkObjects + 0x34, &NetObj34);

        printf("NetworkObjects +08=%d +28=%d +34=%d\n",
            NetObj08,
            NetObj28,
            NetObj34);
    }

    bool LooksServer = Driver && !ServerConnection && ClientNum >= 0;
    bool LooksClient = Driver && ServerConnection && ClientNum == 0;
    if (LooksClient)
    {
        DumpClientLocalPlayerBinding(Driver);
    }
    printf("[NET REALITY:%s] LooksServer=%d LooksClient=%d\n",
        Tag,
        LooksServer ? 1 : 0,
        LooksClient ? 1 : 0);

    if (ClientData && ClientNum > 0 && ClientNum < 32)
    {
        for (int32_t i = 0; i < ClientNum; i++)
        {
            void* Conn = nullptr;

            __try
            {
                Conn = ((void**)ClientData)[i];
            }
            __except (EXCEPTION_EXECUTE_HANDLER)
            {
                Conn = nullptr;
            }

            DumpConnectionReality(Tag, i, Conn);
        }
    }

    printf("==================================================\n\n");
}
template<typename FuncT>
void ForEachObject_Diagnostic(FuncT Fn)
{
    if (!SDK::UObject::GObjects)
    {
        printf("[GOBJECTS] SDK::UObject::GObjects null\n");
        return;
    }

    int32_t Num = SDK::UObject::GObjects->Num();

    printf("[GOBJECTS] Num=%d\n", Num);

    for (int32_t i = 0; i < Num; i++)
    {
        SDK::UObject* Obj = SDK::UObject::GObjects->GetByIndex(i);

        if (!Obj)
            continue;

        Fn(Obj);
    }
}

bool StringContainsAnyInterestingActorName(const std::string& Name)
{
    const char* Terms[] =
    {
        "SpawnBox",
        "CullBooth",
        "GasPylon",
        "Airdrop",
        "AirDrop",
        "Explosive",
        "Barrel",
        "Tree",
        "Rock",
        "Resource",
        "Loot",
        "MatchPhaseManager",
        "ShooterGameState",
        "PlayerPawn",
        "VictoryPlayerController",
        "VictoryPlayerState"
    };

    for (const char* Term : Terms)
    {
        if (Name.find(Term) != std::string::npos)
            return true;
    }

    return false;
}
void DumpInterestingActorFingerprint(const char* Tag)
{
    printf("\n================ ACTOR FINGERPRINT: %s ================\n",
        Tag ? Tag : "<null>");

    int32_t Count = 0;

    ForEachObject_Diagnostic([&](UObject* Obj)
        {
            if (!Obj)
                return;

            std::string Name;

            if (!TryGetObjectFullName(Obj, Name))
                return;

            if (!StringContainsAnyInterestingActorName(Name))
                return;

            printf("[FINGERPRINT:%s] %p | %s\n",
                Tag ? Tag : "<null>",
                Obj,
                Name.c_str());

            Count++;
        });

    printf("[FINGERPRINT:%s] Count=%d\n", Tag ? Tag : "<null>", Count);
    printf("========================================================\n\n");
}

bool StartsWithWorldPrefix(const std::string& Name)
{
    return Name.rfind("World ", 0) == 0;
}

void DumpWorldCandidatesAndInterestingActors(const char* Tag)
{
    printf("\n\n******** DumpWorldCandidatesAndInterestingActors: %s ********\n",
        Tag ? Tag : "<null>");

    int32_t WorldCount = 0;

    ForEachObject_Diagnostic([&](UObject* Obj)
        {
            if (!Obj)
                return;

            std::string Name;

            if (!TryGetObjectFullName(Obj, Name))
                return;

            // STRICT: only actual UWorld full names begin with "World ".
            if (!StartsWithWorldPrefix(Name))
                return;

            // Skip default archetype world.
            if (Name.find("Default__") != std::string::npos)
                return;

            printf("[WORLD CANDIDATE:%s] %p | %s\n",
                Tag ? Tag : "<null>",
                Obj,
                Name.c_str());

            DumpNetRealityForWorld(Name.c_str(), Obj);
            WorldCount++;
        });

    printf("[WORLD CANDIDATE:%s] WorldCount=%d\n",
        Tag ? Tag : "<null>",
        WorldCount);

    // For now, comment this out until the world scan is stable.
    // DumpInterestingActorFingerprint(Tag);

    printf("****************************************************************\n\n");
}
void DumpServerNetRealityNow()
{
    printf("\n\n******** DumpServerNetRealityNow ********\n");
    printf("gServerWorld  = %p\n", gServerWorld);
    printf("gServerDriver = %p\n", gServerDriver);

    if (gServerWorld)
    {
        DumpNetRealityForWorld("gServerWorld", gServerWorld);
    }
    else
    {
        printf("[NET REALITY] gServerWorld is null\n");
    }

    printf("*****************************************\n\n");
}

void TickLivingPawnExportRepair_GameThread()
{

    //if (gLivingPawnRepairInProgress)
    //{
    //    printf("[LIVING REPAIR] skipped because repair already in progress\n");
    //    return;
    //}

    //gLivingPawnRepairInProgress = true;

    //// Disable immediately so this is one-shot even if we fail, return early, or stall later.
    //gLivingPawnRepairEnabled = false;

    printf("\n========== LIVING REPAIR ONE-SHOT ENTER ==========\n");

    uint64_t Now = GetTickCount64();

    // Throttle to avoid spamming every message pump event.
    if (Now - gLivingPawnRepairLastMs < 250)
        return;

    gLivingPawnRepairLastMs = Now;

    if (!gServerWorld || !gServerDriver || !gCachedWorldContext)
        return;

    APlayerController* PC = FindRemotePlayerControllerForNetObjectDump();

    if (!PC)
        return;

    APawn* Pawn = nullptr;
    void* Conn = nullptr;

    Pawn = PC->Pawn;
    Conn = PC->NetConnection ? (void*)PC->NetConnection : (void*)PC->Player;


    if (!Pawn || !Conn)
        return;

    if ((uintptr_t)Pawn != gLivingPawnRepairPawn)
    {
        ResetLivingPawnRepairForPawn(Pawn);
    }

    uint8_t Flags84 = SafeReadActorByte((AActor*)Pawn, 0x84);
    uint8_t Flags86 = SafeReadActorByte((AActor*)Pawn, 0x86);

    bool bTearOff = (Flags84 & 0x40) != 0;
    bool bReplicates = (Flags86 & 0x08) != 0;
    bool bHasPawnChannel = HasActorChannelFor((UNetConnection*)Conn, Pawn);

    gLivingPawnRepairWaitTicks++;

    // If a living pawn channel exists, now it is safe to resend ClientRestart.
    if (bHasPawnChannel && !bTearOff)
    {
        if (!gLivingPawnRepairRestartSent)
        {
            printf("\n========== LIVING PAWN CHANNEL EXISTS ==========\n");
            printf("[LIVING REPAIR] PC   = %p | %s\n", PC, SafeName((UObject*)PC));
            printf("[LIVING REPAIR] Pawn = %p | %s\n", Pawn, SafeName((UObject*)Pawn));
            printf("[LIVING REPAIR] Conn = %p | %s\n", Conn, SafeName((UObject*)Conn));
            printf("[LIVING REPAIR] Flags84=0x%02X Flags86=0x%02X\n", Flags84, Flags86);
            printf("[LIVING REPAIR] Sending ClientRestart(Pawn) now.\n");


            PC->ClientRestart(Pawn);
            printf("[LIVING REPAIR] ClientRestart(Pawn) sent OK.\n");


            gLivingPawnRepairRestartSent = true;
            gLivingPawnRepairStage = 99;

            printf("===============================================\n\n");
        }

        return;
    }

    // If channel exists but only because pawn is torn off, do NOT treat it as success.
    if (bHasPawnChannel && bTearOff)
    {
        if (gLivingPawnRepairStage != 80)
        {
            printf("\n[LIVING REPAIR] Pawn channel exists, but pawn is torn off/dead. Not sending restart as success.\n");
            printf("[LIVING REPAIR] Pawn=%p | %s Flags84=0x%02X\n",
                Pawn,
                SafeName((UObject*)Pawn),
                Flags84);

            gLivingPawnRepairStage = 80;
        }

        return;
    }

    // Stage 0: safe nudge.
    if (gLivingPawnRepairStage == 0)
    {
        printf("\n========== LIVING PAWN EXPORT REPAIR STAGE 0 ==========\n");
        printf("[LIVING REPAIR] PC   = %p | %s\n", PC, SafeName((UObject*)PC));
        printf("[LIVING REPAIR] Pawn = %p | %s\n", Pawn, SafeName((UObject*)Pawn));
        printf("[LIVING REPAIR] Conn = %p | %s\n", Conn, SafeName((UObject*)Conn));
        printf("[LIVING REPAIR] Flags84=0x%02X Flags86=0x%02X bRep=%d bTearOff=%d HasChannel=%d\n",
            Flags84,
            Flags86,
            bReplicates ? 1 : 0,
            bTearOff ? 1 : 0,
            bHasPawnChannel ? 1 : 0);

        printf("[LIVING REPAIR] Calling FlushNetDormancy + ForceNetUpdate\n");

        SafeProcessEventNoParams(
            (UObject*)Pawn,
            "Function Engine.Actor.FlushNetDormancy"
        );

        SafeProcessEventNoParams(
            (UObject*)Pawn,
            "Function Engine.Actor.ForceNetUpdate"
        );
        printf("[LIVING REPAIR] FlushNetDormancy + ForceNetUpdate OK\n");
        DumpPlayerCameraManagerViewTarget(PC, Pawn);
        DumpConnectionReadinessInputs(Conn, gServerDriver);
        DumpConnFloatCandidatesNearDriverTime(Conn, gServerDriver);
        DumpWorldDriverBackReferences();
        gLivingPawnRepairStage = 1;
        gLivingPawnRepairWaitTicks = 0;
        gWatchConn = Conn;
        gWatchPawn = Pawn;
        gLastOpenChannelsNum = -1;
        printf("=======================================================\n\n");
        return;
    }

    // Stage 1: wait a few net/message ticks after ForceNetUpdate.
    if (gLivingPawnRepairStage == 1)
    {
        printf("[LIVING REPAIR] Stage 1: native pawn actor-channel export via 0799E10\n");
        RepairConnViewTargetFromPlayerCameraManager(PC, Conn);
        DumpPCPawnReferences(PC, Pawn);
        DumpActorRoles("TARGET PAWN", (AActor*)Pawn);
        DumpActorRoles("REMOTE PC", (AActor*)PC);
        DumpTickFlushServerGate();

        // Fix connection-side state.
        RepairPawnOwnerAndViewTarget(PC, Pawn, Conn);
        RepairConnectionControllerAndViewTarget(PC, Pawn, Conn);

        // Fix actor-side ownership / roles / replication scheduling.
        SafeSetOwnerMaybeNull((AActor*)Pawn, (AActor*)PC);
        ForcePawnServerAuthorityRoles(Pawn);
        ForcePawnRealReplicationScheduling((AActor*)Pawn);
        SafeProcessEventNoParams(
            (UObject*)Pawn,
            "Function Engine.Actor.FlushNetDormancy"
        );

        SafeProcessEventNoParams(
            (UObject*)Pawn,
            "Function Engine.Actor.ForceNetUpdate"
        );

        // Optional for now. Keep it if this was part of the successful test.
        //HardReregisterPawnNetworkObject(gServerWorld, (AActor*)Pawn);

        DumpPawnReplicationRelevancyState(PC, Pawn, Conn);

        printf("[LIVING REPAIR] Before 0799E10 pawn channel check\n");
        HasPawnChannelForConnection(Conn, Pawn);

        TryActorReplicationHelper0799E10((AActor*)Pawn);

        printf("[LIVING REPAIR] After 0799E10 pawn channel check\n");
        HasPawnChannelForConnection(Conn, Pawn);

        DumpPawnReplicationRelevancyState(PC, Pawn, Conn);
        DumpTickFlushServerGate();
        DumpPCPawnReferences(PC, Pawn);
        //ScanObjectForClassName("PC", PC, 0x1200, "PlayerCameraManager");
        //SearchQwordInObject("PlayerCameraManager for Pawn pointer", (uintptr_t)PCM, 0x1000, (uintptr_t)Pawn);


        // Do not call this during the clean 0799E10 test.
        // TryCallServerReplicateActors_NoPatches();

        // Do not manually open channel during this test.
        // ManualOpenPawnActorChannel(Conn, (AActor*)Pawn);

        gLivingPawnRepairStage = 2;
        gLivingPawnRepairWaitTicks = 0;
        gLivingPawnRepairLastMs = 0;

        return;
    }
    // Stage 2: wait after SetReplicates bounce.
    if (gLivingPawnRepairStage == 2)
    {
        printf("\n========== LIVING PAWN EXPORT REPAIR STAGE 2 ==========\n");
        DumpActorNetBytes("[NETBYTE] PawnCompare", Pawn);
        bool bHasPawnChannel = HasPawnChannelForConnection(Conn, Pawn);

        printf("[LIVING REPAIR] HasPawnChannel = %d\n",
            bHasPawnChannel ? 1 : 0);

        if (!bHasPawnChannel)
        {
            printf("[LIVING REPAIR] Pawn still has no channel. Not sending ClientRestart.\n");
        }
        else
        {
            printf("[LIVING REPAIR] Pawn has channel. Sending ClientRestart.\n");
            SafeClientRestart(PC, Pawn);
        }

        gLivingPawnRepairStage = 999;
        gLivingPawnRepairEnabled = false;
        gLivingPawnRepairInProgress = false;

        bool bRestartOk = SafeClientRestart(PC, Pawn);
        //SafeClientGotoState(PC, L"Playing");
        SafeServerRestartPlayer(PC);
        SafeProcessEventNoParams(
            (UObject*)Pawn,
            "Function Engine.Actor.FlushNetDormancy"
        );

        SafeProcessEventNoParams(
            (UObject*)Pawn,
            "Function Engine.Actor.ForceNetUpdate"
        );
        printf("=======================================================\n\n");
        return;
    }
}



void TryGameModePlayerBridge(APawn* Pawn)
{
    printf("\n========== TRY GAMEMODE PLAYER BRIDGE ==========\n");

    PrintObjectNameSafe("[GM BRIDGE] Input Pawn", Pawn);

    APlayerController* PC = ResolvePCFromPawn(Pawn);
    UObject* GameMode = ResolveAuthorityGameMode();

    if (!PC || !GameMode)
    {
        printf("[GM BRIDGE] missing PC or GameMode\n");
        printf("===============================================\n\n");
        return;
    }

    PrintObjectNameSafe("[GM BRIDGE] PC", PC);
    PrintObjectNameSafe("[GM BRIDGE] GameMode", GameMode);

    // First try the high-level "new player is ready" pipeline.
    SafeHandleStartingNewPlayer(GameMode, PC);

    // Then explicitly ask GameMode to restart the player.
    // This may spawn/possess a fresh pawn using the normal game path.
    SafeRestartPlayer(GameMode, (AController*)PC);

    // Re-resolve from the original pawn first. If GameMode replaced pawn,
    // this may not show it, but logs will still tell us whether calls worked.
    SafeProcessEventNoParams(
        (UObject*)PC,
        "Function Engine.PlayerController.BeginPlayingState"
    );

    printf("===============================================\n\n");
}
void DumpFunctionsContaining(const char* Needle)
{
    printf("\n========== FUNCTIONS CONTAINING: %s ==========\n", Needle);

    int Count = 0;

    for (int i = 0; i < UObject::GObjects->Num(); i++)
    {
        UObject* Obj = UObject::GObjects->GetByIndex(i);

        if (!Obj || !Obj->Class)
            continue;

        std::string ClassName = Obj->Class->GetFullName();

        if (ClassName.find("Function") == std::string::npos)
            continue;

        std::string Name = Obj->GetFullName();

        if (Name.find(Needle) == std::string::npos)
            continue;

        printf("[FUNC] %s | %p\n", Name.c_str(), Obj);
        Count++;
    }

    printf("[FUNC] Count=%d\n", Count);
    printf("==============================================\n\n");
}
static int gRespawnBridgeStage = 0;
static APlayerController* gRespawnPC = nullptr;
static APawn* gRespawnOldPawn = nullptr;
bool SafeUnPossess(AController* Controller)
{
    if (!Controller)
    {
        printf("[SAFE UnPossess] skipped Controller=null\n");
        return false;
    }

    UFunction* Fn = UObject::FindObject<UFunction>(
        "Function Engine.Controller.UnPossess"
    );

    if (!Fn)
    {
        printf("[SAFE UnPossess] Function Engine.Controller.UnPossess not found\n");
        return false;
    }

    printf("[SAFE UnPossess] Calling Controller=%p Fn=%p\n", Controller, Fn);
    PrintObjectNameSafe("[SAFE UnPossess] Controller", Controller);

    bool Ok = CallProcessEventRaw((UObject*)Controller, Fn, nullptr);

    printf("[SAFE UnPossess] returned Ok=%d\n", Ok ? 1 : 0);

    return Ok;
}
bool SafeDestroyActor(AActor* Actor)
{
    if (!Actor)
    {
        printf("[SAFE DestroyActor] skipped Actor=null\n");
        return false;
    }

    UFunction* Fn = UObject::FindObject<UFunction>(
        "Function Engine.Actor.K2_DestroyActor"
    );

    if (!Fn)
    {
        printf("[SAFE DestroyActor] Function Engine.Actor.K2_DestroyActor not found\n");
        return false;
    }

    printf("[SAFE DestroyActor] Calling Actor=%p Fn=%p\n", Actor, Fn);
    PrintObjectNameSafe("[SAFE DestroyActor] Actor", Actor);

    bool Ok = CallProcessEventRaw((UObject*)Actor, Fn, nullptr);

    printf("[SAFE DestroyActor] returned Ok=%d\n", Ok ? 1 : 0);

    return Ok;
}
void TryServerSideRespawnBridge()
{
    printf("\n========== SERVER-SIDE RESPAWN BRIDGE ==========\n");

    APlayerController* PC = FindRemotePlayerControllerForNetObjectDump();

    if (!PC)
    {
        printf("[RESPAWN] No remote PC found\n");
        printf("================================================\n\n");
        return;
    }

    APawn* Pawn = nullptr;
    void* Conn = nullptr;

    __try
    {
        Pawn = PC->Pawn;
        Conn = PC->NetConnection ? (void*)PC->NetConnection : (void*)PC->Player;
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        Pawn = nullptr;
        Conn = nullptr;
    }

    PrintObjectNameSafe("[RESPAWN] PC", PC);
    PrintObjectNameSafe("[RESPAWN] Current Pawn", Pawn);
    PrintObjectNameSafe("[RESPAWN] Conn", Conn);

    if (!Pawn || !Conn)
    {
        printf("[RESPAWN] Missing Pawn or Conn\n");
        printf("================================================\n\n");
        return;
    }

    if (gRespawnBridgeStage == 0)
    {
        printf("[RESPAWN] Stage 0: UnPossess + destroy stale pawn\n");

        gRespawnPC = PC;
        gRespawnOldPawn = Pawn;

        SafeUnPossess((AController*)PC);

        SafeDestroyActor((AActor*)Pawn);

        gRespawnBridgeStage = 1;

        printf("[RESPAWN] Stage 0 done. Press key again after a second/tick for RestartPlayer.\n");
        printf("================================================\n\n");
        return;
    }

    if (gRespawnBridgeStage == 1)
    {
        printf("[RESPAWN] Stage 1: Restart player through PC/GameMode\n");

        UObject* GameMode = ResolveAuthorityGameMode();

        if (GameMode)
        {
            SafeRestartPlayer(GameMode, (AController*)PC);
        }

        SafeServerRestartPlayer(PC);

        APawn* NewPawn = nullptr;

        __try
        {
            NewPawn = PC->Pawn;
        }
        __except (EXCEPTION_EXECUTE_HANDLER)
        {
            NewPawn = nullptr;
        }

        PrintObjectNameSafe("[RESPAWN] New PC.Pawn", NewPawn);

        if (NewPawn && NewPawn != gRespawnOldPawn)
        {
            printf("[RESPAWN] SUCCESS: PC.Pawn changed from old stale pawn to new pawn.\n");

            RepairPawnOwnerAndViewTarget(PC, NewPawn, Conn);

            SafeSetOwnerMaybeNull((AActor*)NewPawn, (AActor*)PC);

            SafeProcessEventNoParams(
                (UObject*)NewPawn,
                "Function Engine.Actor.FlushNetDormancy"
            );

            SafeProcessEventNoParams(
                (UObject*)NewPawn,
                "Function Engine.Actor.ForceNetUpdate"
            );

            bool HasChannel = HasPawnChannelForConnection(Conn, NewPawn);

            printf("[RESPAWN] NewPawn HasChannel=%d\n", HasChannel ? 1 : 0);
        }
        else
        {
            printf("[RESPAWN] PC.Pawn did not change. Restart path did not spawn a replacement.\n");
        }

        gRespawnBridgeStage = 0;
        gRespawnPC = nullptr;
        gRespawnOldPawn = nullptr;

        printf("================================================\n\n");
        return;
    }

    printf("================================================\n\n");
}

bool __fastcall HookedWorldListen(UWorld* World, void* URL)
{
    printf("\n========== HOOKED WORLD LISTEN ==========\n");
    printf("[WORLD LISTEN] World=%p URL=%p\n", World, URL);

    if (!World || !URL)
    {
        printf("[WORLD LISTEN] World or URL null\n");
        return false;
    }

    void* ExistingNetDriver = nullptr;


    ExistingNetDriver = *(void**)((uint8_t*)World + 0x38);



    printf("[WORLD LISTEN] World->NetDriver before = %p\n", ExistingNetDriver);

    if (ExistingNetDriver)
    {
        printf("[WORLD LISTEN] World already has NetDriver, returning true\n");
        return true;
    }

    uintptr_t GameBase = (uintptr_t)GetModuleHandleW(nullptr);

    UClass* NetDriverClass =
        UObject::FindObject<UClass>("Class OnlineSubsystemSteam.SteamNetDriver");

    UClass* IpConnClass =
        UObject::FindObject<UClass>("Class OnlineSubsystemSteam.SteamNetConnection");

    printf("[WORLD LISTEN] SteamNetDriverClass=%p SteamNetConnectionClass=%p\n",
        NetDriverClass,
        IpConnClass);

    if (!NetDriverClass || !IpConnClass)
    {
        printf("[WORLD LISTEN] Steam driver/connection class missing, falling back to IpNetDriver\n");

        NetDriverClass =
            UObject::FindObject<UClass>("Class OnlineSubsystemUtils.IpNetDriver");

        IpConnClass =
            UObject::FindObject<UClass>("Class OnlineSubsystemUtils.IpConnection");
    }

    FNameRaw GameNetDriverName = MakeFNameW(L"GameNetDriver");
    uint64_t PackedGameNetDriverName = *(uint64_t*)&GameNetDriverName;

    printf("[WORLD LISTEN] NetDriverClass=%p IpConnClass=%p\n",
        NetDriverClass,
        IpConnClass);

    typedef UObject* (*tStaticConstructObject_Internal)(
        UClass* Class,
        UObject* InOuter,
        uint64_t Name,
        int SetFlags,
        int InternalSetFlags,
        UObject* Template,
        bool bCopyTransientsFromClassDefaults,
        void* InstanceGraph,
        bool bAssumeTemplateIsMainCopy
        );

    auto ConstructObject =
        (tStaticConstructObject_Internal)(GameBase + RVA_CONSTRUCT_OBJECT);

    /*
        Use GameNetDriver as the actual object/name if FName constructor works.
        This matters because native UE normally creates a named GameNetDriver.
    */
    //FName GameNetDriverName(L"GameNetDriver");
    //uint64_t PackedGameNetDriverName = *(uint64_t*)&GameNetDriverName;

    UObject* NewNetDriverObj = ConstructObject(
        NetDriverClass,
        World,
        PackedGameNetDriverName,
        0,
        0,
        nullptr,
        false,
        nullptr,
        false
    );
    UNetDriver* Driver = reinterpret_cast<UNetDriver*>(NewNetDriverObj);
    *(uint64_t*)&Driver->NetDriverName = PackedGameNetDriverName;
    uint32_t* RawObjName = (uint32_t*)((uint8_t*)Driver + 0x18);
    uint32_t* RawDriverName = (uint32_t*)&Driver->NetDriverName;

    printf("[WORLD LISTEN] Driver UObject::Name raw = %08X %08X\n",
        RawObjName[0],
        RawObjName[1]);

    printf("[WORLD LISTEN] Driver->NetDriverName raw = %08X %08X\n",
        RawDriverName[0],
        RawDriverName[1]);
    if (!NewNetDriverObj)
    {
        printf("[WORLD LISTEN] ConstructObject IpNetDriver returned null\n");
        return false;
    }


    printf("[WORLD LISTEN] Driver allocated: %p\n", Driver);

    if (Driver->Class)
    {
        printf("[WORLD LISTEN] Driver class: %s\n",
            Driver->Class->GetFullName().c_str());
    }

    /*
        Critical native setup that our old path was trying to fake.
    */
    //Driver->NetDriverName = GameNetDriverName;
    Driver->NetConnectionClass = IpConnClass;

    uint32_t* RawName = (uint32_t*)&Driver->NetDriverName;

    printf("[WORLD LISTEN] Driver->NetDriverName raw = %08X %08X\n",
        RawName[0],
        RawName[1]);

    /*
        Use native SetWorld.
        This should set Driver->World and Driver->Notify.
    */
    AttachDriverWithSetWorld(Driver, World);
    printf("[SETWORLD CHECK] World->NetDriver=%p\n", *(void**)((uint8_t*)World + 0x38));
    printf("[SETWORLD CHECK] Driver->World=%p\n", *(void**)((uint8_t*)Driver + 0xA0));
    printf("[SETWORLD CHECK] Driver->Notify=%p\n", *(void**)((uint8_t*)Driver + 0xE8));
    printf("[SETWORLD CHECK] TickDispatchHandle=%llX\n", *(uint64_t*)((uint8_t*)Driver + 0x3D0));
    printf("[SETWORLD CHECK] TickFlushHandle=%llX\n", *(uint64_t*)((uint8_t*)Driver + 0x3D8));
    printf("[SETWORLD CHECK] PostTickFlushHandle=%llX\n", *(uint64_t*)((uint8_t*)Driver + 0x3E0));
    printf("[SETWORLD CHECK] NetworkObjects=%p\n", *(void**)((uint8_t*)Driver + 0x3F0));

    void* Notify = nullptr;


    Notify = *(void**)((uint8_t*)Driver + 0xE8);


    if (!Notify)
    {
        printf("[WORLD LISTEN] Driver->Notify null after SetWorld, falling back to World\n");
        Notify = World;
    }

    printf("[WORLD LISTEN] Notify=%p\n", Notify);
    printf("[WORLD LISTEN] World->NetDriver after SetWorld = %p\n",
        *(void**)((uint8_t*)World + 0x38));

    uintptr_t* VTable = *(uintptr_t**)Driver;

    printf("[WORLD LISTEN] Driver VTable=%p\n", VTable);
    printf("[WORLD LISTEN] VTable[68] InitListen = %p RVA=0x%llX\n",
        (void*)VTable[68],
        (unsigned long long)((uintptr_t)VTable[68] - GameBase));

    using tInitListen = bool(__fastcall*)(
        UNetDriver* Drv,
        void* Notify,
        void* URL,
        bool bReuseAddressAndPort,
        void* Error
        );

    auto NativeInitListen = (tInitListen)VTable[68];

    /*
        Use a real SDK FString if available.
        If this fails to compile, tell me and we'll swap it to a raw fake FString carefully.
    */
    FString Error;

    bool bListenOk = false;


    bListenOk = NativeInitListen(
        Driver,
        Notify,
        URL,
        true,   // native UWorld::Listen uses false here
        &Error
    );


    printf("[WORLD LISTEN] InitListen returned %d\n",
        bListenOk ? 1 : 0);

    if (!bListenOk)
    {
        printf("[WORLD LISTEN] InitListen failed. World->NetDriver=%p Driver=%p\n",
            *(void**)((uint8_t*)World + 0x38),
            Driver);

        return false;
    }

    /*
        Attach the successful driver.
        Native UWorld::Listen would normally do this.
    */
    *(void**)((uint8_t*)World + 0x38) = Driver;

    gServerWorld = World;
    gServerDriver = Driver;
    gServerDriverVTable = *(uintptr_t**)Driver;
    DumpNetDriverVTableTargets(Driver);
    PatchNetDriverTickFlushTrace(Driver);
    PatchWorldLevelCollections(World, Driver);
    //PatchSteamNetDriverTickFlushActorPump(Driver);
    ResolveAndRegisterWorldContext(
        World,
        Driver,
        "HookedWorldListen"
    );

    printf("[WORLD LISTEN] SUCCESS\n");
    printf("[WORLD LISTEN] World->NetDriver final = %p\n",
        *(void**)((uint8_t*)World + 0x38));
    EnsureNativeWorldContextHasNetDriver_Once();
    DumpFunctionsContaining("BeginPlaying");
    DumpFunctionsContaining("PlayingState");
    DumpFunctionsContaining("ClientGotoState");
    DumpFunctionsContaining("ChangeState");
    DumpFunctionsContaining("Restart");
    printf("=========================================\n\n");
    return true;
}
static bool IsRemotePlayerController(APlayerController* PC)
{
    if (!PC)
        return false;

    // On the listen server, the remote player's PC should have a NetConnection.
    // Host/local PC usually has a LocalPlayer path instead.
    void* Conn = PC->NetConnection;

    if (!Conn)
        return false;

    UObject* ConnObj = (UObject*)Conn;

    if (!ConnObj || !ConnObj->Class)
        return false;

    std::string ConnClass = ConnObj->Class->GetFullName();
    std::string ConnName = ConnObj->GetFullName();

    return ConnClass.find("NetConnection") != std::string::npos ||
        ConnName.find("NetConnection") != std::string::npos ||
        ConnClass.find("SteamNetConnection") != std::string::npos ||
        ConnName.find("SteamNetConnection") != std::string::npos;
}
static APawn* FindRemotePawnFromWorld(
    UWorld* World,
    APlayerController** OutPC = nullptr,
    void** OutConn = nullptr
)
{
    if (OutPC)
        *OutPC = nullptr;

    if (OutConn)
        *OutConn = nullptr;

    if (!World)
    {
        printf("[REMOTE PAWN] World null\n");
        return nullptr;
    }

    ULevel* Level = World->PersistentLevel;

    if (!Level)
    {
        printf("[REMOTE PAWN] PersistentLevel null\n");
        return nullptr;
    }

    printf("[REMOTE PAWN] Scanning Level=%p ActorCount=%d\n",
        Level,
        Level->Actors.Num());

    for (int i = 0; i < Level->Actors.Num(); i++)
    {
        AActor* Actor = Level->Actors[i];

        if (!Actor || !Actor->Class)
            continue;

        std::string ClassName = Actor->Class->GetFullName();
        std::string ObjName = Actor->GetFullName();

        bool bLooksLikePC =
            ClassName.find("PlayerController") != std::string::npos ||
            ObjName.find("PlayerController") != std::string::npos ||
            ObjName.find("VictoryPlayerController") != std::string::npos;

        if (!bLooksLikePC)
            continue;

        APlayerController* PC = (APlayerController*)Actor;

        APawn* Pawn = PC->Pawn;
        void* Conn = PC->NetConnection;

        printf("[REMOTE PAWN] Candidate PC Actor[%d]=%p\n", i, PC);
        printf("              Name=%s\n", ObjName.c_str());
        printf("              Class=%s\n", ClassName.c_str());
        printf("              NetConnection=%p\n", Conn);
        printf("              Pawn=%p\n", Pawn);

        if (Conn)
        {
            UObject* ConnObj = (UObject*)Conn;

            if (ConnObj && ConnObj->Class)
            {
                printf("              ConnClass=%s\n",
                    ConnObj->Class->GetFullName().c_str());

                printf("              ConnName=%s\n",
                    ConnObj->GetFullName().c_str());
            }
        }

        if (IsRemotePlayerController(PC) && Pawn)
        {
            printf("[REMOTE PAWN] FOUND remote PC=%p Pawn=%p Conn=%p\n",
                PC,
                Pawn,
                Conn);

            if (OutPC)
                *OutPC = PC;

            if (OutConn)
                *OutConn = Conn;

            return Pawn;
        }
    }

    printf("[REMOTE PAWN] No remote pawn found\n");
    return nullptr;
}
static void DumpActorNetReplicationState(const char* Label, AActor* Actor, UNetDriver* Driver)
{
    printf("\n========== ACTOR NET STATE: %s ==========\n", Label ? Label : "?");

    if (!Actor)
    {
        printf("[ACTOR NET] Actor=null\n");
        printf("=========================================\n\n");
        return;
    }

    printf("[ACTOR NET] Actor=%p\n", Actor);

    if (Actor->Class)
    {
        printf("[ACTOR NET] Class=%s\n", Actor->Class->GetFullName().c_str());
    }

    printf("[ACTOR NET] Name=%s\n", Actor->GetFullName().c_str());

    FNameRaw ActorNetDriverName = *(FNameRaw*)((uint8_t*)Actor + 0x88);

    FNameRaw DriverNetDriverName{};

    if (Driver)
    {
        DriverNetDriverName = *(FNameRaw*)&Driver->NetDriverName;
    }

    printf("[ACTOR NET] Actor->NetDriverName  = %08X %08X\n",
        ActorNetDriverName.ComparisonIndex,
        ActorNetDriverName.Number);

    printf("[ACTOR NET] Driver->NetDriverName = %08X %08X\n",
        DriverNetDriverName.ComparisonIndex,
        DriverNetDriverName.Number);

    bool bNameMatches =
        ActorNetDriverName.ComparisonIndex == DriverNetDriverName.ComparisonIndex &&
        ActorNetDriverName.Number == DriverNetDriverName.Number;

    printf("[ACTOR NET] NetDriverName matches = %s\n", BoolStr(bNameMatches));

    uint8_t Flags84 = *(uint8_t*)((uint8_t*)Actor + 0x84);
    uint8_t Flags85 = *(uint8_t*)((uint8_t*)Actor + 0x85);
    uint8_t Flags86 = *(uint8_t*)((uint8_t*)Actor + 0x86);

    bool bNetStartup = (Flags84 & (1 << 2)) != 0;
    bool bOnlyRelevantToOwner = (Flags84 & (1 << 3)) != 0;
    bool bAlwaysRelevant = (Flags84 & (1 << 4)) != 0;
    bool bReplicateMovement = (Flags84 & (1 << 5)) != 0;
    bool bTearOff = (Flags84 & (1 << 6)) != 0;
    bool bPendingNetUpdate = (Flags85 & (1 << 0)) != 0;
    bool bNetLoadOnClient = (Flags85 & (1 << 1)) != 0;
    bool bNetUseOwnerRelevancy = (Flags85 & (1 << 2)) != 0;
    bool bReplicates = (Flags86 & (1 << 3)) != 0;

    uint8_t RemoteRole = *(uint8_t*)((uint8_t*)Actor + 0x90);
    uint8_t Role = *(uint8_t*)((uint8_t*)Actor + 0x118);

    AActor* Owner = *(AActor**)((uint8_t*)Actor + 0x98);

    printf("[ACTOR NET] bNetStartup=%s\n", BoolStr(bNetStartup));
    printf("[ACTOR NET] bOnlyRelevantToOwner=%s\n", BoolStr(bOnlyRelevantToOwner));
    printf("[ACTOR NET] bAlwaysRelevant=%s\n", BoolStr(bAlwaysRelevant));
    printf("[ACTOR NET] bReplicateMovement=%s\n", BoolStr(bReplicateMovement));
    printf("[ACTOR NET] bTearOff=%s\n", BoolStr(bTearOff));
    printf("[ACTOR NET] bPendingNetUpdate=%s\n", BoolStr(bPendingNetUpdate));
    printf("[ACTOR NET] bNetLoadOnClient=%s\n", BoolStr(bNetLoadOnClient));
    printf("[ACTOR NET] bNetUseOwnerRelevancy=%s\n", BoolStr(bNetUseOwnerRelevancy));
    printf("[ACTOR NET] bReplicates=%s\n", BoolStr(bReplicates));
    printf("[ACTOR NET] Role=%u RemoteRole=%u\n", Role, RemoteRole);
    printf("[ACTOR NET] Owner=%p\n", Owner);

    UObject* Outer = Actor->Outer;
    printf("[ACTOR NET] Outer=%p %s\n",
        Outer,
        Outer ? Outer->GetFullName().c_str() : "null");

    // Actor Outer is usually ULevel.
    if (Outer)
    {
        uint8_t* Level = (uint8_t*)Outer;

        UWorld* LevelOwningWorld = *(UWorld**)(Level + 0xB0);
        uint8_t LevelFlags = *(uint8_t*)(Level + 0x1E4);
        bool bLevelVisible = (LevelFlags & (1 << 3)) != 0;

        void* DriverWorld = nullptr;

        if (Driver)
        {
            DriverWorld = *(void**)((uint8_t*)Driver + 0xA0);
        }

        printf("[ACTOR NET] Level.OwningWorld=%p Driver->World=%p\n",
            LevelOwningWorld,
            DriverWorld);

        printf("[ACTOR NET] Level.bIsVisible=%s RawFlags1E4=%02X\n",
            BoolStr(bLevelVisible),
            LevelFlags);
    }

    printf("=========================================\n\n");
}
static void ForceActorNetDriverName(AActor* Actor, UNetDriver* Driver)
{
    if (!Actor || !Driver)
    {
        printf("[ACTOR NET] ForceActorNetDriverName skipped Actor=%p Driver=%p\n",
            Actor,
            Driver);
        return;
    }

    FNameRaw DriverNetDriverName = *(FNameRaw*)&Driver->NetDriverName;

    printf("[ACTOR NET] Forcing Actor=%p NetDriverName to %08X %08X\n",
        Actor,
        DriverNetDriverName.ComparisonIndex,
        DriverNetDriverName.Number);

    *(FNameRaw*)((uint8_t*)Actor + 0x88) = DriverNetDriverName;
}
void DiagnoseAndPatchRemotePawnNetDriverName()
{
    printf("\n========== DIAGNOSE REMOTE PAWN NETDRIVER NAME ==========\n");

    UWorld* World = gServerWorld;

    if (!World)
    {
        uintptr_t GameBase = (uintptr_t)GetModuleHandleW(nullptr);
        World = GetBestServerWorld(GameBase);
        printf("[REMOTE PAWN DIAG] gServerWorld null, GetBestServerWorld=%p\n", World);
    }

    UNetDriver* Driver = gServerDriver;

    if (!Driver && World)
    {
        Driver = World->NetDriver;
        printf("[REMOTE PAWN DIAG] gServerDriver null, World->NetDriver=%p\n", Driver);
    }

    printf("[REMOTE PAWN DIAG] World=%p Driver=%p\n", World, Driver);

    APlayerController* RemotePC = nullptr;
    void* RemoteConn = nullptr;

    APawn* RemotePawn = FindRemotePawnFromWorld(
        World,
        &RemotePC,
        &RemoteConn
    );

    printf("[REMOTE PAWN DIAG] RemotePC=%p RemoteConn=%p RemotePawn=%p\n",
        RemotePC,
        RemoteConn,
        RemotePawn);

    if (!RemotePawn)
    {
        printf("[REMOTE PAWN DIAG] No remote pawn found; cannot patch\n");
        printf("=========================================================\n\n");
        return;
    }

    DumpActorNetReplicationState("REMOTE PAWN BEFORE", (AActor*)RemotePawn, Driver);

    ForceActorNetDriverName((AActor*)RemotePawn, Driver);

    DumpActorNetReplicationState("REMOTE PAWN AFTER", (AActor*)RemotePawn, Driver);

    printf("=========================================================\n\n");
}
bool PatchLoadMapWorldListenCall(uintptr_t GameBase)
{
    PatchGlobalBindSlot(GameBase);
    //PatchGetNetModeFallbackToDedicated(GameBase);
    //PatchGlobalSendSlot(GameBase);
    //PatchIATRecvFrom();
    //PatchAddressCompare(GameBase);
    //NopBytes(GameBase + 0x22DA7F7, 6);
    uintptr_t CallSite = GameBase + 0x1644CEF; // 00007FF6A1BD4CEF

    printf("[WORLD LISTEN PATCH] CallSite=%p\n", (void*)CallSite);
    printf("[WORLD LISTEN PATCH] Hook=%p\n", (void*)&HookedWorldListen);

    uint8_t Original[5]{};

    __try {
        memcpy(Original, (void*)CallSite, sizeof(Original));
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        printf("[WORLD LISTEN PATCH] failed reading callsite\n");
        return false;
    }

    printf("[WORLD LISTEN PATCH] Current bytes: %02X %02X %02X %02X %02X\n",
        Original[0], Original[1], Original[2], Original[3], Original[4]);

    /*
        Original should be:
            E8 xx xx xx xx
        call UWorld::Listen stub
    */
    if (Original[0] != 0xE8)
    {
        printf("[WORLD LISTEN PATCH] callsite is not a CALL rel32. Already patched or wrong RVA.\n");
        return false;
    }

    uint8_t* Stub = (uint8_t*)AllocNearAddress(CallSite, 0x1000);

    if (!Stub)
    {
        printf("[WORLD LISTEN PATCH] failed to allocate near stub\n");
        return false;
    }

    /*
        Stub:
            mov rax, HookedWorldListen
            jmp rax
    */
    Stub[0] = 0x48;
    Stub[1] = 0xB8;
    *(uintptr_t*)(Stub + 2) = (uintptr_t)&HookedWorldListen;
    Stub[10] = 0xFF;
    Stub[11] = 0xE0;

    FlushInstructionCache(GetCurrentProcess(), Stub, 12);

    int64_t Rel64 = (int64_t)Stub - ((int64_t)CallSite + 5);

    if (Rel64 < INT32_MIN || Rel64 > INT32_MAX)
    {
        printf("[WORLD LISTEN PATCH] Stub still too far: Stub=%p Rel=%lld\n",
            Stub,
            (long long)Rel64);

        VirtualFree(Stub, 0, MEM_RELEASE);
        return false;
    }

    uint8_t Patch[5]{};
    Patch[0] = 0xE8; // call rel32
    *(int32_t*)&Patch[1] = (int32_t)Rel64;

    DWORD OldProtect = 0;

    if (!VirtualProtect((void*)CallSite, sizeof(Patch), PAGE_EXECUTE_READWRITE, &OldProtect))
    {
        printf("[WORLD LISTEN PATCH] VirtualProtect failed: %lu\n", GetLastError());
        VirtualFree(Stub, 0, MEM_RELEASE);
        return false;
    }

    memcpy((void*)CallSite, Patch, sizeof(Patch));

    DWORD Temp = 0;
    VirtualProtect((void*)CallSite, sizeof(Patch), OldProtect, &Temp);

    FlushInstructionCache(GetCurrentProcess(), (void*)CallSite, sizeof(Patch));

    printf("[WORLD LISTEN PATCH] SUCCESS. CallSite=%p -> Stub=%p -> Hook=%p\n",
        (void*)CallSite,
        Stub,
        (void*)&HookedWorldListen);

    return true;
}
static constexpr uintptr_t RVA_UNETDRIVER_FLUSH_CORE = 0x1306390; // 00007FF6A1896390

using tNetDriverTickFloat = void(__fastcall*)(void* Driver, float DeltaSeconds);

void TryCallNativeNetFlushCoreOnce()
{
    if (!gServerDriver)
    {
        printf("[NATIVE FLUSH] gServerDriver null\n");
        return;
    }

    uintptr_t GameBase = (uintptr_t)GetModuleHandleW(nullptr);

    auto Fn =
        (tNetDriverTickFloat)(GameBase + RVA_UNETDRIVER_FLUSH_CORE);

    printf("\n========== TRY NATIVE NET FLUSH CORE ==========\n");
    printf("[NATIVE FLUSH] Driver=%p Fn=%p\n", gServerDriver, Fn);

    __try
    {
        Fn(gServerDriver, 0.033f);
        printf("[NATIVE FLUSH] returned\n");
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[NATIVE FLUSH] SEH exception\n");
    }

    printf("===============================================\n\n");
}
void PatchDriver430ToWorldForTest()
{
    if (!gServerDriver)
    {
        printf("[DRIVER 430] gServerDriver null\n");
        return;
    }

    uint8_t* D = (uint8_t*)gServerDriver;

    __try
    {
        void* Old430 = *(void**)(D + 0x430);
        void* World = *(void**)(D + 0xA0);

        printf("\n========== PATCH DRIVER +0x430 TEST ==========\n");
        printf("[DRIVER 430] Driver=%p\n", gServerDriver);
        printf("[DRIVER 430] old +0x430 = %p | %s\n",
            Old430,
            SafeName((UObject*)Old430));
        printf("[DRIVER 430] World +0xA0 = %p | %s\n",
            World,
            SafeName((UObject*)World));

        *(void**)(D + 0x430) = World;

        printf("[DRIVER 430] new +0x430 = %p | %s\n",
            *(void**)(D + 0x430),
            SafeName((UObject*)*(void**)(D + 0x430)));

        printf("==============================================\n\n");
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[DRIVER 430] SEH while patching\n");
    }
}
void ClearServerReplicateActorsGate()
{
    if (!gServerDriver)
    {
        printf("[REPL GATE] gServerDriver null\n");
        return;
    }

    uint8_t* D = (uint8_t*)gServerDriver;

    __try
    {
        uint8_t* Gate = D + 0x941;

        printf("\n========== CLEAR SERVER REPLICATE ACTORS GATE ==========\n");
        printf("[REPL GATE] Driver=%p | %s\n",
            gServerDriver,
            SafeName((UObject*)gServerDriver));

        printf("[REPL GATE] +0x941 before = %02X\n", *Gate);

        *Gate = 0;

        printf("[REPL GATE] +0x941 after  = %02X\n", *Gate);
        printf("========================================================\n\n");
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[REPL GATE] SEH while clearing Driver+0x941\n");
    }
}
void DumpNetDriver430Field(const char* Tag, void* Driver)
{
    printf("\n========== NETDRIVER +0x430 FIELD: %s ==========\n",
        Tag ? Tag : "?");

    if (!Driver)
    {
        printf("[ND430] Driver=null\n");
        printf("================================================\n\n");
        return;
    }

    uint8_t* D = (uint8_t*)Driver;

    __try
    {
        printf("[ND430] Driver        = %p | %s\n", Driver, SafeName((UObject*)Driver));
        printf("[ND430] +0xA0 World   = %p | %s\n",
            *(void**)(D + 0xA0),
            SafeName((UObject*)*(void**)(D + 0xA0)));
        printf("[ND430] +0xE8 Notify  = %p | %s\n",
            *(void**)(D + 0xE8),
            SafeName((UObject*)*(void**)(D + 0xE8)));
        printf("[ND430] +0x430 Object = %p | %s\n",
            *(void**)(D + 0x430),
            SafeName((UObject*)*(void**)(D + 0x430)));
        printf("[ND430] +0x941 Gate   = %02X\n",
            *(uint8_t*)(D + 0x941));
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[ND430] SEH while dumping Driver=%p\n", Driver);
    }

    printf("================================================\n\n");
}
void DumpDriverEarlyReplicationGates(const char* Tag)
{
    if (!gServerDriver)
    {
        printf("[EARLY REPL] gServerDriver null\n");
        return;
    }

    uint8_t* D = (uint8_t*)gServerDriver;

    printf("\n========== EARLY REPLICATION GATES: %s ==========\n",
        Tag ? Tag : "?");

    __try
    {
        void* ClientData = *(void**)(D + 0x78);
        int32_t ClientNum = *(int32_t*)(D + 0x80);
        int32_t ClientMax = *(int32_t*)(D + 0x84);
        void* FirstConn = nullptr;

        if (ClientData && ClientNum > 0)
            FirstConn = *(void**)ClientData;

        printf("[EARLY REPL] Driver=%p | %s\n",
            gServerDriver,
            SafeName((UObject*)gServerDriver));

        printf("[EARLY REPL] +0x78 ClientData = %p\n", ClientData);
        printf("[EARLY REPL] +0x80 ClientNum  = %d\n", ClientNum);
        printf("[EARLY REPL] +0x84 ClientMax  = %d\n", ClientMax);

        printf("[EARLY REPL] FirstConn = %p | %s\n",
            FirstConn,
            SafeName((UObject*)FirstConn));

        if (FirstConn)
        {
            printf("[EARLY REPL] FirstConn +0x124 State = %d / 0x%X\n",
                *(int32_t*)((uint8_t*)FirstConn + 0x124),
                *(int32_t*)((uint8_t*)FirstConn + 0x124));

            printf("[EARLY REPL] FirstConn +0x88 ViewTarget = %p | %s\n",
                *(void**)((uint8_t*)FirstConn + 0x88),
                SafeName((UObject*)*(void**)((uint8_t*)FirstConn + 0x88)));

            printf("[EARLY REPL] FirstConn +0x90 OwningActor = %p | %s\n",
                *(void**)((uint8_t*)FirstConn + 0x90),
                SafeName((UObject*)*(void**)((uint8_t*)FirstConn + 0x90)));
        }

        printf("[EARLY REPL] +0x941 Gate = %02X\n",
            *(uint8_t*)(D + 0x941));

        printf("[EARLY REPL] +0x3F0 NetworkObjects = %p\n",
            *(void**)(D + 0x3F0));

        printf("[EARLY REPL] +0x430 Object = %p | %s\n",
            *(void**)(D + 0x430),
            SafeName((UObject*)*(void**)(D + 0x430)));

        printf("[EARLY REPL] +0x4B8 = %d\n", *(int32_t*)(D + 0x4B8));
        printf("[EARLY REPL] +0x4E4 = %d\n", *(int32_t*)(D + 0x4E4));
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[EARLY REPL] SEH while dumping\n");
    }

    printf("=================================================\n\n");
}
void DumpOneNetDriverCandidate(void* Driver)
{
    if (!Driver)
        return;

    uint8_t* D = (uint8_t*)Driver;

    __try
    {
        printf("\n========== NETDRIVER CANDIDATE ==========\n");
        printf("[NDC] Driver = %p | %s\n", Driver, SafeName((UObject*)Driver));

        printf("[NDC] +0xA0 World          = %p | %s\n",
            *(void**)(D + 0xA0),
            SafeName((UObject*)*(void**)(D + 0xA0)));

        printf("[NDC] +0x3F0 NetworkObjects = %p\n",
            *(void**)(D + 0x3F0));

        printf("[NDC] +0x430 Object         = %p | %s\n",
            *(void**)(D + 0x430),
            SafeName((UObject*)*(void**)(D + 0x430)));

        printf("[NDC] +0x941 Gate           = %02X\n",
            *(uint8_t*)(D + 0x941));

        printf("[NDC] +0x4B8                = %d / 0x%08X\n",
            *(int32_t*)(D + 0x4B8),
            *(uint32_t*)(D + 0x4B8));

        printf("[NDC] +0x4E4                = %d / 0x%08X\n",
            *(int32_t*)(D + 0x4E4),
            *(uint32_t*)(D + 0x4E4));

        printf("[NDC] +0x78 ClientData      = %p\n",
            *(void**)(D + 0x78));

        printf("[NDC] +0x80 ClientNum       = %d\n",
            *(int32_t*)(D + 0x80));

        printf("[NDC] +0x84 ClientMax       = %d\n",
            *(int32_t*)(D + 0x84));

        printf("=========================================\n\n");
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[NDC] SEH dumping candidate Driver=%p\n", Driver);
    }
}
void DumpAllNetDriverCandidates()
{
    printf("\n========== ALL NETDRIVER CANDIDATES ==========\n");

    if (!UObject::GObjects)
    {
        printf("[NDC SCAN] GObjects is null\n");
        printf("==============================================\n\n");
        return;
    }

    int Count = 0;

    for (int i = 0; i < UObject::GObjects->Num(); i++)
    {
        UObject* Obj = UObject::GObjects->GetByIndex(i);

        if (!Obj || !Obj->Class)
            continue;

        std::string ClassName;
        std::string ObjName;

        ClassName = Obj->Class->GetFullName();
        ObjName = Obj->GetFullName();


        bool bLooksLikeActualNetDriver =
            ClassName.find("NetDriver") != std::string::npos &&
            ObjName.find("Default__") == std::string::npos &&
            ObjName.find("Class ") == std::string::npos &&
            ObjName.find("Property ") == std::string::npos &&
            ObjName.find("ScriptStruct ") == std::string::npos;

        if (!bLooksLikeActualNetDriver)
            continue;

        printf("[NDC SCAN] Found Obj=%p\n", Obj);
        printf("[NDC SCAN] Class=%s\n", ClassName.c_str());
        printf("[NDC SCAN] Name =%s\n", ObjName.c_str());

        DumpOneNetDriverCandidate((void*)Obj);

        Count++;
    }

    printf("[NDC SCAN] Count=%d\n", Count);
    printf("==============================================\n\n");
}
void DumpNetDriverReflectedPropertyOffsets()
{
    printf("\n========== NETDRIVER REFLECTED PROPERTY OFFSETS ==========\n");

    if (!UObject::GObjects)
    {
        printf("[PROP OFFSETS] GObjects null\n");
        printf("==========================================================\n\n");
        return;
    }

    int Count = 0;

    for (int i = 0; i < UObject::GObjects->Num(); i++)
    {
        UObject* Obj = UObject::GObjects->GetByIndex(i);

        if (!Obj || !Obj->Class)
            continue;

        std::string ClassName;
        std::string ObjName;


        ClassName = Obj->Class->GetFullName();
        ObjName = Obj->GetFullName();


        bool bIsProperty =
            ClassName.find("Property") != std::string::npos;

        if (!bIsProperty)
            continue;

        bool bIsNetDriverProperty =
            ObjName.find("Engine.NetDriver.") != std::string::npos ||
            ObjName.find("Engine.DemoNetDriver.") != std::string::npos ||
            ObjName.find("OnlineSubsystemUtils.IpNetDriver.") != std::string::npos ||
            ObjName.find("OnlineSubsystemSteam.SteamNetDriver.") != std::string::npos;

        if (!bIsNetDriverProperty)
            continue;

        uint8_t* P = (uint8_t*)Obj;

        int32_t Off40 = 0;
        int32_t Off44 = 0;
        int32_t Off48 = 0;
        int32_t Off4C = 0;
        int32_t Off50 = 0;


        Off40 = *(int32_t*)(P + 0x40);
        Off44 = *(int32_t*)(P + 0x44);
        Off48 = *(int32_t*)(P + 0x48);
        Off4C = *(int32_t*)(P + 0x4C);
        Off50 = *(int32_t*)(P + 0x50);


        printf("[PROP] Obj=%p Class=%s\n", Obj, ClassName.c_str());
        printf("       Name=%s\n", ObjName.c_str());
        printf("       +40=%d/0x%X +44=%d/0x%X +48=%d/0x%X +4C=%d/0x%X +50=%d/0x%X\n",
            Off40, (uint32_t)Off40,
            Off44, (uint32_t)Off44,
            Off48, (uint32_t)Off48,
            Off4C, (uint32_t)Off4C,
            Off50, (uint32_t)Off50);

        if (Off40 == 0x430 || Off44 == 0x430 || Off48 == 0x430 || Off4C == 0x430 || Off50 == 0x430)
        {
            printf("       >>> POSSIBLE +0x430 MATCH <<<\n");
        }

        Count++;
    }

    printf("[PROP OFFSETS] Count=%d\n", Count);
    printf("==========================================================\n\n");
}
void DumpNetDriverVTableRange(void* Driver, int Start, int End)
{
    if (!Driver)
    {
        printf("[VTABLE RANGE] Driver null\n");
        return;
    }

    uintptr_t Base = (uintptr_t)GetModuleHandleW(nullptr);

    printf("\n========== NETDRIVER VTABLE RANGE ==========\n");
    printf("[VTABLE RANGE] Driver=%p | %s\n", Driver, SafeName((UObject*)Driver));

    __try
    {
        void** VTable = *(void***)Driver;

        printf("[VTABLE RANGE] VTable=%p\n", VTable);

        for (int i = Start; i <= End; i++)
        {
            void* Fn = VTable[i];
            uintptr_t Rva = (uintptr_t)Fn - Base;

            printf("[VTABLE RANGE] [%03d] Fn=%p RVA=0x%llX\n",
                i,
                Fn,
                (unsigned long long)Rva);
        }
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[VTABLE RANGE] SEH\n");
    }

    printf("============================================\n\n");
}
static constexpr uintptr_t RVA_FUNC_19C0CB0 = 0x1430CB0; // 00007FF6A19C0CB0

using tFunc19C0CB0 = UObject * (__fastcall*)(void* Driver);

void DumpFunc19C0CB0Result()
{
    if (!gServerDriver)
    {
        printf("[19C0CB0] gServerDriver null\n");
        return;
    }

    uintptr_t Base = (uintptr_t)GetModuleHandleW(nullptr);
    auto Fn = (tFunc19C0CB0)(Base + RVA_FUNC_19C0CB0);

    printf("\n========== 19C0CB0 RESULT ==========\n");

    __try
    {
        UObject* Obj = Fn(gServerDriver);

        printf("[19C0CB0] Driver=%p | %s\n",
            gServerDriver,
            SafeName((UObject*)gServerDriver));

        printf("[19C0CB0] Result=%p | %s\n",
            Obj,
            SafeName(Obj));

        if (Obj)
        {
            void** VT = *(void***)Obj;
            void* Target = VT[0x2C0 / 8];

            printf("[19C0CB0] VTable=%p\n", VT);
            printf("[19C0CB0] VFunc +0x2C0 = %p RVA=0x%llX\n",
                Target,
                (unsigned long long)((uintptr_t)Target - Base));
        }
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        printf("[19C0CB0] SEH exception\n");
    }

    printf("====================================\n\n");
}
void RepairViewTargetOnly_ExistingHelpers()
{
    printf("\n========== VIEWTARGET-ONLY REPAIR ==========\n");

    APlayerController* PC = FindRemotePlayerControllerForNetObjectDump();

    if (!PC)
    {
        printf("[VIEWTARGET ONLY] no remote PC found\n");
        printf("============================================\n\n");
        return;
    }

    APawn* Pawn = PC->Pawn;

    void* Conn = nullptr;
    Conn = PC->NetConnection ? (void*)PC->NetConnection : (void*)PC->Player;

    printf("[VIEWTARGET ONLY] PC   = %p | %s\n", PC, SafeName((UObject*)PC));
    printf("[VIEWTARGET ONLY] Pawn = %p | %s\n", Pawn, SafeName((UObject*)Pawn));
    printf("[VIEWTARGET ONLY] Conn = %p | %s\n", Conn, SafeName((UObject*)Conn));

    if (!PC || !Pawn || !Conn)
    {
        printf("[VIEWTARGET ONLY] missing PC/Pawn/Conn\n");
        printf("============================================\n\n");
        return;
    }

    DumpPawnReplicationRelevancyState(PC, Pawn, Conn);

    RepairPawnOwnerAndViewTarget(PC, Pawn, Conn);

    DumpPawnReplicationRelevancyState(PC, Pawn, Conn);

    printf("============================================\n\n");
}

LRESULT CALLBACK GameWndProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam)
{
    WatchOpenChannelsDelta();

    if (uMsg == WM_KEYDOWN)
    {
        if (wParam == VK_F5)
        {
            printf("\n[WNDPROC] F5 received. Manual living pawn repair tick.\n");

            // Reset stage and immediately run the repair once.
            //gLivingPawnRepairStage = 0;
            gLivingPawnRepairWaitTicks = 0;
            gLivingPawnRepairRestartSent = false;
            gLivingPawnRepairLastMs = 0;

            TickLivingPawnExportRepair_GameThread();


            return 0;
        }

        if (uMsg == WM_KEYDOWN && wParam == VK_F6)
        {
            DumpActorsMatchingTerms();
            return 0;
        }
        if (uMsg == WM_KEYDOWN && wParam == VK_F7)
        {
            gEnableFullTickFlushWrapper = !gEnableFullTickFlushWrapper;

            printf("[FULL TICKFLUSH] Full wrapper: %s\n",
                gEnableFullTickFlushWrapper ? "ENABLED" : "DISABLED");

            return 0;
        }
        if (wParam == VK_F8)
        {
            printf("\n[F8 DIAG] Running net/world diagnostics\n");

            DumpServerNetRealityNow();
            DumpWorldCandidatesAndInterestingActors("F8");

            return 0;
        }

    }

    return CallWindowProc(OriginalWndProc, hwnd, uMsg, wParam, lParam);
}

void CreateDebugConsole() {
    AllocConsole();

    FILE* fDummy;
    freopen_s(&fDummy, "CONOUT$", "w", stdout);
    freopen_s(&fDummy, "CONOUT$", "w", stderr);

    printf("===============================================\n");
    printf("     THE CULLING: SERVER RESURRECTION DLL      \n");
    printf("===============================================\n");

    printf("[DIAGNOSTIC] MyBind = %p\n", &MyBind);
}
HWND FindUnrealWindowForCurrentProcess()
{
    struct Ctx {
        DWORD pid;
        HWND hwnd;
    } ctx{ GetCurrentProcessId(), NULL };

    EnumWindows([](HWND hwnd, LPARAM lParam) -> BOOL {
        Ctx* ctx = (Ctx*)lParam;

        DWORD windowPid = 0;
        GetWindowThreadProcessId(hwnd, &windowPid);

        if (windowPid != ctx->pid)
            return TRUE;

        char cls[256]{};
        GetClassNameA(hwnd, cls, sizeof(cls));

        if (strcmp(cls, "UnrealWindow") != 0)
            return TRUE;

        if (!IsWindowVisible(hwnd))
            return TRUE;

        ctx->hwnd = hwnd;
        return FALSE;
        }, (LPARAM)&ctx);

    return ctx.hwnd;
}
void NativeServerThread() {
    CreateDebugConsole();

    printf("[*] Waiting 12 seconds for the Splash Screen to close...\n");
    //Sleep(12000);

    HWND hGameWnd = NULL;

    while (!hGameWnd) {
        hGameWnd = FindUnrealWindowForCurrentProcess();
        Sleep(500);
    }

    DWORD pid = 0;
    GetWindowThreadProcessId(hGameWnd, &pid);

    printf("[WINDOW] hGameWnd=%p ownerPid=%lu currentPid=%lu\n",
        hGameWnd,
        pid,
        GetCurrentProcessId());

    SetLastError(0);

    OriginalWndProc = (WNDPROC)SetWindowLongPtr(
        hGameWnd,
        GWLP_WNDPROC,
        (LONG_PTR)GameWndProc
    );


    SetTimer(
        hGameWnd,
        NET_TICK_TIMER_ID,
        100,
        nullptr
    );

    printf("[WNDPROC] Started living pawn repair timer id=%u interval=100ms\n",
        NET_TICK_TIMER_ID);

    DWORD err = GetLastError();

    printf("[WNDPROC] SetWindowLongPtr result OriginalWndProc=%p err=%lu\n",
        OriginalWndProc,
        err);

    printf("[WNDPROC] Current WndProc=%p Expected=%p\n",
        (void*)GetWindowLongPtr(hGameWnd, GWLP_WNDPROC),
        (void*)GameWndProc);
    uintptr_t GameBase = (uintptr_t)GetModuleHandle(NULL);
    //PatchAddressCompare(GameBase);

    ////ForceDedicatedLikeGlobals(GameBase);


    printf("[SUCCESS] Hooked REAL Main Game Thread!\n");
    printf("[*] Start an Offline Match, then Press F9 to call InitListen with CreateAddr hook.\n");

    if (!IsClientPatchMode()) {
        PatchLoadMapWorldListenCall(GameBase);
        while (true) {
            PatchGameModeCDOsOnce();
            PatchSteamNetConnectionCDOOnce();

            //if (GetAsyncKeyState(VK_F2) & 1)
            //{
            //    printf("\n\n================ MANUAL F7 NETWORK STATE ================\n");

            //    DumpActiveNetDriversSimple("F7 manual");

            //    if (gServerWorld && gServerDriver)
            //    {
            //        DumpNetDriverRegistrationState("F7 manual", gServerDriver, gServerWorld);
            //        DumpWorldLevelCollections(gServerWorld);
            //        DumpPlayerControllers();
            //    }
            //    else
            //    {
            //        printf("[F7] gServerWorld or gServerDriver missing\n");
            //    }

            //    printf("================ END MANUAL F7 NETWORK STATE ================\n\n");
            //}
            //if (GetAsyncKeyState(VK_F1) & 1)
            //{
            //    DiagnoseAndPatchRemotePawnNetDriverName();
            //}
            //if (GetAsyncKeyState(VK_F6) & 1)
            //{
            //    DumpRemotePawnNetworkObjectMembership();
            //}
            //if (GetAsyncKeyState(VK_F5) & 1)
            //{
            //    BounceRemotePawnReplicatesOnce();
            //}
            //if (GetAsyncKeyState(VK_F8) & 1)
            //{
            //    printf("\n[WNDPROC] F8 received. Dumping relevancy state.\n");
            //    DumpRemoteConnectionRelevancyState();
            //}



            Sleep(10);
        }
    }
}

BOOL APIENTRY DllMain(HMODULE hModule, DWORD reason, LPVOID reserved) {
    if (reason == DLL_PROCESS_ATTACH) {
        DisableThreadLibraryCalls(hModule);

        CreateThread(
            0,
            0,
            (LPTHREAD_START_ROUTINE)NativeServerThread,
            0,
            0,
            0
        );
    }

    return TRUE;
}