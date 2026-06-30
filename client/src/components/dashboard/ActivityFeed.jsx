import { useEffect, useState } from "react";

import { getActivities, getActivityHistory } from "../../services/dashboardService";
import { getStaff } from "../../services/staffService";
import { exportActivity } from "../../services/exportService";
import ExportButton from "../common/ExportButton";

import { card, colors, inputBase } from "./styles/tokens";

import socket from "../../socket";

const badgeStyles = {

UPDATE_STOCK: {
bg: "rgba(61,214,140,0.12)",
color: "#3dd68c",
label: "Stock",
},

CREATE_BILL: {
bg: "rgba(124,110,240,0.15)",
color: colors.purple,
label: "Billing",
},

DELETE_PRODUCT: {
bg: "rgba(240,89,90,0.12)",
color: colors.red,
label: "Delete",
},

ADD_PRODUCT: {
bg: "rgba(255,255,255,0.08)",
color: "#fff",
label: "Product",
},

UPDATE_PRODUCT: {
bg: "rgba(96,165,250,0.12)",
color: "#60a5fa",
label: "Update",
},

};

// Max items kept in the live "Recent Activity" list — older incoming events
// just fall off the end instead of growing the array forever during a long
// session.
const RECENT_LIMIT = 2;

export default function ActivityFeed() {

const [activities, setActivities] = useState([]);

const [showAll, setShowAll] = useState(false);

const [allActivities, setAllActivities] = useState([]);

// Reflects the actual Socket.IO connection, not a hardcoded "always on"
// badge — this route is admin-only, and the server only puts admin sockets
// in the room this feed listens to (see server.js / socket.js).
const [isLive, setIsLive] = useState(socket.connected);

// Filters for the "All Activities" modal — affect both what's displayed
// (via getActivityHistory) and what gets exported (via exportActivity), so
// the two always stay in sync with each other.
const [filterFrom, setFilterFrom] = useState("");
const [filterTo, setFilterTo] = useState("");
const [filterUserId, setFilterUserId] = useState("");
const [staffList, setStaffList] = useState([]);
const [historyLoading, setHistoryLoading] = useState(false);

useEffect(() => {


loadActivities();


}, []);

// ─────────────────────────────────────
// Real-time: new activity pushed from the server
// ─────────────────────────────────────
useEffect(() => {

  const handleConnect = () => setIsLive(true);
  const handleDisconnect = () => setIsLive(false);

  const handleNewActivity = (activity) => {
    setActivities((prev) => {
      // Guard against duplicates if the initial fetch and the socket event
      // race on first load.
      if (prev.some((a) => a._id === activity._id)) return prev;
      return [activity, ...prev].slice(0, RECENT_LIMIT);
    });

    setAllActivities((prev) => {
      if (prev.length === 0) return prev; // history modal not loaded/open
      if (prev.some((a) => a._id === activity._id)) return prev;
      return [activity, ...prev];
    });
  };

  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("activity:new", handleNewActivity);

  return () => {
    socket.off("connect", handleConnect);
    socket.off("disconnect", handleDisconnect);
    socket.off("activity:new", handleNewActivity);
  };

}, []);

// ─────────────────────────────────────
// Latest 2 Activities
// ─────────────────────────────────────
const loadActivities = async () => {


try {

  const res = await getActivities(RECENT_LIMIT);

  setActivities(res.data || []);

} catch (err) {

  console.error(err);

}


};

// ─────────────────────────────────────
// Load All Activities (with current filters)
// ─────────────────────────────────────
const loadAllActivities = async () => {

  setHistoryLoading(true);

  try {

    const res = await getActivityHistory({
      limit: 50,
      from: filterFrom || undefined,
      to: filterTo || undefined,
      userId: filterUserId || undefined,
    });

    setAllActivities(res.data || []);

    setShowAll(true);

    // Staff list for the filter dropdown — fetched once when the modal
    // opens rather than on every keystroke/filter change.
    if (staffList.length === 0) {
      try {
        const staffRes = await getStaff();
        setStaffList(staffRes?.data || staffRes || []);
      } catch {
        // Non-fatal — the filter dropdown just won't have options if this fails.
      }
    }

  } catch (err) {

    console.error(err);

  } finally {

    setHistoryLoading(false);

  }


};

// Re-fetch the modal's list whenever a filter changes WHILE it's already
// open — lets the admin narrow results without closing and reopening.
useEffect(() => {
  if (!showAll) return;

  setHistoryLoading(true);
  getActivityHistory({
    limit: 50,
    from: filterFrom || undefined,
    to: filterTo || undefined,
    userId: filterUserId || undefined,
  })
    .then((res) => setAllActivities(res.data || []))
    .catch(console.error)
    .finally(() => setHistoryLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [filterFrom, filterTo, filterUserId, showAll]);

const handleExportActivity = (formatKey) =>
  exportActivity({
    from: filterFrom || undefined,
    to: filterTo || undefined,
    userId: filterUserId || undefined,
  });

return (


<>

<div
  style={{
    ...card,
    position: "relative",
    overflow: "hidden",

    background: "rgba(255,255,255,0.025)",

    border: "0.5px solid rgba(255,255,255,0.07)",

    borderRadius: 16,

    padding: 18,
  }}
>

  {/* Background Glow */}
  <div
    style={{
      position: "absolute",

      width: 180,

      height: 180,

      borderRadius: "50%",

      background:
        "radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)",

      top: -60,

      right: -60,

      pointerEvents: "none",
    }}
  />

  {/* Header */}
  <div
    style={{
      display: "flex",

      alignItems: "center",

      justifyContent: "space-between",

      marginBottom: 16,
    }}
  >

    <div>

      <p
        style={{
          fontSize: 10,

          letterSpacing: "0.14em",

          textTransform: "uppercase",

          color: "rgba(255,255,255,0.22)",

          marginBottom: 4,
        }}
      >
        Activity Monitor
      </p>

      <h3
        style={{
          fontSize: 20,

          fontWeight: 300,

          color: "#fff",

          margin: 0,

          fontFamily: "'Lato', sans-serif",
        }}
      >
        Recent Activity
      </h3>

    </div>

    {/* Live */}
    <div
      style={{
        display: "flex",

        alignItems: "center",

        gap: 6,

        fontSize: 11,

        color: isLive ? "#34d399" : "rgba(255,255,255,0.3)",
      }}
    >

      <div
        style={{
          width: 7,

          height: 7,

          borderRadius: "50%",

          background: isLive ? "#34d399" : "rgba(255,255,255,0.3)",

          boxShadow: isLive
            ? "0 0 10px rgba(52,211,153,0.8)"
            : "none",
        }}
      />

      {isLive ? "Live" : "Offline"}

    </div>

  </div>

  {/* Activity List */}
  <div
    style={{
      display: "flex",

      flexDirection: "column",

      gap: 12,
    }}
  >

    {activities.length === 0 ? (

      <div
        style={{
          padding: "32px 0",

          textAlign: "center",

          color: "rgba(255,255,255,0.2)",

          fontSize: 13,
        }}
      >
        No recent activity
      </div>

    ) : (

      activities.map((a) => {

        const badge =
          badgeStyles[a.action] || {
            bg: "rgba(255,255,255,0.06)",
            color: "#fff",
            label: a.action,
          };

        return (

          <div
            key={a._id}

            style={{
              display: "flex",

              alignItems: "flex-start",

              gap: 14,

              padding: "14px 16px",

              borderRadius: 14,

              background:
                "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))",

              border:
                "0.5px solid rgba(255,255,255,0.06)",

              backdropFilter: "blur(10px)",

              transition: "all 0.25s ease",

              cursor: "pointer",

              position: "relative",

              overflow: "hidden",
            }}

            onMouseEnter={(e) => {
              e.currentTarget.style.transform =
                "translateY(-2px)";

              e.currentTarget.style.border =
                "0.5px solid rgba(167,139,250,0.22)";
            }}

            onMouseLeave={(e) => {
              e.currentTarget.style.transform =
                "translateY(0px)";

              e.currentTarget.style.border =
                "0.5px solid rgba(255,255,255,0.06)";
            }}
          >

            {/* Glow */}
            <div
              style={{
                position: "absolute",

                width: 100,

                height: 100,

                borderRadius: "50%",

                background: `${badge.color}10`,

                top: -40,

                right: -40,

                pointerEvents: "none",
              }}
            />

            {/* Dot */}
            <div
              style={{
                width: 10,

                height: 10,

                borderRadius: "50%",

                marginTop: 7,

                background: badge.color,

                boxShadow:
                  `0 0 10px ${badge.color}55`,

                flexShrink: 0,
              }}
            />

            {/* Content */}
            <div style={{ flex: 1 }}>

              <div
                style={{
                  display: "flex",

                  alignItems: "center",

                  gap: 8,

                  marginBottom: 6,

                  flexWrap: "wrap",
                }}
              >

                <span
                  style={{
                    background: badge.bg,

                    color: badge.color,

                    fontSize: 10,

                    padding: "3px 8px",

                    borderRadius: 999,

                    fontWeight: 600,

                    letterSpacing: "0.05em",
                  }}
                >
                  {badge.label}
                </span>

                <span
                  style={{
                    fontSize: 11,

                    color: "rgba(255,255,255,0.3)",

                    textTransform: "uppercase",

                    letterSpacing: "0.06em",
                  }}
                >
                  {a.role}
                </span>

              </div>

              {/* Message */}
              <div
                style={{
                  color: "rgba(255,255,255,0.88)",

                  fontSize: 14,

                  lineHeight: 1.6,

                  fontWeight: 300,
                }}
              >
                {a.message}
              </div>

              {/* Time */}
              <div
                style={{
                  marginTop: 8,

                  fontSize: 10,

                  color: "rgba(255,255,255,0.22)",

                  letterSpacing: "0.04em",
                }}
              >
                {new Date(a.createdAt).toLocaleString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "short",
                })}
              </div>

            </div>

          </div>
        );
      })
    )}

  </div>

  {/* View More Button */}
  <div
    style={{
      marginTop: 16,

      display: "flex",

      justifyContent: "center",
    }}
  >

    <button
      onClick={loadAllActivities}

      style={{
        background:
          "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(96,165,250,0.08))",

        border:
          "0.5px solid rgba(167,139,250,0.18)",

        color: "#fff",

        padding: "9px 16px",

        borderRadius: 10,

        fontSize: 12,

        cursor: "pointer",

        transition: "0.2s ease",

        fontWeight: 500,

        letterSpacing: "0.03em",
      }}
    >
      View More
    </button>

  </div>

</div>

{/* ───────────────────────────────────── */}
{/* Modal */}
{/* ───────────────────────────────────── */}

{
showAll && (

<div
  style={{
    position: "fixed",

    inset: 0,

    background: "rgba(0,0,0,0.72)",

    backdropFilter: "blur(10px)",

    zIndex: 9999,

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    padding: 20,
  }}
>

  <div
    style={{
      width: "100%",

      maxWidth: 700,

      maxHeight: "85vh",

      overflowY: "auto",

      background: "#0d0e16",

      borderRadius: 18,

      border:
        "0.5px solid rgba(255,255,255,0.08)",

      padding: 22,

      boxShadow:
        "0 20px 60px rgba(0,0,0,0.45)",
    }}
  >

    {/* Header */}
    <div
      style={{
        display: "flex",

        justifyContent: "space-between",

        alignItems: "center",

        marginBottom: 22,
      }}
    >

      <div>

        <p
          style={{
            fontSize: 10,

            color: "rgba(255,255,255,0.25)",

            letterSpacing: "0.12em",

            textTransform: "uppercase",

            marginBottom: 4,
          }}
        >
          Activity History
        </p>

        <h2
          style={{
            color: "#fff",

            margin: 0,

            fontWeight: 300,
          }}
        >
          All Activities
        </h2>

      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

        <ExportButton
          label="Export"
          formats={[{ key: "csv", label: "CSV" }]}
          onExport={handleExportActivity}
        />

        <button
        onClick={() => setShowAll(false)}

        style={{
          width: 34,

          height: 34,

          borderRadius: 10,

          border:
            "0.5px solid rgba(255,255,255,0.08)",

          background:
            "rgba(255,255,255,0.03)",

          color: "#fff",

          cursor: "pointer",

          fontSize: 18,
        }}
      >
        ×
      </button>

      </div>

    </div>

    {/* Filters */}
    <div
      style={{
        display: "flex",
        gap: 10,
        marginBottom: 18,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <input
        type="date"
        style={{ ...inputBase, width: "auto", padding: "8px 12px", fontSize: 12 }}
        value={filterFrom}
        onChange={(e) => setFilterFrom(e.target.value)}
        title="From date"
      />
      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>to</span>
      <input
        type="date"
        style={{ ...inputBase, width: "auto", padding: "8px 12px", fontSize: 12 }}
        value={filterTo}
        onChange={(e) => setFilterTo(e.target.value)}
        title="To date"
      />
      <select
        style={{ ...inputBase, width: "auto", padding: "8px 12px", fontSize: 12 }}
        value={filterUserId}
        onChange={(e) => setFilterUserId(e.target.value)}
      >
        <option value="">All Staff</option>
        {staffList.map((s) => (
          <option key={s._id} value={s._id}>{s.name || s.email}</option>
        ))}
      </select>
      {(filterFrom || filterTo || filterUserId) && (
        <button
          onClick={() => {
            setFilterFrom("");
            setFilterTo("");
            setFilterUserId("");
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.35)",
            fontSize: 12,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Clear filters
        </button>
      )}
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>
        Activity logs are retained for 7 days
      </span>
    </div>

    {/* All Activities */}
    <div
      style={{
        display: "flex",

        flexDirection: "column",

        gap: 12,
      }}
    >

      {historyLoading ? (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
          Loading...
        </p>
      ) : allActivities.length === 0 ? (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
          No activity found for the selected filters.
        </p>
      ) : (
      allActivities.map((a) => {

        const badge =
          badgeStyles[a.action] || {
            bg: "rgba(255,255,255,0.06)",
            color: "#fff",
            label: a.action,
          };

        return (

          <div
            key={a._id}

            style={{
              padding: "14px 16px",

              borderRadius: 14,

              background:
                "rgba(255,255,255,0.025)",

              border:
                "0.5px solid rgba(255,255,255,0.06)",
            }}
          >

            <div
              style={{
                display: "flex",

                alignItems: "center",

                gap: 8,

                marginBottom: 7,
              }}
            >

              <span
                style={{
                  background: badge.bg,

                  color: badge.color,

                  fontSize: 10,

                  padding: "3px 8px",

                  borderRadius: 999,

                  fontWeight: 600,
                }}
              >
                {badge.label}
              </span>

              <span
                style={{
                  color:
                    "rgba(255,255,255,0.3)",

                  fontSize: 11,
                }}
              >
                {a.role}
              </span>

            </div>

            <div
              style={{
                color: "#fff",

                fontSize: 14,

                lineHeight: 1.6,
              }}
            >
              {a.message}
            </div>

            <div
              style={{
                marginTop: 8,

                fontSize: 10,

                color:
                  "rgba(255,255,255,0.22)",
              }}
            >
              {new Date(
                a.createdAt
              ).toLocaleString()}
            </div>

          </div>
        );
      })
      )}

    </div>

  </div>

</div>

)
}

</>


);
}
