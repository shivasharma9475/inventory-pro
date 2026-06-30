const express = require("express");
const router = express.Router();

const { dashboardController } = require("../controllers/dashboard.controller");
const { authUser, authorise } = require("../middleware/auth.middleware");

// 🧠 Main Dashboard (Admin + Staff)
router.get("/", authUser, dashboardController.getDashboard);

// 📊 Basic Stats (Admin + Staff)
router.get("/stats", authUser, authorise("admin", "staff"), dashboardController.getDashboardStats);

// 📂 Category Stats (Admin + Staff)
router.get("/category", authUser, authorise("admin", "staff"), dashboardController.getCategoryStats);

// 🔥 Top Selling (Admin + Staff)
router.get("/top-selling", authUser, authorise("admin", "staff"), dashboardController.getTopSellingProducts);

// 💰 Inventory Value (Admin + Staff)
router.get("/value", authUser, authorise("admin", "staff"), dashboardController.getInventoryValue);

// 📈 Sales Trend (Admin + Staff)
router.get("/trend", authUser, authorise("admin", "staff"), dashboardController.getSalesTrend);

// 🤖 Restock Suggestions (Admin + Staff)
router.get("/restock", authUser, authorise("admin", "staff"), dashboardController.getRestockSuggestions);

// ⚠️ Dead Stock (Admin + Staff)
router.get("/dead-stock", authUser, authorise("admin", "staff"), dashboardController.getDeadStock);

// 🚀 Product Movement (Admin + Staff)
router.get("/movement", authUser, authorise("admin", "staff"), dashboardController.getProductMovement);

// 📊 Monthly Sales (Admin + Staff)
router.get("/monthly-sales", authUser, authorise("admin", "staff"), dashboardController.getMonthlySales);

module.exports = router;