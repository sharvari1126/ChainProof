import { Verdict } from "../lib/verify.js";
import { HashCompare } from "./Hash.jsx";
import RecordCard from "./RecordCard.jsx";

const TEXT = {
  [Verdict.AUTHENTIC]: { word: "AUTHENTIC", cls: "v-authentic", headline: "This document matches its blockchain record." },
  [Verdict.TAMPERED]: { word: "TAMPERED", cls: "v-tampered", headline: "This document does not match its blockchain record." },
  [Verdict.REVOKED]: { word: "REVOKED", cls: "v-revoked", headline: "The issuer has revoked this document." },
  [Verdict.NOT_FOUND]: { word: "NOT FOUND", cls: "v-notfound", headline: "No blockchain record exists for this document ID." },
};

function Check({ ok, children }) {
  const mark = ok === true ? "pass" : ok === false ? "fail" : "skip";
  const label = ok === true ? "Passed" : ok === false ? "Failed" : "Not applicable";
  return (
    <li className={`check check-${mark}`}>
      <span className="check-state">{label}</span>
      <span>{children}</span>
    </li>
  );
}

export default function ResultPanel({ result }) {
  if (!result) return null;
  const t = TEXT[result.verdict];
  const found = result.verdict !== Verdict.NOT_FOUND;

  return (
    <section className={`result ${t.cls}`} aria-live="polite" aria-label="Verification result">
      <div className="result-head">
        <div className="stamp">{t.word}</div>
        <div>
          <h2>{t.headline}</h2>
          <p>{result.reason}</p>
        </div>
      </div>

      <h3>How this result was produced</h3>
      <ul className="checks">
        <Check ok={found}>
          Record for ID <strong>{result.documentId}</strong> {found ? "exists on the blockchain." : "does not exist on the blockchain."}
        </Check>
        <Check ok={found ? result.hashMatches : null}>
          SHA-256 of the submitted file {found ? (result.hashMatches ? "equals the stored hash." : "differs from the stored hash.") : "could not be compared (no stored hash)."}
        </Check>
        <Check ok={found ? result.record.status !== "Revoked" : null}>
          Record status is <strong>{found ? result.record.status : "unknown"}</strong>.
        </Check>
      </ul>

      {found && <HashCompare computed={result.computedHash} stored={result.record.documentHash} />}
      {found && <RecordCard record={result.record} />}

      <p className="caveat">
        ChainProof shows whether this file matches what was registered on-chain and whether that record is still valid. It does not prove the document was legitimate when it was first issued.
      </p>
    </section>
  );
}
