const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const staffRoutes = require("./routes/staff.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const companySettingsRoutes = require("./routes/companySettings.routes");
const paymentRoutes = require("./routes/payment.routes");
const billingRoutes = require("./routes/billing.routes");
const activityRoutes = require("./routes/activity.routes");
const exportRoutes = require("./routes/export.routes");
const chatbotRoutes = require("./routes/chatbot.routes");

const app = express();

// Security
app.use(helmet());

console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("CLIENT_URL:", process.env.CLIENT_URL);

// CORS
const allowedOrigins = process.env.NODE_ENV === "production"
  ? [process.env.CLIENT_URL]
  : [
      "http://localhost:5173",
      "http://localhost:5174",
    ];

console.log("Allowed Origins:", allowedOrigins);

app.use(
  cors({
    origin(origin, callback) {
      console.log("Incoming Origin:", origin);

      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked Origin:", origin);

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);


// Middlewares
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    skip: (req) => req.method === "OPTIONS",
  })
);

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    skip: (req) => req.method === "OPTIONS",
  })
);

// Stripe webhook
app.use(
  "/api/payments/stripe/webhook",
  express.raw({ type: "application/json" }),
  (req, _res, next) => {
    req.rawBody = req.body;
    next();
  },
  paymentRoutes
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/bills", billingRoutes);
app.use("/api/company-settings", companySettingsRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/chat", chatbotRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;