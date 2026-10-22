const LABELS = {
  wallet: ["Waiting for MetaMask", "Review and confirm the transaction in the MetaMask window."],
  pending: ["Transaction submitted", "Waiting for it to be included in a block..."],
  confirmed: ["Transaction confirmed", "The transaction is recorded on the blockchain."],
  failed: ["Transaction not completed", "Nothing was changed on the blockchain."],
};

export default function TxStatus({ phase, txHash }) {
  if (!phase || !LABELS[phase]) return null;
  const [title, text] = LABELS[phase];
  return (
    <div className={`tx tx-${phase}`} role="status" aria-live="polite">
      <strong>{title}</strong>
      <span>{text}</span>
      {txHash && (
        <span className="tx-hash">
          Transaction hash: <code>{txHash}</code>
        </span>
      )}
    </div>
  );
}
