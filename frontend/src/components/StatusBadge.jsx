const CLASS = { Active: "st-active", Revoked: "st-revoked" };
export default function StatusBadge({ status }) {
  return <span className={`badge ${CLASS[status] ?? ""}`}>{status}</span>;
}
