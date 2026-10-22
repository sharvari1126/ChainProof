export default function ErrorNotice({ error }) {
  if (!error) return null;
  return (
    <div className="notice notice-bad" role="alert">
      <strong>{error.title}</strong>
      <p>{error.message}</p>
    </div>
  );
}
