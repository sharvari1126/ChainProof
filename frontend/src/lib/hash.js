/**
 * SHA-256 hashing of a file's raw bytes.
 *
 * WHY THIS EXISTS: registration and verification MUST use the exact same
 * representation or the same document would never match itself. Both flows
 * call this single function, so there is only one definition.
 *
 * Correctness notes:
 *  - Only the file CONTENT (its bytes) is hashed - never the name, path,
 *    last-modified date or any UI text.
 *  - Output is "0x" + 64 lowercase hex chars = a Solidity bytes32 value.
 *  - Uses the browser's built-in Web Crypto API (crypto.subtle), which is a
 *    native, audited SHA-256 implementation. It needs a secure context
 *    (https:// or http://localhost), which Vite's dev server provides.
 */

export const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB - the file is read into memory

export class InvalidFileError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidFileError";
    this.code = "INVALID_FILE";
  }
}

export async function sha256File(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new InvalidFileError("No valid file was selected.");
  }
  if (file.size === 0) {
    throw new InvalidFileError("The selected file is empty (0 bytes). Choose a file with content.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new InvalidFileError("The selected file is larger than 50 MB. Choose a smaller file.");
  }
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) {
    throw new InvalidFileError(
      "This browser context cannot compute SHA-256. Open the app via http://localhost:5173 (a secure context)."
    );
  }

  const bytes = await file.arrayBuffer(); // exact file bytes
  const digest = await subtle.digest("SHA-256", bytes);
  return "0x" + Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
