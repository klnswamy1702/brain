import { useState } from "react";
import type { Session, ResearchSource } from "../shared/types";
import { openTab, openTabs } from "../shared/tabs";
import { deriveResearchState, cleanTitle } from "../shared/session-generator";

interface SessionDetailProps {
  session: Session;
  onBack: () => void;
  onUpdateSession: (updated: Session) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
}

export function SessionDetail({
  session,
  onBack,
  onUpdateSession,
  onDeleteSession,
}: SessionDetailProps) {
  // Ensure research state is derived for full fidelity
  const derivedState = deriveResearchState(session);

  // Editable fields
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(session.title);

  const [objective, setObjective] = useState(
    session.objective || derivedState.objective,
  );
  const [isEditingObjective, setIsEditingObjective] = useState(false);

  const [summary, setSummary] = useState(session.summary || "");
  const [isEditingSummary, setIsEditingSummary] = useState(false);

  const [learnings, setLearnings] = useState<string[]>(derivedState.learnings);
  const [newLearning, setNewLearning] = useState("");

  const [insights, setInsights] = useState<string[]>(derivedState.insights);
  const [newInsight, setNewInsight] = useState("");

  const [unresolved, setUnresolved] = useState<string[]>(derivedState.unresolved);
  const [newQuestion, setNewQuestion] = useState("");

  const [stoppingPoint, setStoppingPoint] = useState(
    session.stoppingPoint || derivedState.stoppingPoint,
  );

  // Sources search/filter
  const [sourceSearch, setSourceSearch] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const sources: ResearchSource[] =
    session.sources && session.sources.length > 0
      ? session.sources
      : session.tabs?.map((t) => ({
          title: t.title,
          url: t.url,
          domain: new URL(t.url).hostname.replace(/^www\./, ""),
          capturedAt: session.createdAt,
        })) ?? [];

  const tabCount = session.tabCount || sources.length;

  const filteredSources = sources.filter((s) => {
    if (!sourceSearch.trim()) return true;
    const query = sourceSearch.toLowerCase();
    return (
      s.title.toLowerCase().includes(query) ||
      s.url.toLowerCase().includes(query) ||
      (s.domain && s.domain.toLowerCase().includes(query))
    );
  });

  // Save session edits
  const saveChanges = async (partial: Partial<Session>) => {
    const updated: Session = {
      ...session,
      ...partial,
      title: partial.title ?? title,
      objective: partial.objective ?? objective,
      summary: partial.summary ?? summary,
      keyLearnings: partial.keyLearnings ?? learnings,
      insights: partial.insights ?? insights,
      openQuestions: partial.openQuestions ?? unresolved,
      stoppingPoint: partial.stoppingPoint ?? stoppingPoint,
      researchState: {
        objective: partial.objective ?? objective,
        learnings: partial.keyLearnings ?? learnings,
        insights: partial.insights ?? insights,
        unresolved: partial.openQuestions ?? unresolved,
        stoppingPoint: partial.stoppingPoint ?? stoppingPoint,
      },
    };
    await onUpdateSession(updated);
    setFeedback("✓ Changes saved to session notebook.");
    setTimeout(() => setFeedback(null), 3000);
  };

  // Continue Research action
  const handleContinueResearch = async () => {
    if (sources.length === 0) {
      setFeedback("No sources recorded to reopen.");
      return;
    }
    setIsContinuing(true);
    try {
      const urls = sources.map((s) => s.url);
      const count = await openTabs(urls);
      setFeedback(`✓ Opened ${count} research tab${count === 1 ? "" : "s"} in Chrome to continue!`);
    } catch (err: any) {
      setFeedback(`Failed to open tabs: ${err?.message || String(err)}`);
    } finally {
      setIsContinuing(false);
    }
  };

  // Delete session action
  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${session.title}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    setIsDeleting(true);
    await onDeleteSession(session.id);
  };

  // Helper formatting
  const formatDateTime = (ts: number) =>
    new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const getFaviconUrl = (source: ResearchSource) => {
    if (source.favIconUrl) return source.favIconUrl;
    try {
      return `https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=16`;
    } catch {
      return undefined;
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 24px" }}>
      {/* Top Navigation & Breadcrumb */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <button
          className="btn-ghost"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            padding: "6px 12px",
          }}
        >
          <span>←</span> Back to All Sessions
        </button>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-primary"
            onClick={handleContinueResearch}
            disabled={isContinuing}
            style={{
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              color: "white",
              boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
            }}
          >
            {isContinuing ? "Reopening tabs..." : "🚀 Continue Research"}
          </button>
          <button
            className="btn-ghost"
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              padding: "7px 14px",
              fontSize: 13,
              color: "var(--danger)",
              borderColor: "rgba(239, 68, 68, 0.3)",
            }}
          >
            {isDeleting ? "Deleting..." : "🗑 Delete Session"}
          </button>
        </div>
      </nav>

      {/* Feedback banner */}
      {feedback && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius)",
            background: feedback.startsWith("✓")
              ? "rgba(34, 197, 94, 0.12)"
              : "rgba(239, 68, 68, 0.12)",
            color: feedback.startsWith("✓") ? "#22c55e" : "var(--danger)",
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: `1px solid ${feedback.startsWith("✓") ? "rgba(34, 197, 94, 0.3)" : "var(--danger)"}`,
          }}
        >
          <span>{feedback}</span>
          <button
            onClick={() => setFeedback(null)}
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

      {/* Session Title Header Card */}
      <header
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "24px 28px",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1 }}>
            {isEditingTitle ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsEditingTitle(false);
                  saveChanges({ title });
                }}
                style={{ display: "flex", gap: 8, maxWidth: 600 }}
              >
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                  style={{ fontSize: 18, fontWeight: 600, padding: "6px 10px" }}
                />
                <button className="btn-primary" type="submit" style={{ padding: "6px 12px", fontSize: 13 }}>
                  Save
                </button>
                <button
                  className="btn-ghost"
                  type="button"
                  onClick={() => {
                    setTitle(session.title);
                    setIsEditingTitle(false);
                  }}
                  style={{ padding: "6px 12px", fontSize: 13 }}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
                  {title}
                </h1>
                <button
                  className="btn-ghost"
                  onClick={() => setIsEditingTitle(true)}
                  style={{ padding: "2px 8px", fontSize: 11 }}
                  title="Rename session"
                >
                  ✎ Edit Title
                </button>
              </div>
            )}

            {/* Metadata Pills */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 12,
                flexWrap: "wrap",
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              <span>📅 Created {formatDateTime(session.createdAt)}</span>
              {session.endedAt && session.endedAt !== session.createdAt && (
                <span>• Ended {formatDateTime(session.endedAt)}</span>
              )}
              <span
                style={{
                  background: "rgba(99, 102, 241, 0.15)",
                  color: "var(--accent-hover)",
                  padding: "2px 8px",
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                {tabCount} tabs captured
              </span>
            </div>

            {/* Topics tags */}
            {session.topics && session.topics.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
                {session.topics.map((topic, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      padding: "3px 10px",
                      borderRadius: 14,
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    🏷️ {topic}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Research State Notebook Grid ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 28 }}>
        {/* 1. Research Objective Card */}
        <section
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🎯</span>
              <h2 style={sectionHeaderStyle}>Research Objective</h2>
              <span style={fidelityBadgeStyle}>Derived from Scope</span>
            </div>
            {!isEditingObjective && (
              <button
                className="btn-ghost"
                onClick={() => setIsEditingObjective(true)}
                style={{ padding: "2px 8px", fontSize: 11 }}
              >
                ✎ Edit
              </button>
            )}
          </div>

          {isEditingObjective ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={3}
                style={textareaStyle}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setIsEditingObjective(false);
                    saveChanges({ objective });
                  }}
                  style={{ padding: "4px 12px", fontSize: 12 }}
                >
                  Save
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setObjective(session.objective || derivedState.objective);
                    setIsEditingObjective(false);
                  }}
                  style={{ padding: "4px 12px", fontSize: 12 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-primary)" }}>
              {objective}
            </p>
          )}
        </section>

        {/* 2. Executive Summary Card */}
        <section
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>📝</span>
              <h2 style={sectionHeaderStyle}>Executive Summary</h2>
              <span style={fidelityBadgeStyle}>Synthesized Interpretation</span>
            </div>
            {!isEditingSummary && (
              <button
                className="btn-ghost"
                onClick={() => setIsEditingSummary(true)}
                style={{ padding: "2px 8px", fontSize: 11 }}
              >
                ✎ Edit
              </button>
            )}
          </div>

          {isEditingSummary ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                style={textareaStyle}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setIsEditingSummary(false);
                    saveChanges({ summary });
                  }}
                  style={{ padding: "4px 12px", fontSize: 12 }}
                >
                  Save
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setSummary(session.summary || "");
                    setIsEditingSummary(false);
                  }}
                  style={{ padding: "4px 12px", fontSize: 12 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--text-primary)",
                whiteSpace: "pre-line",
              }}
            >
              {summary || "No executive summary available."}
            </p>
          )}
        </section>

        {/* Two-column layout for Learnings & Unresolved */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* 3. What Was Learned */}
          <section
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>💡</span>
              <h2 style={sectionHeaderStyle}>What Was Learned</h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, marginBottom: 12 }}>
              {learnings.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    background: "var(--bg-primary)",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  <span style={{ color: "var(--accent)", marginTop: 1 }}>•</span>
                  <span style={{ flex: 1 }}>{item}</span>
                  <button
                    onClick={() => {
                      const updated = learnings.filter((_, i) => i !== idx);
                      setLearnings(updated);
                      saveChanges({ keyLearnings: updated });
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: 14,
                      padding: 0,
                    }}
                    title="Remove learning"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Add Learning input */}
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="text"
                value={newLearning}
                onChange={(e) => setNewLearning(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newLearning.trim()) {
                    e.preventDefault();
                    const updated = [...learnings, newLearning.trim()];
                    setLearnings(updated);
                    setNewLearning("");
                    saveChanges({ keyLearnings: updated });
                  }
                }}
                placeholder="+ Add takeaway..."
                style={{ fontSize: 12, padding: "5px 8px", flex: 1 }}
              />
              <button
                className="btn-ghost"
                type="button"
                onClick={() => {
                  if (newLearning.trim()) {
                    const updated = [...learnings, newLearning.trim()];
                    setLearnings(updated);
                    setNewLearning("");
                    saveChanges({ keyLearnings: updated });
                  }
                }}
                style={{ padding: "4px 8px", fontSize: 11 }}
              >
                Add
              </button>
            </div>
          </section>

          {/* 4. What Remains Unresolved */}
          <section
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>❓</span>
              <h2 style={sectionHeaderStyle}>What Remains Unresolved</h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, marginBottom: 12 }}>
              {unresolved.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    background: "var(--bg-primary)",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  <span style={{ color: "#f59e0b", fontWeight: 700, marginTop: 1 }}>?</span>
                  <span style={{ flex: 1 }}>{item}</span>
                  <button
                    onClick={() => {
                      const updated = unresolved.filter((_, i) => i !== idx);
                      setUnresolved(updated);
                      saveChanges({ openQuestions: updated });
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: 14,
                      padding: 0,
                    }}
                    title="Remove question"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Add Question input */}
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newQuestion.trim()) {
                    e.preventDefault();
                    const updated = [...unresolved, newQuestion.trim()];
                    setUnresolved(updated);
                    setNewQuestion("");
                    saveChanges({ openQuestions: updated });
                  }
                }}
                placeholder="+ Add unresolved question..."
                style={{ fontSize: 12, padding: "5px 8px", flex: 1 }}
              />
              <button
                className="btn-ghost"
                type="button"
                onClick={() => {
                  if (newQuestion.trim()) {
                    const updated = [...unresolved, newQuestion.trim()];
                    setUnresolved(updated);
                    setNewQuestion("");
                    saveChanges({ openQuestions: updated });
                  }
                }}
                style={{ padding: "4px 8px", fontSize: 11 }}
              >
                Add
              </button>
            </div>
          </section>
        </div>

        {/* 5. Key Insights & Analytical Observations */}
        {insights.length > 0 && (
          <section
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "18px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>📊</span>
              <h2 style={sectionHeaderStyle}>Key Insights & Observations</h2>
              <span style={fidelityBadgeStyle}>Analytical Synthesis</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    gap: 10,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "var(--text-primary)",
                  }}
                >
                  <span style={{ color: "var(--accent)" }}>◆</span>
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. Where Research Stopped */}
        <section
          style={{
            background: "rgba(99, 102, 241, 0.06)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            borderRadius: "var(--radius)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>🛑</span>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-hover)", textTransform: "uppercase" }}>
                Where Research Stopped
              </h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {stoppingPoint}
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={handleContinueResearch}
            style={{
              flexShrink: 0,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Resume Here
          </button>
        </section>
      </div>

      {/* ── 7. Captured Sources Archive ── */}
      <section
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "20px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>📚</span>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>
              Captured Sources ({sources.length})
            </h2>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Direct clickable original URLs
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="text"
              value={sourceSearch}
              onChange={(e) => setSourceSearch(e.target.value)}
              placeholder="Filter sources..."
              style={{ fontSize: 12, padding: "5px 10px", width: 180 }}
            />
            <button
              className="btn-ghost"
              onClick={handleContinueResearch}
              style={{ fontSize: 12, padding: "5px 12px" }}
              title="Open all sources as tabs in Chrome"
            >
              Open All ({sources.length})
            </button>
          </div>
        </div>

        {filteredSources.length === 0 ? (
          <div
            style={{
              padding: "24px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            {sourceSearch ? "No matching sources found." : "No sources captured in this session."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredSources.map((source, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: "var(--radius)",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  gap: 12,
                  transition: "border-color 100ms",
                }}
              >
                {/* Favicon */}
                <img
                  src={getFaviconUrl(source)}
                  alt=""
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />

                {/* Title & URL */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      cursor: "pointer",
                    }}
                    onClick={() => openTab(source.url)}
                    title={source.title}
                  >
                    {cleanTitle(source.title) || source.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginTop: 2,
                    }}
                  >
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--text-muted)", textDecoration: "none" }}
                      onClick={(e) => {
                        e.preventDefault();
                        openTab(source.url);
                      }}
                    >
                      {source.url}
                    </a>
                  </div>
                </div>

                {/* Domain Pill */}
                {source.domain && (
                  <span
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--text-secondary)",
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 10,
                      flexShrink: 0,
                    }}
                  >
                    {source.domain}
                  </span>
                )}

                {/* Open Action */}
                <button
                  className="btn-ghost"
                  onClick={() => openTab(source.url)}
                  style={{
                    padding: "4px 10px",
                    fontSize: 11,
                    flexShrink: 0,
                  }}
                  title="Open source URL in new tab"
                >
                  Open ↗
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "var(--text-secondary)",
};

const fidelityBadgeStyle: React.CSSProperties = {
  fontSize: 10,
  background: "var(--bg-tertiary)",
  color: "var(--text-muted)",
  padding: "1px 6px",
  borderRadius: 8,
  fontWeight: 500,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-primary)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: "8px 12px",
  color: "var(--text-primary)",
  fontSize: 13,
  lineHeight: 1.5,
  fontFamily: "inherit",
  resize: "vertical",
};
