const slugify = require("slugify");
const ProductModel = require("../models/product.model");
const mongoose = require("mongoose");
const { emitToCompany } = require("../socket");
const buildActivity = require("../utils/activityMessages");
const logActivity = require("../utils/activityLogger");

// 🆕 Add Product (ADMIN ONLY)
const addProduct = async (req, res) => {
  try {
    if (!req.user || !req.user.companyCode) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const companyCode = req.user.companyCode;

    const {
  name,
  price,
  sku,
  barcode,
  costPrice,
  stock,
  lowStockThreshold,
  minStock,
  category,
  description,
  seller,
  discount,
  unit
} = req.body;

    if (!name || !price || !stock || !category) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    // ✅ Duplicate check (company specific)
    const existing = await ProductModel.findOne({
      companyCode,
      name: { $regex: `^${name}$`, $options: "i" }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Product already exists"
      });
    }

    // ✅ Duplicate barcode check — the field has a unique sparse index, so a
    // stale/colliding barcode would otherwise surface as an opaque 500 from
    // a Mongo duplicate-key error instead of a clear 409.
    const trimmedBarcode = barcode?.trim() || undefined;
    if (trimmedBarcode) {
      const barcodeExists = await ProductModel.findOne({
        companyCode,
        barcode: trimmedBarcode,
      });
      if (barcodeExists) {
        return res.status(409).json({
          success: false,
          message: `Barcode "${trimmedBarcode}" is already assigned to "${barcodeExists.name}"`,
        });
      }
    }

    let slug = slugify(name, { lower: true });

    const slugExists = await ProductModel.findOne({ companyCode, slug });
    if (slugExists) slug += "-" + Date.now();

    const product = await ProductModel.create({
  name,
  slug,
  sku: sku?.trim(),
  barcode: trimmedBarcode,
  price: Number(price),
  costPrice: Number(costPrice) || 0,
  stock: Number(stock),
  lowStockThreshold: Number(lowStockThreshold) || 10,
  minStock: Number(minStock) || 5,
  category,
  description,
  seller: seller || "Unknown Supplier",
  discount: Number(discount ?? 0),
  unit: unit || "pcs",
  companyCode,
  isActive: true
});

    // 🔥 Real-time: let Products/Dashboard refresh without a manual reload
    emitToCompany(companyCode, "product:created", {
      productId: product._id,
      name: product.name,
      stock: product.stock,
      category: product.category,
    });

    await logActivity({
      user: req.user,
      action: "ADD_PRODUCT",
      entity: "PRODUCT",
      entityId: product._id,
      entityData: { name: product.name },
      req,
    });

    res.status(201).json({
      success: true,
      data: product
    });

  } catch (err) {
    console.error("ADD ERROR:", err);
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A product with that SKU or barcode already exists",
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};
// 📄 Get Products
const getProducts = async (req, res) => {
  try {
    if (!req.user || !req.user.companyCode) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const companyCode = req.user.companyCode;

    let {
      keyword = "",
      category = "",
      page = 1,
      limit = 50,
      tab = "active"
    } = req.query;

    page = parseInt(page) || 1;
    limit = Math.min(parseInt(limit) || 50, 100);

    const skip = (page - 1) * limit;

    // ✅ FIXED QUERY
    const query = {
      companyCode,
      isActive: tab === "deleted" ? false : true
    };

    // ✅ SEARCH FIX
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { category: { $regex: keyword, $options: "i" } },
        { seller: { $regex: keyword, $options: "i" } },
        { sku: { $regex: keyword, $options: "i" } },
      ];
    }

    if (category) {
      query.category = category;
    }

  const totalProducts = await ProductModel.countDocuments(query);

const products = await ProductModel.find(query)
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .lean();

res.json({
  success: true,
  totalProducts,
  currentPage: page,
  totalPages: Math.ceil(totalProducts / limit),
  data: products,
});

  } catch (err) {
    console.error("GET ERROR:", err);
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "SKU already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// 🔍 Get  Product by barcode
const getProductByBarcode = async (req, res) => {
  try {
    if (!req.user || !req.user.companyCode) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }
 
    const { code } = req.params;
    const trimmedCode = (code || "").trim();
 
    if (!trimmedCode) {
      return res.status(400).json({
        success: false,
        message: "Barcode/SKU is required"
      });
    }
 
    // Match either the dedicated `barcode` field or `sku` — scanners are often
    // configured to print either, and staff may have only set one.
    const product = await ProductModel.findOne({
      companyCode: req.user.companyCode,
      isActive: true,
      $or: [{ barcode: trimmedCode }, { sku: trimmedCode }],
    }).lean();
 
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `No product found for code "${trimmedCode}"`
      });
    }
 
    res.json({
      success: true,
      data: product,
    });
  } catch (err) {
    console.error("GET BY BARCODE ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// 🔍 Get Single Product
const getProductById = async (req, res) => {
  try {
    // ✅ Auth check
    if (!req.user || !req.user.companyCode) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const { id } = req.params;

    // ✅ ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const product = await ProductModel.findOne({
      _id: id,
      companyCode: req.user.companyCode
    }).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.json({
  success: true,
  data: product,
});

  } catch (err) {
    console.error("GET BY ID ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ✏️ Update Product (ADMIN)
const updateProduct = async (req, res) => {
  try {
    // ✅ Auth check
    if (!req.user || !req.user.companyCode) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // ✅ Role check (ADMIN ONLY)
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const { id } = req.params;

    // ✅ ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    // ✅ Allowed fields only (VERY IMPORTANT 🔥)
    const allowedFields = [
  "name",
  "sku",
  "barcode",
  "price",
  "costPrice",
  "stock",
  "lowStockThreshold",
  "minStock",
  "category",
  "description",
  "seller",
  "discount",
  "unit"
];

    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Normalize barcode the same way addProduct does, and pre-check for a
    // collision so it surfaces as a clear 409 instead of a raw duplicate-key
    // error from the unique sparse index.
    if (updateData.barcode !== undefined) {
      const trimmed = String(updateData.barcode || "").trim();
      updateData.barcode = trimmed || undefined;

      if (updateData.barcode) {
        const barcodeExists = await ProductModel.findOne({
          companyCode: req.user.companyCode,
          barcode: updateData.barcode,
          _id: { $ne: id },
        });
        if (barcodeExists) {
          return res.status(409).json({
            success: false,
            message: `Barcode "${updateData.barcode}" is already assigned to "${barcodeExists.name}"`,
          });
        }
      }
    }

    // NOTE: `returnDocument` is the native MongoDB driver option name, not a
    // Mongoose option — Mongoose ignores it and returns the *pre*-update
    // document by default. Using `new: true` is what actually returns the
    // updated document to the client.
    const product = await ProductModel.findOneAndUpdate(
      {
        _id: id,
        companyCode: req.user.companyCode
      },
      updateData,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Not found or unauthorized"
      });
    }

    // 🔥 Real-time: Products/Dashboard pick up the change without a reload
    emitToCompany(req.user.companyCode, "product:updated", {
      productId: product._id,
      name: product.name,
      stock: product.stock,
    });

    await logActivity({
      user: req.user,
      action: "UPDATE_PRODUCT",
      entity: "PRODUCT",
      entityId: product._id,
      entityData: { name: product.name },
      req,
    });

    res.json({
  success: true,
  data: product,
});

  } catch (err) {
    console.error("UPDATE ERROR:", err);
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A product with that SKU or barcode already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ❌ Delete Product
const deleteProduct = async (req, res) => {
  try {
    // ✅ Auth check
    if (!req.user || !req.user.companyCode) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // ✅ Role check (ADMIN ONLY)
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { id } = req.params;

    // ✅ ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const product = await ProductModel.findOneAndUpdate(
      {
        _id: id,
        companyCode: req.user.companyCode
      },
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or unauthorized",
      });
    }

    console.log("🗑️ Product deleted:", product._id);

    // 🔥 Real-time: Products/Dashboard pick up the removal without a reload
    emitToCompany(req.user.companyCode, "product:deleted", {
      productId: product._id,
      name: product.name,
    });

    await logActivity({
      user: req.user,
      action: "DELETE_PRODUCT",
      entity: "PRODUCT",
      entityId: product._id,
      entityData: { name: product.name },
      req,
    });

    res.json({
      success: true,
      message: "Product deleted successfully",
      data: product
    });

  } catch (err) {
    console.error("DELETE ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ♻️ Restore Product
const restoreProduct = async (req, res) => {
  try {
    if (!req.user || !req.user.companyCode) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const product = await ProductModel.findOneAndUpdate(
      {
        _id: id,
        companyCode: req.user.companyCode
      },
      { isActive: true },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // 🔥 Real-time: Products/Dashboard pick up the restore without a reload
    emitToCompany(req.user.companyCode, "product:restored", {
      productId: product._id,
      name: product.name,
      stock: product.stock,
    });

    await logActivity({
      user: req.user,
      action: "RESTORE_PRODUCT",
      entity: "PRODUCT",
      entityId: product._id,
      entityData: { name: product.name },
      req,
    });

    res.json({
      success: true,
      data: product,
    });

  } catch (err) {
    console.error("RESTORE ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ⚠️ Low Stock
const getLowStockProducts = async (req, res) => {
  try {
    // ✅ Auth check
    if (!req.user || !req.user.companyCode) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const companyCode = req.user.companyCode;

    // ✅ Optional global threshold
    const globalThreshold =
      req.query.threshold !== undefined
        ? Number(req.query.threshold)
        : null;

    const limit = parseInt(req.query.limit) || 10;

    let products;

    // 🔥 BEST APPROACH → Use DB filtering (no manual filter)
    if (globalThreshold !== null) {
      // 👉 If frontend sends threshold
      products = await ProductModel.find({
        companyCode,
        isActive: true,
        stock: { $lte: globalThreshold },
      })
        .select("_id name stock lowStockThreshold category")
        .sort({ stock: 1 })
        .limit(limit)
        .lean();
    } else {
      // 👉 Use each product's own threshold (BEST LOGIC)
      products = await ProductModel.find({
        companyCode,
        isActive: true,
        $expr: {
          $lte: ["$stock", "$lowStockThreshold"],
        },
      })
        .select("_id name stock lowStockThreshold category")
        .sort({ stock: 1 })
        .limit(limit)
        .lean();
    }

    // ✅ No cache
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    res.json({
      success: true,
      threshold: globalThreshold !== null ? globalThreshold : 10,
      limit,
      count: products.length,
      data: products,
    });

  } catch (err) {
    console.error("LOW STOCK ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const updateStock = async (req, res) => {
  try {
    const { stock } = req.body;

    const product = await ProductModel.findOneAndUpdate(
      {
        _id: req.params.id,
        companyCode: req.user.companyCode
      },
      { stock: Number(stock) },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false
      });
    }

    // 🔥 Emit real-time stock update — scoped to this company's room only.
    // The previous `getIO().emit(...)` broadcast globally to every connected
    // socket regardless of company, which would leak one company's stock
    // changes to every other company's connected clients.
    emitToCompany(req.user.companyCode, "product:stockUpdated", {
      productId: product._id,
      stock: product.stock,
      productName: product.name,
      updatedBy: req.user.name || "Staff"
    });

    console.log("📡 Stock update emitted");

    await logActivity({
  user: req.user,

  action: "UPDATE_STOCK",

  entity: "PRODUCT",

  entityId: product._id,

  entityData: {
    name: product.name,
    stock: product.stock,
  },

  req,
});

    res.json({
      success: true,
      data: product,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false
    });
  }
};

module.exports = {
  productController: {
    addProduct,
    getProducts,
    getProductById,
    getProductByBarcode,
    updateProduct,
    deleteProduct,
    restoreProduct,
    getLowStockProducts,
    updateStock
  }
};