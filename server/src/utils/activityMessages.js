const buildActivity = ({
user,
action,
entity,
entityData = {},
}) => {

const entityName =
entityData.name ||
entityData.productName ||
entityData.title ||
"Item";

const templates = {


// ── Product Actions ─────────────────────
ADD_PRODUCT: {
  message: `${user.name} added product ${entityName}`,
},

UPDATE_PRODUCT: {
  message: `${user.name} updated ${entityName}`,
},

DELETE_PRODUCT: {
  message: `${user.name} deleted ${entityName}`,
},

RESTORE_PRODUCT: {
  message: `${user.name} restored ${entityName}`,
},

UPDATE_STOCK: {
  message:
    entityData.oldStock !== undefined
      ? `${user.name} updated stock of ${entityName} from ${entityData.oldStock} to ${entityData.newStock}`
      : `${user.name} updated stock of ${entityName}`,
},

// ── Billing ─────────────────────────────
CREATE_BILL: {
  message:
    entityData.billId
      ? `${user.name} created bill ${entityData.billId} for ${entityData.customer}`
      : `${user.name} created bill for ₹${entityData.totalAmount}`,
},

// ── Auth ────────────────────────────────
LOGIN: {
  message: `${user.name} logged in`,
},

LOGOUT: {
  message: `${user.name} logged out`,
},

RESET_PASSWORD: {
  message: `${user.name} reset password`,
},

// ── Staff ───────────────────────────────
CREATE_STAFF: {
  message: `${user.name} created a new staff account`,
},

DELETE_STAFF: {
  message: `${user.name} removed a staff account`,
},


};

return {
action,


entity,

message:
  templates[action]?.message ||
  `${user.name} performed ${action}`,

details: entityData,


};
};

module.exports = buildActivity;
