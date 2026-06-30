const ProductModel = require("../models/product.model");
const UserModel = require("../models/user.model");
const Bill = require("../models/bill.model");

// 🔥 Disable caching for all dashboard endpoints
const disableCache = (res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
};

// 🥇 1. Overall Stats
const getDashboardStats = async (req, res) => {
  try {
    disableCache(res);
    const companyCode = req.user.companyCode;

    const [totalProducts, lowStockProducts, totalStaff, totalUsers] = await Promise.all([
      ProductModel.countDocuments({ companyCode, isActive: true  }),

      ProductModel.countDocuments({
        companyCode,
        stock: { $lte: 5 },
        isActive: true ,
      }),

      UserModel.countDocuments({
        companyCode,
        role: "staff",
        
      }),

      UserModel.countDocuments({
        companyCode,
      }),
    ]);

    res.json({
      success: true,
      data: { totalProducts, lowStockProducts, totalStaff, totalUsers },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🥈 2. Category Stats
const getCategoryStats = async (req, res) => {
  try {
    disableCache(res);
    const companyCode = req.user.companyCode;

    const data = await ProductModel.aggregate([
      { $match: { companyCode, isActive: true  } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalStock: { $sum: "$stock" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// 🔥 4. Top Selling Products — total quantity sold, from Bill (source of truth)
//
// Previously this loaded every product into memory and averaged
// `p.salesHistory` as if it were a flat number array — that field never
// existed on the schema, so `avgSales` was always 0/NaN for every product.
// This now aggregates directly against Bill, the actual source of truth,
// and sorts by total quantity sold (matching the stated requirement)
// rather than an "average" that had no real basis.
const getTopSellingProducts = async (req, res) => {
  try {
    disableCache(res);
    const companyCode = req.user.companyCode;
    const limit = Math.min(Number(req.query.limit) || 5, 50);

    const result = await Bill.aggregate([
      { $match: { companyCode } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.lineTotal" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: "$product._id",
          name: "$product.name",
          category: "$product.category",
          stock: "$product.stock",
          totalQuantity: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
        },
      },
    ]);

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 💰 5. Inventory Value
const getInventoryValue = async (req, res) => {
  try {
    disableCache(res);
    const companyCode = req.user.companyCode;

    const result = await ProductModel.aggregate([
      { $match: { companyCode, isActive: true  } },
      {
        $group: {
          _id: null,
          totalValue: {
            $sum: { $multiply: ["$price", "$stock"] },
          },
        },
      },
    ]);

    res.json({
  success: true,
  data: {
    totalValue: result[0]?.totalValue || 0,
  },
});
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 📈 6. Revenue Trend — revenue aggregated by month, from Bill
//
// Previously this returned each product's name alongside a meaningless
// "totalSales" (summed from the non-existent flat salesHistory array, so
// always 0). A per-product list was never a "trend" anyway — a trend is
// a time series. This now returns revenue grouped by month, going back
// `months` months (default 6), with months that had zero bills still
// present at 0 (not just omitted) so a chart doesn't show gaps.
const getSalesTrend = async (req, res) => {
  try {
    disableCache(res);
    const companyCode = req.user.companyCode;
    const months = Math.min(Number(req.query.months) || 6, 24);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - (months - 1));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const result = await Bill.aggregate([
      { $match: { companyCode, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          billCount: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Fill in every month in the requested range, even ones with zero
    // bills — without this, a chart's x-axis would silently skip months
    // that had no sales instead of showing them as 0.
    const byKey = new Map(result.map((r) => [`${r._id.year}-${r._id.month}`, r]));
    const data = [];
    const cursor = new Date(startDate);
    for (let i = 0; i < months; i++) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth() + 1;
      const found = byKey.get(`${year}-${month}`);
      data.push({
        year,
        month,
        label: cursor.toLocaleString("en-IN", { month: "short", year: "numeric" }),
        revenue: found ? Math.round(found.revenue * 100) / 100 : 0,
        billCount: found ? found.billCount : 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🤖 7. Restock Suggestions — based on average monthly sales velocity
//
// Previously this averaged a non-existent flat array (always 0) and
// suggested restocking to 2x that average — i.e. always suggested 0 for
// every product. This now computes real average monthly units sold over
// the last 90 days (a fixed 3-month window, so "average per month" means
// something stable) and flags products where current stock won't last
// through the next month at that pace.
const getRestockSuggestions = async (req, res) => {
  try {
    disableCache(res);
    const companyCode = req.user.companyCode;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const salesByProduct = await Bill.aggregate([
      { $match: { companyCode, createdAt: { $gte: ninetyDaysAgo } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalQuantity90d: { $sum: "$items.quantity" },
        },
      },
    ]);

    const salesMap = new Map(salesByProduct.map((s) => [String(s._id), s.totalQuantity90d]));

    const products = await ProductModel.find({ companyCode, isActive: true })
      .select("name stock lowStockThreshold")
      .lean();

    const data = products
      .map((p) => {
        const totalQuantity90d = salesMap.get(String(p._id)) || 0;
        const avgMonthlySales = Math.round((totalQuantity90d / 3) * 10) / 10; // 90 days ≈ 3 months

        return {
          _id: p._id,
          name: p.name,
          currentStock: p.stock,
          avgMonthlySales,
          // Suggests covering ~2 months of demand at the current pace,
          // minus what's already on hand — never negative.
          suggestedRestockQty: Math.max(0, Math.ceil(avgMonthlySales * 2 - p.stock)),
        };
      })
      // Only products that actually need attention — current stock won't
      // cover one more month at the recent sales pace.
      .filter((p) => p.avgMonthlySales > 0 && p.currentStock < p.avgMonthlySales)
      .sort((a, b) => b.suggestedRestockQty - a.suggestedRestockQty);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ⚠️ 8. Dead Stock — active products with ZERO sales in the last 90 days
//
// Previously this checked `p.salesHistory?.every(s => s === 0)` — since
// salesHistory never existed, `every()` on undefined returns undefined
// (falsy), so this NEVER flagged a single product as dead stock,
// regardless of how long something sat unsold. This now checks against
// real bills in the last 90 days.
const getDeadStock = async (req, res) => {
  try {
    disableCache(res);
    const companyCode = req.user.companyCode;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Every productId that appears in any bill from the last 90 days —
    // anything NOT in this set, among active products, is dead stock.
    const soldProductIds = await Bill.aggregate([
      { $match: { companyCode, createdAt: { $gte: ninetyDaysAgo } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.productId" } },
    ]);

    const soldIdSet = new Set(soldProductIds.map((s) => String(s._id)));

    const products = await ProductModel.find({ companyCode, isActive: true })
      .select("name category stock price createdAt")
      .lean();

    const dead = products.filter((p) => !soldIdSet.has(String(p._id)));

    res.json({ success: true, count: dead.length, data: dead });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🚀 9. Product Movement — Fast / Medium / Slow, based on units sold in the last 30 days
//
// Previously this divided a non-existent flat array's sum by its length
// (0/0 = NaN for every product), so the `avg > 20` / `avg > 10` checks
// were comparing NaN to a number — always false, so every single product
// was always classified "Slow 🐢" regardless of actual sales. This now
// classifies based on real units sold in the last 30 days. Thresholds
// (>20 fast, >5 medium per spec's general shape, else slow) are a
// reasonable starting point — adjust freely per your catalog's real
// volume once you have a few weeks of real data to look at.
const getProductMovement = async (req, res) => {
  try {
    disableCache(res);
    const companyCode = req.user.companyCode;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesByProduct = await Bill.aggregate([
      { $match: { companyCode, createdAt: { $gte: thirtyDaysAgo } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          unitsSold30d: { $sum: "$items.quantity" },
        },
      },
    ]);

    const salesMap = new Map(salesByProduct.map((s) => [String(s._id), s.unitsSold30d]));

    const products = await ProductModel.find({ companyCode, isActive: true })
      .select("name category stock")
      .lean();

    const data = products.map((p) => {
      const unitsSold30d = salesMap.get(String(p._id)) || 0;
      const movement = unitsSold30d > 20 ? "Fast" : unitsSold30d > 5 ? "Medium" : "Slow";

      return {
        _id: p._id,
        name: p.name,
        category: p.category,
        stock: p.stock,
        unitsSold30d,
        movement,
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 📊 10. Monthly Sales — units sold aggregated by month, from Bill
//
// Previously this summed each product's flat salesHistory array
// position-by-position into a fixed 5-element array — meaningless once
// you consider salesHistory never existed, AND the position-based
// approach assumed every product's array was aligned to the same months,
// which was never guaranteed even in the old (broken) design.
const getMonthlySales = async (req, res) => {
  try {
    disableCache(res);
    const companyCode = req.user.companyCode;
    const months = Math.min(Number(req.query.months) || 6, 24);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - (months - 1));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const result = await Bill.aggregate([
      { $match: { companyCode, createdAt: { $gte: startDate } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          unitsSold: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.lineTotal" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const byKey = new Map(result.map((r) => [`${r._id.year}-${r._id.month}`, r]));
    const data = [];
    const cursor = new Date(startDate);
    for (let i = 0; i < months; i++) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth() + 1;
      const found = byKey.get(`${year}-${month}`);
      data.push({
        year,
        month,
        label: cursor.toLocaleString("en-IN", { month: "short", year: "numeric" }),
        unitsSold: found ? found.unitsSold : 0,
        revenue: found ? Math.round(found.revenue * 100) / 100 : 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🔥 11. Combined Dashboard
const getDashboard = async (req, res) => {
  try {
    disableCache(res);
    const companyCode = req.user.companyCode;

    const stats = await ProductModel.aggregate([
      { $match: { companyCode, isActive: true  } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: "$stock" },
        },
      },
    ]);

    const categoryStats = await ProductModel.aggregate([
      { $match: { companyCode, isActive: true  } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        stats: stats[0] || {},
        categoryStats,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  dashboardController: {
    getDashboardStats,
    getCategoryStats,
    getTopSellingProducts,
    getInventoryValue,
    getSalesTrend,
    getRestockSuggestions,
    getDeadStock,
    getProductMovement,
    getMonthlySales,
    getDashboard,
  },
};