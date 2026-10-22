/**
 * End-to-end scenarios 1-6 from the project brief.
 *
 * These run against a real (in-process Hardhat) blockchain and call the SAME
 * hashing / verification / error-message code the React frontend uses
 * (frontend/src/lib/*), so they check the actual pipeline:
 *   file bytes -> SHA-256 -> contract -> read back -> verdict
 * The only part not exercised here is the MetaMask popup itself.
 */
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { createHash, randomBytes } = require("crypto");
const path = require("path");
const { pathToFileURL } = require("url");

const lib = (name) => import(pathToFileURL(path.join(__dirname, "..", "frontend", "src", "lib", name)).href);

describe("ChainProof end-to-end scenarios", function () {
  let chainProof, walletA, walletB, sha256File, verifyDocument, Verdict, friendlyError;

  // The "document": any bytes. Wrapped in a File exactly as the browser would provide it.
  const docBytes = Buffer.from("CERTIFICATE OF COMPLETION\nAwarded to: A. Student\nGrade: A\n");
  const makeFile = (bytes, name = "certificate.txt") => new File([bytes], name);

  before(async function () {
    ({ sha256File } = await lib("hash.js"));
    ({ verifyDocument, Verdict } = await lib("verify.js"));
    ({ friendlyError } = await lib("errors.js"));
  });

  beforeEach(async function () {
    [walletA, walletB] = await ethers.getSigners();
    chainProof = await ethers.deployContract("ChainProof");
  });

  async function registerAs(signer, id, file) {
    const hash = await sha256File(file);
    await (await chainProof.connect(signer).registerDocument(id, hash)).wait();
    return hash;
  }

  describe("hashing correctness", function () {
    it("matches the reference SHA-256 (known vector + Node crypto)", async function () {
      expect(await sha256File(makeFile(Buffer.from("abc")))).to.equal(
        "0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
      );
      const random = randomBytes(10_000);
      expect(await sha256File(makeFile(random))).to.equal("0x" + createHash("sha256").update(random).digest("hex"));
    });

    it("hashes content only: the file name is irrelevant", async function () {
      expect(await sha256File(makeFile(docBytes, "a.pdf"))).to.equal(await sha256File(makeFile(docBytes, "totally-different.txt")));
    });

    it("a one-byte change produces a different hash", async function () {
      const changed = Buffer.from(docBytes);
      changed[changed.length - 2] ^= 1;
      expect(await sha256File(makeFile(changed))).to.not.equal(await sha256File(makeFile(docBytes)));
    });

    it("rejects an empty file with an INVALID_FILE error", async function () {
      let caught;
      try {
        await sha256File(makeFile(Buffer.alloc(0)));
      } catch (e) {
        caught = e;
      }
      expect(caught).to.exist;
      expect(friendlyError(caught).kind).to.equal("invalid-file");
    });
  });

  it("TEST 1: register A, verify the same document -> AUTHENTIC", async function () {
    await registerAs(walletA, "DOC-A", makeFile(docBytes));
    const r = await verifyDocument(chainProof, "DOC-A", makeFile(docBytes, "renamed-copy.txt"));
    expect(r.verdict).to.equal(Verdict.AUTHENTIC);
    expect(r.hashMatches).to.equal(true);
  });

  it("TEST 2: register A, modify it, verify with the same ID -> TAMPERED", async function () {
    await registerAs(walletA, "DOC-A", makeFile(docBytes));
    const modified = Buffer.from(docBytes.toString().replace("Grade: A", "Grade: B"));
    const r = await verifyDocument(chainProof, "DOC-A", makeFile(modified));
    expect(r.verdict).to.equal(Verdict.TAMPERED);
    expect(r.hashMatches).to.equal(false);
    expect(r.computedHash).to.not.equal(r.record.documentHash);
  });

  it("TEST 3: register A, revoke as issuer, verify A -> REVOKED", async function () {
    await registerAs(walletA, "DOC-A", makeFile(docBytes));
    await (await chainProof.connect(walletA).revokeDocument("DOC-A")).wait();
    const r = await verifyDocument(chainProof, "DOC-A", makeFile(docBytes));
    expect(r.verdict).to.equal(Verdict.REVOKED);
    expect(r.record.status).to.equal("Revoked");
  });

  it("TEST 4: wallet B cannot revoke wallet A's document -> UNAUTHORIZED", async function () {
    await registerAs(walletA, "DOC-A", makeFile(docBytes));

    let caught;
    try {
      await chainProof.connect(walletB).revokeDocument("DOC-A");
    } catch (e) {
      caught = e;
    }
    expect(caught, "revocation by wallet B must fail").to.exist;
    const msg = friendlyError(caught, chainProof.interface);
    expect(msg.kind).to.equal("unauthorized");
    expect(msg.message).to.include(walletA.address);

    // and the document is still valid
    const r = await verifyDocument(chainProof, "DOC-A", makeFile(docBytes));
    expect(r.verdict).to.equal(Verdict.AUTHENTIC);
  });

  it("TEST 5: registering a duplicate document ID is rejected", async function () {
    await registerAs(walletA, "DOC-A", makeFile(docBytes));
    let caught;
    try {
      await registerAs(walletB, "DOC-A", makeFile(Buffer.from("some other document")));
    } catch (e) {
      caught = e;
    }
    expect(caught, "duplicate registration must fail").to.exist;
    expect(friendlyError(caught, chainProof.interface).kind).to.equal("duplicate");

    // original record is unchanged
    const r = await verifyDocument(chainProof, "DOC-A", makeFile(docBytes));
    expect(r.verdict).to.equal(Verdict.AUTHENTIC);
  });

  it("TEST 6: verifying a nonexistent document ID -> NOT_FOUND", async function () {
    const r = await verifyDocument(chainProof, "DOES-NOT-EXIST", makeFile(docBytes));
    expect(r.verdict).to.equal(Verdict.NOT_FOUND);
    expect(r.record).to.equal(null);
    expect(r.reason).to.match(/No record/);
  });
});
