import { io } from "socket.io-client";

// The server's socket middleware (see server.js) rejects connections that
// don't present a valid JWT, and uses it to decide which company/admin
// rooms to join — so we must NOT auto-connect at module load time (there
// may be no token yet), and must NOT connect anonymously.
const SOCKET_URL = "http://localhost:3000";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  auth: (cb) => {
    // Re-read the token on every (re)connect attempt rather than once at
    // module load, so a fresh login after a logout picks up the new token.
    cb({ token: localStorage.getItem("token") || null });
  },
});

// Call after login (and once on app load if already logged in) to open the
// connection now that a token exists.
export const connectSocket = () => {
  if (!localStorage.getItem("token")) return;
  if (socket.connected) return;
  socket.connect();
};

// Call on logout so a stale/cleared token doesn't linger on an open socket
// and so the next login starts from a clean connection.
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export default socket;