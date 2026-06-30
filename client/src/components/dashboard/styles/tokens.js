export const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Lato:wght@100;300;400&family=DM+Sans:wght@300;400&display=swap');
`;

export const globalStyles = `
  ${fonts}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #090a0f; font-family: 'DM Sans', sans-serif; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
  @keyframes fadeDown {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .anim { animation: fadeDown 0.4s ease both; }
  .hover-row:hover td { background: rgba(255,255,255,0.02); }
  .loader {
    display: inline-block; width: 15px; height: 15px;
    border: 1.5px solid rgba(255,255,255,0.12);
    border-top-color: #a78bfa; border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
`;

// ── Color tokens ──────────────────────────────────────────
export const colors = {
  purple: "#a78bfa",
  blue:   "#60a5fa",
  green:  "#34d399",
  red:    "#f87171",
  amber:  "#fbbf24",
  bg:     "#090a0f",
  surface:"rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.07)",
};

// ── Reusable style objects ────────────────────────────────
export const card = {
  background: colors.surface,
  border: `0.5px solid ${colors.border}`,
  borderRadius: 14,
};

export const inputBase = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "0.5px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  padding: "10px 14px",
  color: "#fff",
  fontSize: 13,
  fontFamily: "'DM Sans', sans-serif",
  outline: "none",
  caretColor: "#a78bfa",
};

export const inputError = {
  ...inputBase,
  border: "0.5px solid rgba(248,113,113,0.5)",
};

export const btnPrimary = {
  background: "linear-gradient(135deg,#7c3aed,#3b82f6)",
  border: "none", borderRadius: 10,
  color: "#fff", fontSize: 12,
  fontFamily: "'DM Sans', sans-serif",
  letterSpacing: "0.08em",
  padding: "9px 18px",
  cursor: "pointer", fontWeight: 300,
  display: "inline-flex", alignItems: "center", gap: 6,
};

export const btnDanger = {
  background: "rgba(248,113,113,0.08)",
  border: "0.5px solid rgba(248,113,113,0.25)",
  borderRadius: 8, color: "rgba(248,113,113,0.8)",
  fontSize: 11, fontFamily: "'DM Sans', sans-serif",
  padding: "6px 12px", cursor: "pointer",
};

export const btnGhost = {
  background: "rgba(255,255,255,0.04)",
  border: "0.5px solid rgba(255,255,255,0.1)",
  borderRadius: 8, color: "rgba(255,255,255,0.45)",
  fontSize: 11, fontFamily: "'DM Sans', sans-serif",
  padding: "6px 12px", cursor: "pointer",
};