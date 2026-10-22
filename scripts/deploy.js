// Deploys ChainProof and writes the address + ABI where the frontend reads them:
//   frontend/src/contracts/deployment.json
//   frontend/src/contracts/ChainProof.abi.json
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const { ethers, artifacts } = hre;
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  const chainProof = await ethers.deployContract("ChainProof");
  await chainProof.waitForDeployment();
  const address = await chainProof.getAddress();

  const outDir = path.join(__dirname, "..", "frontend", "src", "contracts");
  fs.mkdirSync(outDir, { recursive: true });

  const artifact = await artifacts.readArtifact("ChainProof");
  fs.writeFileSync(path.join(outDir, "ChainProof.abi.json"), JSON.stringify(artifact.abi, null, 2) + "\n");
  fs.writeFileSync(
    path.join(outDir, "deployment.json"),
    JSON.stringify(
      {
        address,
        chainId: Number(network.chainId),
        networkName: "Hardhat Local",
        rpcUrl: "http://127.0.0.1:8545",
      },
      null,
      2
    ) + "\n"
  );

  console.log("ChainProof deployed");
  console.log("  address   :", address);
  console.log("  chainId   :", Number(network.chainId));
  console.log("  deployer  :", deployer.address);
  console.log("  frontend config written to frontend/src/contracts/");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
