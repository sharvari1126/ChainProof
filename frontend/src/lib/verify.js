/**
 * Verification logic, kept free of React and wallet code so it can be reused
 * (and is exercised by the automated scenario tests in /test).
 */
import { sha256File } from "./hash.js";

export const Verdict = Object.freeze({
  AUTHENTIC: "AUTHENTIC",
  TAMPERED: "TAMPERED",
  REVOKED: "REVOKED",
  NOT_FOUND: "NOT_FOUND",
});

const STATUS_NAMES = ["Active", "Revoked"]; // must match the Solidity enum order

/** Document IDs are trimmed so " DOC-1" and "DOC-1" cannot become two records. */
export function cleanDocumentId(raw) {
  return String(raw ?? "").trim();
}

/** Turn the ethers Result struct into a plain JS object. */
export function normalizeRecord(raw) {
  return {
    documentId: raw.documentId,
    documentHash: String(raw.documentHash).toLowerCase(),
    issuer: raw.issuer,
    timestamp: Number(raw.timestamp),
    status: STATUS_NAMES[Number(raw.status)] ?? "Unknown",
  };
}

/**
 * Fetch a record. Returns null if the contract says DocumentNotFound.
 * Any other failure (RPC down, wrong network...) is re-thrown for the UI.
 */
export async function lookupRecord(contract, documentId) {
  try {
    return normalizeRecord(await contract.getDocument(documentId));
  } catch (err) {
    if (revertName(err, contract.interface) === "DocumentNotFound") return null;
    throw err;
  }
}

/** Pure decision function: record + freshly computed hash -> verdict. */
export function classify(record, computedHash) {
  if (!record) {
    return {
      verdict: Verdict.NOT_FOUND,
      hashMatches: null,
      reason: "No record with this document ID exists on the blockchain. It was never registered (or the ID was typed differently).",
    };
  }
  const hashMatches = record.documentHash === String(computedHash).toLowerCase();

  // REVOKED wins over the hash comparison: a revoked record is no longer valid
  // even if the file is byte-for-byte identical. The hash result is still reported.
  if (record.status === "Revoked") {
    return {
      verdict: Verdict.REVOKED,
      hashMatches,
      reason: hashMatches
        ? "The file matches the registered hash, but the issuer has revoked this document, so it is no longer valid."
        : "The issuer has revoked this document, so it is no longer valid. (The submitted file also does not match the registered hash.)",
    };
  }
  if (!hashMatches) {
    return {
      verdict: Verdict.TAMPERED,
      hashMatches,
      reason: "The SHA-256 hash of the submitted file differs from the hash registered on-chain. The file is not the same as the one that was issued - it has been altered, or it is a different file.",
    };
  }
  return {
    verdict: Verdict.AUTHENTIC,
    hashMatches,
    reason: "The SHA-256 hash of the submitted file is identical to the hash registered on-chain, and the record has not been revoked.",
  };
}

/** Full verification: hash the file, read the chain, compare. */
export async function verifyDocument(contract, documentId, file) {
  const id = cleanDocumentId(documentId);
  const computedHash = await sha256File(file); // throws InvalidFileError for bad files
  const record = await lookupRecord(contract, id);
  return { documentId: id, computedHash, record, ...classify(record, computedHash) };
}

/**
 * Decode a Solidity custom error from an ethers error: { name, args } or null.
 * ethers v6 usually fills err.revert; wallets/nodes sometimes only expose raw
 * revert data, so we also try to decode that with the contract interface.
 */
export function decodeRevert(err, iface) {
  if (!err) return null;
  if (err.revert?.name) return { name: err.revert.name, args: err.revert.args ?? [] };
  if (iface) {
    const candidates = [err.data, err.error?.data, err.info?.error?.data, err.info?.error?.data?.data, err.error?.data?.data];
    for (const data of candidates) {
      if (typeof data === "string" && data.startsWith("0x") && data.length >= 10) {
        try {
          const parsed = iface.parseError(data);
          if (parsed) return { name: parsed.name, args: Array.from(parsed.args) };
        } catch {
          /* not one of our errors */
        }
      }
    }
  }
  return null;
}

export const revertName = (err, iface) => decodeRevert(err, iface)?.name ?? null;
