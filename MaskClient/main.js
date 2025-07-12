// =======================================================
//                main.js - Companion Mode
// =======================================================

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fp = require("find-process");
const find =
  typeof fp === "function"
    ? fp // Common-JS path
    : fp.default; // ESM / transpiled path
const robot = require("robotjs"); // <-- For sending commands
const io = require("socket.io-client"); // ← simplest

// --- Global Variables ---
let overlayWindow;
let gameProcessInfo;
let socket;

// --- Configuration ---
const PYTHON_SERVER_URL =
  "https://clientweb2.us-east-1.production.theculling.net"; // Points to your server via hosts
const GAME_NAME = "Victory.exe";
// --- CORE FUNCTIONS ---

/**
 * Creates the transparent overlay window that holds our UI.
 */
function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  overlayWindow.loadFile(path.join(__dirname, "mask.html"));
  overlayWindow.webContents.openDevTools({ mode: "detach" });
  // We start with the overlay non-clickable until it's ready.
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
}

/**
 * Continuously scans for the Victory.exe process.
 * Once found, it creates the overlay. If lost, it quits the launcher.
 */
function connectToBackend() {
  console.log(`[Socket.IO] Connecting to backend: ${PYTHON_SERVER_URL}`);
  socket = io(PYTHON_SERVER_URL, {
    transports: ["websocket"],
    rejectUnauthorized: false, // Necessary for our self-signed cert
  });

  socket.on("connect", () => {
    console.log(`[Socket.IO] Connected to backend! Getting login ticket...`);
    // We now need to get the Steam ticket and send the login event.
    // For now, we'll send a fake login to establish the session.
    const fakeUserID = "steam:76561198058969576";
    const fakeAuthData = {
      authType: "steam",
      token: "fake-jwt-token-for-testing-purposes", // Corresponds to what your Python server login sends
      userID: fakeUserID,
      build: "119207",
      bCheckDLC: true,
    };
    socket.emit("login", fakeAuthData);
  });

  socket.on("auth-response", () => {
    console.log("[Socket.IO] Login to backend successful!");

    // --- THIS IS THE CRITICAL FIX ---
    // Now that we are fully connected and authenticated,
    // tell the UI that it's okay to enable the matchmaking buttons.
    if (overlayWindow) {
      console.log("[IPC] Sending 'backend-connected' signal to UI.");
      overlayWindow.webContents.send("backend-connected");
    }
  });

  socket.on("match-ready", (data) => {
    console.log("[Socket.IO] Match is ready!", data);
    if (overlayWindow) overlayWindow.hide();
    sendCommandToGame(`open ${data.gameServer}`);
  });

  socket.on("leave-mm-ack", () => {
    console.log("[Socket.IO] Left queue successfully.");

    // --- THIS IS THE FIX ---
    // Tell the UI to hide the queue overlay AND show the main buttons again.
    if (overlayWindow) {
      overlayWindow.webContents.send("queue-cancelled");
    }
  });

  socket.on("disconnect", (r) => console.log(`[Socket.IO] Disconnected: ${r}`));
  socket.on("connect_error", (err) =>
    console.error(`[Socket.IO] Connection Error: ${err.message}`)
  );
}
function findAndMonitorGame() {
  console.log(`[Launcher] Searching for ${GAME_NAME}...`);
  setInterval(() => {
    find("name", GAME_NAME, true).then((list) => {
      if (list.length > 0 && !gameProcessInfo) {
        gameProcessInfo = list[0];
        console.log(
          `[Launcher] ${GAME_NAME} found! PID: ${gameProcessInfo.pid}`
        );
        if (overlayWindow) overlayWindow.webContents.send("game-found");
      } else if (list.length === 0 && gameProcessInfo) {
        console.log(`[Launcher] ${GAME_NAME} closed. Quitting.`);
        app.quit();
      }
    });
  }, 2000);
}
/**
 * Sends a command to the game by simulating keyboard input.
 * @param {string} command The console command to run (e.g., "open 127.0.0.1:7777")
 */
async function sendCommandToGame(command) {
  if (!gameProcessInfo) {
    console.error("[Launcher] Cannot send command: Game process not found.");
    return;
  }

  // This is a very simple implementation. More robust solutions would
  // use native OS calls to ensure the game window is focused first.
  console.log(
    "--> IMPORTANT: Please ensure the game window is focused! Sending command in 3 seconds..."
  );
  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    // Configure a small delay between key presses for reliability
    robot.setKeyboardDelay(100);

    // Key for opening the console in most UE4 games is the backtick/tilde key
    robot.keyTap("`");

    // Type the command string
    robot.typeString(command);

    // Press enter to execute the command
    robot.keyTap("enter");

    console.log(`[Launcher] Sent command "${command}" to game.`);
  } catch (e) {
    console.error("[Launcher] Error during robotjs keyboard simulation:", e);
  }
}

// =======================================================
//                IPC & APP LIFECYCLE
// =======================================================

ipcMain.on("start-matchmaking", (event, data) => {
  if (socket && socket.connected) {
    console.log(`[IPC] Received matchmaking request for queue: ${data.queue}`);

    // This is where we replicate the 'DoQueueMatchmaking' logic.
    // We will make the HTTP POST request from Node.js.
    // We don't have a real ticket, so we'll send placeholder data.
    const postData = new URLSearchParams({
      ticket: "FAKE_TICKET_FROM_LAUNCHER",
      authType: "steam",
      appid: "437220",
      build: "119207",
      userid: "steam:76561198058969576", // Use a consistent user ID
      queuename: data.queue,
    });

    console.log("[Launcher] Making HTTP POST to /api/matchqueue...");

    // Use Electron's net module to make the HTTP request
    const { net } = require("electron");
    const request = net.request({
      method: "POST",
      protocol: "https:",
      hostname: "clientweb2.us-east-1.production.theculling.net",
      path: "/api/matchqueue",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    request.on("response", (response) => {
      console.log(
        `[Launcher] /api/matchqueue response status: ${response.statusCode}`
      );
      if (response.statusCode === 200) {
        // The server has acknowledged our request. Now we wait for WebSocket events.
        console.log(
          "[Launcher] Successfully queued! Waiting for WebSocket updates."
        );
        overlayWindow.webContents.send("show-queue-status");
      } else {
        console.error("[Launcher] Failed to queue for match.");
      }
    });

    request.on("error", (error) => {
      console.error(
        `[Launcher] Error on /api/matchqueue request: ${error.message}`
      );
    });

    request.write(postData.toString());
    request.end();
  } else {
    console.error("[IPC] Cannot start matchmaking, not connected to backend.");
  }
});

ipcMain.on("cancel-matchmaking", () => {
  if (socket && socket.connected) {
    console.log(`[IPC] Sending 'leave-mm' WebSocket event.`);
    socket.emit("leave-mm", { queueName: "ffa_jungle" });
  }
});

ipcMain.on("set-clickable", (event, isClickable) => {
  if (overlayWindow) {
    // The logic is inverted:
    // - When the UI is 'clickable' (isClickable = true), we want to STOP ignoring mouse events.
    // - When the UI is NOT 'clickable' (isClickable = false), we want to START ignoring mouse events again.
    const shouldIgnore = !isClickable;

    // Log the state change for debugging
    console.log(
      `[IPC] Setting mouse-ignore to: ${shouldIgnore} (UI is clickable: ${isClickable})`
    );

    overlayWindow.setIgnoreMouseEvents(shouldIgnore, { forward: true });
  }
});

// --- App Lifecycle ---
app.whenReady().then(() => {
  createOverlayWindow();
  findAndMonitorGame();
  connectToBackend();
});

app.on("window-all-closed", () => {
  if (gameProcess) gameProcess.kill();
  app.quit();
});
