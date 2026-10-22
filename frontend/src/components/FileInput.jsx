import { useId } from "react";

/** File picker that only reports the chosen File; hashing happens in the page. */
export default function FileInput({ file, onChange, label = "Document file" }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="file" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      {file && (
        <p className="hint">
          Selected: <strong>{file.name}</strong> ({file.size.toLocaleString()} bytes). Only the file's contents are hashed - the name is ignored. The file never leaves your browser.
        </p>
      )}
    </div>
  );
}
