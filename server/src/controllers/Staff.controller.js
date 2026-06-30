const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const logActivity = require("../utils/activityLogger");
const { emitToCompanyAdmins } = require("../socket");

const createStaff = async (req, res) => {
  try {
    const { name, email, password, designation } = req.body;

    const admin = req.user;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await userModel.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    const staff = await userModel.create({
      name: name || "",
      designation: designation || "",

      email: normalizedEmail,
      password: password.trim(), // ✅ FIX

      role: "staff",

      companyName: admin.companyName,
      companyCode: admin.companyCode.toLowerCase(),

      createdBy: admin._id,

      isVerified: true,
    });

    // 🔥 Real-time: staff list / activity feed refresh for other admins
    emitToCompanyAdmins(admin.companyCode, "staff:created", {
      staffId: staff._id,
      name: staff.name,
      email: staff.email,
    });

    await logActivity({
      user: admin,
      action: "CREATE_STAFF",
      entity: "STAFF",
      entityId: staff._id,
      entityData: { name: staff.name, email: staff.email },
      req,
    });

    return res.status(201).json({
      message: "Staff created successfully",
      staff: {
        id: staff._id,
        email: staff.email,
        role: staff.role,
        name: staff.name,
        designation: staff.designation,
      },
    });

  } catch (error) {
    console.error("createStaff error:", error);

    return res.status(500).json({
      message: "Failed to create staff",
    });
  }
};

const getStaff = async (req, res) => {
  try {
    const admin = req.user; // 🔥 middleware se

    // 💣 only admin allowed
    if (admin.role !== "admin") {
      return res.status(403).json({
        message: "Access denied. Admin only.",
      });
    }

    // 🔥 get staff of same company
    const staff = await userModel.find({
      companyCode: admin.companyCode,
      role: "staff",
    }).select("-password");

    res.status(200).json({
      success: true,
      data: staff,
    });

  } catch (error) {
    console.error("getStaff error:", error);

    res.status(500).json({
      message: "Failed to fetch staff",
    });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const admin = req.user;
    const { id } = req.params;

    // 💣 only admin allowed
    if (admin.role !== "admin") {
      return res.status(403).json({
        message: "Access denied. Admin only.",
      });
    }

    // 🔥 find staff
    const staff = await userModel.findById(id);

    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    // 💣 security: same company check
    if (staff.companyCode !== admin.companyCode) {
      return res.status(403).json({
        message: "Unauthorized action",
      });
    }

    // 💣 extra: ensure only staff deleted
    if (staff.role !== "staff") {
      return res.status(400).json({
        message: "You can only delete staff",
      });
    }

    await staff.deleteOne();

    // 🔥 Real-time: staff list / activity feed refresh for other admins
    emitToCompanyAdmins(admin.companyCode, "staff:deleted", {
      staffId: staff._id,
      name: staff.name,
    });

    await logActivity({
      user: admin,
      action: "DELETE_STAFF",
      entity: "STAFF",
      entityId: staff._id,
      entityData: { name: staff.name, email: staff.email },
      req,
    });

    res.status(200).json({
      message: "Staff deleted successfully",
    });

  } catch (error) {
    console.error("deleteStaff error:", error);

    res.status(500).json({
      message: "Failed to delete staff",
    });
  }
};

module.exports = {
  createStaff,
  getStaff,
  deleteStaff
};