import { useState } from "react";

/** Monospace hash with a working copy button. */
export function Hash({ value }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable - the hash is still selectable */
    }
  }
  return (
    <span className="hash-line">
      <code className="hash">{value}</code>
      <button type="button" className="btn-link" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}

/**
 * Shows the computed hash next to the on-chain hash and highlights every
 * differing character. Even a 1-byte change in the file flips ~half the digits
 * (the "avalanche effect" of SHA-256).
 */
export function HashCompare({ computed, stored }) {
  const same = computed.toLowerCase() === stored.toLowerCase();
  const render = (a, b) =>
    Array.from(a).map((ch, i) => (
      <span key={i} className={!same && ch !== b[i] ? "diff" : undefined}>
        {ch}
      </span>
    ));
  return (
    <div className="compare">
      <div>
        <div className="compare-label">Computed from the submitted file</div>
        <code className="hash block">{render(computed.toLowerCase(), stored.toLowerCase())}</code>
      </div>
      <div>
        <div className="compare-label">Stored on the blockchain</div>
        <code className="hash block">{render(stored.toLowerCase(), computed.toLowerCase())}</code>
      </div>
      <p className={`compare-verdict ${same ? "ok" : "bad"}`}>{same ? "Hashes are identical." : "Hashes differ - highlighted characters do not match."}</p>
    </div>
  );
}
