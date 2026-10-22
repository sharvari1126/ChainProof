import { useWallet } from "../context/WalletContext.jsx";
import { NETWORK, isContractConfigured } from "../lib/chain.js";
import ErrorNotice from "./ErrorNotice.jsx";

/**
 * Explains what is missing (MetaMask / wallet / network / contract address).
 * Renders nothing when everything needed is ready.
 * `needWallet`: transactions need a connected account; read-only verification does not.
 */
export default function NetworkGuard({ needWallet }) {
  const w = useWallet();

  if (!isContractConfigured) {
    return (
      <div className="notice notice-bad" role="alert">
        <strong>Contract address not configured.</strong>
        <p>Start the local node (<code>npx hardhat node</code>), then run <code>npm run deploy</code> in the project root and reload this page.</p>
      </div>
    );
  }
  if (!w.installed) {
    return needWallet ? (
      <div className="notice notice-bad" role="alert">
        <strong>MetaMask is not installed.</strong>
        <p>Install the MetaMask browser extension from metamask.io and reload this page to issue or revoke documents.</p>
      </div>
    ) : (
      <div className="notice notice-info">
        <strong>Read-only mode.</strong> MetaMask was not found, so the app reads the blockchain directly from {NETWORK.rpcUrl}. Verification still works.
      </div>
    );
  }
  if (w.installed && w.chainId != null && !w.isCorrectNetwork) {
    return (
      <div className="notice notice-bad" role="alert">
        <strong>Wrong network.</strong>
        <p>MetaMask is on chain {w.chainId}, but ChainProof is deployed on {NETWORK.name} (chain {NETWORK.chainId}).</p>
        <button className="btn btn-small" onClick={w.switchNetwork} disabled={w.busy}>
          {w.busy ? "Switching..." : `Switch to ${NETWORK.name}`}
        </button>
        {w.error && <ErrorNotice error={w.error} />}
      </div>
    );
  }
  if (needWallet && !w.account) {
    return (
      <div className="notice notice-warn" role="alert">
        <strong>Wallet not connected.</strong>
        <p>Connect MetaMask to continue.</p>
        <button className="btn btn-small" onClick={w.connect} disabled={w.busy}>
          {w.busy ? "Connecting..." : "Connect MetaMask"}
        </button>
        {w.error && <ErrorNotice error={w.error} />}
      </div>
    );
  }
  return null;
}

/** True when the page's main action may proceed. */
export function useReady(needWallet) {
  const w = useWallet();
  if (!isContractConfigured) return false;
  if (!w.installed) return !needWallet;
  if (w.chainId == null || !w.isCorrectNetwork) return false;
  return needWallet ? Boolean(w.account) : true;
}
