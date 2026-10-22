import { Hash } from "./Hash.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { formatTimestamp } from "../lib/chain.js";

/** The on-chain record, plus transaction details when we have them. */
export default function RecordCard({ record, txHash, blockNumber, title = "Blockchain record" }) {
  return (
    <section className="card" aria-label={title}>
      <h3>{title}</h3>
      <dl className="facts">
        <dt>Document ID</dt>
        <dd>{record.documentId}</dd>
        <dt>SHA-256 hash</dt>
        <dd><Hash value={record.documentHash} /></dd>
        <dt>Issuer wallet</dt>
        <dd><code className="hash">{record.issuer}</code></dd>
        <dt>Registered</dt>
        <dd>{formatTimestamp(record.timestamp)} <span className="muted">(block time, UNIX {record.timestamp})</span></dd>
        <dt>Status</dt>
        <dd><StatusBadge status={record.status} /></dd>
        {txHash && (<><dt>Transaction hash</dt><dd><code className="hash">{txHash}</code></dd></>)}
        {blockNumber != null && (<><dt>Block number</dt><dd>{blockNumber}</dd></>)}
      </dl>
    </section>
  );
}
