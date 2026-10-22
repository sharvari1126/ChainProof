import { useEffect, useState } from "react";
import FileInput from "../components/FileInput.jsx";
import NetworkGuard, { useReady } from "../components/NetworkGuard.jsx";
import TxStatus from "../components/TxStatus.jsx";
import ErrorNotice from "../components/ErrorNotice.jsx";
import RecordCard from "../components/RecordCard.jsx";
import { Hash } from "../components/Hash.jsx";
import { getWriteContract, iface } from "../lib/chain.js";
import { sha256File } from "../lib/hash.js";
import { cleanDocumentId, normalizeRecord } from "../lib/verify.js";
import { friendlyError } from "../lib/errors.js";

export default function IssuePage() {
  const ready = useReady(true);
  const [file, setFile] = useState(null);
  const [hash, setHash] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [phase, setPhase] = useState(null); // wallet | pending | confirmed | failed
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState(null);
  const [registered, setRegistered] = useState(null);

  // Hash the file as soon as it is chosen so the issuer can see the fingerprint.
  useEffect(() => {
    let cancelled = false;
    setHash("");
    setRegistered(null);
    setPhase(null);
    setError(null);
    if (!file) return;
    sha256File(file)
      .then((h) => !cancelled && setHash(h))
      .catch((e) => !cancelled && setError(friendlyError(e)));
    return () => {
      cancelled = true;
    };
  }, [file]);

  const id = cleanDocumentId(documentId);
  const busy = phase === "wallet" || phase === "pending";
  const canSubmit = ready && hash && id && !busy;

  async function register() {
    setError(null);
    setRegistered(null);
    setTxHash("");
    setPhase("wallet");
    try {
      const contract = await getWriteContract();
      if (await contract.documentExists(id)) {
        throw { revert: { name: "DocumentAlreadyExists", args: [id] } };
      }
      const tx = await contract.registerDocument(id, hash); // opens MetaMask
      setTxHash(tx.hash);
      setPhase("pending");
      const receipt = await tx.wait();
      // Read the record back from the chain: what we display is what is stored.
      const record = normalizeRecord(await contract.getDocument(id));
      setRegistered({ record, txHash: tx.hash, blockNumber: receipt.blockNumber });
      setPhase("confirmed");
    } catch (e) {
      setError(friendlyError(e, iface));
      setPhase("failed");
    }
  }

  return (
    <div className="page">
      <h1>Issue a document</h1>
      <p className="lead">Fingerprint a document with SHA-256 and register that fingerprint on the blockchain. The document itself stays on your computer.</p>

      <NetworkGuard needWallet />

      <div className="card">
        <FileInput file={file} onChange={setFile} />
        {hash && (
          <div className="field">
            <span className="label">SHA-256 hash of the file</span>
            <Hash value={hash} />
          </div>
        )}
        <div className="field">
          <label htmlFor="docid">Document ID</label>
          <input id="docid" type="text" value={documentId} maxLength={64} placeholder="e.g. CERT-2027-0001" onChange={(e) => setDocumentId(e.target.value)} disabled={busy} />
          <p className="hint">Must be unique. You will need this ID later to verify or revoke the document.</p>
        </div>
        <button className="btn" onClick={register} disabled={!canSubmit}>
          {busy ? "Working..." : "Register on blockchain"}
        </button>
      </div>

      <TxStatus phase={phase} txHash={txHash} />
      <ErrorNotice error={error} />
      {registered && (
        <>
          <div className="notice notice-ok" role="status">
            <strong>Document registered successfully.</strong> The hash and metadata are now stored on the blockchain.
          </div>
          <RecordCard record={registered.record} txHash={registered.txHash} blockNumber={registered.blockNumber} title="Registered record (read back from the blockchain)" />
        </>
      )}
    </div>
  );
}
