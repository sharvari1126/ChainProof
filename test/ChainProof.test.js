const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const STATUS = { Active: 0n, Revoked: 1n };

// Any 32-byte value works as a stand-in for a SHA-256 digest at contract level.
const hashOf = (text) => ethers.sha256(ethers.toUtf8Bytes(text));

describe("ChainProof contract", function () {
  async function deployFixture() {
    const [issuer, other] = await ethers.getSigners();
    const chainProof = await ethers.deployContract("ChainProof");
    return { chainProof, issuer, other };
  }

  describe("registerDocument", function () {
    it("1. registers a document and emits DocumentRegistered", async function () {
      const { chainProof, issuer } = await loadFixture(deployFixture);
      const h = hashOf("document A");

      const tx = await chainProof.registerDocument("DOC-001", h);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(chainProof, "DocumentRegistered")
        .withArgs(anyValue, "DOC-001", h, issuer.address, block.timestamp);
    });

    it("2. rejects a duplicate document ID (even from another wallet)", async function () {
      const { chainProof, other } = await loadFixture(deployFixture);
      await chainProof.registerDocument("DOC-001", hashOf("A"));

      await expect(chainProof.registerDocument("DOC-001", hashOf("B")))
        .to.be.revertedWithCustomError(chainProof, "DocumentAlreadyExists")
        .withArgs("DOC-001");
      await expect(chainProof.connect(other).registerDocument("DOC-001", hashOf("C")))
        .to.be.revertedWithCustomError(chainProof, "DocumentAlreadyExists");

      // original record untouched
      const doc = await chainProof.getDocument("DOC-001");
      expect(doc.documentHash).to.equal(hashOf("A"));
    });

    it("rejects an empty ID and an all-zero hash", async function () {
      const { chainProof } = await loadFixture(deployFixture);
      await expect(chainProof.registerDocument("", hashOf("A"))).to.be.revertedWithCustomError(
        chainProof,
        "EmptyDocumentId"
      );
      await expect(chainProof.registerDocument("DOC-1", ethers.ZeroHash)).to.be.revertedWithCustomError(
        chainProof,
        "EmptyDocumentHash"
      );
    });
  });

  describe("getDocument", function () {
    it("3. returns exactly what was registered", async function () {
      const { chainProof, issuer } = await loadFixture(deployFixture);
      const h = hashOf("document A");
      const tx = await chainProof.registerDocument("DOC-001", h);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const doc = await chainProof.getDocument("DOC-001");
      expect(doc.documentId).to.equal("DOC-001");
      expect(doc.documentHash).to.equal(h);
      expect(doc.issuer).to.equal(issuer.address);
      expect(doc.timestamp).to.equal(BigInt(block.timestamp));
      expect(doc.status).to.equal(STATUS.Active);
    });

    it("reverts with DocumentNotFound for an unknown ID", async function () {
      const { chainProof } = await loadFixture(deployFixture);
      await expect(chainProof.getDocument("NOPE"))
        .to.be.revertedWithCustomError(chainProof, "DocumentNotFound")
        .withArgs("NOPE");
      expect(await chainProof.documentExists("NOPE")).to.equal(false);
    });
  });

  describe("revokeDocument", function () {
    it("4. lets the original issuer revoke and emits DocumentRevoked", async function () {
      const { chainProof, issuer } = await loadFixture(deployFixture);
      await chainProof.registerDocument("DOC-001", hashOf("A"));

      const tx = await chainProof.revokeDocument("DOC-001");
      await expect(tx)
        .to.emit(chainProof, "DocumentRevoked")
        .withArgs(anyValue, "DOC-001", issuer.address, anyValue);
    });

    it("5. rejects revocation from a wallet that is not the issuer", async function () {
      const { chainProof, issuer, other } = await loadFixture(deployFixture);
      await chainProof.registerDocument("DOC-001", hashOf("A"));

      await expect(chainProof.connect(other).revokeDocument("DOC-001"))
        .to.be.revertedWithCustomError(chainProof, "NotDocumentIssuer")
        .withArgs("DOC-001", other.address, issuer.address);

      const doc = await chainProof.getDocument("DOC-001");
      expect(doc.status).to.equal(STATUS.Active);
    });

    it("6. keeps the record after revocation and reports status Revoked", async function () {
      const { chainProof, issuer } = await loadFixture(deployFixture);
      const h = hashOf("A");
      await chainProof.registerDocument("DOC-001", h);
      await time.increase(60);
      await chainProof.revokeDocument("DOC-001");

      const doc = await chainProof.getDocument("DOC-001");
      expect(doc.status).to.equal(STATUS.Revoked);
      // nothing else was lost or changed
      expect(doc.documentId).to.equal("DOC-001");
      expect(doc.documentHash).to.equal(h);
      expect(doc.issuer).to.equal(issuer.address);
      expect(await chainProof.documentExists("DOC-001")).to.equal(true);
    });

    it("rejects revoking an unknown ID and double revocation", async function () {
      const { chainProof } = await loadFixture(deployFixture);
      await expect(chainProof.revokeDocument("NOPE")).to.be.revertedWithCustomError(
        chainProof,
        "DocumentNotFound"
      );

      await chainProof.registerDocument("DOC-001", hashOf("A"));
      await chainProof.revokeDocument("DOC-001");
      await expect(chainProof.revokeDocument("DOC-001")).to.be.revertedWithCustomError(
        chainProof,
        "DocumentAlreadyRevoked"
      );
    });

    it("does not allow re-registering a revoked ID", async function () {
      const { chainProof } = await loadFixture(deployFixture);
      await chainProof.registerDocument("DOC-001", hashOf("A"));
      await chainProof.revokeDocument("DOC-001");
      await expect(chainProof.registerDocument("DOC-001", hashOf("B"))).to.be.revertedWithCustomError(
        chainProof,
        "DocumentAlreadyExists"
      );
    });
  });
});
