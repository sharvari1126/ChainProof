import { useWallet } from "../context/WalletContext.jsx";
import { NETWORK, shortAddress } from "../lib/chain.js";

const PAGES = [
  ["home", "Home"],
  ["issue", "Issue"],
  ["verify", "Verify"],
  ["revoke", "Revoke"],
];

function Seal() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" className="seal">
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
      <path d="M10.5 16.5l3.6 3.6 7.4-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Header({ page, onNavigate }) {
  const w = useWallet();
  const networkLabel = !w.installed ? "No MetaMask" : w.chainId == null ? "Network unknown" : w.isCorrectNetwork ? NETWORK.name : `Wrong network (chain ${w.chainId})`;
  const netClass = !w.installed || w.chainId == null ? "chip-neutral" : w.isCorrectNetwork ? "chip-ok" : "chip-bad";

  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="brand" onClick={() => onNavigate("home")} aria-label="ChainProof home">
          <Seal />
          <span>ChainProof</span>
        </button>

        <nav aria-label="Main">
          {PAGES.map(([id, label]) => (
            <button key={id} className={`nav-btn ${page === id ? "active" : ""}`} aria-current={page === id ? "page" : undefined} onClick={() => onNavigate(id)}>
              {label}
            </button>
          ))}
        </nav>

        <div className="wallet-area">
          <span className={`chip ${netClass}`} title="Current MetaMask network">
            {networkLabel}
          </span>
          {w.account ? (
            <span className="chip chip-account" title={w.account}>
              {shortAddress(w.account)}
            </span>
          ) : (
            <button className="btn btn-small" onClick={w.connect} disabled={w.busy}>
              {w.busy ? "Connecting..." : "Connect MetaMask"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
