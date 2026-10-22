# ChainProof

**A Blockchain-Based Document Authenticity and Verification System**

ChainProof tells you whether a digital document has been altered since it was issued. The document's SHA-256 fingerprint is registered on an Ethereum-compatible blockchain; anyone can later re-hash a file and compare it with that record.

---

## 1. Problem statement

Digital documents (certificates, transcripts, letters) are easy to copy and edit, and a verifier usually has no trustworthy way to tell the original from a modified copy. Central databases can help but must be trusted, and their records can be silently edited.

## 2. Objectives

- Register a document's cryptographic fingerprint so later changes are detectable.
- Verify any file against the registered fingerprint, with a clear explanation of the result.
- Let the original issuer revoke a document without deleting its history.
- Keep the document itself off-chain (privacy, cost).
- Run entirely locally for demonstration (Hardhat network + MetaMask).

## 3. Features

| Feature | How it works |
|---|---|
| Issue | Connect MetaMask, choose a file, enter a unique ID. The browser computes SHA-256; the contract stores ID, hash, issuer, timestamp, status. |
| Verify | Choose a file and enter the ID. The browser re-hashes it and compares with the on-chain hash. No gas needed. |
| Revoke | Only the registering wallet can revoke. Status becomes `Revoked`; the record stays. |
| Results | **AUTHENTIC**, **TAMPERED**, **REVOKED** or **NOT FOUND**, each with the reasons and a character-level hash comparison. |
| Error handling | MetaMask missing, wallet not connected, wrong network, rejected transaction, duplicate ID, unknown ID, empty/invalid file, unauthorized revoke, RPC down, nonce out of sync. |

## 4. What ChainProof does and does not prove

> The submitted document matches the cryptographic record registered on-chain, and that record has not been revoked.

ChainProof gives **tamper-evident verification**. It does **not** prove that a document was legitimate when it was first registered: if someone registers a forged document, ChainProof will faithfully report that forgery as authentic. Trust in *who issued it* comes from knowing the issuer's wallet address.

## 5. Architecture

```
React frontend (Vite)
      |   hashing happens here, in the browser (Web Crypto SHA-256)
      v
ethers.js v6
      |
      v
MetaMask  (signs transactions, supplies network + account)
      |
      v
Ethereum-compatible chain (Hardhat local node, chainId 31337)
      |
      v
ChainProof.sol  (documentId, SHA-256 hash, issuer, timestamp, status)
```

The document file never leaves the browser and is never sent to the blockchain.

## 6. Workflow

```
ISSUE  -> SHA-256 hash -> registerDocument() -> record on-chain
VERIFY -> SHA-256 of submitted file -> getDocument() -> compare -> AUTHENTIC / TAMPERED / REVOKED / NOT FOUND
REVOKE -> revokeDocument() (issuer only) -> status = Revoked (record kept)
```

Verdict rules (`frontend/src/lib/verify.js`):

1. No record for the ID -> **NOT FOUND**
2. Record is revoked -> **REVOKED** (takes priority; the hash comparison is still shown)
3. Hash differs -> **TAMPERED**
4. Otherwise -> **AUTHENTIC**

## 7. Technology stack

Solidity 0.8.24, Hardhat 2 (hardhat-toolbox, Mocha/Chai), ethers.js v6, React 18 + Vite 5 (JavaScript), MetaMask, Web Crypto API for SHA-256, Node.js 18+ (tested on 22).

No backend server, database, IPFS, tokens or AI are used.

## 8. Folder structure

```
ChainProof/
|-- contracts/ChainProof.sol           Smart contract
|-- test/
|   |-- ChainProof.test.js             Contract unit tests
|   `-- scenarios.test.js              End-to-end scenarios 1-6 + hashing tests
|-- scripts/deploy.js                  Deploys; writes address + ABI for the frontend
|-- frontend/
|   |-- src/lib/hash.js                SHA-256 of file bytes (one definition, used everywhere)
|   |-- src/lib/verify.js              Verdict logic (pure; shared with the tests)
|   |-- src/lib/errors.js              Raw errors -> readable messages
|   |-- src/lib/chain.js               Provider / contract helpers
|   |-- src/context/WalletContext.jsx  MetaMask account + network state
|   |-- src/pages/                     Dashboard, Issue, Verify, Revoke
|   |-- src/components/                Header, ResultPanel, RecordCard, NetworkGuard, ...
|   `-- src/contracts/                 deployment.json + ChainProof.abi.json (written by deploy)
|-- docs/VIVA.md                       Viva explanations
|-- hardhat.config.js
|-- package.json
`-- README.md
```

## 9. Prerequisites

- Node.js 18 or newer (`node -v`) and npm
- A browser with the [MetaMask](https://metamask.io) extension
- Internet on the **first** `compile` (Hardhat downloads the Solidity compiler once)

## 10. Installation (from a clean clone)

```bash
cd ChainProof
npm install                 # Hardhat + test tooling
npm run frontend:install    # React app dependencies
```

## 11. Run it, step by step

Use **three terminals**, all in the project root.

**Terminal 1: local blockchain** (leave running)
```bash
npm run node
```
It prints 20 funded test accounts with private keys.

**Terminal 2: compile, test, deploy**
```bash
npm run compile
npm test
npm run deploy
```
`npm run deploy` prints the contract address and writes it, with the ABI, to `frontend/src/contracts/`. On a fresh node the address is normally `0x5FbDB2315678afecb367f032d93F642f64180aa3`.

> Restarting Terminal 1 wipes the chain. Run `npm run deploy` again afterwards and reset MetaMask's activity data (see section 16).

**Terminal 3: frontend**
```bash
npm run frontend:dev
```
Open **http://localhost:5173** (use `localhost`; SHA-256 in the browser needs a secure context).

## 12. MetaMask setup

1. **Add the network.** Easiest: click *Switch to Hardhat Local* in the app. Manually: MetaMask > Networks > Add network > Add manually:
   - Network name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency symbol: `ETH`
2. **Import test accounts.** MetaMask > account menu > Add account > Import account > paste a private key printed by Terminal 1. Import at least two:
   - Account #0 (Wallet A, issuer): `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - Account #1 (Wallet B, other user): `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

   These are Hardhat's public development keys. **Never send real funds to them or use them outside a local chain.**
3. Click **Connect MetaMask** in the app.

## 13. Usage

- **Issue:** Issue tab > choose a file > enter an ID (e.g. `CERT-001`) > *Register on blockchain* > confirm in MetaMask. The page shows ID, hash, issuer, timestamp, transaction hash, block number and status, read back from the chain.
- **Verify:** Verify tab > choose a file > enter the ID > *Verify document*.
- **Revoke:** Revoke tab > enter the ID > *Find record* > *Revoke document* > confirm in MetaMask.

## 14. End-to-end demo script (about 5 minutes)

Create `certificate.txt` with some text, and a copy `certificate-edited.txt` with one character changed.

| Step | Action | Expected |
|---|---|---|
| 1 | Wallet A: Issue `certificate.txt` as `CERT-001` | Success + record details |
| 2 | Verify `certificate.txt` with `CERT-001` | **AUTHENTIC** |
| 3 | Verify `certificate-edited.txt` with `CERT-001` | **TAMPERED** (differing hash characters highlighted) |
| 4 | Verify with ID `NOPE-123` | **NOT FOUND** |
| 5 | Issue another file as `CERT-001` | Rejected: ID already registered |
| 6 | Switch MetaMask to Wallet B, Revoke `CERT-001` | Rejected: only the issuer can revoke |
| 7 | Switch back to Wallet A, Revoke `CERT-001` | Success, status Revoked |
| 8 | Verify `certificate.txt` with `CERT-001` | **REVOKED** |

## 15. Testing

```bash
npm test
```

- `test/ChainProof.test.js`: registration, duplicate rejection, retrieval, issuer revocation, unauthorized revocation, status after revocation, plus empty input, unknown IDs, double revocation, and no re-registration of a revoked ID.
- `test/scenarios.test.js`: scenarios 1-6 from the brief, run against a real Hardhat chain using the **same hashing, verification and error-message code as the frontend**, plus SHA-256 correctness (known test vector, comparison with Node's crypto, one-byte change, file name ignored, empty file rejected).

Not covered by automated tests: the MetaMask pop-up and clicking through the browser UI. Use the demo script above for those.

## 16. Common errors and fixes

| Symptom | Cause / fix |
|---|---|
| "MetaMask is not installed" | Install the extension and reload. Verify still works in read-only mode. |
| "Wrong network" banner | Click *Switch to Hardhat Local*, or select it in MetaMask. |
| "Contract not found on this network" | The node was restarted. Run `npm run deploy` and reload the page. |
| "Contract address not configured" | Run `npm run deploy` once. |
| "Cannot reach the blockchain node" | Terminal 1 (`npm run node`) is not running. |
| Transaction nonce error | After restarting the node: MetaMask > Settings > Advanced > *Clear activity tab data*. |
| "Insufficient funds" | The selected account has no test ETH. Import a Hardhat account. |
| Hash computation fails | Open the app via `http://localhost:5173`, not an IP address. |
| `compile` cannot download the compiler | Needs internet on the first run. |

## 17. Limitations

- Proves integrity relative to registration, not original legitimacy (section 4).
- Verification needs the exact original bytes: re-saving, re-compressing or converting a file changes its hash.
- An issuer's identity is its wallet address; there is no off-chain identity binding or issuer whitelist.
- IDs are free-form strings, first come first served.
- Local Hardhat chain only; it is wiped on restart. Not deployed to a public network.
- Files are read fully into memory (50 MB limit in the UI).

## 18. Future scope (not implemented)

- IPFS storage of the document, with the CID in the record.
- QR code on the issued document linking to verification.
- Document versioning (a new hash linked to the previous version).
- Issuer roles/whitelist, public testnet deployment, batch registration.

## 19. Screenshots

Put images in `docs/screenshots/` and link them here.

- Dashboard: `docs/screenshots/dashboard.png` *(placeholder)*
- Issue success: `docs/screenshots/issue.png` *(placeholder)*
- AUTHENTIC / TAMPERED / REVOKED results: `docs/screenshots/results.png` *(placeholder)*

## 20. Team / project information

- Project title: ChainProof
- Institution / Department: *(fill in)*
- Course: Blockchain Fundamentals
- Team members: *(fill in)*
- Guide / Faculty: *(fill in)*
- Academic year: *(fill in)*
