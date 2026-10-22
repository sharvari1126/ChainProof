import { useEffect, useState } from "react";
import { useWallet } from "../context/WalletContext.jsx";
import { CONTRACT_ADDRESS, NETWORK, getReadContract, isContractConfigured, shortAddress, formatTimestamp } from "../lib/chain.js";
import { lookupRecord } from "../lib/verify.js";
import { friendlyError } from "../lib/errors.js";
import NetworkGuard, { useReady } from "../components/NetworkGuard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

/** Latest registrations, read from the contract's DocumentRegistered events. */
function RecentRegistrations() {
  const ready = useReady(false);
  const { chainId } = useWallet();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const contract = await getReadContract();
        const events = await contract.queryFilter(contract.filters.DocumentRegistered(), 0);
        const latest = events.slice(-5).reverse();
        const out = [];
        for (const ev of latest) {
          const rec = await lookupRecord(contract, ev.args.documentId); // current status, not just event data
          if (rec) out.push(rec);
        }
        if (!cancelled) setRows(out);
      } catch (e) {
        if (!cancelled) setError(friendlyError(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, chainId]);

  if (!ready) return null;
  return (
    <section className="card">
      <h3>Recent registrations</h3>
      {error && <p className="muted">Could not load registrations: {error.message}</p>}
      {!error && rows === null && <p className="muted">Loading from the blockchain...</p>}
      {rows && rows.length === 0 && <p className="muted">No documents have been registered yet. Use "Issue" to register the first one.</p>}
      {rows && rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Document ID</th><th>Issuer</th><th>Registered</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.documentId}>
                  <td>{r.documentId}</td>
                  <td><code title={r.issuer}>{shortAddress(r.issuer)}</code></td>
                  <td>{formatTimestamp(r.timestamp)}</td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function Dashboard({ onNavigate }) {
  const w = useWallet();
  return (
    <div className="page">
      <h1>Is this document the one that was issued?</h1>
      <p className="lead">
        ChainProof stores a SHA-256 fingerprint of each issued document on an Ethereum-compatible blockchain. Anyone can later check a file against that fingerprint and learn whether it has been altered or revoked.
      </p>

      <NetworkGuard needWallet={false} />

      <div className="actions">
        <button className="action" onClick={() => onNavigate("issue")}><strong>Issue a document</strong><span>Register its fingerprint on-chain.</span></button>
        <button className="action" onClick={() => onNavigate("verify")}><strong>Verify a document</strong><span>Authentic, tampered, revoked or not found.</span></button>
        <button className="action" onClick={() => onNavigate("revoke")}><strong>Revoke a document</strong><span>Issuer only. The record is kept.</span></button>
      </div>

      <section className="card">
        <h3>Connection</h3>
        <dl className="facts">
          <dt>Wallet</dt>
          <dd>{w.account ? <code className="hash">{w.account}</code> : <span className="muted">Not connected</span>}</dd>
          <dt>Network</dt>
          <dd>{!w.installed ? "MetaMask not detected" : w.chainId == null ? "Unknown" : w.isCorrectNetwork ? `${NETWORK.name} (chain ${w.chainId})` : `Chain ${w.chainId} - expected ${NETWORK.name} (chain ${NETWORK.chainId})`}</dd>
          <dt>Contract</dt>
          <dd>{isContractConfigured ? <code className="hash">{CONTRACT_ADDRESS}</code> : <span className="muted">Not deployed yet - run <code>npm run deploy</code></span>}</dd>
        </dl>
      </section>

      <RecentRegistrations />

      <section className="card">
        <h3>How verification works</h3>
        <ol className="steps">
          <li><strong>Issue.</strong> The file is hashed in your browser with SHA-256. Only the hash, the document ID, the issuer's wallet and a timestamp go on the blockchain.</li>
          <li><strong>Verify.</strong> The submitted file is hashed again and compared with the hash stored on-chain.</li>
          <li><strong>Result.</strong> Same hash and active record: authentic. Different hash: tampered. Revoked by the issuer: revoked.</li>
        </ol>
        <p className="caveat">What this proves: the file matches the record registered on-chain, and the record has not been revoked. It does not prove the document was legitimate when it was first issued.</p>
      </section>
    </div>
  );
}
