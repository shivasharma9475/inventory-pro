/**
 * contextBuilder.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds the inventory context injected into Gemini prompts.
 *
 * Security model:
 *   • Data is fetched from MongoDB with role-scoped queries.
 *   • Sensitive fields (email, phone, salary, payment credentials) are
 *     NEVER selected from the DB for staff roles.
 *   • Context is built from two separate code paths: buildAdminContext()
 *     and buildStaffContext() — not a single function that selectively hides.
 *   • The final "contextSnapshot" stored in ChatAudit never contains PII.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use strict";

const ProductModel  = require("../models/product.model");
const BillModel     = require("../models/bill.model");
const ActivityModel = require("../models/activity.model");
const UserModel     = require("../models/user.model");

// ── Utility helpers ───────────────────────────────────────────────────────────

function inr(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekStart() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Shared product queries (used by both roles) ───────────────────────────────

async function fetchProducts(companyCode) {
  return ProductModel.find({ companyCode, isActive: true })
    .select("name category sku barcode price costPrice stock lowStockThreshold unit discount seller description")
    .lean();
}

function deriveProductStats(products) {
  const outOfStock   = products.filter(p => p.stock === 0);
  const lowStock     = products.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold);
  const healthy      = products.filter(p => p.stock > p.lowStockThreshold);
  const totalValue   = products.reduce((s, p) => s + p.price * p.stock, 0);
  const costValue    = products.reduce((s, p) => s + p.costPrice * p.stock, 0);

  const categoryMap  = {};
  products.forEach(p => {
    if (!categoryMap[p.category]) categoryMap[p.category] = { count: 0, stock: 0, value: 0 };
    categoryMap[p.category].count++;
    categoryMap[p.category].stock += p.stock;
    categoryMap[p.category].value += p.price * p.stock;
  });

  return { outOfStock, lowStock, healthy, totalValue, costValue, categoryMap };
}

// ── Product context text (shared) ─────────────────────────────────────────────

function buildProductSection(products, stats) {
  const { outOfStock, lowStock, categoryMap, totalValue } = stats;

  return `
## PRODUCT INVENTORY

### Overview
- Total active products: ${products.length}
- Out of stock: ${outOfStock.length}
- Low stock (at or below threshold): ${lowStock.length}
- Healthy stock: ${products.length - outOfStock.length - lowStock.length}
- Total inventory value (retail): ${inr(totalValue)}

### Category Breakdown
${Object.entries(categoryMap)
  .sort((a, b) => b[1].stock - a[1].stock)
  .map(([cat, d]) => `- **${cat}**: ${d.count} products | ${d.stock} total units | ${inr(d.value)} value`)
  .join("\n")}

### Out of Stock Products
${outOfStock.length === 0
  ? "✅ No products are out of stock."
  : outOfStock.map(p =>
      `- ${p.name} (${p.category}) | SKU: ${p.sku || "N/A"} | Price: ${inr(p.price)} | Seller: ${p.seller || "Unknown"}`
    ).join("\n")}

### Low Stock Products (need restocking)
${lowStock.length === 0
  ? "✅ No products are currently low on stock."
  : lowStock.map(p =>
      `- ${p.name}: **${p.stock} units left** (threshold: ${p.lowStockThreshold}) | Category: ${p.category} | Price: ${inr(p.price)}`
    ).join("\n")}

### All Products (sorted by stock)
${products
  .sort((a, b) => b.stock - a.stock)
  .map(p =>
    `- **${p.name}** | Stock: ${p.stock} ${p.unit} | Category: ${p.category} | Price: ${inr(p.price)} | Cost: ${inr(p.costPrice)} | Discount: ${p.discount}% | SKU: ${p.sku || "N/A"} | Seller: ${p.seller || "N/A"}`
  ).join("\n")}
`.trim();
}

// ── Billing context (admin gets full PII; staff gets sanitized summary) ────────

async function fetchBillingData(companyCode, { maxBills, includeFullBuyerInfo }) {
  const [todayBills, weekBills, recentBills] = await Promise.all([
    BillModel.find({ companyCode, createdAt: { $gte: todayStart() } })
      .select("totalAmount taxAmount items payment.method payment.status createdAt")
      .lean(),

    BillModel.find({ companyCode, createdAt: { $gte: weekStart() } })
      .select("totalAmount items payment.method payment.status createdAt")
      .lean(),

    BillModel.find({ companyCode })
      .sort({ createdAt: -1 })
      .limit(maxBills)
      // Admin gets buyer name; staff gets only totals
      .select(includeFullBuyerInfo
        ? "billId totalAmount taxAmount items payment buyer.name buyer.city createdAt"
        : "totalAmount items payment.status payment.method createdAt")
      .lean(),
  ]);

  return { todayBills, weekBills, recentBills };
}

function buildBillingSection(billing, isAdmin) {
  const { todayBills, weekBills, recentBills } = billing;

  const todayRevenue  = todayBills.reduce((s, b) => s + b.totalAmount, 0);
  const weekRevenue   = weekBills.reduce((s, b) => s + b.totalAmount, 0);
  const recentRevenue = recentBills.reduce((s, b) => s + b.totalAmount, 0);

  // Top selling products from recent bills
  const productFreq = {};
  recentBills.forEach(b => {
    b.items.forEach(item => {
      productFreq[item.name] = (productFreq[item.name] || 0) + item.quantity;
    });
  });
  const topSelling = Object.entries(productFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, qty]) => `- **${name}**: ${qty} units sold`);

  // Payment method breakdown
  const methodCount = {};
  recentBills.forEach(b => {
    const m = b.payment?.method || "unknown";
    methodCount[m] = (methodCount[m] || 0) + 1;
  });

  let section = `
## BILLING & SALES DATA

### Today's Sales (${fmtDate(new Date())})
- Transactions: ${todayBills.length}
- Revenue: ${inr(todayRevenue)}

### This Week's Sales
- Transactions: ${weekBills.length}
- Revenue: ${inr(weekRevenue)}
`;

  if (isAdmin) {
    section += `
### Revenue Summary (last ${recentBills.length} bills)
- Total collected: ${inr(recentRevenue)}
- Average bill: ${inr(recentBills.length ? recentRevenue / recentBills.length : 0)}

### Payment Methods Used
${Object.entries(methodCount).map(([m, c]) => `- ${m}: ${c} bills`).join("\n") || "- No data"}

### Recent Bills
${recentBills.slice(0, 15).map(b =>
  `- ${fmtDate(b.createdAt)} | ${b.buyer?.name || "Unknown"} (${b.buyer?.city || ""}) | ${inr(b.totalAmount)} | ${b.payment?.method || "?"} | ${b.payment?.status || "?"}`
).join("\n")}
`;
  } else {
    // Staff: summary only, no buyer PII
    section += `
### Sales Summary (recent ${recentBills.length} bills)
- Total transactions: ${recentBills.length}
- Payment methods: ${Object.keys(methodCount).join(", ") || "N/A"}
`;
  }

  section += `
### Top Selling Products
${topSelling.length ? topSelling.join("\n") : "- No sales data yet."}
`;

  return section.trim();
}

// ── Admin-only: staff roster ──────────────────────────────────────────────────

async function fetchStaffData(companyCode) {
  // NOTE: We only select name + designation + createdAt. No email, phone, password.
  const staff = await UserModel.find({ companyCode, role: "staff", isActive: true })
    .select("name designation createdAt isActive")
    .lean();

  return staff;
}

function buildStaffSection(staffList) {
  if (!staffList.length) return "\n## STAFF\nNo staff members found.";

  return `
## STAFF MEMBERS (Admin View)
Total staff: ${staffList.length}

${staffList.map(s =>
  `- **${s.name || "Unnamed"}** | ${s.designation || "No designation"} | Joined: ${fmtDate(s.createdAt)}`
).join("\n")}
`.trim();
}

// ── Activities ────────────────────────────────────────────────────────────────

async function fetchActivities(companyCode, { limit, userId, ownOnly }) {
  const query = { companyCode };
  if (ownOnly && userId) query.userId = userId; // staff sees only their own

  return ActivityModel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("userName action entity message createdAt role")
    .lean();
}

function buildActivitySection(activities, isAdmin) {
  if (!activities.length) return "\n## RECENT ACTIVITY\nNo recent activity recorded.";

  return `
## RECENT ACTIVITY ${isAdmin ? "(Company-wide)" : "(Your activity)"}
${activities.map(a =>
  `- [${fmtDate(a.createdAt)}] ${isAdmin ? `**${a.userName}** (${a.role}) → ` : ""}${a.action} ${a.entity}: ${a.message}`
).join("\n")}
`.trim();
}

// ── Admin dashboard stats ─────────────────────────────────────────────────────

async function fetchDashboardStats(companyCode) {
  const [totalUsers, adminCount, staffCount] = await Promise.all([
    UserModel.countDocuments({ companyCode, isActive: true }),
    UserModel.countDocuments({ companyCode, role: "admin", isActive: true }),
    UserModel.countDocuments({ companyCode, role: "staff", isActive: true }),
  ]);
  return { totalUsers, adminCount, staffCount };
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build the full context for an ADMIN user.
 * Includes: products, billing (full), staff roster, company-wide activity, stats.
 */
async function buildAdminContext(companyCode) {
  const [products, billing, staffList, activities, dashStats] = await Promise.all([
    fetchProducts(companyCode),
    fetchBillingData(companyCode, { maxBills: 100, includeFullBuyerInfo: true }),
    fetchStaffData(companyCode),
    fetchActivities(companyCode, { limit: 50, ownOnly: false }),
    fetchDashboardStats(companyCode),
  ]);

  const stats = deriveProductStats(products);

  const contextSnapshot = {
    totalProducts:       products.length,
    outOfStockCount:     stats.outOfStock.length,
    lowStockCount:       stats.lowStock.length,
    totalInventoryValue: stats.totalValue,
    todaySales:          billing.todayBills.length,
    weekSales:           billing.weekBills.length,
    staffCount:          staffList.length,
    totalUsers:          dashStats.totalUsers,
  };

  const contextText = [
    buildProductSection(products, stats),
    buildBillingSection(billing, true),
    buildStaffSection(staffList),
    buildActivitySection(activities, true),
    `\n## COMPANY STATS\n- Total users (admin + staff): ${dashStats.totalUsers}\n- Admins: ${dashStats.adminCount}\n- Staff: ${dashStats.staffCount}`,
  ].join("\n\n---\n\n");

  return { contextText, contextSnapshot };
}

/**
 * Build the restricted context for a STAFF user.
 * Includes: products, billing summary (no PII), own activity only.
 * EXCLUDES: staff list, emails, full revenue analytics, audit log, settings.
 */
async function buildStaffContext(companyCode, userId) {
  const [products, billing, activities] = await Promise.all([
    fetchProducts(companyCode),
    fetchBillingData(companyCode, { maxBills: 10, includeFullBuyerInfo: false }),
    fetchActivities(companyCode, { limit: 20, userId, ownOnly: true }),
  ]);

  const stats = deriveProductStats(products);

  const contextSnapshot = {
    totalProducts:       products.length,
    outOfStockCount:     stats.outOfStock.length,
    lowStockCount:       stats.lowStock.length,
    totalInventoryValue: stats.totalValue,
    todaySales:          billing.todayBills.length,
  };

  const contextText = [
    buildProductSection(products, stats),
    buildBillingSection(billing, false),
    buildActivitySection(activities, false),
  ].join("\n\n---\n\n");

  return { contextText, contextSnapshot };
}

/**
 * Master entry point — pick the right builder based on role.
 */
async function buildContext({ companyCode, role, userId }) {
  if (role === "admin") {
    return buildAdminContext(companyCode);
  }
  return buildStaffContext(companyCode, userId);
}

module.exports = { buildContext };
