// pages/DashboardHome.jsx — Enterprise Interactive Dashboard
// Zero backend changes — all service imports are identical.

import { useState, useEffect, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
} from "recharts";

import {
  getDashboardStats,
  getInventoryValue,
  getMonthlySales,
  getTopSelling,
  getCategoryStats,
  getLowStock,
} from "../services/dashboardService";

import { LoadingState } from "../components/dashboard/ui/index";
import socket from "../socket";
import ExportButton from "../components/common/ExportButton";
import { exportDashboardReport } from "../services/exportService";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  purple: "#a78bfa", blue: "#60a5fa", green: "#34d399",
  red: "#f87171", amber: "#fbbf24", orange: "#fb923c",
  bg: "#090a0f", surface: "rgba(255,255,255,0.025)",
  border: "rgba(255,255,255,0.07)", borderHover: "rgba(255,255,255,0.13)",
  text: "#fff", textMid: "rgba(255,255,255,0.55)", textLow: "rgba(255,255,255,0.28)",
  textFaint: "rgba(255,255,255,0.12)",
};
const PIE_COLORS = [T.purple, T.blue, T.green, T.amber, T.red, T.orange];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Utility ──────────────────────────────────────────────────────────────────
const fmt  = (n) => Number(n || 0).toLocaleString("en-IN");
const fmtR = (n) => `₹${fmt(n)}`;
const fmtK = (n) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(1)}k` : fmtR(n);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ─── Shared primitives ────────────────────────────────────────────────────────
const Eyebrow = ({ children, style }) => (
  <p style={{ fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase",
    color:T.textLow, fontWeight:500, fontFamily:"'DM Sans',sans-serif", ...style }}>
    {children}
  </p>
);

const Divider = ({ vertical, style }) =>
  vertical
    ? <div style={{ width:1, alignSelf:"stretch", background:T.border, ...style }}/>
    : <div style={{ height:"0.5px", background:T.border, margin:"0", ...style }}/>;

const Panel = ({ children, style, glow }) => (
  <div style={{
    background: T.surface, border:`0.5px solid ${T.border}`,
    borderRadius:16, overflow:"hidden", transition:"border-color 0.2s",
    ...(glow ? { boxShadow:`0 0 0 0.5px ${glow}28, 0 8px 32px ${glow}08` } : {}),
    ...style,
  }}>{children}</div>
);

const PanelHead = ({ title, right, sub }) => (
  <div style={{ padding:"14px 18px", borderBottom:`0.5px solid ${T.border}`,
    display:"flex", alignItems:"center", justifyContent:"space-between" }}>
    <div>
      <Eyebrow>{title}</Eyebrow>
      {sub && <p style={{ fontSize:11, color:T.textLow, marginTop:2 }}>{sub}</p>}
    </div>
    {right && <div style={{ display:"flex", alignItems:"center", gap:8 }}>{right}</div>}
  </div>
);

const Pill = ({ label, color, bg, dot }) => (
  <span style={{ fontSize:10, padding:"3px 9px", borderRadius:20, fontWeight:500,
    background:bg||`${color}18`, border:`0.5px solid ${color}35`, color,
    letterSpacing:"0.05em", display:"inline-flex", alignItems:"center", gap:5 }}>
    {dot && <span style={{ width:5, height:5, borderRadius:"50%", background:color, flexShrink:0 }}/>}
    {label}
  </span>
);

const TabBtn = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    padding:"5px 13px", borderRadius:20, fontSize:10, cursor:"pointer",
    fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.07em", textTransform:"uppercase",
    outline:"none", transition:"all 0.15s",
    background: active ? "rgba(167,139,250,0.15)" : "transparent",
    border:`0.5px solid ${active ? "rgba(167,139,250,0.4)" : T.border}`,
    color: active ? T.purple : T.textLow,
  }}>{label}</button>
);

const SparkBar = ({ value, max, color }) => (
  <div style={{ flex:1, height:4, borderRadius:2, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
    <div style={{ width:`${clamp(max>0?(value/max)*100:0,0,100)}%`, height:"100%",
      borderRadius:2, background:color, transition:"width 0.9s ease" }}/>
  </div>
);

// Animated counter hook
const useCount = (target, duration=1200) => {
  const [val, setVal] = useState(0);
  const ref = useRef();
  useEffect(() => {
    const start = performance.now();
    const t = Number(target)||0;
    cancelAnimationFrame(ref.current);
    const step = (now) => {
      const p = Math.min((now - start)/duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * t));
      if (p < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(ref.current);
  }, [target]);
  return val;
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label, prefix="", suffix="" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"rgba(9,10,15,0.97)", border:"0.5px solid rgba(167,139,250,0.3)",
      borderRadius:10, padding:"9px 14px", backdropFilter:"blur(16px)",
      boxShadow:"0 8px 24px rgba(0,0,0,0.5)" }}>
      {label && <p style={{ color:T.textLow, fontSize:10, marginBottom:5 }}>{label}</p>}
      {payload.map((p,i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:7 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:p.color||T.purple, flexShrink:0 }}/>
          <p style={{ color:p.color||T.purple, fontSize:13, fontWeight:300 }}>
            {prefix}{typeof p.value==="number"?fmt(p.value):p.value}{suffix}
          </p>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, rawValue, display, sub, color, icon, onClick, active, delay=0 }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      className="anim"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        animationDelay:`${delay}s`,
        background: active ? `${color}0e` : T.surface,
        border:`0.5px solid ${active ? color+"50" : hov ? T.borderHover : T.border}`,
        borderRadius:16, padding:"20px 18px", position:"relative", overflow:"hidden",
        cursor: onClick ? "pointer" : "default",
        transition:"all 0.2s",
        transform: hov && onClick ? "translateY(-2px)" : "none",
        boxShadow: active ? `0 0 0 0.5px ${color}30, 0 8px 32px ${color}10` : "none",
      }}>
      {/* glow blob */}
      <div style={{ position:"absolute", width:120, height:120, borderRadius:"50%",
        background:`radial-gradient(circle,${color}20 0%,transparent 70%)`,
        top:-30, right:-30, pointerEvents:"none" }}/>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <Eyebrow>{label}</Eyebrow>
        <div style={{ width:32, height:32, borderRadius:9,
          background:`${color}18`, border:`0.5px solid ${color}35`,
          display:"flex", alignItems:"center", justifyContent:"center",
          color, fontSize:15, flexShrink:0, transition:"transform 0.2s",
          transform: hov ? "scale(1.1)" : "scale(1)" }}>
          {icon}
        </div>
      </div>

      <p style={{ fontSize:28, fontWeight:300, color:T.text, letterSpacing:"-0.02em",
        lineHeight:1, marginBottom:8, fontFamily:"'Lato',sans-serif" }}>
        {display}
      </p>

      {sub && <p style={{ fontSize:11, color:T.textLow }}>{sub}</p>}
      {onClick && (
        <p style={{ fontSize:10, color:`${color}80`, marginTop:6, letterSpacing:"0.05em" }}>
          {active ? "▴ Filtered below" : "Click to filter ›"}
        </p>
      )}
    </div>
  );
};

// ─── Animated number display ──────────────────────────────────────────────────
const AnimNum = ({ value, prefix="", suffix="" }) => {
  const v = useCount(value);
  return <>{prefix}{fmt(v)}{suffix}</>;
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardHome() {
  const { user } = useOutletContext();

  // Raw data
  const [stats,      setStats]      = useState({});
  const [invValue,   setInvValue]   = useState(0);
  const [monthly,    setMonthly]    = useState([]);
  const [topSelling, setTop]        = useState([]);
  const [categories, setCategories] = useState([]);
  const [lowStock,   setLowStock]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [lastRefresh,setLastRefresh]= useState(null);

  // UI state
  const [trendTab,   setTrendTab]   = useState("sales");    // sales | revenue
  const [chartType,  setChartType]  = useState("area");     // area | bar | line
  const [filterCat,  setFilterCat]  = useState(null);       // category filter
  const [hovKpi,     setHovKpi]     = useState(null);
  const [alertPage,  setAlertPage]  = useState(0);
  const [topN,       setTopN]       = useState(5);
  const [showAll,    setShowAll]    = useState(false);

  const ALERTS_PER_PAGE = 4;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, v, m, t, c, l] = await Promise.all([
        getDashboardStats(),
        getInventoryValue(),
        getMonthlySales(),
        getTopSelling(),
        getCategoryStats(),
        getLowStock(20),
      ]);
      setStats(s.data ?? {});
      setInvValue(v.data?.totalValue ?? 0);
      // getMonthlySales now returns real { label, unitsSold, revenue } objects
      // aggregated from actual Bill records — previously this multiplied a
      // fabricated number by an arbitrary 1240 to fake a revenue figure,
      // because the backend was returning meaningless data to begin with.
      const raw = m.data ?? [];
      setMonthly(raw.map((entry) => ({
        month: entry.label,
        sales: entry.unitsSold ?? 0,
        revenue: entry.revenue ?? 0,
      })));
      setTop(t.data ?? []);
      setCategories(c.data ?? []);
      setLowStock(l.data ?? []);
      setLastRefresh(new Date());
    } catch(e) { console.error("Dashboard:", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Real-time refresh ───────────────────────────────────────────────────
  // Stock edits, new/removed products, and bills all change these stats, but
  // each can fire in quick succession (e.g. one bill with 10 line items
  // emits 10 stockUpdated events). Debounce so a burst triggers one refetch,
  // not ten.
  useEffect(() => {
    let debounceTimer = null;

    const scheduleRefresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => load(), 600);
    };

    const events = [
      "product:stockUpdated",
      "product:created",
      "product:updated",
      "product:deleted",
      "product:restored",
      "bill:created",
    ];

    events.forEach((evt) => socket.on(evt, scheduleRefresh));

    return () => {
      clearTimeout(debounceTimer);
      events.forEach((evt) => socket.off(evt, scheduleRefresh));
    };
  }, [load]);

  if (loading) return <LoadingState />;

  // ── Derived ────────────────────────────────────────────────────────────────
  const displayName = user?.role==="admin"
    ? user?.companyName?.trim()||"Company"
    : user?.name?.trim()||"User";
  const displayRole = user?.role==="admin"?"Administrator":user?.designation?.trim()||"Staff";
  const isAdmin     = user?.role==="admin";

  const totalProducts = stats.totalProducts ?? 0;
  const lowCount      = lowStock.length;
  const healthPct     = totalProducts>0
    ? Math.round(((totalProducts-lowCount)/totalProducts)*100) : 100;

  const totalSales   = monthly.reduce((s,m)=>s+(m.sales??0),0);
  const totalRevenue = monthly.reduce((s,m)=>s+(m.revenue??0),0);
  const topMax       = topSelling.reduce((m,p)=>Math.max(m,p.totalQuantity??0),1);

  const filteredTop = filterCat
    ? topSelling.filter(p=>p.category===filterCat)
    : topSelling;

  // Alerts pagination
  const critical = lowStock.filter(p=>p.stock===0);
  const high     = lowStock.filter(p=>p.stock>0&&p.stock<=2);
  const medium   = lowStock.filter(p=>p.stock>2);
  const alertsToShow = showAll ? lowStock : lowStock.slice(alertPage*ALERTS_PER_PAGE,(alertPage+1)*ALERTS_PER_PAGE);
  const totalAlertPages = Math.ceil(lowStock.length/ALERTS_PER_PAGE);

  // Category totals for radial chart
  const catTotal = categories.reduce((s,c)=>s+(c.count||0),0);

  // Peak month
  const peakMonth = monthly.length>0
    ? monthly.reduce((b,m)=>(m[trendTab]??0)>(b[trendTab]??0)?m:b, monthly[0])
    : null;

  const now = new Date();
  const timeLabel = now.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const refreshLabel = lastRefresh?.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});

  // Trend chart data key
  const trendKey = trendTab==="revenue"?"revenue":"sales";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="anim" style={{ fontFamily:"'DM Sans',sans-serif" }}>

      {/* ══════════════ HEADER ══════════════ */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <div style={{ display:"inline-flex", alignItems:"center", gap:7,
            padding:"4px 12px", borderRadius:100, marginBottom:10,
            background:"rgba(255,255,255,0.03)", border:`0.5px solid ${T.border}` }}>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
              <rect x="1"    y="1"    width="7.5" height="7.5" rx="1.5" fill="#a78bfa" opacity=".9"/>
              <rect x="11.5" y="1"    width="7.5" height="7.5" rx="1.5" fill="#60a5fa" opacity=".9"/>
              <rect x="1"    y="11.5" width="7.5" height="7.5" rx="1.5" fill="#60a5fa" opacity=".45"/>
              <rect x="11.5" y="11.5" width="7.5" height="7.5" rx="1.5" fill="#a78bfa" opacity=".45"/>
            </svg>
            <span style={{ fontSize:10, letterSpacing:"0.14em", color:T.textLow, textTransform:"uppercase" }}>
              Inventory Pro
            </span>
          </div>

          <h1 style={{ fontSize:24, fontWeight:300, color:T.text, fontFamily:"'Lato',sans-serif",
            letterSpacing:"0.01em", lineHeight:1.2, marginBottom:5 }}>
            Good {now.getHours()<12?"morning":now.getHours()<17?"afternoon":"evening"},{" "}
            <span style={{ background:"linear-gradient(135deg,#a78bfa,#60a5fa)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              {displayName}
            </span>
          </h1>
          <p style={{ fontSize:12, color:T.textLow, letterSpacing:"0.03em" }}>
            {displayRole}&nbsp;·&nbsp;{timeLabel}
          </p>
        </div>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:10 }}>
          {/* Status chips */}
          <div style={{ display:"flex", gap:7, flexWrap:"wrap", justifyContent:"flex-end" }}>
            {critical.length>0 && <Pill label={`${critical.length} Critical`} color={T.red}/>}
            {high.length>0    && <Pill label={`${high.length} High Risk`}   color={T.orange}/>}
            <Pill label={`${healthPct}% Health`}
              color={healthPct>=80?T.green:healthPct>=50?T.amber:T.red}
              dot/>
            {isAdmin && <Pill label="Admin" color={T.purple}/>}
          </div>
          {/* Refresh button */}
          <button onClick={load} style={{
            display:"flex", alignItems:"center", gap:6, padding:"6px 13px",
            borderRadius:20, fontSize:11, cursor:"pointer", outline:"none",
            background:"rgba(255,255,255,0.03)", border:`0.5px solid ${T.border}`,
            color:T.textLow, fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s",
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M10.5 6A4.5 4.5 0 112.3 3M1 1v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            {refreshLabel ? `Updated ${refreshLabel}` : "Refresh"}
          </button>
          {/* PDF report export — admin only, matches backend RBAC on /api/export/dashboard/pdf */}
          {isAdmin && (
            <ExportButton
              label="Download Report"
              formats={[{ key: "pdf", label: "PDF Report" }]}
              onExport={() => exportDashboardReport()}
            />
          )}
        </div>
      </div>

      {/* ══════════════ KPI ROW ══════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:14 }}>

        <KpiCard delay={0} label="Total Products" display={<AnimNum value={totalProducts}/>}
          rawValue={totalProducts} sub={`across ${categories.length} categories`}
          color={T.purple}
          icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M2 4l6-2 6 2v6l-6 4-6-4V4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            <path d="M8 2v10M2 4l6 4 6-4" stroke="currentColor" strokeWidth="1"/>
          </svg>}/>

        <KpiCard delay={0.05} label="Inventory Value" display={<AnimNum value={invValue} prefix="₹"/>}
          rawValue={invValue} sub="current stock valuation"
          color={T.green}
          icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v14M5 4h4.5a2.5 2.5 0 010 5H5m0 0h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>}/>

        <KpiCard delay={0.1} label="Total Sales" display={<AnimNum value={totalSales}/>}
          rawValue={totalSales} sub="units sold all time"
          color={T.blue}
          icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M1 12L5 7l3 3 3-4 3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>}/>

        <KpiCard delay={0.15}
          label="Low Stock Items"
          display={<AnimNum value={lowCount}/>}
          rawValue={lowCount}
          sub={lowCount>0?`${critical.length} critical · ${high.length} high`:"All products stocked well"}
          color={lowCount>0?T.red:T.green}
          icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v7M8 11v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="14" r=".7" fill="currentColor"/>
          </svg>}/>
      </div>

      {/* ══════════════ SECONDARY KPI STRIP ══════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:14 }}>
        {[
          { label:"Staff Members",      value:stats.totalStaff??0,      color:T.blue,   prefix:"",  suffix:"" },
          { label:"Revenue (est.)",     value:totalRevenue,             color:T.green,  prefix:"₹", suffix:"" },
          { label:"Peak Month",         value:peakMonth?.month||"—",    color:T.purple, isStr:true       },
          { label:"Avg Monthly Sales",  value:monthly.length>0?Math.round(totalSales/monthly.length):0, color:T.amber, suffix:" units" },
        ].map(({ label, value, color, prefix="", suffix="", isStr }, i) => (
          <div key={label} className="anim" style={{
            animationDelay:`${0.2+i*0.04}s`,
            background:T.surface, border:`0.5px solid ${T.border}`,
            borderRadius:12, padding:"13px 16px",
            display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <div>
              <Eyebrow style={{ marginBottom:5 }}>{label}</Eyebrow>
              <p style={{ fontSize:18, fontWeight:300, color:T.text, fontFamily:"'Lato',sans-serif" }}>
                {isStr ? value : <>{prefix}<AnimNum value={value}/>{suffix}</>}
              </p>
            </div>
            <div style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0 }}/>
          </div>
        ))}
      </div>

      {/* ══════════════ MAIN CHART ROW ══════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:12, marginBottom:12 }}>

        {/* ── Sales / Revenue Trend ── */}
        <Panel>
          <PanelHead
            title="Performance trend"
            sub={`${monthly.length} months of data`}
            right={<>
              <div style={{ display:"flex", gap:4 }}>
                <TabBtn label="Sales"   active={trendTab==="sales"}   onClick={()=>setTrendTab("sales")}/>
                <TabBtn label="Revenue" active={trendTab==="revenue"} onClick={()=>setTrendTab("revenue")}/>
              </div>
              <Divider vertical style={{ height:20, margin:"0 4px" }}/>
              <div style={{ display:"flex", gap:4 }}>
                <TabBtn label="Area" active={chartType==="area"} onClick={()=>setChartType("area")}/>
                <TabBtn label="Bar"  active={chartType==="bar"}  onClick={()=>setChartType("bar")}/>
                <TabBtn label="Line" active={chartType==="line"} onClick={()=>setChartType("line")}/>
              </div>
            </>}
          />

          {/* Summary strip */}
          <div style={{ display:"flex", borderBottom:`0.5px solid ${T.border}` }}>
            {[
              { label:"Total",  value:trendTab==="revenue"?fmtK(totalRevenue):fmt(totalSales), color:T.purple },
              { label:"Peak",   value:peakMonth ? (trendTab==="revenue"?fmtK(peakMonth.revenue):fmt(peakMonth.sales)) : "—", color:T.blue },
              { label:"Month",  value:peakMonth?.month||"—", color:T.green },
              { label:"Avg",    value:monthly.length>0
                ? (trendTab==="revenue"
                    ? fmtK(Math.round(totalRevenue/monthly.length))
                    : fmt(Math.round(totalSales/monthly.length)))
                : "—", color:T.amber },
            ].map(({ label, value, color }, i) => (
              <div key={label} style={{
                flex:1, padding:"12px 18px",
                borderRight: i<3 ? `0.5px solid ${T.border}` : "none",
              }}>
                <Eyebrow style={{ marginBottom:4 }}>{label}</Eyebrow>
                <p style={{ fontSize:16, fontWeight:300, color, fontFamily:"'Lato',sans-serif" }}>{value}</p>
              </div>
            ))}
          </div>

          <div style={{ padding:"18px 18px 14px" }}>
            {monthly.length>0 ? (
              <ResponsiveContainer width="100%" height={200}>
                {chartType==="bar" ? (
                  <BarChart data={monthly} margin={{ top:4,right:4,left:-16,bottom:0 }}>
                    <defs>
                      <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={T.purple} stopOpacity="0.9"/>
                        <stop offset="100%" stopColor={T.purple} stopOpacity="0.3"/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false}/>
                    <XAxis dataKey="month" tick={{ fill:T.textLow,fontSize:10,fontFamily:"'DM Sans',sans-serif" }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:T.textLow,fontSize:10,fontFamily:"'DM Sans',sans-serif" }} axisLine={false} tickLine={false} width={38}
                      tickFormatter={trendTab==="revenue"?fmtK:undefined}/>
                    <Tooltip content={<ChartTip prefix={trendTab==="revenue"?"₹":""} suffix={trendTab==="sales"?" units":""}/>}/>
                    <Bar dataKey={trendKey} fill="url(#barG)" radius={[4,4,0,0]}/>
                  </BarChart>
                ) : chartType==="line" ? (
                  <LineChart data={monthly} margin={{ top:4,right:4,left:-16,bottom:0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false}/>
                    <XAxis dataKey="month" tick={{ fill:T.textLow,fontSize:10,fontFamily:"'DM Sans',sans-serif" }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:T.textLow,fontSize:10,fontFamily:"'DM Sans',sans-serif" }} axisLine={false} tickLine={false} width={38}
                      tickFormatter={trendTab==="revenue"?fmtK:undefined}/>
                    <Tooltip content={<ChartTip prefix={trendTab==="revenue"?"₹":""} suffix={trendTab==="sales"?" units":""}/>}/>
                    <Line type="monotone" dataKey={trendKey} stroke={T.purple} strokeWidth={2}
                      dot={{ r:3, fill:T.purple, strokeWidth:0 }}
                      activeDot={{ r:5, fill:T.purple, stroke:"rgba(167,139,250,0.3)", strokeWidth:4 }}/>
                  </LineChart>
                ) : (
                  <AreaChart data={monthly} margin={{ top:4,right:4,left:-16,bottom:0 }}>
                    <defs>
                      <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={T.purple} stopOpacity="0.25"/>
                        <stop offset="100%" stopColor={T.purple} stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false}/>
                    <XAxis dataKey="month" tick={{ fill:T.textLow,fontSize:10,fontFamily:"'DM Sans',sans-serif" }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:T.textLow,fontSize:10,fontFamily:"'DM Sans',sans-serif" }} axisLine={false} tickLine={false} width={38}
                      tickFormatter={trendTab==="revenue"?fmtK:undefined}/>
                    <Tooltip content={<ChartTip prefix={trendTab==="revenue"?"₹":""} suffix={trendTab==="sales"?" units":""}/>}/>
                    <Area type="monotone" dataKey={trendKey} stroke={T.purple} strokeWidth={1.8}
                      fill="url(#areaG)"
                      dot={false}
                      activeDot={{ r:4, fill:T.purple, stroke:"rgba(167,139,250,0.3)", strokeWidth:4 }}/>
                  </AreaChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <p style={{ color:T.textFaint, fontSize:12 }}>No sales data yet</p>
              </div>
            )}
          </div>
        </Panel>

        {/* ── Category Donut ── */}
        <Panel>
          <PanelHead title="Category breakdown" sub={`${catTotal} total SKUs`}/>
          <div style={{ padding:"16px 18px" }}>
            {categories.length>0 ? (
              <>
                <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
                  <div style={{ position:"relative" }}>
                    <PieChart width={130} height={130}>
                      <Pie data={categories} dataKey="count" nameKey="_id"
                        cx="50%" cy="50%" outerRadius={58} innerRadius={36}
                        strokeWidth={0} paddingAngle={2}>
                        {categories.map((_,i)=>(
                          <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} opacity={filterCat===categories[i]?._id?1:0.85}/>
                        ))}
                      </Pie>
                    </PieChart>
                    <div style={{ position:"absolute", inset:0, display:"flex",
                      flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                      <p style={{ fontSize:18, fontWeight:300, color:T.text, fontFamily:"'Lato',sans-serif" }}>{catTotal}</p>
                      <p style={{ fontSize:9, color:T.textLow, letterSpacing:"0.07em" }}>SKUs</p>
                    </div>
                  </div>
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {categories.slice(0,6).map((c,i)=>{
                    const pct = catTotal>0?Math.round((c.count/catTotal)*100):0;
                    const col = PIE_COLORS[i%PIE_COLORS.length];
                    const isActive = filterCat===c._id;
                    return (
                      <div key={c._id||i}
                        onClick={()=>setFilterCat(isActive?null:c._id)}
                        style={{ cursor:"pointer", padding:"6px 8px", borderRadius:8, transition:"all 0.15s",
                          background:isActive?`${col}10`:"transparent",
                          border:`0.5px solid ${isActive?col+"35":"transparent"}` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                            <span style={{ width:7, height:7, borderRadius:"50%", background:col, flexShrink:0 }}/>
                            <span style={{ fontSize:12, color:isActive?T.text:T.textMid }}>
                              {c._id||"Other"}
                            </span>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:11, color:T.textLow }}>{c.count}</span>
                            <span style={{ fontSize:10, color:col, fontWeight:500, minWidth:28, textAlign:"right" }}>{pct}%</span>
                          </div>
                        </div>
                        <SparkBar value={c.count} max={categories[0]?.count||1} color={col}/>
                      </div>
                    );
                  })}
                </div>
                {filterCat && (
                  <button onClick={()=>setFilterCat(null)} style={{
                    marginTop:10, width:"100%", padding:"7px", borderRadius:8, fontSize:11,
                    cursor:"pointer", outline:"none", fontFamily:"'DM Sans',sans-serif",
                    background:"rgba(255,255,255,0.04)", border:`0.5px solid ${T.border}`,
                    color:T.textMid, transition:"all 0.15s",
                  }}>✕ Clear filter</button>
                )}
              </>
            ) : (
              <p style={{ color:T.textFaint, fontSize:12, padding:"30px 0", textAlign:"center" }}>No categories</p>
            )}
          </div>
        </Panel>
      </div>

      {/* ══════════════ MIDDLE ROW: TOP PRODUCTS + ALERTS ══════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>

        {/* ── Top Selling Products ── */}
        <Panel>
          <PanelHead
            title={filterCat ? `Top products · ${filterCat}` : "Top selling products"}
            sub="total units sold"
            right={<>
              {[5,8,10].map(n=>(
                <TabBtn key={n} label={`Top ${n}`} active={topN===n} onClick={()=>setTopN(n)}/>
              ))}
            </>}
          />
          <div style={{ padding:"10px 0" }}>
            {filteredTop.length>0 ? (
              filteredTop.slice(0,topN).map((p,i)=>{
                const col = PIE_COLORS[i%PIE_COLORS.length];
                const pct = clamp(topMax>0?((p.totalQuantity??0)/topMax)*100:0,0,100);
                return (
                  <div key={p._id||i} style={{
                    padding:"10px 18px",
                    borderBottom: i<Math.min(filteredTop.length,topN)-1 ? `0.5px solid ${T.border}` : "none",
                    transition:"background 0.12s",
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                        {/* Rank badge */}
                        <div style={{
                          width:24, height:24, borderRadius:7, flexShrink:0,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:10, fontWeight:600,
                          background: i===0?"rgba(251,191,36,0.15)":i===1?"rgba(156,163,175,0.12)":i===2?"rgba(180,122,82,0.12)":"rgba(255,255,255,0.04)",
                          border:`0.5px solid ${i===0?"rgba(251,191,36,0.4)":i===1?"rgba(156,163,175,0.3)":i===2?"rgba(180,122,82,0.3)":"rgba(255,255,255,0.07)"}`,
                          color: i===0?T.amber:i===1?"#9ca3af":i===2?"#b47a52":T.textLow,
                        }}>
                          {i===0?"★":i+1}
                        </div>

                        <div style={{ minWidth:0 }}>
                          <p style={{ fontSize:13, color:T.textMid, whiteSpace:"nowrap",
                            overflow:"hidden", textOverflow:"ellipsis", maxWidth:180 }}>{p.name}</p>
                          {p.category && (
                            <p style={{ fontSize:10, color:T.textLow }}>{p.category}</p>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <p style={{ fontSize:14, fontWeight:300, color:col, fontFamily:"'Lato',sans-serif" }}>
                          {fmt(p.totalQuantity??0)}
                        </p>
                        <p style={{ fontSize:9, color:T.textFaint, letterSpacing:"0.06em" }}>UNITS SOLD</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ flex:1, height:5, borderRadius:3, background:"rgba(255,255,255,0.05)", overflow:"hidden" }}>
                        <div style={{ width:`${pct}%`, height:"100%", borderRadius:3, background:col,
                          transition:"width 1s ease", opacity:0.8 }}/>
                      </div>
                      <span style={{ fontSize:9, color:T.textFaint, minWidth:28, textAlign:"right" }}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding:"40px", textAlign:"center" }}>
                <p style={{ color:T.textFaint, fontSize:12 }}>
                  {filterCat ? `No products in "${filterCat}"` : "No sales data yet"}
                </p>
              </div>
            )}
          </div>
        </Panel>

        {/* ── Stock Alerts ── */}
        <Panel glow={lowCount>0?T.red:undefined}>
          <PanelHead
            title="Stock alerts"
            sub={lowCount>0 ? `${critical.length} critical · ${high.length} high · ${medium.length} medium` : "All products healthy"}
            right={
              lowCount>0
                ? <Pill label={`${lowCount} alerts`} color={T.red}/>
                : <Pill label="All clear" color={T.green}/>
            }
          />

          {/* Health bar */}
          <div style={{ padding:"12px 18px", borderBottom:`0.5px solid ${T.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
              <span style={{ fontSize:11, color:T.textLow }}>Stock health</span>
              <span style={{ fontSize:13, fontWeight:300, fontFamily:"'Lato',sans-serif",
                color:healthPct>=80?T.green:healthPct>=50?T.amber:T.red }}>{healthPct}%</span>
            </div>
            <div style={{ height:7, borderRadius:4, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
              <div style={{ width:`${healthPct}%`, height:"100%", borderRadius:4,
                background: healthPct>=80
                  ? "linear-gradient(90deg,#34d399,#6ee7b7)"
                  : healthPct>=50 ? "linear-gradient(90deg,#fbbf24,#fde68a)"
                  : "linear-gradient(90deg,#f87171,#fca5a5)",
                transition:"width 1.2s ease" }}/>
            </div>
            {/* Severity breakdown */}
            <div style={{ display:"flex", gap:16, marginTop:8 }}>
              {[
                { label:"Critical", count:critical.length, color:T.red    },
                { label:"High",     count:high.length,     color:T.orange },
                { label:"Medium",   count:medium.length,   color:T.amber  },
                { label:"OK",       count:totalProducts-lowCount, color:T.green },
              ].map(({ label, count, color }) => (
                <div key={label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:color }}/>
                  <span style={{ fontSize:10, color:T.textLow }}>{label}</span>
                  <span style={{ fontSize:10, color, fontWeight:500 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alert list */}
          <div style={{ minHeight:180 }}>
            {lowCount===0 ? (
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"20px 18px" }}>
                <div style={{ width:32, height:32, borderRadius:"50%",
                  background:"rgba(52,211,153,0.08)", border:"0.5px solid rgba(52,211,153,0.2)",
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1.5 7.5l4 4 7-8" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p style={{ color:T.green, fontSize:13, fontWeight:300 }}>
                  All {totalProducts} products are well stocked
                </p>
              </div>
            ) : (
              <div>
                {alertsToShow.map((p,i)=>{
                  const urgency = p.stock===0?"critical":p.stock<=2?"high":"medium";
                  const urgColor = urgency==="critical"?T.red:urgency==="high"?T.orange:T.amber;
                  return (
                    <div key={p._id||i}
                      style={{
                        display:"flex", alignItems:"center", gap:10,
                        padding:"9px 18px",
                        borderBottom:`0.5px solid ${T.border}`,
                        transition:"background 0.12s",
                      }}
                      onMouseEnter={e=>e.currentTarget.style.background=`${urgColor}07`}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      {/* urgency stripe */}
                      <div style={{ width:3, height:32, borderRadius:2,
                        background:urgColor, flexShrink:0, opacity:0.8 }}/>

                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12, color:T.textMid, whiteSpace:"nowrap",
                          overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</p>
                        {p.category && (
                          <p style={{ fontSize:10, color:T.textLow }}>{p.category}</p>
                        )}
                      </div>

                      <div style={{ flexShrink:0, textAlign:"right" }}>
                        <p style={{ fontSize:15, fontWeight:300, color:urgColor, fontFamily:"'Lato',sans-serif" }}>
                          {p.stock}
                        </p>
                        <p style={{ fontSize:9, color:T.textFaint, letterSpacing:"0.06em", textTransform:"uppercase" }}>
                          {urgency==="critical"?"out of stock":"remaining"}
                        </p>
                      </div>

                      <Pill
                        label={urgency==="critical"?"OUT":urgency==="high"?"HIGH":"LOW"}
                        color={urgColor}/>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination / show all */}
          {lowCount>ALERTS_PER_PAGE && (
            <div style={{ padding:"10px 18px", borderTop:`0.5px solid ${T.border}`,
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <button onClick={()=>setShowAll(v=>!v)} style={{
                fontSize:11, color:T.purple, background:"none", border:"none",
                cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
              }}>
                {showAll ? "Show less ↑" : `Show all ${lowCount} ↓`}
              </button>
              {!showAll && (
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <button disabled={alertPage===0} onClick={()=>setAlertPage(p=>p-1)} style={{
                    width:26, height:26, borderRadius:6, border:`0.5px solid ${T.border}`,
                    background:"transparent", color:T.textMid, cursor:alertPage===0?"default":"pointer",
                    opacity:alertPage===0?0.3:1, fontSize:13, outline:"none",
                  }}>‹</button>
                  <span style={{ fontSize:11, color:T.textLow }}>
                    {alertPage+1}/{totalAlertPages}
                  </span>
                  <button disabled={alertPage===totalAlertPages-1} onClick={()=>setAlertPage(p=>p+1)} style={{
                    width:26, height:26, borderRadius:6, border:`0.5px solid ${T.border}`,
                    background:"transparent", color:T.textMid,
                    cursor:alertPage===totalAlertPages-1?"default":"pointer",
                    opacity:alertPage===totalAlertPages-1?0.3:1, fontSize:13, outline:"none",
                  }}>›</button>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>

      {/* ══════════════ BOTTOM ROW: BAR CHART + INSIGHTS + RADIAL ══════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 200px 200px", gap:12 }}>

        {/* ── Monthly bar chart ── */}
        <Panel>
          <PanelHead title="Monthly units sold" sub="bar chart view"/>
          <div style={{ padding:"16px 18px 14px" }}>
            {monthly.length>0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={monthly} margin={{ top:0,right:4,left:-22,bottom:0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false}/>
                  <XAxis dataKey="month" tick={{ fill:T.textLow,fontSize:10,fontFamily:"'DM Sans',sans-serif" }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:T.textLow,fontSize:10,fontFamily:"'DM Sans',sans-serif" }} axisLine={false} tickLine={false} width={32}/>
                  <Tooltip content={<ChartTip suffix=" units"/>}/>
                  <Bar dataKey="sales" radius={[4,4,0,0]}>
                    {monthly.map((m,i)=>(
                      <Cell key={i}
                        fill={m.month===peakMonth?.month?"url(#peakBarG)":"url(#normalBarG)"}
                        opacity={0.85}/>
                    ))}
                    <defs>
                      <linearGradient id="normalBarG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={T.blue} stopOpacity="0.75"/>
                        <stop offset="100%" stopColor={T.blue} stopOpacity="0.25"/>
                      </linearGradient>
                      <linearGradient id="peakBarG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={T.purple} stopOpacity="0.95"/>
                        <stop offset="100%" stopColor={T.purple} stopOpacity="0.4"/>
                      </linearGradient>
                    </defs>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height:150, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <p style={{ color:T.textFaint, fontSize:12 }}>No data</p>
              </div>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:14, marginTop:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:8, height:8, borderRadius:2, background:T.blue }}/>
                <span style={{ fontSize:10, color:T.textLow }}>Regular month</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:8, height:8, borderRadius:2, background:T.purple }}/>
                <span style={{ fontSize:10, color:T.textLow }}>Peak month</span>
              </div>
            </div>
          </div>
        </Panel>

        {/* ── Quick insights ── */}
        <Panel>
          <PanelHead title="Quick insights"/>
          <div style={{ padding:"0 0 8px" }}>
            {[
              { label:"Inv. value",   value:fmtK(invValue),         color:T.green  },
              { label:"Total SKUs",   value:fmt(totalProducts),      color:T.purple },
              { label:"Categories",   value:categories.length,       color:T.blue   },
              { label:"Staff",        value:stats.totalStaff??0,     color:T.amber  },
              { label:"Best seller",  value:topSelling[0]?.name||"—", color:T.orange, small:true },
            ].map(({ label, value, color, small }, i, arr) => (
              <div key={label}>
                <div style={{ padding:"11px 16px" }}>
                  <Eyebrow style={{ marginBottom:4 }}>{label}</Eyebrow>
                  <p style={{
                    fontSize:small?12:17, fontWeight:300, color,
                    fontFamily:"'Lato',sans-serif",
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                  }}>{value}</p>
                </div>
                {i<arr.length-1 && <Divider/>}
              </div>
            ))}
          </div>
        </Panel>

        {/* ── Radial stock health gauge ── */}
        <Panel>
          <PanelHead title="Health gauge"/>
          <div style={{ padding:"16px", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
            <div style={{ position:"relative" }}>
              <RadialBarChart width={160} height={160} cx={80} cy={80}
                innerRadius={48} outerRadius={72}
                data={[
                  { name:"OK",    value:totalProducts-lowCount, fill:T.green  },
                  { name:"Alert", value:lowCount,               fill:T.red    },
                ]}
                startAngle={225} endAngle={-45}>
                <RadialBar dataKey="value" cornerRadius={4} background={{ fill:"rgba(255,255,255,0.04)" }}/>
              </RadialBarChart>
              <div style={{ position:"absolute", inset:0, display:"flex",
                flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                <p style={{ fontSize:22, fontWeight:300, color:healthPct>=80?T.green:T.red,
                  fontFamily:"'Lato',sans-serif" }}>{healthPct}%</p>
                <p style={{ fontSize:9, color:T.textLow, letterSpacing:"0.07em" }}>HEALTH</p>
              </div>
            </div>

            <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:7 }}>
              {[
                { label:"Stocked",   value:totalProducts-lowCount, color:T.green  },
                { label:"Low stock", value:lowCount,               color:T.red    },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ width:6, height:6, borderRadius:"50%", background:color }}/>
                    <span style={{ fontSize:11, color:T.textLow }}>{label}</span>
                  </div>
                  <span style={{ fontSize:13, color, fontWeight:300, fontFamily:"'Lato',sans-serif" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* ══════════════ ADMIN BANNER ══════════════ */}
      {isAdmin && (
        <div className="anim" style={{
          marginTop:14, padding:"14px 20px",
          borderRadius:14, animationDelay:"0.4s",
          background:"rgba(167,139,250,0.04)",
          border:"0.5px solid rgba(167,139,250,0.15)",
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:32, height:32, borderRadius:9,
              background:"rgba(167,139,250,0.1)", border:"0.5px solid rgba(167,139,250,0.22)",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                <path d="M7 1l1.5 3.5H12L9.5 6.8l1 3.2L7 8.2 3.5 10l1-3.2L2 4.5h3.5L7 1z"
                  fill="#a78bfa" opacity=".9"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize:13, color:T.textMid, fontWeight:300 }}>Administrator access active</p>
              <p style={{ fontSize:11, color:T.textLow, letterSpacing:"0.02em" }}>
                Full control over products, staff, billing and company settings
              </p>
            </div>
          </div>
          <div style={{ display:"flex", gap:24, flexShrink:0 }}>
            {[
              { label:"Products",  val:fmt(totalProducts)  },
              { label:"Staff",     val:fmt(stats.totalStaff??0) },
              { label:"Alerts",    val:fmt(lowCount)        },
              { label:"Value",     val:fmtK(invValue)       },
            ].map(({ label, val }) => (
              <div key={label} style={{ textAlign:"center" }}>
                <p style={{ fontSize:16, fontWeight:300, color:T.purple, fontFamily:"'Lato',sans-serif" }}>{val}</p>
                <p style={{ fontSize:9, color:T.textLow, letterSpacing:"0.09em", textTransform:"uppercase" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}