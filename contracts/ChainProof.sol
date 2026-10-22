// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ChainProof
 * @notice Tamper-evident registry of document fingerprints (SHA-256 hashes).
 *
 * Only the proof of a document is stored on-chain: its ID, SHA-256 hash,
 * issuer address, timestamp and status. The document itself NEVER touches
 * the blockchain.
 *
 * What this contract proves:
 *   "A document with this exact hash was registered by this wallet at this
 *    time, and the record has (or has not) been revoked since."
 * It does NOT prove that the document was legitimate when it was issued.
 */
contract ChainProof {
    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    /// Active = valid record. Revoked = issuer withdrew it (record is kept).
    /// `None` is deliberately NOT part of the enum: "does not exist" is
    /// detected through `issuer == address(0)` instead.
    enum Status {
        Active,
        Revoked
    }

    struct Document {
        string documentId; // human-readable unique ID chosen by the issuer
        bytes32 documentHash; // SHA-256 digest of the file bytes
        address issuer; // wallet that registered it (the only one who can revoke)
        uint256 timestamp; // block timestamp of registration
        Status status;
    }

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// documentId => record. Records are never deleted.
    mapping(string => Document) private documents;

    // ---------------------------------------------------------------------
    // Events & Errors
    // ---------------------------------------------------------------------

    event DocumentRegistered(
        string indexed documentIdHash, // indexed strings are stored as keccak256
        string documentId,
        bytes32 documentHash,
        address indexed issuer,
        uint256 timestamp
    );

    event DocumentRevoked(
        string indexed documentIdHash,
        string documentId,
        address indexed issuer,
        uint256 timestamp
    );

    error EmptyDocumentId();
    error EmptyDocumentHash();
    error DocumentAlreadyExists(string documentId);
    error DocumentNotFound(string documentId);
    error NotDocumentIssuer(string documentId, address caller, address issuer);
    error DocumentAlreadyRevoked(string documentId);

    // ---------------------------------------------------------------------
    // Write functions
    // ---------------------------------------------------------------------

    /**
     * @notice Register a new document fingerprint.
     * @dev Reverts if the ID is already used, so an existing record can never
     *      be overwritten (this is what makes the registry tamper-evident).
     *      The issuer is always msg.sender - it cannot be spoofed by an argument.
     */
    function registerDocument(string calldata documentId, bytes32 documentHash) external {
        if (bytes(documentId).length == 0) revert EmptyDocumentId();
        if (documentHash == bytes32(0)) revert EmptyDocumentHash();
        if (documents[documentId].issuer != address(0)) revert DocumentAlreadyExists(documentId);

        documents[documentId] = Document({
            documentId: documentId,
            documentHash: documentHash,
            issuer: msg.sender,
            timestamp: block.timestamp,
            status: Status.Active
        });

        emit DocumentRegistered(documentId, documentId, documentHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Revoke a document. Only the wallet that registered it may do so.
     * @dev The record is kept (status flips to Revoked) so history is preserved
     *      and later verification can report REVOKED instead of "not found".
     */
    function revokeDocument(string calldata documentId) external {
        Document storage doc = documents[documentId];
        if (doc.issuer == address(0)) revert DocumentNotFound(documentId);
        if (doc.issuer != msg.sender) revert NotDocumentIssuer(documentId, msg.sender, doc.issuer);
        if (doc.status == Status.Revoked) revert DocumentAlreadyRevoked(documentId);

        doc.status = Status.Revoked;

        emit DocumentRevoked(documentId, documentId, msg.sender, block.timestamp);
    }

    // ---------------------------------------------------------------------
    // Read functions
    // ---------------------------------------------------------------------

    /// @notice Fetch a record. Reverts with DocumentNotFound for unknown IDs.
    function getDocument(string calldata documentId) external view returns (Document memory) {
        Document memory doc = documents[documentId];
        if (doc.issuer == address(0)) revert DocumentNotFound(documentId);
        return doc;
    }

    /// @notice Cheap existence check that does not revert.
    function documentExists(string calldata documentId) external view returns (bool) {
        return documents[documentId].issuer != address(0);
    }
}
