import { useEffect, useState } from "react";
import NetworkGuard, { useReady } from "../components/NetworkGuard.jsx";
import TxStatus from "../components/TxStatus.jsx";
import ErrorNotice from "../components/ErrorNotice.jsx";
import RecordCard from "../components/RecordCard.jsx";
import { useWallet } from "../context/WalletContext.jsx";
import { getReadContract, getWriteContract, iface } from "../lib/chain.js";
import { cleanDocumentId, lookupRecord, normalizeRecord } from "../lib/verify.js";
import { friendlyError } from "../lib/errors.js";

export default function RevokePage() {
  const ready = useReady(true);
  const { account } = useWallet();
  const [documentId, setDocumentId] = useState("");
  const [record, setRecord] = useState(null);
  const [lookupDone, setLookupDone] = useState(false);
  const [phase, setPhase] = useState(null);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [looking, setLooking] = useState(false);

  useEffect(() => {
    setRecord(null);
    setLookupDone(false);
    setDone(null);
    setError(null);
    setPhase(null);
  }, [documentId]);

  const id = cleanDocumentId(documentId);
  const busy = phase === "wallet" || phase === "pending";
  const isIssuer = record && account && record.issuer.toLowerCase() === account.toLowerCase();

  async function lookup() {
    setLooking(true);
    setError(null);
    try {
      setRecord(await lookupRecord(await getReadContract(), id));
      setLookupDone(true);
    } catch (e) {
      setError(friendlyError(e, iface));
    } finally {
      setLooking(false);
    }
  }

  async function revoke() {
    setError(null);
    setTxHash("");
    setPhase("wallet");
    try {
      const contract = await getWriteContract();
      // The smart contract is the authority: it rejects any wallet that is not
      // the original issuer, whatever this page shows.
      const tx = await contract.revokeDocument(id);
      setTxHash(tx.hash);
      setPhase("pending");
      const receipt = await tx.wait();
      const updated = normalizeRecord(await contract.getDocument(id));
      setRecord(updated);
      setDone({ txHash: tx.hash, blockNumber: receipt.blockNumber });
      setPhase("confirmed");
    } catch (e) {
      setError(friendlyError(e, iface));
      setPhase("failed");
    }
  }

  return (
    <div className="page">
      <h1>Revoke a document</h1>
      <p className="lead">Only the wallet that registered a document can revoke it. The record is not deleted: its status changes to Revoked, and later verification reports REVOKED.</p>

      <NetworkGuard needWallet />

      <div className="card">
        <div className="field">
          <label htmlFor="rid">Document ID</label>
          <input id="rid" type="text" value={documentId} placeholder="e.g. CERT-2027-0001" onChange={(e) => setDocumentId(e.target.value)} disabled={busy} />
        </div>
        <button className="btn btn-secondary" onClick={lookup} disabled={!ready || !id || looking || busy}>
          {looking ? "Looking up..." : "Find record"}
        </button>
      </div>

      {lookupDone && !record && (
        <div className="notice notice-warn" role="alert">
          <strong>Document not found.</strong> No record with the ID "{id}" exists on the blockchain.
        </div>
      )}

      {record && (
        <>
          <RecordCard record={record} txHash={done?.txHash} blockNumber={done?.blockNumber} />
          {record.status === "Revoked" ? (
            <div className="notice notice-warn">This document is revoked.</div>
          ) : (
            <div className="card">
              {isIssuer ? (
                <p>The connected wallet is the issuer of this document.</p>
              ) : (
                <div className="notice notice-warn">
                  <strong>The connected wallet is not the issuer.</strong> You can still submit the request: the smart contract will reject it. This shows that access control is enforced on-chain.
                </div>
              )}
              <button className="btn btn-danger" onClick={revoke} disabled={!ready || busy}>
                {busy ? "Working..." : "Revoke document"}
              </button>
              <p className="hint">Revocation is permanent. A revoked document cannot be re-activated.</p>
            </div>
          )}
        </>
      )}

      <TxStatus phase={phase} txHash={txHash} />
      <ErrorNotice error={error} />
      {done && (
        <div className="notice notice-ok" role="status">
          <strong>Document revoked.</strong> The record is preserved on the blockchain with status Revoked.
        </div>
      )}
    </div>
  );
}
