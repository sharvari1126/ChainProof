# ChainProof: Viva Notes

## One-minute architecture
The user picks a file in the React app. The browser computes its SHA-256 hash. Through ethers.js and MetaMask, the hash plus the document ID is sent to the `ChainProof` smart contract on an Ethereum-compatible chain (a local Hardhat network). The contract stores ID, hash, issuer address, timestamp and status. To verify, the app hashes the submitted file again, reads the record from the contract, and compares. The document is never uploaded or stored on-chain.

## Concepts in simple words
- **SHA-256:** a one-way function that turns any file into a fixed 256-bit fingerprint (64 hex characters). The same bytes always give the same hash; changing even one bit changes about half the output bits (avalanche effect); you cannot recover the file from the hash, and cannot realistically craft a different file with the same hash.
- **Blockchain:** a shared, append-only ledger replicated across many nodes. Once a transaction is in a block, changing it would mean redoing the chain, so records are tamper-evident.
- **Smart contract:** a program stored on the blockchain. Its rules (unique IDs, only the issuer may revoke) are enforced by the network, not by a server we control.
- **MetaMask:** a browser wallet. It holds the user's keys, asks for confirmation, signs transactions, and tells the app which account and network are active. The private key never reaches our code.
- **ethers.js:** a JavaScript library for talking to the blockchain: send transactions, call read-only functions, decode errors and events.
- **Hardhat:** a development environment: compiles Solidity, runs a local blockchain with funded test accounts, runs tests, deploys contracts.
- **React:** a JavaScript UI library; the interface is built from components that re-render when state (wallet, file, result) changes.

## Why the document is not stored on-chain
On-chain storage is expensive and permanent, and everything on-chain is public. A 32-byte hash is enough to prove integrity, reveals nothing about the content, and costs the same small amount of gas whatever the file size.

## How tampering is detected
Registration stored `H(original)`. A modified file gives `H(modified) != H(original)`. The app compares the two and reports TAMPERED, and highlights the differing hash characters. The stored hash cannot be changed: the contract has no function that overwrites it and rejects duplicate IDs.

## Why use a blockchain at all
A normal database administrator could silently edit a stored hash (or the verification result) to make a forged file pass. On a blockchain no single party can alter history, the issuer cannot deny what their wallet signed, and anyone can verify without trusting the operator of ChainProof.

## Security decisions worth mentioning
- `issuer = msg.sender`, never a function argument, so it cannot be spoofed.
- `revokeDocument` checks the caller against the stored issuer inside the contract; the UI cannot bypass it.
- Revocation changes status only. Nothing is deleted, so history is preserved.
- Registration reverts on duplicate IDs, so records cannot be overwritten, and a revoked ID cannot be reused.
- Custom errors give cheap, precise failure reasons that the UI turns into readable messages.
- Only file bytes are hashed, not the file name, and one `sha256File` function serves both issue and verify.

## Likely questions
- *Does it prove the document is genuine?* No. It proves the file equals what was registered and the record is not revoked. Genuineness depends on trusting the issuer's wallet.
- *What if someone registers another person's document first?* Possible, since IDs are first come first served. A production system would add issuer whitelisting.
- *What if I re-save the PDF?* The bytes change, so the hash changes and verification reports TAMPERED. This is by design.
- *Why REVOKED rather than TAMPERED when both apply?* A revoked record is invalid regardless of the file; the page still shows the hash comparison.
- *Why not IPFS / QR / versioning?* They are outside the submitted scope; `hash.js`, `verify.js` and the record struct are isolated so they can be added later.
