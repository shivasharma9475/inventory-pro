const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const transporter = require("../config/mail");

// 🔑 Generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "1d" }
  );
};

// ── REGISTER ─────────────────────────────
async function registerUser(req, res) {
  try {
    const {
      companyName,
      email,
      password,
      country,
      state,
      city,
      phone,
    } = req.body;

    // ✅ 1. Validate
    if (!companyName || !email || !password) {
      return res.status(400).json({
        message: "Company name, email and password are required",
        companyCode: user.companyCode,
      });
    }

    // ✅ 2. Normalize
    const normalizedEmail = email.toLowerCase().trim();
    const companyCode = companyName.toLowerCase().trim(); // 🔥 MAIN KEY

    // ✅ 3. Check email exists
    const existingUser = await userModel.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists with this email",
      });
    }

    // ✅ 4. Check company already has admin
    const adminExists = await userModel.findOne({
      companyCode,
      role: "admin",
    });

    if (adminExists) {
      return res.status(403).json({
        message: "Company already registered",
      });
    }

    // ✅ 5. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcrypt.hash(otp, 10);

    // ✅ 6. Create Admin
    const user = await userModel.create({
      companyName: companyName.trim(), // display name
      companyCode, // 🔥 MUST
      email: normalizedEmail,
      password,
      country,
      state,
      city,
      phone,
      role: "admin",

      otp: hashedOTP,
      otpExpiry: Date.now() + 2 * 60 * 1000,
      otpCooldown: Date.now() + 60 * 1000,

      isVerified: false,
      isResetVerified: false,
    });

    // ✅ 7. Send OTP
    try {
      await transporter.sendMail({
        to: user.email,
        subject: "InventoryPro OTP Verification",
        html: `
          <div style="background-color: #f9fafb; padding: 50px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.03);">
        
        <div style="padding: 40px 40px 20px 40px; text-align: left;">
            <div style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 14px; border-radius: 8px; font-weight: 800; font-size: 20px; letter-spacing: -0.5px;">
                IP
            </div>
            <span style="font-size: 22px; font-weight: 700; color: #111827; margin-left: 10px; vertical-align: middle;">InventoryPro</span>
        </div>

        <div style="padding: 0 40px 40px 40px;">
            <h2 style="font-size: 24px; font-weight: 700; color: #111827; margin-top: 0;">Verify your email address</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
                Hi <strong>${user.companyName}</strong>,
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
                Welcome to InventoryPro! We're excited to help you streamline your operations. To get started, please use the verification code below to confirm your account:
            </p>

            <div style="margin: 32px 0; padding: 24px; background-color: #f3f4f6; border-radius: 12px; text-align: center;">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #6b7280; margin-bottom: 8px; font-weight: 600;">
                    Your Verification Code
                </div>
                <div style="font-size: 38px; font-weight: 800; color: #4f46e5; letter-spacing: 10px; font-family: 'Courier New', Courier, monospace;">
                    ${otp}
                </div>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-bottom: 30px;">
                <strong>Security note:</strong> This code will expire in <span style="color: #111827; font-weight: 600;">2 minutes</span>. If you didn't request this email, you can safely ignore it.
            </p>

            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-bottom: 30px;" />

            <p style="font-size: 15px; color: #4b5563; margin-bottom: 0;">
                Best regards,<br />
                <span style="font-weight: 600; color: #111827;">The InventoryPro Team</span>
            </p>
        </div>

        <div style="background-color: #f9fafb; padding: 30px 40px; text-align: left; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.5;">
                © 2026 InventoryPro Inc. | 123 Logistics Way, Suite 100, Tech City.<br />
                You’re receiving this because you signed up for an InventoryPro account.
            </p>
        </div>
    </div>
</div>
        `,
      });
    } catch (mailErr) {
      console.error("Mail error:", mailErr.message);
    }

    // ✅ 8. Response
    return res.status(201).json({
      message: "OTP sent successfully to your email",
      user,
    });

  } catch (error) {
    console.error("registerUser error:", error);

    return res.status(500).json({
      message: "Registration failed. Please try again later.",
    });
  }
}

// ── LOGIN ─────────────────────────────
async function loginUser(req, res) {
  try {
    const { email, password, companyCode, role } = req.body;

    // 🔥 VALIDATION
    if (!email || !password || !companyCode) {
      return res.status(400).json({
        field: "general",
        message: "All fields are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCompany = companyCode.toLowerCase().trim();

    
    const user1 = await userModel
    .findOne({ email: normalizedEmail })
    .select("+password");

if (user1) {

  const isMatch = await bcrypt.compare(password, user1.password);
}

    // 🔥 STEP 1: CHECK EMAIL EXIST
    const user = await userModel
      .findOne({ email: normalizedEmail })
      .select("+password");

    if (!user) {
      return res.status(401).json({
        field: "email",
        message: "User not found",
      });
    }

    // 🔥 STEP 2: CHECK COMPANY
    if (user.companyCode !== normalizedCompany) {
      return res.status(401).json({
        field: "companyCode",
        message: "Invalid company code",
      });
    }

    // 🔥 STEP 3: VERIFY ACCOUNT
    if (!user.isVerified) {
      return res.status(403).json({
        field: "general",
        message: "Please verify your account first",
      });
    }

    // 🔥 STEP 4: CHECK PASSWORD
const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        field: "password",
        message: "Incorrect password",
      });
    }

    // 💣 STEP 5: ROLE CHECK (IMPORTANT ADDITION)
    if (role && user.role !== role) {
      return res.status(403).json({
        field: "general",
        message: `You are not allowed to login as ${role}`,
      });
    }

    // 🔥 STEP 6: SUCCESS
    const token = generateToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        companyCode: user.companyCode,
        companyName: user.companyName,
        name: user.name || "",
        designation: user.designation || "",
        phone: user.phone || "",
        city: user.city || "",
        state: user.state || "",
        country: user.country || "",
        companyLogo: user.companyLogo,
        profileImage: user.profileImage,
        isActive: user.isActive,
        isVerified: user.isVerified,
        permissions: user.permissions,
        createdAt: user.createdAt,
      },
    });

  } catch (error) {
    console.error("loginUser error:", error);

    res.status(500).json({
      field: "general",
      message: "Login failed",
    });
  }
}

// ── LOGOUT ─────────────────────────────
async function logOutUser(req, res) {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed" });
  }
}


// ── VERIFY OTP ─────────────────────────────
async function verifyOTP(req, res) {
  try {
    const { email, otp, type } = req.body;
    

    const normalizedEmail = email.toLowerCase();
    const user = await userModel.findOne({ email: normalizedEmail });
    

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValidOTP = await bcrypt.compare(otp, user.otp);

    if (!isValidOTP || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (type === "register") user.isVerified = true;
    if (type === "forgot") user.isResetVerified = true;

    // ✅ ADD THIS 🔥
    user.otp = null;
    user.otpExpiry = null;
    user.otpCooldown = null; // 🔥 FIX

    await user.save();

    const token = generateToken(user);

    res.json({ message: "OTP verified successfully" ,
      token,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        companyCode: user.companyCode,
        companyName: user.companyName,
        name: user.name || "",
        designation: user.designation || "",
        phone: user.phone || "",
        city: user.city || "",
        state: user.state || "",
        country: user.country || "",
        companyLogo: user.companyLogo,
        profileImage: user.profileImage,
        isActive: user.isActive,
        isVerified: user.isVerified,
        permissions: user.permissions,
        createdAt: user.createdAt,
      },});

  } catch (error) {
    console.error("verifyOTP error:", error);
    res.status(500).json({ message: "Verification failed" });
  }
}

// ── RESEND OTP ─────────────────────────────
async function resendOTP(req, res) {
  try {
    const { email } = req.body;

    const normalizedEmail = email.toLowerCase();
    const user = await userModel.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.otpCooldown && user.otpCooldown > Date.now()) {
      return res.status(429).json({
        message: "Please wait before requesting OTP",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpiry = Date.now() + 2 * 60 * 1000;
    user.otpCooldown = Date.now() + 60 * 1000;

    await user.save();

    await transporter.sendMail({
      to: user.email,
      subject: "Resend OTP",
      html: `<div style="background-color: #f9fafb; padding: 50px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.03);">
        
        <div style="padding: 40px 40px 20px 40px; text-align: left;">
            <div style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 14px; border-radius: 8px; font-weight: 800; font-size: 20px; letter-spacing: -0.5px;">
                IP
            </div>
            <span style="font-size: 22px; font-weight: 700; color: #111827; margin-left: 10px; vertical-align: middle;">InventoryPro</span>
        </div>

        <div style="padding: 0 40px 40px 40px;">
            <h2 style="font-size: 24px; font-weight: 700; color: #111827; margin-top: 0;">Verify your email address</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
                Hi <strong>${user.companyName}</strong>,
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
                Welcome to InventoryPro! We're excited to help you streamline your operations. To get started, please use the verification code below to confirm your account:
            </p>

            <div style="margin: 32px 0; padding: 24px; background-color: #f3f4f6; border-radius: 12px; text-align: center;">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #6b7280; margin-bottom: 8px; font-weight: 600;">
                    Your Verification Code
                </div>
                <div style="font-size: 38px; font-weight: 800; color: #4f46e5; letter-spacing: 10px; font-family: 'Courier New', Courier, monospace;">
                    ${otp}
                </div>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-bottom: 30px;">
                <strong>Security note:</strong> This code will expire in <span style="color: #111827; font-weight: 600;">2 minutes</span>. If you didn't request this email, you can safely ignore it.
            </p>

            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-bottom: 30px;" />

            <p style="font-size: 15px; color: #4b5563; margin-bottom: 0;">
                Best regards,<br />
                <span style="font-weight: 600; color: #111827;">The InventoryPro Team</span>
            </p>
        </div>

        <div style="background-color: #f9fafb; padding: 30px 40px; text-align: left; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.5;">
                © 2026 InventoryPro Inc. | 123 Logistics Way, Suite 100, Tech City.<br />
                You’re receiving this because you signed up for an InventoryPro account.
            </p>
        </div>
    </div>
</div>`,
    });

    res.json({ message: "OTP resent successfully" });

  } catch (error) {
    console.error("resendOTP error:", error);
    res.status(500).json({ message: "Failed to resend OTP" });
  }
}

// ── FORGOT PASSWORD ─────────────────────────────
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    const normalizedEmail = email.toLowerCase();
    const user = await userModel.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "staff") {
  return res.status(403).json({
    message: "Staff is not allowed to reset password. Contact admin.",
  });
}

    if (user.otpCooldown && user.otpCooldown > Date.now()) {
      return res.status(429).json({
  message: "Wait 60 seconds before requesting new OTP",
});
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpiry = Date.now() + 2 * 60 * 1000;
    user.otpCooldown = Date.now() + 60 * 1000;
    user.isResetVerified = false;

    await user.save();

    await transporter.sendMail({
      to: user.email,
      subject: "Reset Password OTP",
      html: `<div style="background-color: #f9fafb; padding: 50px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.03);">
        
        <div style="padding: 40px 40px 20px 40px; text-align: left;">
            <div style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 14px; border-radius: 8px; font-weight: 800; font-size: 20px; letter-spacing: -0.5px;">
                IP
            </div>
            <span style="font-size: 22px; font-weight: 700; color: #111827; margin-left: 10px; vertical-align: middle;">InventoryPro</span>
        </div>

        <div style="padding: 0 40px 40px 40px;">
            <h2 style="font-size: 24px; font-weight: 700; color: #111827; margin-top: 0;">Verify your email address</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
                Hi <strong>${user.companyName}</strong>,
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
                Welcome to InventoryPro! We're excited to help you streamline your operations. To get started, please use the verification code below to confirm your account:
            </p>

            <div style="margin: 32px 0; padding: 24px; background-color: #f3f4f6; border-radius: 12px; text-align: center;">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #6b7280; margin-bottom: 8px; font-weight: 600;">
                    Your Verification Code
                </div>
                <div style="font-size: 38px; font-weight: 800; color: #4f46e5; letter-spacing: 10px; font-family: 'Courier New', Courier, monospace;">
                    ${otp}
                </div>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-bottom: 30px;">
                <strong>Security note:</strong> This code will expire in <span style="color: #111827; font-weight: 600;">2 minutes</span>. If you didn't request this email, you can safely ignore it.
            </p>

            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-bottom: 30px;" />

            <p style="font-size: 15px; color: #4b5563; margin-bottom: 0;">
                Best regards,<br />
                <span style="font-weight: 600; color: #111827;">The InventoryPro Team</span>
            </p>
        </div>

        <div style="background-color: #f9fafb; padding: 30px 40px; text-align: left; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.5;">
                © 2026 InventoryPro Inc. | 123 Logistics Way, Suite 100, Tech City.<br />
                You’re receiving this because you signed up for an InventoryPro account.
            </p>
        </div>
    </div>
</div>`,
    });

    res.json({ message: "OTP sent successfully" });

  } catch (error) {
    console.error("forgotPassword error:", error);
    res.status(500).json({ message: "Error sending OTP" });
  }
}

// ── RESET PASSWORD ─────────────────────────────
async function resetPassword(req, res) {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await userModel.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "staff") {
  return res.status(403).json({
    message: "Staff cannot reset password",
  });
}

    if (!user.isResetVerified) {
      return res.status(400).json({
        message: "OTP verification required",
      });
    }

    user.password = newPassword;
    user.isResetVerified = false;

    await user.save();

    res.json({ message: "Password reset successful" });

  } catch (error) {
    console.error("resetPassword error:", error);
    res.status(500).json({ message: "Reset failed" });
  }
}

async function getMe (req, res, next)  {
  try {
   const user = await userModel.findById(req.user._id).lean();

let companyName = user.companyName;
let companyLogo = user.companyLogo;

if (user.role === "staff" && user.createdBy) {
  const admin = await userModel.findById(user.createdBy)
    .select("companyName companyLogo")
    .lean();

  if (admin) {
    companyName = admin.companyName;
    companyLogo = admin.companyLogo;
  }
}

res.json({
  success: true,
  user: {
    _id: user._id,
    email: user.email,
    role: user.role,

    companyName,
    companyLogo,

    companyCode: user.companyCode,
    name: user.name || "",
    designation: user.designation || "",

    country: user.country || "",
    state: user.state || "",
    city: user.city || "",
    phone: user.phone || "",

    profileImage: user.profileImage,

    isActive: user.isActive,
    isVerified: user.isVerified,

    permissions: user.permissions,
    createdAt: user.createdAt,
  },
});
  } catch (err) {
    next(err);
  }
};

async function updateMe (req, res) {
  try {
    const { name, phone, designation } = req.body;

    // Whitelist — staff cannot change email/role/company fields via this route
    const updates = {};
    if (name?.trim())        updates.name        = name.trim();
    if (phone !== undefined) updates.phone        = phone;
    if (designation !== undefined) updates.designation = designation;

    const user = await userModel.findByIdAndUpdate(req.user._id, updates, {
      new:       true,
      runValidators: true,
    });

    return res.json({ success: true, user, message: "Profile updated" });
  } catch (err) {
    console.error("[updateMe]", err);
    return res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await userModel.findById(req.user._id).select("+password");

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to change password",
    });
  }
}
module.exports = {
  registerUser,
  loginUser,
  logOutUser,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
  getMe,
  updateMe,
  changePassword,
};