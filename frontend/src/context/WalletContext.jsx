import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { EXPECTED_CHAIN_ID, NETWORK, hasMetaMask } from "../lib/chain.js";
import { friendlyError } from "../lib/errors.js";

const WalletContext = createContext(null);
export const useWallet = () => useContext(WalletContext);

/** Tracks MetaMask account + network and exposes connect / switch actions. */
export function WalletProvider({ children }) {
  const installed = hasMetaMask();
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!installed) return;
    const eth = window.ethereum;
    let alive = true;

    // Restore an already-authorised session without opening a popup.
    (async () => {
      try {
        const [accounts, cid] = await Promise.all([eth.request({ method: "eth_accounts" }), eth.request({ method: "eth_chainId" })]);
        if (!alive) return;
        setAccount(accounts[0] ?? null);
        setChainId(parseInt(cid, 16));
      } catch (e) {
        if (alive) setError(friendlyError(e));
      }
    })();

    const onAccounts = (accounts) => setAccount(accounts[0] ?? null);
    const onChain = (cid) => setChainId(parseInt(cid, 16));
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      alive = false;
      eth.removeListener("accountsChanged", onAccounts);
      eth.removeListener("chainChanged", onChain);
    };
  }, [installed]);

  const connect = useCallback(async () => {
    setError(null);
    if (!installed) return setError(friendlyError({ code: "NO_METAMASK" }));
    setBusy(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0] ?? null);
      setChainId(parseInt(await window.ethereum.request({ method: "eth_chainId" }), 16));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }, [installed]);

  /** Switch MetaMask to the Hardhat network, adding it first if MetaMask doesn't know it. */
  const switchNetwork = useCallback(async () => {
    setError(null);
    if (!installed) return setError(friendlyError({ code: "NO_METAMASK" }));
    setBusy(true);
    try {
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: NETWORK.chainIdHex }] });
      } catch (e) {
        if (e?.code !== 4902 && e?.data?.originalError?.code !== 4902) throw e;
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: NETWORK.chainIdHex,
              chainName: NETWORK.name,
              rpcUrls: [NETWORK.rpcUrl],
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            },
          ],
        });
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }, [installed]);

  const value = useMemo(
    () => ({
      installed,
      account,
      chainId,
      isCorrectNetwork: chainId === EXPECTED_CHAIN_ID,
      busy,
      error,
      connect,
      switchNetwork,
    }),
    [installed, account, chainId, busy, error, connect, switchNetwork]
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
