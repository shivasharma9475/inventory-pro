const express = require("express");
const router = express.Router();

const {
  getSettings,
  updateSettings,
  uploadLogo,
  deleteLogo,
} = require("../controllers/companySettings.controller");

const { authUser, authorise } = require("../middleware/auth.middleware");

// Admin only routes
router.use(authUser, authorise("admin"));

router.get("/", getSettings);
router.put("/", updateSettings);
router.post("/upload-logo", uploadLogo);
router.delete("/logo", deleteLogo);

module.exports = router;