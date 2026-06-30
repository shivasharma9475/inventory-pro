// controllers/companySettings.controller.js
const User      = require("../models/User.model");
const imagekit  = require("../utils/imagekit");

// ── GET /api/company-settings  (admin only) ───────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("+razorpay.keySecret +stripe.secretKey +stripe.webhookSecret");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.json({ success: true, data: user.toSafeObject() });
  } catch (err) {
    console.error("[getSettings]", err);
    return res.status(500).json({ success: false, message: "Failed to fetch settings" });
  }
};

// ── PUT /api/company-settings  (admin only) ───────────────────────────────────
exports.updateSettings = async (req, res) => {
  try {
    const b = req.body;

    const user = await User.findById(req.user._id)
      .select("+razorpay.keySecret +stripe.secretKey +stripe.webhookSecret");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // ── Scalar fields ─────────────────────────────────────────────────────────
    const scalars = [
      "tagline", "phone", "website", "address", "city",
      "state", "country", "pincode", "gst", "pan", "defaultTaxRate",
    ];
    scalars.forEach((f) => { if (b[f] !== undefined) user[f] = b[f]; });

    if (b.companyName?.trim()) user.companyName = b.companyName.trim();

    // ── Bank ──────────────────────────────────────────────────────────────────
    if (b.bank) {
      user.bank = {
        accountName: b.bank.accountName ?? user.bank?.accountName ?? "",
        bankName:    b.bank.bankName    ?? user.bank?.bankName    ?? "",
        accountNo:   b.bank.accountNo   ?? user.bank?.accountNo   ?? "",
        ifsc:        (b.bank.ifsc ?? user.bank?.ifsc ?? "").toUpperCase(),
        branch:      b.bank.branch      ?? user.bank?.branch      ?? "",
        accountType: b.bank.accountType ?? user.bank?.accountType ?? "Current",
      };
    }

    // ── UPI ───────────────────────────────────────────────────────────────────
    if (b.upi) {
      user.upi = {
        id:   b.upi.id   ?? user.upi?.id   ?? "",
        name: b.upi.name ?? user.upi?.name ?? "",
      };
    }

    // ── Razorpay (only update secret if user typed a new one, not masked) ─────
    if (b.razorpay) {
      user.razorpay = {
        keyId:   b.razorpay.keyId   ?? user.razorpay?.keyId   ?? "",
        enabled: b.razorpay.enabled ?? user.razorpay?.enabled ?? false,
        keySecret:
          b.razorpay.keySecret && !b.razorpay.keySecret.startsWith("••")
            ? b.razorpay.keySecret          // pre-save hook will encrypt
            : (user.razorpay?.keySecret ?? ""),
      };
    }

    // ── Stripe ────────────────────────────────────────────────────────────────
    if (b.stripe) {
      user.stripe = {
        publishableKey: b.stripe.publishableKey ?? user.stripe?.publishableKey ?? "",
        enabled:        b.stripe.enabled        ?? user.stripe?.enabled        ?? false,
        secretKey:
          b.stripe.secretKey && !b.stripe.secretKey.startsWith("••")
            ? b.stripe.secretKey
            : (user.stripe?.secretKey ?? ""),
        webhookSecret:
          b.stripe.webhookSecret && !b.stripe.webhookSecret.startsWith("••")
            ? b.stripe.webhookSecret
            : (user.stripe?.webhookSecret ?? ""),
      };
    }

    // ── Invoice ───────────────────────────────────────────────────────────────
    if (b.invoice) {
      user.invoice = {
        prefix:     b.invoice.prefix     ?? user.invoice?.prefix     ?? "BILL",
        termsNotes: b.invoice.termsNotes ?? user.invoice?.termsNotes ?? "",
        footerText: b.invoice.footerText ?? user.invoice?.footerText ?? "Thank you for your business 🙏",
        showLogo:   b.invoice.showLogo   ?? user.invoice?.showLogo   ?? true,
        showGst:    b.invoice.showGst    ?? user.invoice?.showGst    ?? true,
      };
    }

    // ── Payment methods ───────────────────────────────────────────────────────
    if (b.enabledPaymentMethods) {
      user.enabledPaymentMethods = {
        cash:         b.enabledPaymentMethods.cash         ?? user.enabledPaymentMethods?.cash         ?? true,
        upi:          b.enabledPaymentMethods.upi          ?? user.enabledPaymentMethods?.upi          ?? false,
        card:         b.enabledPaymentMethods.card         ?? user.enabledPaymentMethods?.card         ?? false,
        bankTransfer: b.enabledPaymentMethods.bankTransfer ?? user.enabledPaymentMethods?.bankTransfer ?? false,
      };
    }

    await user.save();

    const updated = await User.findById(req.user._id)
      .select("+razorpay.keySecret +stripe.secretKey +stripe.webhookSecret");

    return res.json({ success: true, data: updated.toSafeObject(), message: "Settings saved successfully" });
  } catch (err) {
    console.error("[updateSettings]", err);
    return res.status(err.status || 500).json({ success: false, message: err.message || "Failed to save settings" });
  }
};

// ── POST /api/company-settings/upload-logo  (admin only) ─────────────────────
exports.uploadLogo = async (req, res) => {
  try {
    const { logoBase64 } = req.body;

    if (!logoBase64)                              return res.status(400).json({ success: false, message: "No logo provided" });
    if (!logoBase64.startsWith("data:image/"))    return res.status(400).json({ success: false, message: "File must be an image" });

    const response = await imagekit.upload({
      file:              logoBase64,
      fileName:          `company-logo-${req.user._id}.png`,
      folder:            "/company-logos",
      useUniqueFileName: true,
    });

    await User.findByIdAndUpdate(req.user._id, {
      companyLogo: { url: response.url, fileId: response.fileId },
    });

    return res.json({ success: true, logoUrl: response.url, message: "Logo uploaded successfully" });
  } catch (err) {
    console.error("[uploadLogo]", err);
    return res.status(500).json({ success: false, message: "Logo upload failed" });
  }
};

// ── DELETE /api/company-settings/logo  (admin only) ──────────────────────────
exports.deleteLogo = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { fileId } = user.companyLogo || {};
    if (!fileId)      return res.status(400).json({ success: false, message: "No logo to delete" });

    try {
      await imagekit.deleteFile(fileId);
    } catch (ikErr) {
      // Log but don't crash — always clean DB
      console.warn("[deleteLogo] ImageKit delete failed:", ikErr.message);
    }

    user.companyLogo = { url: "", fileId: "" };
    await user.save();

    return res.json({ success: true, message: "Logo deleted successfully" });
  } catch (err) {
    console.error("[deleteLogo]", err);
    return res.status(500).json({ success: false, message: err.message || "Delete failed" });
  }
};

exports.uploadProfilePhoto = async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64)
      return res.status(400).json({
        success: false,
        message: "No image provided",
      });

    const response = await imagekit.upload({
      file: imageBase64,
      fileName: `profile-${req.user._id}.png`,
      folder: "/staff-profiles",
      useUniqueFileName: true,
    });

    await User.findByIdAndUpdate(req.user._id, {
      profileImage: {
        url: response.url,
        fileId: response.fileId,
      },
    });

    return res.json({
      success: true,
      imageUrl: response.url,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Upload failed",
    });
  }
};

// ── Internal helper: decrypted secrets for payment processing ─────────────────
exports.getDecryptedSecrets = async (userId) => {
  const user = await User.findById(userId)
    .select("+razorpay.keySecret +stripe.secretKey +stripe.webhookSecret")
    .lean(false);
  if (!user) return null;
  return user.getPaymentSecrets();
};
