const express = require("express");
const router = express.Router();

const { productController } = require("../controllers/product.controller");
const { authUser, authorise } = require("../middleware/auth.middleware");

const {
  AddProductValidationRules,
  UpdateProductValidationRules,
  validateObjectId,
} = require("../middleware/validation.middleware");

// 🧑‍💼 ADMIN ONLY → Create Product
router.post(
  "/",
  authUser,
  authorise("admin"),
  ...AddProductValidationRules,
  productController.addProduct
);

// 👨‍💻 ADMIN + STAFF → Get All Products
router.get("/", authUser, productController.getProducts);

// 👨‍💻 ADMIN + STAFF → Low Stock
router.get("/low-stock", authUser, productController.getLowStockProducts);

// 👨‍💻 ADMIN + STAFF → Lookup by barcode/SKU (for scanner-based billing)
router.get("/barcode/:code", authUser, productController.getProductByBarcode);

// 👨‍💻 ADMIN + STAFF → Update Stock
router.patch(
  "/:id/stock",
  authUser,
  authorise("admin", "staff"),
  validateObjectId,
  productController.updateStock
);

// 👨‍💻 ADMIN + STAFF → Get Single Product
router.get(
  "/:id",
  authUser,
  validateObjectId,
  productController.getProductById
);

// 🧑‍💼 ADMIN ONLY → Full Update
router.put(
  "/:id",
  authUser,
  authorise("admin"),
  ...UpdateProductValidationRules,
  validateObjectId,
  productController.updateProduct
);

// 🧑‍💼 ADMIN ONLY → Delete
router.delete(
  "/:id",
  authUser,
  authorise("admin"),
  validateObjectId,
  productController.deleteProduct
);

// 🧑‍💼 ADMIN ONLY → Restore
router.put(
  "/restore/:id",
  authUser,
  authorise("admin"),
  validateObjectId,
  productController.restoreProduct
);

module.exports = router;