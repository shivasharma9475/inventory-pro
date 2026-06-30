const Activity = require("../models/activity.model");

const getActivities = async (req, res) => {

  try {

    if (!req.user || !req.user.companyCode) {

      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });

    }

    // ✅ Limit protection
    const limit = Math.min(
      Number(req.query.limit) || 20,
      20
    );

    const activities = await Activity.find({
      companyCode: req.user.companyCode,
    })

      // ✅ only required fields
      .select(
        "message role action createdAt"
      )

      // ✅ newest first
      .sort({ createdAt: -1 })

      // ✅ limit
      .limit(limit)

      // ✅ faster response
      .lean();

    res.json({
      success: true,
      data: activities,
    });

  } catch (err) {

    console.error(
      "GET ACTIVITIES ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });

  }
};

// GET /api/activities/history — paginated history (admin only, route-protected)
// Note: the Activity collection has a 7-day TTL index (see activity.model.js),
// so "history" is bounded to the last 7 days regardless of page/limit. If you
// need longer retention, that TTL needs to be revisited deliberately — it's a
// data-retention/storage decision, not something to change silently here.
const getActivityHistory = async (req, res) => {

  try {

    if (!req.user || !req.user.companyCode) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const { from, to, userId } = req.query;

    const filter = { companyCode: req.user.companyCode };

    if (userId) {
      filter.userId = userId;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        if (!Number.isNaN(fromDate.getTime())) filter.createdAt.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = toDate;
        }
      }
      // Both invalid -> remove the empty object so it doesn't act as an
      // unintended "createdAt exists" filter.
      if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
    }

    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .select("message role action createdAt userId userName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Activity.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: activities,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });

  } catch (err) {

    console.error("GET ACTIVITY HISTORY ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });

  }
};

module.exports = {
  activityController: {
    getActivities,
    getActivityHistory,
  },
};