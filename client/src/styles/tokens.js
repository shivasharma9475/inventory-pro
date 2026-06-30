// src/styles/tokens.js

export const colors = {
  bg:          "#0f0f13",
  surface:     "#16161d",
  surface2:    "#1c1c26",
  border:      "rgba(255,255,255,0.07)",
  border2:     "rgba(255,255,255,0.12)",
  text1:       "#f1f0f5",
  text2:       "rgba(255,255,255,0.55)",
  text3:       "rgba(255,255,255,0.28)",
  accent:      "#7c6ff7",
  accentDim:   "rgba(124,111,247,0.1)",
  accentBorder:"rgba(124,111,247,0.3)",
  green:       "#34d399",
  greenDim:    "rgba(52,211,153,0.1)",
  red:         "#f87171",
  redDim:      "rgba(248,113,113,0.08)",
  amber:       "#fbbf24",
  amberDim:    "rgba(251,191,36,0.08)",
};

export const card = {
  background:   colors.surface,
  border:       `0.5px solid ${colors.border}`,
  borderRadius: 14,
};

export const inputBase = {
  background:   colors.surface2,
  border:       `0.5px solid ${colors.border2}`,
  borderRadius: 8,
  color:        colors.text1,
  padding:      "8px 12px",
  fontSize:     13,
  outline:      "none",
  boxSizing:    "border-box",
  transition:   "border-color 0.15s",
};

export const btnPrimary = {
  background:   colors.accent,
  color:        "#fff",
  border:       "none",
  borderRadius: 9,
  fontSize:     13,
  fontWeight:   500,
  cursor:       "pointer",
  display:      "inline-flex",
  alignItems:   "center",
  gap:          6,
  transition:   "opacity 0.15s",
};

export const sectionTitle = {
  fontSize:       11,
  fontWeight:     600,
  letterSpacing:  "0.1em",
  textTransform:  "uppercase",
  color:          colors.text3,
  marginBottom:   16,
  display:        "flex",
  alignItems:     "center",
  gap:            7,
};
