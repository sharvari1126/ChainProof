import { useEffect, useState } from "react";
import FileInput from "../components/FileInput.jsx";
import NetworkGuard, { useReady } from "../components/NetworkGuard.jsx";
import ErrorNotice from "../components/ErrorNotice.jsx";
import ResultPanel from "../components/ResultPanel.jsx";
import { getReadContract, iface } from "../lib/chain.js";
import { cleanDocumentId, verifyDocument } from "../lib/verify.js";
import { friendlyError } from "../lib/errors.js";

export default function VerifyPage() {
  const ready = useReady(false);
  const [file, setFile] = useState(null);
  const [documentId, setDocumentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // A new file or ID makes any previous result stale.
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [file, documentId]);

  const id = cleanDocumentId(documentId);

  async function verify() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const contract = await getReadContract();
      setResult(await verifyDocument(contract, id, file));
    } catch (e) {
      setError(friendlyError(e, iface));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>Verify a document</h1>
      <p className="lead">Check whether a file is identical to the one registered under a document ID. No wallet connection or gas fee is needed to verify.</p>

      <NetworkGuard needWallet={false} />

      <div className="card">
        <FileInput file={file} onChange={setFile} label="Document to verify" />
        <div className="field">
          <label htmlFor="vid">Document ID</label>
          <input id="vid" type="text" value={documentId} placeholder="e.g. CERT-2027-0001" onChange={(e) => setDocumentId(e.target.value)} />
        </div>
        <button className="btn" onClick={verify} disabled={!ready || !file || !id || busy}>
          {busy ? "Verifying..." : "Verify document"}
        </button>
      </div>

      <ErrorNotice error={error} />
      <ResultPanel result={result} />
    </div>
  );
}
