// client/src/pages/BillHistory.jsx
//
// Previously there was no page that listed past bills at all — Billing.jsx
// is only the checkout wizard. This page exists so "export bills/invoices",
// "export sales history", and "billing reports by date range" have an
// actual list view to filter and export from, instead of an export button
// floating with no data to look at first.

import { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { getBills } from "../../services/billService";
import { exportBills } from "../../services/exportService";
import ExportButton from "../common/ExportButton";
import { card, colors, inputBase, btnGhost } from "../dashboard/styles/tokens";
import { LoadingState, EmptyState } from "../dashboard/ui/index";

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

const PAYMENT_METHODS = [
  { value: "", label: "All Methods" },
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

export default function BillHistory() {
  const { isAdmin } = useOutletContext() || {};

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });

  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    getBills({ page, limit: 20, search, method, from, to })
      .then((res) => {
        setBills(res.data?.data || []);
        setPagination(res.data?.pagination || { pages: 1, total: 0 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, method, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  // Filters changing should reset to page 1 — otherwise a narrower filter
  // could leave the user stuck on a page number that no longer exists.
  useEffect(() => {
    setPage(1);
  }, [search, method, from, to]);

  const handleExport = (formatKey) => exportBills(formatKey, { method, from, to });

  return (
    <div style={{ padding: 16 }}>
      <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  }}
>
        <div>
          <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 300, marginBottom: 4 }}>Bill History</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
            {pagination.total} bill{pagination.total === 1 ? "" : "s"} total
          </p>
        </div>

        <ExportButton
          label="Export"
          formats={[
            { key: "excel", label: "Excel (.xlsx)" },
            { key: "csv", label: "CSV" },
          ]}
          onExport={handleExport}
        />
      </div>

      {/* Filters */}
      <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    flexWrap: "nowrap",
  }}
>
        <input
          style={{
  ...inputBase,
  width: 220,
  minWidth: 220,
}}
          placeholder="Search bill ID, customer, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
  style={{
    ...inputBase,
    width: 160,
    minWidth: 160,
  }}
>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <input
          type="date"
          style={{
  ...inputBase,
  width: 140,
  minWidth: 140,
}}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          title="From date"
        />
        <input
          type="date"
          style={{
  ...inputBase,
  width: 140,
  minWidth: 140,
}}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          title="To date"
        />
        {(search || method || from || to) && (
          <button
            style={btnGhost}
            onClick={() => {
              setSearch("");
              setMethod("");
              setFrom("");
              setTo("");
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: "hidden" }}>
        {loading ? (
          <LoadingState />
        ) : bills.length === 0 ? (
          <EmptyState message="No bills match your filters." />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `0.5px solid rgba(255,255,255,0.08)` }}>
                {["Bill ID", "Date", "Customer", "Items", "Method", "Status", "Total"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 14px",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                      fontWeight: 400,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill._id} className="hover-row" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.025)" }}>
                  <td style={{ padding: "10px 14px", color: "#fff", fontSize: 13 }}>{bill.billId}</td>
                  <td style={{ padding: "10px 14px", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                    {bill.createdAt ? new Date(bill.createdAt).toLocaleDateString("en-IN") : ""}
                  </td>
                  <td style={{ padding: "10px 14px", color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                    {bill.buyer?.name}
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{bill.buyer?.phone}</div>
                  </td>
                  <td style={{ padding: "10px 14px", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                    {bill.items?.length || 0}
                  </td>
                  <td style={{ padding: "10px 14px", color: "rgba(255,255,255,0.6)", fontSize: 13, textTransform: "capitalize" }}>
                    {bill.payment?.method?.replace("_", " ")}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12 }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        textTransform: "capitalize",
                        background:
                          bill.payment?.status === "paid"
                            ? "rgba(52,211,153,0.12)"
                            : bill.payment?.status === "pending"
                            ? "rgba(251,191,36,0.12)"
                            : "rgba(248,113,113,0.12)",
                        color:
                          bill.payment?.status === "paid"
                            ? colors.green
                            : bill.payment?.status === "pending"
                            ? colors.amber
                            : colors.red,
                      }}
                    >
                      {bill.payment?.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", color: "#fff", fontSize: 13, fontWeight: 500 }}>
                    {formatCurrency(bill.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <button
            style={{ ...btnGhost, opacity: page <= 1 ? 0.4 : 1 }}
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, alignSelf: "center" }}>
            Page {page} of {pagination.pages}
          </span>
          <button
            style={{ ...btnGhost, opacity: page >= pagination.pages ? 0.4 : 1 }}
            disabled={page >= pagination.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
