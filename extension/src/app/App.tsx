import { useState, useEffect, useCallback } from "react";
import type {
  Session,
  TabGroup,
  CapturedTab,
  CaptureResponse,
  RestoreResponse,
} from "../shared/types";
import { storage } from "../shared/storage";

type View = "home" | "session-detail";

export function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tabGroups, setTabGroups] = useState<TabGroup[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureResult, setCaptureResult] = useState<string | null>(null);

  // Session editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Tab group editing
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupTitle, setEditGroupTitle] = useState("");

  // Expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [view] = useState<View>("home");

  const loadData = useCallback(async () => {
    const allSessions = await storage.get("sessions");
    const activeId = await storage.get("currentSessionId");
    const groups = await storage.get("tabGroups");
    setSessions(allSessions);
    setCurrentSessionId(activeId);
    setTabGroups(groups);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Capture ──────────────────────────────────────────────

  const handleCapture = async (closeAfterCapture: boolean) => {
    setIsCapturing(true);
    setCaptureResult(null);
    chrome.runtime.sendMessage(
      { action: "CAPTURE_TABS", payload: { closeAfterCapture } },
      (response: CaptureResponse) => {
        setIsCapturing(false);
        if (response.success && response.capturedCount > 0) {
          setCaptureResult(
            `✓ ${response.capturedCount} tabs captured${closeAfterCapture ? " & closed" : ""}`,
          );
        } else if (response.capturedCount === 0) {
          setCaptureResult(response.error || "No new tabs to capture");
        } else {
          setCaptureResult(`✗ ${response.error || "Capture failed"}`);
        }
        loadData();
      },
    );
  };

  // ── Restore ──────────────────────────────────────────────

  const handleRestoreTab = (groupId: string, url: string, removeAfterRestore: boolean) => {
    chrome.runtime.sendMessage(
      { action: "RESTORE_TAB", payload: { groupId, url, removeAfterRestore } },
      (_response: RestoreResponse) => {
        loadData();
      },
    );
  };

  const handleRestoreAll = (groupId: string, removeAfterRestore: boolean) => {
    chrome.runtime.sendMessage(
      { action: "RESTORE_ALL", payload: { groupId, removeAfterRestore } },
      (_response: RestoreResponse) => {
        loadData();
      },
    );
  };

  // ── Delete ───────────────────────────────────────────────

  const handleDeleteGroup = (groupId: string) => {
    chrome.runtime.sendMessage(
      { action: "DELETE_TAB_GROUP", payload: { groupId } },
      () => {
        loadData();
      },
    );
  };

  const handleDeleteTabFromGroup = async (groupId: string, url: string) => {
    const groups = await storage.get("tabGroups");
    const updated = groups
      .map((g: TabGroup) => {
        if (g.id !== groupId) return g;
        return { ...g, tabs: g.tabs.filter((t) => t.url !== url) };
      })
      .filter((g: TabGroup) => g.tabs.length > 0);
    await storage.set("tabGroups", updated);
    setTabGroups(updated);
  };

  // ── Session management ───────────────────────────────────

  const handleNewSession = async () => {
    const session: Session = {
      id: crypto.randomUUID(),
      title: `Session ${sessions.length + 1}`,
      createdAt: Date.now(),
    };
    const updated = [session, ...sessions];
    await storage.set("sessions", updated);
    await storage.set("currentSessionId", session.id);
    setSessions(updated);
    setCurrentSessionId(session.id);
  };

  const handleEndDay = async () => {
    if (!currentSessionId) return;
    const updated = sessions.map((s) =>
      s.id === currentSessionId ? { ...s, endedAt: Date.now() } : s,
    );
    await storage.set("sessions", updated);
    await storage.set("currentSessionId", null);
    setSessions(updated);
    setCurrentSessionId(null);
  };

  const handleDeleteSession = async (id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    await storage.set("sessions", updated);
    if (currentSessionId === id) {
      await storage.set("currentSessionId", null);
      setCurrentSessionId(null);
    }
    setSessions(updated);
  };

  const handleRenameSession = async (id: string) => {
    if (!editTitle.trim()) return;
    const updated = sessions.map((s) =>
      s.id === id ? { ...s, title: editTitle.trim() } : s,
    );
    await storage.set("sessions", updated);
    setSessions(updated);
    setEditingId(null);
    setEditTitle("");
  };

  const handleRenameGroup = async (groupId: string) => {
    if (!editGroupTitle.trim()) return;
    const updated = tabGroups.map((g) =>
      g.id === groupId ? { ...g, title: editGroupTitle.trim() } : g,
    );
    await storage.set("tabGroups", updated);
    setTabGroups(updated);
    setEditingGroupId(null);
    setEditGroupTitle("");
  };

  // ── Toggle expand ────────────────────────────────────────

  const toggleExpand = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // ── Helpers ──────────────────────────────────────────────

  const getFaviconUrl = (tab: CapturedTab) => {
    if (tab.favIconUrl) return tab.favIconUrl;
    try {
      return `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=16`;
    } catch {
      return undefined;
    }
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  // ── Render ───────────────────────────────────────────────

  if (view !== "home") return null;

  const activeSessions = sessions.filter((s) => !s.endedAt);
  const endedSessions = sessions.filter((s) => s.endedAt);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>🧠 Research Brain</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-primary"
            onClick={() => handleCapture(true)}
            disabled={isCapturing}
            style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600 }}
          >
            {isCapturing ? "Capturing..." : "📥 Capture & Close Tabs"}
          </button>
          <button
            className="btn-ghost"
            onClick={() => handleCapture(false)}
            disabled={isCapturing}
            style={{ fontSize: 12 }}
          >
            Capture Only
          </button>
        </div>
      </header>

      {/* Capture result feedback */}
      {captureResult && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius)",
            background: captureResult.startsWith("✓")
              ? "rgba(34, 197, 94, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
            color: captureResult.startsWith("✓") ? "#22c55e" : "var(--danger)",
            fontSize: 13,
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{captureResult}</span>
          <button
            onClick={() => setCaptureResult(null)}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: 16,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Tab Groups (OneTab-style lists) ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={sectionHeadingStyle}>
          Saved Tab Groups
          <span style={{ marginLeft: 8, fontWeight: 400 }}>
            ({tabGroups.length})
          </span>
        </h2>

        {tabGroups.length === 0 ? (
          <div style={emptyStateStyle}>
            <p style={{ fontSize: 15, marginBottom: 4 }}>No captured tabs yet</p>
            <p style={{ fontSize: 13 }}>
              Click "Capture & Close Tabs" to save your open tabs
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tabGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.id);
              return (
                <div
                  key={group.id}
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    overflow: "hidden",
                  }}
                >
                  {/* Group header */}
                  <div
                    style={{
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleExpand(group.id)}
                  >
                    <div style={{ flex: 1 }}>
                      {editingGroupId === group.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleRenameGroup(group.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ display: "flex", gap: 8 }}
                        >
                          <input
                            type="text"
                            value={editGroupTitle}
                            onChange={(e) => setEditGroupTitle(e.target.value)}
                            autoFocus
                            style={{
                              flex: 1,
                              padding: "4px 8px",
                              fontSize: 13,
                            }}
                          />
                          <button
                            className="btn-primary"
                            type="submit"
                            style={{ padding: "4px 10px", fontSize: 12 }}
                          >
                            Save
                          </button>
                          <button
                            className="btn-ghost"
                            type="button"
                            onClick={() => setEditingGroupId(null)}
                            style={{ padding: "4px 10px", fontSize: 12 }}
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 14,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                transition: "transform 150ms",
                                transform: isExpanded
                                  ? "rotate(90deg)"
                                  : "rotate(0deg)",
                                display: "inline-block",
                              }}
                            >
                              ▶
                            </span>
                            {group.title}
                            <span
                              style={{
                                background: "var(--accent)",
                                color: "white",
                                padding: "1px 8px",
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 500,
                              }}
                            >
                              {group.tabs.length}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              marginTop: 2,
                              marginLeft: 20,
                            }}
                          >
                            {formatTime(group.capturedAt)}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Group actions */}
                    <div
                      style={{ display: "flex", gap: 6 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="btn-primary"
                        onClick={() => handleRestoreAll(group.id, true)}
                        style={{ padding: "4px 10px", fontSize: 11 }}
                        title="Open all tabs and remove this group"
                      >
                        Restore All
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() =>
                          handleRestoreAll(group.id, false)
                        }
                        style={{ padding: "4px 10px", fontSize: 11 }}
                        title="Open all tabs but keep the group saved"
                      >
                        Open All
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() => {
                          setEditingGroupId(group.id);
                          setEditGroupTitle(group.title);
                        }}
                        style={{ padding: "4px 10px", fontSize: 11 }}
                      >
                        Rename
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() => handleDeleteGroup(group.id)}
                        style={{
                          padding: "4px 10px",
                          fontSize: 11,
                          color: "var(--danger)",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Expanded tab list */}
                  {isExpanded && (
                    <div
                      style={{
                        borderTop: "1px solid var(--border)",
                        padding: "8px 0",
                      }}
                    >
                      {group.tabs.map((tab, index) => (
                        <div
                          key={`${tab.url}-${index}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "6px 16px",
                            gap: 10,
                            transition: "background 100ms",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLDivElement).style.background =
                              "var(--bg-tertiary)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLDivElement).style.background =
                              "transparent";
                          }}
                        >
                          {/* Favicon */}
                          <img
                            src={getFaviconUrl(tab)}
                            alt=""
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 2,
                              flexShrink: 0,
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />

                          {/* Title + URL */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                cursor: "pointer",
                                color: "var(--accent-hover)",
                              }}
                              onClick={() =>
                                handleRestoreTab(group.id, tab.url, false)
                              }
                              title={tab.title}
                            >
                              {tab.title}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={tab.url}
                            >
                              {tab.url}
                            </div>
                          </div>

                          {/* Tab actions */}
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              flexShrink: 0,
                            }}
                          >
                            <button
                              className="btn-ghost"
                              onClick={() =>
                                handleRestoreTab(group.id, tab.url, true)
                              }
                              style={{
                                padding: "2px 8px",
                                fontSize: 11,
                              }}
                              title="Open this tab and remove from list"
                            >
                              Open & Remove
                            </button>
                            <button
                              className="btn-ghost"
                              onClick={() =>
                                handleDeleteTabFromGroup(group.id, tab.url)
                              }
                              style={{
                                padding: "2px 8px",
                                fontSize: 11,
                                color: "var(--danger)",
                              }}
                              title="Remove from list without opening"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Sessions ── */}
      <section style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h2 style={sectionHeadingStyle}>
            Active Sessions
            <span style={{ marginLeft: 8, fontWeight: 400 }}>
              ({activeSessions.length})
            </span>
          </h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn-ghost"
              onClick={handleNewSession}
              style={{ fontSize: 12 }}
            >
              + New Session
            </button>
            {currentSessionId && (
              <button
                className="btn-danger"
                onClick={handleEndDay}
                style={{ fontSize: 12, padding: "4px 10px" }}
              >
                End My Day
              </button>
            )}
          </div>
        </div>

        {activeSessions.length === 0 ? (
          <div style={emptyStateStyle}>
            <p style={{ fontSize: 15, marginBottom: 4 }}>No active sessions</p>
            <p style={{ fontSize: 13 }}>
              Click "+ New Session" to start a research session
            </p>
          </div>
        ) : (
          <ul style={listStyle}>
            {activeSessions.map((session) => (
              <li
                key={session.id}
                style={{
                  ...cardStyle,
                  border:
                    session.id === currentSessionId
                      ? "1px solid var(--accent)"
                      : "1px solid var(--border)",
                }}
              >
                <div style={{ flex: 1 }}>
                  {editingId === session.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleRenameSession(session.id);
                      }}
                      style={{ display: "flex", gap: 8 }}
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        autoFocus
                        style={{ flex: 1, padding: "4px 8px", fontSize: 13 }}
                      />
                      <button
                        className="btn-primary"
                        type="submit"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                      >
                        Save
                      </button>
                      <button
                        className="btn-ghost"
                        type="button"
                        onClick={() => setEditingId(null)}
                        style={{ padding: "4px 10px", fontSize: 12 }}
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>
                        {session.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
                        Started {formatTime(session.createdAt)}
                      </div>
                    </>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {session.id === currentSessionId && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--accent)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      Active
                    </span>
                  )}
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      setEditingId(session.id);
                      setEditTitle(session.title);
                    }}
                    style={{ padding: "4px 8px", fontSize: 11 }}
                  >
                    Rename
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => handleDeleteSession(session.id)}
                    style={{
                      padding: "4px 8px",
                      fontSize: 11,
                      color: "var(--danger)",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Past Sessions */}
      {endedSessions.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>
            Past Sessions
            <span style={{ marginLeft: 8, fontWeight: 400 }}>
              ({endedSessions.length})
            </span>
          </h2>
          <ul style={listStyle}>
            {endedSessions.map((session) => (
              <li
                key={session.id}
                style={{ ...cardStyle, opacity: 0.7 }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>
                    {session.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {formatTime(session.createdAt)}
                    {session.endedAt &&
                      ` — ended ${formatTime(session.endedAt)}`}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{ fontSize: 11, color: "var(--text-muted)" }}
                  >
                    Ended
                  </span>
                  <button
                    className="btn-ghost"
                    onClick={() => handleDeleteSession(session.id)}
                    style={{
                      padding: "4px 8px",
                      fontSize: 11,
                      color: "var(--danger)",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer
        style={{
          marginTop: 48,
          textAlign: "center",
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        Research Brain v0.1.0
      </footer>
    </div>
  );
}

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--text-secondary)",
  marginBottom: 12,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const emptyStateStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  borderRadius: "var(--radius)",
  padding: 32,
  textAlign: "center",
  color: "var(--text-muted)",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const cardStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  borderRadius: "var(--radius)",
  padding: "12px 16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid var(--border)",
};
