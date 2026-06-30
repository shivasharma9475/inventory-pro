// src/components/settings/StaffPanel.jsx
import { useState } from "react";
import { SectionCard, Alert } from "./ui";
import { colors, btnPrimary } from "../../styles/tokens";
import { updateMe, changePassword, uploadProfilePhoto } from "../../services/authService";

export function StaffProfilePanel({ user, setUser }) {
  const [form, setForm] = useState({
    name:        user?.name        || "",
    phone:       user?.phone       || "",
    designation: user?.designation || "",
  });
  const [pwForm,   setPwForm]   = useState({ current: "", newPw: "", confirm: "" });
  const [saving,   setSaving]   = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [msg,      setMsg]      = useState({ type: "", text: "" });
  const [preview,  setPreview]  = useState(user?.profileImage?.url || "");

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  // Initials fallback for avatar
  const initials = (form.name || user?.name || "?")
    .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setPreview(ev.target.result);
      try {
        const res = await uploadProfilePhoto(ev.target.result);
        const newUrl = res.data.imageUrl;
        setPreview(newUrl);
        setUser((prev) => ({
          ...prev,
          profileImage: { ...prev?.profileImage, url: newUrl },
        }));
        flash("success", "Profile photo updated");
      } catch {
        flash("danger", "Upload failed");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateMe(form);
      setUser(res.data.user);
      flash("success", "Profile updated successfully");
    } catch (err) {
      flash("danger", err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm)
      return flash("danger", "New passwords do not match");
    if (pwForm.newPw.length < 8)
      return flash("danger", "Password must be at least 8 characters");
    setPwSaving(true);
    try {
      await changePassword({ currentPassword: pwForm.current, newPassword: pwForm.newPw });
      setPwForm({ current: "", newPw: "", confirm: "" });
      flash("success", "Password changed successfully");
    } catch (err) {
      flash("danger", err.response?.data?.message || "Password change failed");
    } finally {
      setPwSaving(false);
    }
  };

  // Company fields — prefer populated createdBy admin, fall back to staff doc
  const admin       = (typeof user?.createdBy === "object" && user.createdBy) || {};
  const companyName = admin.companyName || user?.companyName || "—";
  const gst         = admin.gst         || user?.gst         || "—";
  const country     = admin.country     || user?.country     || "—";
  const address     = [
    admin.address  ?? user?.address,
    admin.city     ?? user?.city,
    admin.state    ?? user?.state,
  ].filter(Boolean).join(", ") || "—";

  // ── shared style tokens ───────────────────────────────────────────────────
  const card = {
    background: colors.bg1,
    border: `0.5px solid ${colors.border}`,
    borderRadius: 12,
    padding: "1.5rem",
    marginBottom: "1rem",
  };
  const sectionHeader = {
    display: "flex", alignItems: "center", gap: 10,
    marginBottom: "1.25rem", paddingBottom: "0.75rem",
    borderBottom: `0.5px solid ${colors.border}`,
  };
  const sectionIcon = {
    width: 32, height: 32, borderRadius: 8,
    background: colors.bg2,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const labelStyle = {
    fontSize: 11, fontWeight: 500,
    color: colors.text3,
    textTransform: "uppercase", letterSpacing: "0.04em",
    marginBottom: 5, display: "block",
  };
  const inputStyle = {
    fontSize: 13, padding: "8px 10px",
    borderRadius: 8, border: `0.5px solid ${colors.border2}`,
    background: colors.bg1, color: colors.text1,
    width: "100%", boxSizing: "border-box",
    outline: "none",
  };
  const inputReadonly = { ...inputStyle, background: colors.bg2, color: colors.text3 };
const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 12,
  marginBottom: 12,
};  
const Field = ({ label, value, onChange, placeholder, type = "text", readonly = false }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        style={readonly ? inputReadonly : inputStyle}
        type={type} value={value}
        onChange={onChange} placeholder={placeholder}
        readOnly={readonly}
      />
    </div>
  );

  return (
    <div
    style={{
      width: "100%",
      maxWidth: 900,
      margin: "0 auto",
    }}
  >

      <div
  style={{
    display: "flex",
    alignItems: "flex-start",
    gap: 12,

    padding: "14px 18px",
    marginBottom: "1.25rem",

    borderRadius: 12,

    background: "rgba(59,130,246,0.08)",
    border: "1px solid rgba(59,130,246,0.18)",

    color: "#93c5fd",

    boxShadow: "0 4px 20px rgba(59,130,246,0.05)",
  }}
>
  <div
    style={{
      width: 28,
      height: 28,
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",

      background: "rgba(59,130,246,0.15)",
      flexShrink: 0,

      fontSize: 14,
    }}
  >
    ℹ️
  </div>

  <div>
    <div
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: "#dbeafe",
        marginBottom: 4,
      }}
    >
      Profile Information
    </div>

    <div
      style={{
        fontSize: 12,
        lineHeight: 1.6,
        color: "#93c5fd",
      }}
    >
      You can update your profile photo, name, phone number, and designation.
      Email address and company information are managed by your administrator.
    </div>
  </div>
</div>

      {/* Flash message */}
     {msg.text && (
  <div
    style={{
      position: "fixed",
      top: 20,
      right: 20,
      zIndex: 9999,

      display: "flex",
      alignItems: "center",
      gap: 10,

      minWidth: 280,
      maxWidth: 400,

      padding: "14px 18px",
      borderRadius: 12,

      background:
        msg.type === "success"
          ? "rgba(22,163,74,0.95)"
          : "rgba(220,38,38,0.95)",

      color: "#fff",
      fontSize: 13,
      fontWeight: 500,

      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      backdropFilter: "blur(10px)",
    }}
  >
    {msg.type === "success" ? "✅" : "⚠️"}
    {msg.text}
  </div>
)}

      {/* ── Personal information card ── */}
      <form onSubmit={handleProfileSave}>
        <div style={card}>
          <div style={sectionHeader}>
            <div style={sectionIcon}>👤</div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: colors.text1, margin: 0 }}>
                Personal information
              </p>
              <p style={{ fontSize: 12, color: colors.text3, margin: 0 }}>
                Your name, contact details and role
              </p>
            </div>
          </div>

          {/* Avatar row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 20,
            padding: "1rem", background: colors.bg2, borderRadius: 8, marginBottom: "1.25rem",
          }}>
            {/* Avatar */}
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              border: `2px solid ${colors.border2}`,
              overflow: "hidden", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: colors.bg3, fontSize: 22, fontWeight: 500, color: colors.text2,
            }}>
              {preview
                ? <img src={preview} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials
              }
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 500, color: colors.text1, margin: "0 0 2px" }}>
                {form.name || user?.name || "Staff Member"}
              </p>
              <p style={{ fontSize: 12, color: colors.text3, margin: "0 0 10px" }}>
                {form.designation || "Employee"}&nbsp;
                <span style={{
                  display: "inline-block", fontSize: 11, padding: "2px 8px",
                  borderRadius: 20, background: colors.infoBg, color: colors.infoText,
                }}>Staff</span>
              </p>
              <label style={{
                display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12,
                padding: "6px 12px", borderRadius: 8,
                border: `0.5px solid ${colors.border2}`,
                background: colors.bg1, color: colors.text1,
                cursor: "pointer",
              }}>
                📷 Upload photo
                <input type="file" accept="image/*" onChange={handleImageChange} hidden />
              </label>
            </div>
          </div>

          <div style={grid2}>
            <Field label="Full name"        value={form.name}        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}        placeholder="Your full name" />
            <Field label="Email address"    value={user?.email || ""} readonly />
          </div>
          <div style={grid2}>
            <Field label="Phone number"     value={form.phone}       onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}       placeholder="+91 XXXXX XXXXX" />
            <Field label="Designation"      value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} placeholder="e.g. Sales Executive" />
          </div>

          <button
            type="submit" disabled={saving}
            style={{ ...btnPrimary, padding: "8px 18px", marginTop: 4, opacity: saving ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {saving ? "Saving…" : "✓ Save changes"}
          </button>
        </div>
      </form>

      {/* ── Change password card ── */}
      <form onSubmit={handlePasswordChange}>
        <div style={card}>
          <div style={sectionHeader}>
            <div style={sectionIcon}>🔒</div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: colors.text1, margin: 0 }}>Change password</p>
              <p style={{ fontSize: 12, color: colors.text3, margin: 0 }}>Update your account password</p>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <Field label="Current password"    type="password" value={pwForm.current} onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))} placeholder="••••••••" />
          </div>
          <div style={grid2}>
            <Field label="New password"         type="password" value={pwForm.newPw}   onChange={(e) => setPwForm((f) => ({ ...f, newPw: e.target.value }))}   placeholder="Min 8 characters" />
            <Field label="Confirm new password" type="password" value={pwForm.confirm} onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} placeholder="Repeat new password" />
          </div>

          <button
            type="submit" disabled={pwSaving}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 13, padding: "8px 18px", marginTop: 4, borderRadius: 8,
              border: `0.5px solid ${colors.border2}`,
              background: "transparent", color: colors.text1,
              cursor: pwSaving ? "not-allowed" : "pointer", opacity: pwSaving ? 0.6 : 1,
            }}
          >
            {pwSaving ? "Changing…" : "🔒 Update password"}
          </button>
        </div>
      </form>

      {/* ── Company info (read-only) card ── */}
      <div style={card}>
  <div style={sectionHeader}>
    <div style={sectionIcon}>🏢</div>
    <div>
      <p
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: colors.text1,
          margin: 0,
        }}
      >
        Company Information
      </p>

      <p
        style={{
          fontSize: 12,
          color: colors.text3,
          margin: 0,
        }}
      >
        Set by your administrator — read only
      </p>
    </div>
  </div>

  <div style={grid2}>
    <Field
      label="Company Name"
      value={companyName}
      readonly
    />

    <Field
      label="GST Number"
      value={gst}
      readonly
    />
  </div>

  <div style={grid2}>
    <Field
      label="Address"
      value={address}
      readonly
    />

    <Field
      label="Country"
      value={country}
      readonly
    />
  </div>
</div>

    </div>
  );
}