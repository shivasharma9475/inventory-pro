// server/scripts/seed-demo-data.js
//
// One-time seeding script: generates realistic Products, Bills, and
// Activity logs for a given companyCode, using REAL existing User/Product
// IDs from your database (not made-up ObjectIds) so every reference stays
// valid — Bill.createdBy points at a real User, Bill.items[].productId
// points at a real Product, Activity.userId points at a real User.
//
// Why this has to be a script and not raw insertMany() queries:
//   - Bill requires createdBy (a real User _id) and items[].productId (a
//     real Product _id) — there's no way to know these in advance without
//     querying your actual database first.
//   - Product has unique sparse indexes on sku/barcode — generating random
//     values without checking for collisions risks insert failures partway
//     through a batch.
//   - Activity has a 7-day TTL (createdAt: { expires: "7d" }) — anything
//     dated further back than 7 days will be auto-deleted by MongoDB
//     within about a minute of insertion. This script deliberately keeps
//     all generated activity within the last 6 days so it's actually
//     visible after seeding, not silently wiped.
//
// Usage:
//   cd server
//   node scripts/seed-demo-data.js --company=srmu
//   node scripts/seed-demo-data.js --company=srmu --products=300 --bills=250 --activities=150
//
// Safe to re-run — it only ADDS new documents, never deletes or modifies
// existing ones. Run it as many times as you want more data.

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");

const User = require("../src/models/user.model");
const Product = require("../src/models/product.model");
const Bill = require("../src/models/bill.model");
const Activity = require("../src/models/activity.model");
const buildActivity = require("../src/utils/activityMessages");

// ── CLI args ─────────────────────────────────────────────────────────────────
function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const COMPANY_CODE = getArg("company", "").toLowerCase().trim();
const PRODUCT_COUNT = Number(getArg("products", 300));
const BILL_COUNT = Number(getArg("bills", 250));
const ACTIVITY_COUNT = Number(getArg("activities", 150));

if (!COMPANY_CODE) {
  console.error('Missing required --company=yourcompanycode argument, e.g.:\n  node scripts/seed-demo-data.js --company=srmu');
  process.exit(1);
}

// ── Sample data pools (kept dependency-free — no faker install needed) ──────
const CATEGORIES = ["Food", "Electronics", "Clothing", "Other"];

const PRODUCT_NAMES_BY_CATEGORY = {
  Food: ["Basmati Rice 5kg", "Sunflower Oil 1L", "Wheat Flour 10kg", "Toor Dal 1kg", "Sugar 1kg", "Tea Powder 500g", "Coffee Powder 200g", "Salt 1kg", "Maggi Noodles", "Biscuit Pack", "Cooking Oil 5L", "Besan 1kg", "Poha 500g", "Rava 1kg", "Honey 500g"],
  Electronics: ["USB Cable Type-C", "Wireless Mouse", "Bluetooth Earphones", "Power Bank 10000mAh", "LED Bulb 9W", "Extension Board", "Mobile Charger", "HDMI Cable", "Keyboard Wired", "Webcam HD", "Pen Drive 32GB", "SD Card 64GB", "Laptop Stand", "Phone Case", "Screen Protector"],
  Clothing: ["Cotton T-Shirt", "Formal Shirt", "Denim Jeans", "Kurta Set", "Track Pants", "Hoodie", "Saree", "School Uniform", "Socks Pack", "Cap", "Jacket", "Night Suit", "Innerwear Pack", "Scarf", "Belt"],
  Other: ["Notebook A4", "Ball Pen Pack", "Plastic Bucket", "Steel Bottle", "Umbrella", "Broom", "Detergent 1kg", "Toothpaste", "Soap Bar", "Shampoo Bottle", "Hand Sanitizer", "Face Mask Pack", "Torch Light", "Padlock", "Stapler"],
};

const SELLERS = ["Sharma Traders", "Gupta Wholesale", "City Distributors", "Metro Supplies", "Krishna Enterprises", "Unknown Supplier"];

const CUSTOMER_FIRST_NAMES = ["Rahul", "Priya", "Amit", "Sneha", "Vikram", "Anjali", "Rohan", "Kavita", "Suresh", "Neha", "Arjun", "Pooja", "Manish", "Divya", "Sanjay"];
const CUSTOMER_LAST_NAMES = ["Sharma", "Verma", "Gupta", "Singh", "Yadav", "Mishra", "Patel", "Reddy", "Iyer", "Nair"];

const PAYMENT_METHODS = ["cash", "upi", "card", "bank_transfer"];
const PAYMENT_STATUSES = ["paid", "paid", "paid", "pending", "failed"]; // weighted toward "paid"

// ── Helpers ──────────────────────────────────────────────────────────────────
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomPhone() {
  return `9${randomInt(100000000, 999999999)}`;
}

// Random date within the last N days (used for Bills — Bill has no TTL, so
// a longer, more realistic spread is fine there).
function randomDateWithinDays(daysAgo) {
  const now = Date.now();
  const past = now - daysAgo * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past));
}

async function run() {
  await connectDB();

  // ── Resolve real users for this company ─────────────────────────────────
  const companyUsers = await User.find({ companyCode: COMPANY_CODE })
    .select("_id name email role companyCode companyName")
    .lean();

  if (companyUsers.length === 0) {
    console.error(`No users found for companyCode="${COMPANY_CODE}". Nothing to seed against — create at least one admin account for this company first.`);
    await mongoose.connection.close();
    return;
  }

  const admin = companyUsers.find((u) => u.role === "admin") || companyUsers[0];
  console.log(`Found ${companyUsers.length} user(s) for company "${COMPANY_CODE}". Using "${admin.name || admin.email}" as the primary actor.`);

  // ── 1. Seed Products ─────────────────────────────────────────────────────
  console.log(`\nSeeding ${PRODUCT_COUNT} products...`);

  // Avoid SKU/barcode collisions with whatever already exists — sku/barcode
  // both have unique sparse indexes, so a duplicate would abort that one
  // insert (insertMany with ordered:false continues past single failures,
  // but it's cleaner to just generate values that can't collide).
  const existingSkuCount = await Product.countDocuments({ companyCode: COMPANY_CODE, sku: { $exists: true, $ne: null } });
  let skuCounter = existingSkuCount + 1;

  const productDocs = [];
  for (let i = 0; i < PRODUCT_COUNT; i++) {
    const category = randomItem(CATEGORIES);
    const namePool = PRODUCT_NAMES_BY_CATEGORY[category];
    const baseName = randomItem(namePool);
    // Append a short suffix so repeated picks from the same small pool don't
    // all collide on "name" (Product has no unique index on name, but
    // distinct names make the seeded catalog look more realistic).
    const name = `${baseName} ${randomInt(1, 999)}`;

    const price = randomFloat(20, 5000, 2);
    const costPrice = Number((price * randomFloat(0.5, 0.85)).toFixed(2));
    const stock = randomInt(0, 200);

    productDocs.push({
      name,
      sku: `SKU-${COMPANY_CODE.toUpperCase()}-${String(skuCounter++).padStart(5, "0")}`,
      barcode: `${randomInt(100000000000, 999999999999)}`, // 12-digit, EAN/UPC-like
      category,
      price,
      costPrice,
      stock,
      lowStockThreshold: randomItem([5, 10, 15, 20]),
      unit: randomItem(["pcs", "kg", "ltr", "box"]),
      description: "",
      seller: randomItem(SELLERS),
      discount: randomItem([0, 0, 0, 5, 10, 15, 20]), // mostly no discount
      isActive: Math.random() > 0.05, // ~5% soft-deleted, for testing the "deleted" tab
      companyCode: COMPANY_CODE,
    });
  }

  const insertedProducts = await Product.insertMany(productDocs, { ordered: false });
  console.log(`Inserted ${insertedProducts.length} products.`);

  const activeProducts = insertedProducts.filter((p) => p.isActive);

  // ── 2. Seed Bills ────────────────────────────────────────────────────────
  console.log(`\nSeeding ${BILL_COUNT} bills...`);

  if (activeProducts.length === 0) {
    console.warn("No active products available to build bill line items from — skipping bill seeding.");
  } else {
    const billDocs = [];

    for (let i = 0; i < BILL_COUNT; i++) {
      const itemCount = randomInt(1, 5);
      const chosenProducts = Array.from({ length: itemCount }, () => randomItem(activeProducts));

      const items = chosenProducts.map((p) => {
        const quantity = randomInt(1, 4);
        const discount = randomItem([0, 0, 5, 10]);
        const lineTotal = Number((p.price * quantity * (1 - discount / 100)).toFixed(2));
        return {
          productId: p._id,
          name: p.name,
          category: p.category,
          price: p.price,
          discount,
          quantity,
          lineTotal,
        };
      });

      const totalAmount = Number(items.reduce((sum, it) => sum + it.lineTotal, 0).toFixed(2));
      const method = randomItem(PAYMENT_METHODS);
      const status = randomItem(PAYMENT_STATUSES);
      const createdBy = randomItem(companyUsers);
      const createdAt = randomDateWithinDays(90); // bills have no TTL, fine to spread wider

      billDocs.push({
        createdBy: createdBy._id,
        companyCode: COMPANY_CODE,
        buyer: {
          name: `${randomItem(CUSTOMER_FIRST_NAMES)} ${randomItem(CUSTOMER_LAST_NAMES)}`,
          phone: randomPhone(),
          email: "",
          gst: "",
          address: "",
          city: "",
          state: "",
          pincode: "",
        },
        items,
        payment: {
          method,
          status,
          paidAt: status === "paid" ? createdAt : null,
        },
        totalAmount,
        taxRate: 0,
        taxAmount: 0,
        notes: "",
        createdAt,
        updatedAt: createdAt,
      });
    }

    // billId is auto-generated in a pre-validate hook based on
    // countDocuments() at save time — insertMany() skips validate/save
    // middleware, so we assign billId manually here instead.
    const existingBillCount = await Bill.countDocuments();
    billDocs.forEach((doc, idx) => {
      const dateStr = doc.createdAt.toISOString().slice(0, 10).replace(/-/g, "");
      doc.billId = `BILL-${dateStr}-${String(existingBillCount + idx + 1).padStart(4, "0")}`;
    });

    const insertedBills = await Bill.insertMany(billDocs, { ordered: false });
    console.log(`Inserted ${insertedBills.length} bills.`);
  }

  // ── 3. Seed Activity logs ────────────────────────────────────────────────
  // IMPORTANT: Activity has a 7-day TTL (createdAt: { expires: "7d" }).
  // Anything dated further back than 7 days gets auto-deleted by MongoDB
  // within ~60 seconds of insertion. Keeping this within the last 6 days
  // (not the full 7) leaves a small safety margin.
  console.log(`\nSeeding ${ACTIVITY_COUNT} activity log entries (within the last 6 days, due to the 7-day TTL)...`);

  const ACTIVITY_ACTIONS = [
    { action: "ADD_PRODUCT", entity: "PRODUCT" },
    { action: "UPDATE_PRODUCT", entity: "PRODUCT" },
    { action: "UPDATE_STOCK", entity: "PRODUCT" },
    { action: "DELETE_PRODUCT", entity: "PRODUCT" },
    { action: "CREATE_BILL", entity: "BILL" },
    { action: "LOGIN", entity: "AUTH" },
  ];

  const activityDocs = [];
  for (let i = 0; i < ACTIVITY_COUNT; i++) {
    const actor = randomItem(companyUsers);
    const { action, entity } = randomItem(ACTIVITY_ACTIONS);
    const relatedProduct = activeProducts.length > 0 ? randomItem(activeProducts) : null;

    const entityData =
      entity === "PRODUCT" && relatedProduct
        ? { name: relatedProduct.name, oldStock: randomInt(0, 50), newStock: randomInt(0, 50) }
        : entity === "BILL"
        ? { billId: `BILL-${randomInt(1000, 9999)}`, customer: `${randomItem(CUSTOMER_FIRST_NAMES)} ${randomItem(CUSTOMER_LAST_NAMES)}`, totalAmount: randomInt(100, 5000) }
        : {};

    const built = buildActivity({ user: actor, action, entity, entityData });
    const createdAt = randomDateWithinDays(6);

    activityDocs.push({
      userId: actor._id,
      userName: actor.name || actor.email || "Unknown",
      role: actor.role,
      companyCode: COMPANY_CODE,
      action: built.action,
      entity: built.entity,
      entityId: relatedProduct?._id || null,
      message: built.message,
      details: built.details,
      ipAddress: "",
      userAgent: "",
      createdAt,
    });
  }

  const insertedActivities = await Activity.insertMany(activityDocs, { ordered: false });
  console.log(`Inserted ${insertedActivities.length} activity log entries.`);

  console.log("\nDone seeding.");
  console.log(`Summary for companyCode="${COMPANY_CODE}":`);
  console.log(`  Products:   ${insertedProducts.length}`);
  console.log(`  Bills:      ${BILL_COUNT > 0 && activeProducts.length > 0 ? BILL_COUNT : 0}`);
  console.log(`  Activities: ${insertedActivities.length} (will expire ~7 days after their individual createdAt dates)`);

  await mongoose.connection.close();
}

run().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});