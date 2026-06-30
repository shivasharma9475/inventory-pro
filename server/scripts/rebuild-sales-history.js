// server/scripts/rebuild-sales-history.js
//
// Rebuilds Product.salesHistory from Bill records (the real source of
// truth) — use this:
//   1. Once, right after deploying the salesHistory schema + billing-flow
//      changes, to backfill history for every bill that existed BEFORE
//      those changes (those bills never got a salesHistory entry recorded
//      live, since the old code didn't write one at all).
//   2. Any time you suspect salesHistory has drifted from Bill (e.g. after
//      a manual DB edit, a failed migration, or restoring from a backup).
//
// Safe to run multiple times: it uses each bill's billId as a dedupe key
// (same approach as the live billing flow in bill.controller.js) and only
// adds entries for (product, bill) pairs that don't already have one — it
// never removes or duplicates existing entries.
//
// What it does NOT do: touch Product.stock. Stock is a live, current-state
// number; rebuilding sales history from historical bills should never
// retroactively change how much is currently on the shelf. If stock looks
// wrong, that's a separate problem from sales history being wrong.
//
// Usage:
//   cd server
//   node scripts/rebuild-sales-history.js                  # all companies
//   node scripts/rebuild-sales-history.js --company=srmu   # one company only
//   node scripts/rebuild-sales-history.js --dry-run         # report only, no writes

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");

const Bill = require("../src/models/bill.model");
const Product = require("../src/models/product.model");

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const COMPANY_FILTER = getArg("company", null);
const DRY_RUN = process.argv.includes("--dry-run");

// How many bills to pull from MongoDB per batch. Keeps memory bounded
// instead of loading the entire Bill collection into a JS array at once —
// matters once a company has tens of thousands of bills.
const BATCH_SIZE = 500;

async function run() {
  await connectDB();

  const billFilter = COMPANY_FILTER ? { companyCode: COMPANY_FILTER.toLowerCase().trim() } : {};

  const totalBills = await Bill.countDocuments(billFilter);
  console.log(`Found ${totalBills} bill(s)${COMPANY_FILTER ? ` for companyCode="${COMPANY_FILTER}"` : " across all companies"}.`);

  if (totalBills === 0) {
    console.log("Nothing to rebuild. Done.");
    await mongoose.connection.close();
    return;
  }

  if (DRY_RUN) {
    console.log("--dry-run: no writes will be made. Reporting what WOULD happen.\n");
  }

  let processedBills = 0;
  let totalEntriesAdded = 0;
  let totalEntriesSkipped = 0; // already present — this is what makes re-runs safe
  let totalMissingProducts = 0;
  const errors = [];

  // Cursor-based iteration — never holds more than one batch of bills in
  // memory at a time, unlike the old dashboard code this migration exists
  // to fix.
  const cursor = Bill.find(billFilter).select("billId items createdAt companyCode").sort({ createdAt: 1 }).lean().cursor();

  for await (const bill of cursor) {
    for (const item of bill.items || []) {
      if (!item.productId) continue;

      try {
        // Dedupe check — same mechanism as the live billing flow (see
        // bill.controller.js's applyStockAndSalesHistory). This is what
        // makes re-running this script safe: a bill already reflected in
        // a product's salesHistory is skipped, not re-added.
        const alreadyRecorded = await Product.exists({
          _id: item.productId,
          "salesHistory.billId": bill.billId,
        });

        if (alreadyRecorded) {
          totalEntriesSkipped += 1;
          continue;
        }

        const entry = {
          date: bill.createdAt,
          quantity: item.quantity,
          revenue: item.lineTotal,
          billId: bill.billId,
        };

        if (DRY_RUN) {
          totalEntriesAdded += 1;
          continue;
        }

        const result = await Product.updateOne(
          { _id: item.productId },
          { $push: { salesHistory: entry } }
        );

        if (result.matchedCount === 0) {
          // Product was deleted at some point after this bill was created —
          // the bill itself is still valid history, but there's no product
          // document left to attach a salesHistory entry to. Not fixable
          // here; just count it so it's visible in the summary.
          totalMissingProducts += 1;
        } else {
          totalEntriesAdded += 1;
        }
      } catch (err) {
        errors.push({ billId: bill.billId, productId: item.productId, error: err.message });
      }
    }

    processedBills += 1;
    if (processedBills % BATCH_SIZE === 0) {
      console.log(`  ...processed ${processedBills}/${totalBills} bills`);
    }
  }

  console.log("\nDone.");
  console.log(`  Bills processed:        ${processedBills}`);
  console.log(`  salesHistory entries added:   ${totalEntriesAdded}${DRY_RUN ? " (dry-run, not written)" : ""}`);
  console.log(`  Already present (skipped):    ${totalEntriesSkipped}`);
  if (totalMissingProducts > 0) {
    console.log(`  Skipped — product no longer exists: ${totalMissingProducts}`);
  }
  if (errors.length > 0) {
    console.warn(`\n${errors.length} error(s) occurred:`);
    errors.slice(0, 10).forEach((e) => console.warn(`  - bill ${e.billId}, product ${e.productId}: ${e.error}`));
    if (errors.length > 10) console.warn(`  ...and ${errors.length - 10} more`);
  }

  await mongoose.connection.close();
}

run().catch((err) => {
  console.error("Rebuild failed:", err);
  process.exit(1);
});
