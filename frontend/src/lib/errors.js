/**
 * Convert any thrown value (ethers, MetaMask, contract revert, our own errors)
 * into a message a non-developer can act on.
 * Returns { kind, title, message }.
 */
import { decodeRevert } from "./verify.js";

const make = (kind, title, message) => ({ kind, title, message });

export function friendlyError(err, iface) {
  const decoded = decodeRevert(err, iface);
  const name = decoded?.name;
  const args = decoded?.args;

  if (name) {
    switch (name) {
      case "DocumentAlreadyExists":
        return make("duplicate", "Document ID already registered", `The ID ${args?.[0] ? `"${args[0]}" ` : ""}is already on the blockchain. Document IDs are unique and records cannot be overwritten - choose a different ID.`);
      case "DocumentNotFound":
        return make("not-found", "Document not found", "No record with this document ID exists on the blockchain.");
      case "NotDocumentIssuer":
        return make("unauthorized", "Unauthorized: only the original issuer can revoke", `This record was registered by ${args?.[2] ?? "another wallet"}. The connected wallet (${args?.[1] ?? "unknown"}) is not allowed to revoke it. Switch to the issuer's wallet in MetaMask.`);
      case "DocumentAlreadyRevoked":
        return make("already-revoked", "Already revoked", "This document has already been revoked.");
      case "EmptyDocumentId":
        return make("invalid-input", "Document ID required", "Enter a document ID.");
      case "EmptyDocumentHash":
        return make("invalid-input", "Invalid hash", "The document hash is empty.");
      default:
        return make("contract", "Contract rejected the request", `The smart contract reverted with "${name}".`);
    }
  }

  const code = err?.code;
  const text = String(err?.shortMessage || err?.message || err || "");

  if (code === "INVALID_FILE" || err?.name === "InvalidFileError") return make("invalid-file", "Invalid file", err.message);
  if (code === "NO_METAMASK") return make("no-metamask", "MetaMask not installed", "Install the MetaMask browser extension, then reload this page.");
  if (code === "NO_CONTRACT") return make("no-contract", "Contract not found on this network", err.message);
  if (code === "ACTION_REJECTED" || code === 4001 || /user rejected|user denied|rejected the request/i.test(text)) {
    return make("rejected", "Transaction rejected", "You rejected the request in MetaMask. Nothing was written to the blockchain.");
  }
  if (code === -32002) return make("pending-request", "MetaMask request already open", "Open the MetaMask window and finish (or cancel) the pending request.");
  if (code === "INSUFFICIENT_FUNDS" || /insufficient funds/i.test(text)) {
    return make("funds", "Insufficient funds for gas", "The connected account has no test ETH. Import one of the funded Hardhat accounts into MetaMask.");
  }
  if (/nonce/i.test(text)) {
    return make("nonce", "Transaction nonce mismatch", "MetaMask's transaction counter is out of sync with the local chain (this happens after restarting `npx hardhat node`). In MetaMask: Settings > Advanced > Clear activity tab data, then retry.");
  }
  if (code === "NETWORK_ERROR" || code === "SERVER_ERROR" || code === "TIMEOUT" || /could not detect network|failed to fetch|ECONNREFUSED|network error/i.test(text)) {
    return make("network", "Cannot reach the blockchain node", "Is the local node running? Start it with `npx hardhat node` and check the RPC URL in MetaMask (http://127.0.0.1:8545).");
  }
  if (code === "BAD_DATA" || code === "CALL_EXCEPTION") {
    return make("no-contract", "Blockchain call failed", "The call returned no usable data. This usually means MetaMask is on the wrong network, or the local node was restarted and the contract must be redeployed (`npm run deploy`).");
  }
  return make("unknown", "Something went wrong", text.length > 300 ? text.slice(0, 300) + "..." : text || "Unknown error.");
}
