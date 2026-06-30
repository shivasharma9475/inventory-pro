import { useState, useEffect } from "react";
import { useOutletContext, Navigate } from "react-router-dom";
import { getStaff, createStaff, deleteStaff } from "../services/staffService";
import {
  PageHeader,
  Modal,
  FormField,
  LoadingState,
  EmptyState,
  Badge,
} from "../components/dashboard/ui/index";
import {
  card,
  btnPrimary,
  btnDanger,
  btnGhost,
  colors,
} from "../components/dashboard/styles/tokens";

const EMPTY = { name: "", email: "", password: "", designation: "" };

const DESIGNATIONS = [
  "Manager",
  "Supervisor",
  "Cashier",
  "Stock Keeper",
  "Sales Staff",
  "Delivery Staff",
];

// Map designation → accent color
const DESIGNATION_COLORS = {
  Manager:        colors.purple,
  Supervisor:     colors.blue,
  Cashier:        colors.green,
  "Stock Keeper": colors.amber,
  "Sales Staff":  "#fb7185",
  "Delivery Staff": "#22d3ee",
};

// Initials avatar
function Avatar({ name }) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // deterministic color from name
  const palette = [colors.purple, colors.blue, colors.green, colors.amber, "#fb7185", "#22d3ee"];
  const color = palette[(name?.charCodeAt(0) || 0) % palette.length];

  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        background: `${color}18`,
        border: `0.5px solid ${color}28`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 400,
        color,
        letterSpacing: "0.05em",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// Table header cell
function TH({ children, width }) {
  return (
    <th
      style={{
        padding: "10px 16px",
        textAlign: "left",
        fontSize: 9,
        fontWeight: 400,
        color: "rgba(255,255,255,0.22)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        borderBottom: `0.5px solid ${colors.border}`,
        width,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

// Table data cell
function TD({ children, style = {} }) {
  return (
    <td
      style={{
        padding: "12px 16px",
        fontSize: 12,
        color: "rgba(255,255,255,0.55)",
        borderBottom: `0.5px solid rgba(255,255,255,0.04)`,
        verticalAlign: "middle",
        ...style,
      }}
    >
      {children}
    </td>
  );
}

export default function Staff() {
  const { isAdmin } = useOutletContext();
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const [staff, setStaff]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState(EMPTY);
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getStaff();
      setStaff(res.data || []);
    } catch (err) {
      console.error("Load staff error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const upd = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())                        e.name = "Name is required";
    if (!form.email.trim())                       e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter valid email";
    if (!form.password || form.password.length < 6) e.password = "Minimum 6 characters";
    if (!form.designation)                        e.designation = "Select designation";
    return e;
  };

  const handleCreate = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await createStaff({
        name: form.name, email: form.email,
        password: form.password, designation: form.designation,
      });
      setShowAdd(false); setForm(EMPTY); setErrors({});
      load();
    } catch (err) {
      setErrors({ general: err.response?.data?.message || "Failed to create staff" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this staff member?")) return;
    try {
      await deleteStaff(id);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const closeModal = () => { setShowAdd(false); setForm(EMPTY); setErrors({}); };

  return (
    <div className="anim">
      {/* HEADER */}
      <PageHeader
        title="Staff"
        subtitle={`${staff.length} staff member${staff.length !== 1 ? "s" : ""}`}
        action={
          <button style={btnPrimary} onClick={() => setShowAdd(true)}>
            + Add Staff
          </button>
        }
      />

      {/* TABLE CARD */}
      <div style={{ ...card, overflow: "hidden" }}>
        {loading ? (
          <LoadingState />
        ) : staff.length === 0 ? (
          <EmptyState message="No staff members yet." />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <TH width={40}>#</TH>
                <TH>Member</TH>
                <TH>Email</TH>
                <TH>Designation</TH>
                <TH>Joined</TH>
                <TH width={90}>Action</TH>
              </tr>
            </thead>
            <tbody>
              {staff.map((s, i) => {
                const desigColor =
                  DESIGNATION_COLORS[s.designation] || colors.purple;

                return (
                  <tr
                    key={s._id}
                    className="hover-row"
                    style={{ transition: "background 0.15s" }}
                  >
                    {/* # */}
                    <TD style={{ color: "rgba(255,255,255,0.15)", fontSize: 11 }}>
                      {String(i + 1).padStart(2, "0")}
                    </TD>

                    {/* Member — avatar + name */}
                    <TD>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={s.name} />
                        <span
                          style={{
                            fontSize: 13,
                            color: "rgba(255,255,255,0.75)",
                            fontWeight: 400,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.name || "—"}
                        </span>
                      </div>
                    </TD>

                    {/* Email */}
                    <TD>
                      <span
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.35)",
                          fontFamily: "monospace",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {s.email}
                      </span>
                    </TD>

                    {/* Designation badge */}
                    <TD>
                      {s.designation ? (
                        <Badge label={s.designation} color={desigColor} />
                      ) : (
                        <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 11 }}>—</span>
                      )}
                    </TD>

                    {/* Joined date */}
                    <TD>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                        {s.createdAt
                          ? new Date(s.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </TD>

                    {/* Action */}
                    <TD>
                      <button
                        onClick={() => handleDelete(s._id)}
                        style={btnDanger}
                      >
                        Remove
                      </button>
                    </TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {showAdd && (
        <Modal title="Add Staff Member" onClose={closeModal}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {errors.general && (
              <p style={{ color: colors.red, fontSize: 12 }}>{errors.general}</p>
            )}

            <FormField
              label="Full Name" placeholder="Enter staff name"
              value={form.name} onChange={upd("name")}
              error={errors.name} required
            />
            <FormField
              label="Email Address" type="email" placeholder="staff@company.com"
              value={form.email} onChange={upd("email")}
              error={errors.email} required
            />
            <FormField
              label="Password" type="password" placeholder="Min 6 characters"
              value={form.password} onChange={upd("password")}
              error={errors.password} required
            />
            <FormField
              label="Designation" type="select"
              value={form.designation} onChange={upd("designation")}
              error={errors.designation} options={DESIGNATIONS}
              placeholder="Select role" required
            />

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={closeModal} style={{ ...btnGhost, flex: 1 }}>
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                style={{ ...btnPrimary, flex: 1, justifyContent: "center", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Creating…" : "Create Staff"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}