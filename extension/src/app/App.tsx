import { useState, useEffect, useCallback } from "react";
import type {
  Session,
  TabGroup,
  CapturedTab,
  TabInfo,
  CaptureResponse,
  RestoreResponse,
} from "../shared/types";
import { storage } from "../shared/storage";
import { captureCurrentTabs, openTab } from "../shared/tabs";
import { EndMyDayModal } from "./EndMyDayModal";
import { AutoClusterModal } from "./AutoClusterModal";
import { SessionDetail } from "./SessionDetail";
import { cleanTitle } from "../shared/session-generator";

type View = "home" | "session-detail";

export function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tabGroups, setTabGroups] = useState<TabGroup[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureResult, setCaptureResult] = useState<string | null>(null);

  // Routing and active session detail
  const [view, setView] = useState<View>("home");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Session editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Tab group editing
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupTitle, setEditGroupTitle] = useState("");

  // Expanded groups & sessions
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // End My Day Modal state (Feature 3)
  const [isEndMyDayOpen, setIsEndMyDayOpen] = useState(false);
  const [endMyDayTabs, setEndMyDayTabs] = useState<(CapturedTab | TabInfo)[]>([]);
  const [saveConfirmation, setSaveConfirmation] = useState<string | null>(null);

  // Auto-Cluster Modal state (Topic Auto-Clustering)
  const [isAutoClusterOpen, setIsAutoClusterOpen] = useState(false);
  const [autoClusterTabs, setAutoClusterTabs] = useState<(CapturedTab | TabInfo)[]>([]);

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

  // Handle hash routes: #end-my-day, #auto-cluster, #session/:id
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === "#end-my-day") {
        handleOpenEndMyDay();
        try {
          history.replaceState(null, "", window.location.pathname);
        } catch {
          // ignore
        }
      } else if (hash === "#auto-cluster") {
        handleOpenAutoCluster();
        try {
          history.replaceState(null, "", window.location.pathname);
        } catch {
          // ignore
        }
      } else if (hash.startsWith("#session/")) {
        const id = hash.slice(9);
        if (id) {
          setSelectedSessionId(id);
          setView("session-detail");
        }
      } else if (!hash || hash === "#home") {
        setView("home");
        setSelectedSessionId(null);
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [tabGroups, sessions]);

  // ── Navigation helpers ────────────────────────────────────

  const handleOpenSessionDetail = (id: string) => {
    setSelectedSessionId(id);
    setView("session-detail");
    window.location.hash = `#session/${id}`;
  };

  const handleBackToHome = () => {
    setView("home");
    setSelectedSessionId(null);
    window.location.hash = "";
  };

  // ── Auto-Cluster by Topic (Separate Sessions) ─────────────

  const handleOpenAutoCluster = async () => {
    const groupTabs: CapturedTab[] = [];
    for (const group of tabGroups) {
      groupTabs.push(...group.tabs);
    }

    let currentTabs: CapturedTab[] = [];
    try {
      currentTabs = await captureCurrentTabs();
    } catch {
      // not in extension context or failed
    }

    const seenUrls = new Set<string>();
    const combinedTabs: CapturedTab[] = [];

    for (const tab of [...groupTabs, ...currentTabs]) {
      if (!seenUrls.has(tab.url)) {
        seenUrls.add(tab.url);
        combinedTabs.push(tab);
      }
    }

    setAutoClusterTabs(combinedTabs);
    setIsAutoClusterOpen(true);
  };

  const handleSaveAutoClusters = async (
    newSessions: Session[],
    clearGroups: boolean,
  ) => {
    const updated = [...newSessions, ...sessions];
    await storage.set("sessions", updated);
    setSessions(updated);

    if (clearGroups) {
      await storage.set("tabGroups", []);
      setTabGroups([]);
    }

    const sessionTitles = newSessions.map((s) => s.title).join(", ");
    setSaveConfirmation(
      `✓ Created ${newSessions.length} separate topic sessions: ${sessionTitles}!`,
    );
  };

  // ── End My Day (Single Session) ───────────────────────────

  const handleOpenEndMyDay = async () => {
    const groupTabs: CapturedTab[] = [];
    for (const group of tabGroups) {
      groupTabs.push(...group.tabs);
    }

    let currentTabs: CapturedTab[] = [];
    try {
      currentTabs = await captureCurrentTabs();
    } catch {
      // not in extension context or failed
    }

    const seenUrls = new Set<string>();
    const combinedTabs: CapturedTab[] = [];

    for (const tab of [...groupTabs, ...currentTabs]) {
      if (!seenUrls.has(tab.url)) {
        seenUrls.add(tab.url);
        combinedTabs.push(tab);
      }
    }

    setEndMyDayTabs(combinedTabs);
    setIsEndMyDayOpen(true);
  };

  const handleSaveEndMyDaySession = async (
    newSession: Session,
    clearGroups: boolean,
  ) => {
    const updated = [newSession, ...sessions];
    await storage.set("sessions", updated);
    setSessions(updated);

    if (clearGroups) {
      await storage.set("tabGroups", []);
      setTabGroups([]);
    }

    setSaveConfirmation(
      `✓ Research Session "${newSession.title}" saved successfully!`,
    );
    // Directly open the newly created notebook
    handleOpenSessionDetail(newSession.id);
  };


  const handleUpdateSession = async (updated: Session) => {
    const newSessions = sessions.map((s) => (s.id === updated.id ? updated : s));
    await storage.set("sessions", newSessions);
    setSessions(newSessions);
  };

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

  const handleRestoreTab = (
    groupId: string,
    url: string,
    removeAfterRestore: boolean,
  ) => {
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
      topics: ["General"],
      keyLearnings: [],
      openQuestions: [],
      sources: [],
      tabCount: 0,
    };
    const updated = [session, ...sessions];
    await storage.set("sessions", updated);
    await storage.set("currentSessionId", session.id);
    setSessions(updated);
    setCurrentSessionId(session.id);
    handleOpenSessionDetail(session.id);
  };

  const handleDeleteSession = async (id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    await storage.set("sessions", updated);
    setSessions(updated);
    if (currentSessionId === id) {
      await storage.set("currentSessionId", null);
      setCurrentSessionId(null);
    }
    if (selectedSessionId === id) {
      setSelectedSessionId(null);
      setView("home");
      window.location.hash = "";
    }
    if (expandedSessionId === id) {
      setExpandedSessionId(null);
    }
    setSaveConfirmation("✓ Session deleted successfully.");
    setTimeout(() => setSaveConfirmation(null), 3000);
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

  const toggleExpandGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const toggleExpandSession = (sessionId: string) => {
    setExpandedSessionId((prev) => (prev === sessionId ? null : sessionId));
  };

  // ── Helpers ──────────────────────────────────────────────

  const getFaviconUrl = (url: string, favIconUrl?: string) => {
    if (favIconUrl) return favIconUrl;
    try {
      return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`;
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

  const totalCapturedTabsCount = tabGroups.reduce(
    (acc, g) => acc + g.tabs.length,
    0,
  );

  // ── View Router: Session Detail Page (Feature 4) ──────────

  if (view === "session-detail" && selectedSessionId) {
    const selectedSession = sessions.find((s) => s.id === selectedSessionId);
    if (selectedSession) {
      return (
        <SessionDetail
          session={selectedSession}
          onBack={handleBackToHome}
          onUpdateSession={handleUpdateSession}
          onDeleteSession={handleDeleteSession}
        />
      );
    }
  }

  // ── Home View ─────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>🧠 Research Brain</h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            Capture research tabs like OneTab & turn them into structured daily
            sessions
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="btn-primary"
            onClick={handleOpenAutoCluster}
            style={{
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 600,
              background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
              color: "white",
              boxShadow: "0 2px 10px rgba(139, 92, 246, 0.3)",
            }}
            title="Group tabs by topic and create separate sessions in one click"
          >
            ✨ Auto-Cluster by Topic
          </button>
          <button
            className="btn-primary"
            onClick={handleOpenEndMyDay}
            style={{
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 600,
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "white",
              boxShadow: "0 2px 10px rgba(245, 158, 11, 0.25)",
            }}
          >
            🌅 End My Day
          </button>
          <button
            className="btn-primary"
            onClick={() => handleCapture(true)}
            disabled={isCapturing}
            style={{ padding: "9px 16px", fontSize: 13, fontWeight: 600 }}
          >
            {isCapturing ? "Capturing..." : "📥 Capture & Close"}
          </button>
          <button
            className="btn-ghost"
            onClick={() => handleCapture(false)}
            disabled={isCapturing}
            style={{ fontSize: 12, padding: "8px 12px" }}
          >
            Capture Only
          </button>
        </div>
      </header>

      {/* Confirmation Banner */}
      {saveConfirmation && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius)",
            background: "rgba(34, 197, 94, 0.12)",
            color: "#22c55e",
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: "1px solid rgba(34, 197, 94, 0.3)",
          }}
        >
          <span>{saveConfirmation}</span>
          <button
            onClick={() => setSaveConfirmation(null)}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: 18,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Capture Result feedback */}
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

      {/* ── End My Day Callout Banner (when tabs are captured) ── */}
      {totalCapturedTabsCount > 0 && (
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(99, 102, 241, 0.08) 100%)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "var(--radius)",
            padding: "14px 20px",
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#fbbf24",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>🌅</span> Ready to structure your day's research?
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                marginTop: 2,
              }}
            >
              You have {totalCapturedTabsCount} captured tab(s) waiting.
              Auto-cluster tabs by topic into separate sessions or combine them into
              one daily notebook.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 16 }}>
            <button
              className="btn-primary"
              onClick={handleOpenAutoCluster}
              style={{
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                color: "white",
                boxShadow: "0 2px 8px rgba(139, 92, 246, 0.3)",
              }}
            >
              ✨ Auto-Cluster by Topic
            </button>
            <button
              className="btn-ghost"
              onClick={handleOpenEndMyDay}
              style={{
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              🌅 Single Session
            </button>
          </div>
        </div>
      )}

      {/* ── Tab Groups (OneTab-style lists) ── */}
      <section style={{ marginBottom: 44 }}>
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
              Click "Capture & Close Tabs" to save your open tabs in one click
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
                    onClick={() => toggleExpandGroup(group.id)}
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
                        onClick={() => handleRestoreAll(group.id, false)}
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
                            src={getFaviconUrl(tab.url, tab.favIconUrl)}
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

      {/* ── Research Sessions (Feature 3 & 4: Research Notebook) ── */}
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
            Saved Research Sessions
            <span style={{ marginLeft: 8, fontWeight: 400 }}>
              ({sessions.length})
            </span>
          </h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn-ghost"
              onClick={handleNewSession}
              style={{ fontSize: 12 }}
            >
              + Blank Session
            </button>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div style={emptyStateStyle}>
            <p style={{ fontSize: 15, marginBottom: 4 }}>
              No saved research sessions yet
            </p>
            <p style={{ fontSize: 13 }}>
              Capture tabs during your work and click "🌅 End My Day" to
              generate structured session notebooks.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sessions.map((session) => {
              const isExpanded = expandedSessionId === session.id;
              const tabCount =
                session.tabCount ||
                session.sources?.length ||
                session.tabs?.length ||
                0;

              return (
                <div
                  key={session.id}
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: "var(--radius)",
                    border: isExpanded
                      ? "1px solid var(--accent)"
                      : "1px solid var(--border)",
                    overflow: "hidden",
                    transition: "border-color 150ms ease",
                  }}
                >
                  {/* Session Card Header */}
                  <div
                    style={{
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 16,
                      cursor: "pointer",
                    }}
                    onClick={() => handleOpenSessionDetail(session.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingId === session.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleRenameSession(session.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ display: "flex", gap: 8 }}
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
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
                            onClick={() => setEditingId(null)}
                            style={{ padding: "4px 10px", fontSize: 12 }}
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: 16,
                                color: "var(--text-primary)",
                              }}
                            >
                              {session.title}
                            </span>
                            {tabCount > 0 && (
                              <span
                                style={{
                                  background: "rgba(99, 102, 241, 0.2)",
                                  color: "var(--accent-hover)",
                                  padding: "2px 8px",
                                  borderRadius: 10,
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                {tabCount} tabs
                              </span>
                            )}
                          </div>

                          {/* Topics pills */}
                          {session.topics && session.topics.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                marginTop: 8,
                              }}
                            >
                              {session.topics.map((t, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    background: "var(--bg-tertiary)",
                                    border: "1px solid var(--border)",
                                    color: "var(--text-secondary)",
                                    fontSize: 11,
                                    padding: "2px 8px",
                                    borderRadius: 12,
                                  }}
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Objective or summary snippet */}
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--text-muted)",
                              marginTop: 6,
                              lineHeight: 1.4,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {session.objective || session.summary || "Click to open full research notebook"}
                          </div>

                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              marginTop: 4,
                            }}
                          >
                            Created {formatTime(session.createdAt)}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="btn-primary"
                        onClick={() => handleOpenSessionDetail(session.id)}
                        style={{
                          padding: "5px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                        title="Open full research notebook"
                      >
                        📖 Open Notebook
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() => toggleExpandSession(session.id)}
                        style={{ padding: "5px 10px", fontSize: 11 }}
                      >
                        {isExpanded ? "Collapse ▲" : "Preview ▼"}
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() => {
                          setEditingId(session.id);
                          setEditTitle(session.title);
                        }}
                        style={{ padding: "5px 8px", fontSize: 11 }}
                      >
                        Rename
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() => handleDeleteSession(session.id)}
                        style={{
                          padding: "5px 8px",
                          fontSize: 11,
                          color: "var(--danger)",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* ── Quick Preview (Inline) ── */}
                  {isExpanded && (
                    <div
                      style={{
                        borderTop: "1px solid var(--border)",
                        background: "var(--bg-primary)",
                        padding: "18px 22px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      {/* Objective */}
                      {session.objective && (
                        <div>
                          <div style={inlineHeadingStyle}>Objective</div>
                          <div style={{ fontSize: 13, color: "var(--text-primary)" }}>
                            {session.objective}
                          </div>
                        </div>
                      )}

                      {/* Summary */}
                      {session.summary && (
                        <div>
                          <div style={inlineHeadingStyle}>Summary</div>
                          <div
                            style={{
                              fontSize: 13,
                              lineHeight: 1.5,
                              color: "var(--text-secondary)",
                              whiteSpace: "pre-line",
                            }}
                          >
                            {session.summary}
                          </div>
                        </div>
                      )}

                      {/* Action to open full page */}
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                        <button
                          className="btn-primary"
                          onClick={() => handleOpenSessionDetail(session.id)}
                          style={{ fontSize: 12, padding: "5px 12px" }}
                        >
                          View Full Notebook & Sources (Feature 4) →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* End My Day Modal (Single Session) */}
      <EndMyDayModal
        isOpen={isEndMyDayOpen}
        onClose={() => setIsEndMyDayOpen(false)}
        tabs={endMyDayTabs}
        hasTabGroups={tabGroups.length > 0}
        onSave={handleSaveEndMyDaySession}
        onSwitchToAutoCluster={() => {
          setIsEndMyDayOpen(false);
          handleOpenAutoCluster();
        }}
      />

      {/* Auto-Cluster Modal (Separate Topic Sessions) */}
      <AutoClusterModal
        isOpen={isAutoClusterOpen}
        onClose={() => setIsAutoClusterOpen(false)}
        tabs={autoClusterTabs}
        hasTabGroups={tabGroups.length > 0}
        onSaveClusters={handleSaveAutoClusters}
        onSwitchToSingleSession={() => {
          setIsAutoClusterOpen(false);
          handleOpenEndMyDay();
        }}
      />

      <footer
        style={{
          marginTop: 48,
          textAlign: "center",
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        Research Brain v0.2.0
      </footer>
    </div>
  );
}

const inlineHeadingStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "var(--text-secondary)",
  marginBottom: 4,
};

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
