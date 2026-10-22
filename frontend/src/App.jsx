import { useState } from "react";
import Header from "./components/Header.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import IssuePage from "./pages/IssuePage.jsx";
import VerifyPage from "./pages/VerifyPage.jsx";
import RevokePage from "./pages/RevokePage.jsx";

export default function App() {
  const [page, setPage] = useState("home");
  return (
    <>
      <Header page={page} onNavigate={setPage} />
      <main>
        {page === "home" && <Dashboard onNavigate={setPage} />}
        {page === "issue" && <IssuePage />}
        {page === "verify" && <VerifyPage />}
        {page === "revoke" && <RevokePage />}
      </main>
      <footer className="site-footer">ChainProof - academic project. Documents never leave your computer; only SHA-256 hashes and metadata are stored on-chain.</footer>
    </>
  );
}
