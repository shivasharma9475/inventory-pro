let io;

const initSocket = (socketIo) => {
  io = socketIo;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }

  return io;
};

// Every event must be scoped to a company room — never emit globally, or one
// company's stock/billing/activity data would be visible to every connected
// client regardless of which company they belong to.
const companyRoom = (companyCode) => `company:${companyCode}`;

// Activity feed is admin-only data (see activity.routes.js), so it gets its
// own room within the company instead of going to every connected socket.
const companyAdminRoom = (companyCode) => `company:${companyCode}:admin`;

// Emit to every authenticated socket in a company (any role).
const emitToCompany = (companyCode, event, payload) => {
  if (!companyCode) return;
  getIO().to(companyRoom(companyCode)).emit(event, payload);
};

// Emit to admin-only sockets within a company.
const emitToCompanyAdmins = (companyCode, event, payload) => {
  if (!companyCode) return;
  getIO().to(companyAdminRoom(companyCode)).emit(event, payload);
};

module.exports = {
  initSocket,
  getIO,
  companyRoom,
  companyAdminRoom,
  emitToCompany,
  emitToCompanyAdmins,
};