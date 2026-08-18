# 📦 Inventory Pro

<p align="center">
  <b>Production-Ready Multi-Tenant Inventory Management SaaS</b>
</p>

<p align="center">
  A full-stack MERN inventory management platform with authentication, role-based access control, real-time inventory updates, billing, analytics, barcode scanning, payments, exports, activity tracking, and an AI-powered inventory assistant.
</p>

<p align="center">

![MERN](https://img.shields.io/badge/Stack-MERN-61DAFB?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-010101?style=for-the-badge&logo=socket.io)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel)

</p>

---

## 🌐 Live Demo

### Frontend
https://inventory-pro-cyan.vercel.app

### Repository
https://github.com/shivasharma9475/inventory-pro

---

# 📌 Overview

**Inventory Pro** is a full-stack inventory management and business operations platform built using the **MERN stack**.

The application is designed for businesses that need to manage:

- Products
- Inventory
- Staff
- Customers
- Billing
- Payments
- Sales
- Analytics
- Company settings
- Activity logs
- Data exports
- Barcode scanning
- Real-time inventory updates
- AI-assisted inventory operations

The system follows a **multi-tenant SaaS architecture**, allowing different companies to operate independently while sharing the same application infrastructure.

---

# ✨ Key Features

## 📊 Dashboard

The dashboard provides a centralized overview of business performance.

### Includes

- Total products
- Low-stock products
- Inventory value
- Sales analytics
- Top-selling products
- Product movement
- Monthly sales
- Sales trends
- Restock suggestions
- Dead-stock analysis
- Category statistics

Interactive charts are implemented using **Recharts**.

---

# 📦 Product & Inventory Management

Inventory Pro provides complete product lifecycle management.

### Product Features

- Add products
- Edit products
- Delete products
- Restore deleted products
- Update stock quantity
- SKU management
- Barcode management
- Category management
- Seller information
- Product pricing
- Cost price
- Discount
- Units
- Product descriptions
- Low-stock thresholds

### Inventory Views

The system supports:

- Active products
- Deleted products
- Low-stock products
- Search
- Category filtering
- Sorting
- Pagination

---

# 📷 Barcode Scanner

Inventory Pro includes barcode scanning using:

**HTML5 QR Code**

### Barcode Workflow

Users can:

1. Scan a barcode
2. Automatically populate the product barcode field
3. Add a new product
4. Detect an existing product
5. Edit an existing product
6. Quickly restock an existing product

This reduces manual product entry and improves inventory workflows.

---

# 🧾 Billing & POS

The billing system allows businesses to create and manage sales transactions.

### Features

- Product-based billing
- Invoice generation
- Billing management
- Customer information
- Quantity management
- Discounts
- Payment tracking
- Invoice export

The backend provides dedicated billing APIs for managing transactions.

---

# 💳 Payment Integration

Inventory Pro supports payment processing integrations.

### Supported Technologies

- Stripe
- Razorpay

Payment routes are integrated into the backend and protected through the application's authentication architecture.

Stripe webhook handling is implemented using raw request bodies to correctly validate incoming webhook events.

---

# 👥 Staff Management

The application provides role-based employee management.

### Features

- Add staff
- Manage staff
- Role-based permissions
- Company-based access
- Staff activity tracking

Roles are enforced on both the frontend and backend.

---

# 🔐 Authentication & Authorization

Inventory Pro uses secure authentication with:

- JWT
- HTTP cookies
- Password hashing
- Role-based access control
- Protected routes
- Company-level authorization

Authentication tokens are also used for Socket.IO connections.

---

# 🏢 Multi-Tenant Architecture

Inventory Pro is designed as a **multi-tenant SaaS application**.

Each user belongs to a specific company identified through:

companyCode
