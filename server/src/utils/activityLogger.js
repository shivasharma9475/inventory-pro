const Activity = require("../models/activity.model");

const buildActivity = require("./activityMessages");
const { emitToCompanyAdmins } = require("../socket");

const logActivity = async ({
user,
action,
entity,
entityId = null,
entityData = {},
req = null,
}) => {

try {


const activity = buildActivity({
  user,
  action,
  entity,
  entityData,
});

const saved = await Activity.create({
  userId: user?._id,

  userName: user?.name || "Unknown User",

  role: user?.role || "staff",

  companyCode: user?.companyCode,

  action: activity.action,

  entity,

  entityId,

  message: activity.message,

  details: activity.details,

  ipAddress:
    req?.headers["x-forwarded-for"] ||
    req?.socket?.remoteAddress ||
    "",

  userAgent:
    req?.headers["user-agent"] || "",
});

// 🔥 Real-time push — Activity Feed is admin-only (see activity.routes.js),
// so this only reaches sockets in the company's admin room, never staff.
try {
  emitToCompanyAdmins(user?.companyCode, "activity:new", {
    _id: saved._id,
    message: saved.message,
    role: saved.role,
    action: saved.action,
    createdAt: saved.createdAt,
  });
} catch (emitErr) {
  // Socket.IO may not be initialized yet (e.g. during tests/scripts) —
  // never let a missing socket layer break activity logging itself.
  console.error("Activity socket emit failed:", emitErr.message);
}


} catch (err) {


console.error(
  "Activity Logger Error:",
  err.message
);


}
};

module.exports = logActivity;  
