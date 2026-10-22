/**
 * Provider / contract helpers. A fresh BrowserProvider is created per action so
 * a MetaMask network switch never leaves us holding a stale provider.
 */
import { BrowserProvider, Contract, Interface, JsonRpcProvider } from "ethers";
import abi from "../contracts/ChainProof.abi.json";
import deployment from "../contracts/deployment.json";

export const CONTRACT_ADDRESS = deployment.address;
export const EXPECTED_CHAIN_ID = deployment.chainId;
export const NETWORK = {
  chainId: deployment.chainId,
  chainIdHex: "0x" + deployment.chainId.toString(16),
  name: deployment.networkName,
  rpcUrl: deployment.rpcUrl,
};
export const iface = new Interface(abi);
export const isContractConfigured = /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS);
export const hasMetaMask = () => typeof window !== "undefined" && Boolean(window.ethereum);

class ChainError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

async function assertContractDeployed(provider) {
  if (!isContractConfigured) {
    throw new ChainError("NO_CONTRACT", "No contract address configured. Run `npm run deploy` in the project root, then reload this page.");
  }
  const code = await provider.getCode(CONTRACT_ADDRESS);
  if (code === "0x") {
    throw new ChainError(
      "NO_CONTRACT",
      `No ChainProof contract exists at ${CONTRACT_ADDRESS} on the connected network. Select "${NETWORK.name}" in MetaMask, and re-run \`npm run deploy\` if you restarted the local node.`
    );
  }
}

/** Read-only contract. Uses MetaMask's network if installed, else the local RPC directly. */
export async function getReadContract() {
  const provider = hasMetaMask() ? new BrowserProvider(window.ethereum) : new JsonRpcProvider(NETWORK.rpcUrl, NETWORK.chainId, { staticNetwork: true });
  await assertContractDeployed(provider);
  return new Contract(CONTRACT_ADDRESS, abi, provider);
}

/** Contract connected to the MetaMask signer (needed for transactions). */
export async function getWriteContract() {
  if (!hasMetaMask()) throw new ChainError("NO_METAMASK", "MetaMask is not installed.");
  const provider = new BrowserProvider(window.ethereum);
  await assertContractDeployed(provider);
  const signer = await provider.getSigner();
  return new Contract(CONTRACT_ADDRESS, abi, signer);
}

export const shortAddress = (a) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "");
export const formatTimestamp = (seconds) => new Date(seconds * 1000).toLocaleString();
