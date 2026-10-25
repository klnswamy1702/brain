import { useState, useEffect } from "react";
import type { StatusResponse, CaptureResponse } from "../shared/types";
import { openAppPage } from "../shared/navigation";

export function Popup() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureResult, setCaptureResult] = useState<string | null>(null);

  const refreshStatus = () => {
    chrome.runtime.sendMessage({ action: "GET_STATUS" }, (response: StatusResponse) => {
      setStatus(response);
    });
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleCapture = (closeAfter: boolean) => {
    setIsCapturing(true);
    setCaptureResult(null);
    chrome.runtime.sendMessage(
      { action: "CAPTURE_TABS", payload: { closeAfterCapture: closeAfter } },
      (response: CaptureResponse) => {
        setIsCapturing(false);
        if (response.success) {
          if (response.capturedCount > 0) {
            setCaptureResult(`✓ ${response.capturedCount} tabs captured${closeAfter ? " & closed" : ""}`);
          } else {
            setCaptureResult(response.error || "No new tabs to capture");
          }
        } else {
          setCaptureResult(`✗ ${response.error || "Capture failed"}`);
        }
        refreshStatus();
      },
    );
  };

  const handleEndDay = () => {
    openAppPage("#end-my-day");
    window.close();
  };

  return (
    <div style={{ width: 340, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>🧠 Research Brain</h1>
        <button
          className="btn-ghost"
          onClick={() => openAppPage()}
          style={{ fontSize: 12, padding: "4px 10px" }}
        >
          Open Full App
        </button>
      </header>

      {/* Primary Action: Capture & Close (OneTab behavior) */}
      <button
        className="btn-primary"
        onClick={() => handleCapture(true)}
        disabled={isCapturing}
        style={{ width: "100%", padding: "10px 16px", fontSize: 14, fontWeight: 600 }}
      >
        {isCapturing ? "Capturing..." : "📥 Capture & Close All Tabs"}
      </button>

      {/* Secondary: Capture without closing */}
      <button
        className="btn-ghost"
        onClick={() => handleCapture(false)}
        disabled={isCapturing}
        style={{ width: "100%", fontSize: 12 }}
      >
        Capture tabs without closing
      </button>

      {/* Capture result feedback */}
      {captureResult && (
        <div style={{
          padding: "8px 12px",
          borderRadius: "var(--radius)",
          background: captureResult.startsWith("✓") ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
          color: captureResult.startsWith("✓") ? "#22c55e" : "var(--danger)",
          fontSize: 13,
          textAlign: "center",
        }}>
          {captureResult}
        </div>
      )}

      {/* Status */}
      <section>
        <h2 style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Status
        </h2>
        <div style={{
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius)",
          padding: 12,
          color: "var(--text-muted)",
          fontSize: 13,
          display: "flex",
          justifyContent: "space-between",
        }}>
          <span>
            {status
              ? `${status.tabGroupCount} tab group(s)`
              : "Loading..."}
          </span>
          <span>
            {status
              ? `${status.sessionCount} session(s)`
              : ""}
          </span>
        </div>
      </section>

      {/* End My Day (Feature 3) */}
      <button
        className="btn-primary"
        onClick={handleEndDay}
        style={{
          width: "100%",
          padding: "10px 16px",
          fontWeight: 600,
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          color: "white",
          boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
        }}
      >
        🌅 End My Day (Review & Save)
      </button>

      <footer style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)" }}>
        Research Brain v0.2.0
      </footer>
    </div>
  );
}
