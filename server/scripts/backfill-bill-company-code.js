// server/scripts/backfill-bill-company-code.js
//
// One-time migration: backfills `companyCode` on any Bill documents created
// before that field existed on the schema (see models/bill.model.js).
//
// Without this, bills created before the export feature was added would have
// companyCode: "" and would be invisible to every company-scoped export and
// report, even though they're real, valid bills for that company.
//
// Usage:
//   cd server
//   node scripts/backfill-bill-company-code.js
//
// Safe to run multiple times — it only updates bills where companyCode is
// missing or empty, and skips anything already backfilled.

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const Bill = require("../src/models/bill.model");
const User = require("../src/models/user.model");

async function run() {
  await connectDB();

  const staleBills = await Bill.find({
    $or: [{ companyCode: { $exists: false } }, { companyCode: "" }],
  })
    .select("_id createdBy")
    .lean();

  console.log(`Found ${staleBills.length} bill(s) missing companyCode.`);

  if (staleBills.length === 0) {
    console.log("Nothing to backfill. Done.");
    await mongoose.connection.close();
    return;
  }

  // Batch-resolve each bill's creator to their companyCode, then group bills
  // by companyCode so we can do one bulk update per company instead of one
  // write per bill.
  const creatorIds = [...new Set(staleBills.map((b) => String(b.createdBy)))];
  const creators = await User.find({ _id: { $in: creatorIds } })
    .select("_id companyCode")
    .lean();

  const companyCodeByUserId = new Map(
    creators.map((u) => [String(u._id), u.companyCode])
  );

  const billIdsByCompanyCode = new Map();
  let orphaned = 0;

  for (const bill of staleBills) {
    const companyCode = companyCodeByUserId.get(String(bill.createdBy));
    if (!companyCode) {
      // The user who created this bill no longer exists (deleted account) —
      // we genuinely can't know which company this bill belonged to. Leave
      // it as-is rather than guessing; log it so it can be reviewed manually.
      orphaned += 1;
      continue;
    }
    if (!billIdsByCompanyCode.has(companyCode)) {
      billIdsByCompanyCode.set(companyCode, []);
    }
    billIdsByCompanyCode.get(companyCode).push(bill._id);
  }

  let updated = 0;
  for (const [companyCode, billIds] of billIdsByCompanyCode.entries()) {
    const result = await Bill.updateMany(
      { _id: { $in: billIds } },
      { $set: { companyCode } }
    );
    updated += result.modifiedCount;
    console.log(`  companyCode="${companyCode}": updated ${result.modifiedCount} bill(s)`);
  }

  console.log(`\nDone. Updated ${updated} bill(s).`);
  if (orphaned > 0) {
    console.warn(
      `${orphaned} bill(s) could not be backfilled — their creator's user account no longer exists. Review these manually if needed.`
    );
  }

  await mongoose.connection.close();
}

run().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});