import { useState, useEffect, useCallback } from "react";
import type { Session } from "../shared/types";
import { storage } from "../shared/storage";

export function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const loadData = useCallback(async () => {
    const allSessions = await storage.get("sessions");
    const activeId = await storage.get("currentSessionId");
    setSessions(allSessions);
    setCurrentSessionId(activeId);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleDelete = async (id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    await storage.set("sessions", updated);
    if (currentSessionId === id) {
      await storage.set("currentSessionId", null);
      setCurrentSessionId(null);
    }
    setSessions(updated);
  };

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) return;
    const updated = sessions.map((s) =>
      s.id === id ? { ...s, title: editTitle.trim() } : s,
    );
    await storage.set("sessions", updated);
    setSessions(updated);
    setEditingId(null);
    setEditTitle("");
  };

  const handleResumeSession = async (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (!session || session.endedAt) return;
    await storage.set("currentSessionId", id);
    setCurrentSessionId(id);
  };

  const activeSessions = sessions.filter((s) => !s.endedAt);
  const endedSessions = sessions.filter((s) => s.endedAt);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>🧠 Research Brain</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-primary" onClick={handleNewSession}>
            + New Session
          </button>
          {currentSessionId && (
            <button className="btn-danger" onClick={handleEndDay}>
              End My Day
            </button>
          )}
        </div>
      </header>

      <section style={{ marginBottom: 32 }}>
        <input
          type="search"
          placeholder="Search Memory... (coming soon)"
          disabled
          style={{ opacity: 0.5 }}
        />
      </section>

      {/* Active Sessions */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeadingStyle}>
          Active Sessions
          <span style={{ marginLeft: 8, fontWeight: 400 }}>({activeSessions.length})</span>
        </h2>

        {activeSessions.length === 0 ? (
          <div style={emptyStateStyle}>
            <p style={{ fontSize: 15, marginBottom: 4 }}>No active sessions</p>
            <p style={{ fontSize: 13 }}>Click "+ New Session" to start a research session</p>
          </div>
        ) : (
          <ul style={listStyle}>
            {activeSessions.map((session) => (
              <li key={session.id} style={{
                ...cardStyle,
                border: session.id === currentSessionId
                  ? "1px solid var(--accent)"
                  : "1px solid var(--border)",
              }}>
                <div style={{ flex: 1 }}>
                  {editingId === session.id ? (
                    <form onSubmit={(e) => { e.preventDefault(); handleRename(session.id); }}
                      style={{ display: "flex", gap: 8 }}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        autoFocus
                        style={{ flex: 1, padding: "4px 8px", fontSize: 13 }}
                      />
                      <button className="btn-primary" type="submit" style={{ padding: "4px 10px", fontSize: 12 }}>
                        Save
                      </button>
                      <button className="btn-ghost" type="button"
                        onClick={() => setEditingId(null)} style={{ padding: "4px 10px", fontSize: 12 }}>
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{session.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        Started {new Date(session.createdAt).toLocaleString()}
                      </div>
                    </>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {session.id === currentSessionId && (
                    <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, textTransform: "uppercase" }}>
                      Active
                    </span>
                  )}
                  {session.id !== currentSessionId && (
                    <button className="btn-ghost" onClick={() => handleResumeSession(session.id)}
                      style={{ padding: "4px 8px", fontSize: 11 }}>
                      Resume
                    </button>
                  )}
                  <button className="btn-ghost"
                    onClick={() => { setEditingId(session.id); setEditTitle(session.title); }}
                    style={{ padding: "4px 8px", fontSize: 11 }}>
                    Rename
                  </button>
                  <button className="btn-ghost"
                    onClick={() => handleDelete(session.id)}
                    style={{ padding: "4px 8px", fontSize: 11, color: "var(--danger)" }}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Ended Sessions */}
      {endedSessions.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>
            Past Sessions
            <span style={{ marginLeft: 8, fontWeight: 400 }}>({endedSessions.length})</span>
          </h2>
          <ul style={listStyle}>
            {endedSessions.map((session) => (
              <li key={session.id} style={{ ...cardStyle, opacity: 0.7 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{session.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {new Date(session.createdAt).toLocaleString()}
                    {session.endedAt && ` — ended ${new Date(session.endedAt).toLocaleString()}`}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Ended</span>
                  <button className="btn-ghost"
                    onClick={() => handleDelete(session.id)}
                    style={{ padding: "4px 8px", fontSize: 11, color: "var(--danger)" }}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer style={{ marginTop: 48, textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
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
