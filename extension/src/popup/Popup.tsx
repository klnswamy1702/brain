import { useState, useEffect } from "react";
import type { StatusResponse } from "../shared/types";
import { openAppPage } from "../shared/navigation";

export function Popup() {
  const [status, setStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ action: "GET_STATUS" }, (response: StatusResponse) => {
      setStatus(response);
    });
  }, []);

  const handleEndDay = () => {
    chrome.runtime.sendMessage({ action: "END_DAY" }, () => {
      chrome.runtime.sendMessage({ action: "GET_STATUS" }, (response: StatusResponse) => {
        setStatus(response);
      });
    });
  };

  return (
    <div style={{ width: 320, padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>🧠 Research Brain</h1>
        <button
          className="btn-ghost"
          onClick={openAppPage}
          style={{ fontSize: 12, padding: "4px 10px" }}
        >
          Open Full App
        </button>
      </header>

      <div>
        <input
          type="search"
          placeholder="Search Memory..."
          disabled
          style={{ opacity: 0.5 }}
        />
      </div>

      <section>
        <h2 style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Recent Sessions
        </h2>
        <div style={{
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius)",
          padding: 16,
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 13,
        }}>
          {status
            ? status.sessionCount > 0
              ? `${status.sessionCount} session(s) recorded`
              : "No sessions yet"
            : "Loading..."}
        </div>
      </section>

      <button className="btn-danger" onClick={handleEndDay} style={{ width: "100%" }}>
        End My Day
      </button>

      <footer style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)" }}>
        Research Brain v0.1.0
      </footer>
    </div>
  );
}
