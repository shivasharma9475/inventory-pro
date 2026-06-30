require("dotenv").config();

const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const app = require("./src/app");
const connectDB = require("./src/config/db");
const userModel = require("./src/models/user.model");

const { initSocket, companyRoom, companyAdminRoom } = require("./src/socket");

// Connect Database
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    credentials: true,
  },
});

app.set("io", io);   // ← makes io accessible via req.app.get("io") in controllers


// Initialize socket
initSocket(io);

// ── Authenticate every socket connection ────────────────────────────────────
// Without this, anyone who can reach the server URL could open a socket and
// (once joined to a room) see another company's live stock/billing/activity
// data. We reuse the same JWT the REST API already issues — the client sends
// it via the `auth` payload on connect (see client/src/socket.js).
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Unauthorized — token not provided"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.id).select("-password");

    if (!user || !user.companyCode) {
      return next(new Error("Unauthorized — invalid user"));
    }

    socket.user = {
      id: user._id,
      role: user.role,
      companyCode: user.companyCode,
    };

    return next();
  } catch (error) {
    return next(new Error("Unauthorized — invalid token"));
  }
});

// Socket connection
io.on("connection", (socket) => {
  const { companyCode, role, id } = socket.user;

  console.log("User connected:", socket.id, "company:", companyCode, "role:", role);

  // Every authenticated socket joins its company room (stock/billing/product
  // updates — visible to admin + staff, matching the REST API's RBAC).
  socket.join(companyRoom(companyCode));

  // Admins additionally join the admin-only room (activity feed).
  if (role === "admin") {
    socket.join(companyAdminRoom(companyCode));
  }

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id, "user:", id);
  });
});

// Start server
server.listen(3000, () => {
  console.log("Server running on port 3000");
});