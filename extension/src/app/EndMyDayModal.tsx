import { useState, useEffect } from "react";
import type {
  CapturedTab,
  TabInfo,
  Session,
  SessionDraft,
  ResearchSource,
} from "../shared/types";
import { generateResearchSessionDraft, cleanTitle } from "../shared/session-generator";

interface EndMyDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: (CapturedTab | TabInfo)[];
  hasTabGroups: boolean;
  onSave: (session: Session, clearGroups: boolean) => Promise<void>;
}

export function EndMyDayModal({
  isOpen,
  onClose,
  tabs,
  hasTabGroups,
  onSave,
}: EndMyDayModalProps) {
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [title, setTitle] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [summary, setSummary] = useState("");
  const [keyLearnings, setKeyLearnings] = useState<string[]>([]);
  const [newLearning, setNewLearning] = useState("");
  const [openQuestions, setOpenQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [showSourcesList, setShowSourcesList] = useState(false);
  const [clearTabGroups, setClearTabGroups] = useState(hasTabGroups);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize draft when modal opens or tabs change
  useEffect(() => {
    if (!isOpen) return;

    if (tabs.length === 0) {
      setDraft(null);
      return;
    }

    const generated = generateResearchSessionDraft(tabs);
    setDraft(generated);
    setTitle(generated.title);
    setTopics(generated.topics);
    setSummary(generated.summary);
    setKeyLearnings(generated.keyLearnings);
    setOpenQuestions(generated.openQuestions);
    setSelectedUrls(new Set(generated.sources.map((s) => s.url)));
    setClearTabGroups(hasTabGroups);
    setError(null);
  }, [isOpen, tabs, hasTabGroups]);

  if (!isOpen) return null;

  // Handle topic add/remove
  const handleAddTopic = () => {
    const trimmed = newTopic.trim();
    if (trimmed && !topics.includes(trimmed)) {
      setTopics([...topics, trimmed]);
      setNewTopic("");
    }
  };

  const handleRemoveTopic = (t: string) => {
    setTopics(topics.filter((item) => item !== t));
  };

  // Handle learning add/remove
  const handleAddLearning = () => {
    const trimmed = newLearning.trim();
    if (trimmed) {
      setKeyLearnings([...keyLearnings, trimmed]);
      setNewLearning("");
    }
  };

  const handleRemoveLearning = (index: number) => {
    setKeyLearnings(keyLearnings.filter((_, i) => i !== index));
  };

  // Handle question add/remove
  const handleAddQuestion = () => {
    const trimmed = newQuestion.trim();
    if (trimmed) {
      setOpenQuestions([...openQuestions, trimmed]);
      setNewQuestion("");
    }
  };

  const handleRemoveQuestion = (index: number) => {
    setOpenQuestions(openQuestions.filter((_, i) => i !== index));
  };

  // Handle tab inclusion toggle
  const toggleTabSelection = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  // Handle Save
  const handleSave = async () => {
    if (!draft) return;
    if (!title.trim()) {
      setError("Please provide a session title");
      return;
    }

    const filteredSources = draft.sources.filter((s) =>
      selectedUrls.has(s.url),
    );

    if (filteredSources.length === 0) {
      setError("Please include at least one research source");
      return;
    }

    setIsSaving(true);
    setError(null);

    const now = Date.now();
    const session: Session = {
      id: crypto.randomUUID(),
      title: title.trim(),
      createdAt: now,
      endedAt: now,
      tabCount: filteredSources.length,
      sources: filteredSources,
      summary: summary.trim(),
      topics,
      keyLearnings,
      openQuestions,
    };

    try {
      await onSave(session, clearTabGroups);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save research session");
    } finally {
      setIsSaving(false);
    }
  };

  const getFaviconUrl = (source: ResearchSource) => {
    if (source.favIconUrl) return source.favIconUrl;
    try {
      return `https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=16`;
    } catch {
      return undefined;
    }
  };

  const formatTime = (ts?: number) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          width: "100%",
          maxWidth: 720,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-tertiary)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>🌅</span>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                End My Day — Research Session Review
              </h2>
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                marginTop: 4,
              }}
            >
              Turn your captured tabs into structured, persistent knowledge
            </p>
          </div>

          <button
            onClick={onClose}
            className="btn-ghost"
            style={{
              padding: "4px 10px",
              fontSize: 18,
              lineHeight: 1,
              borderRadius: "50%",
            }}
            title="Cancel and close"
          >
            ×
          </button>
        </header>

        {/* Scrollable Body */}
        <div
          style={{
            padding: "24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "var(--radius)",
                background: "rgba(239, 68, 68, 0.15)",
                color: "var(--danger-hover)",
                fontSize: 13,
                border: "1px solid var(--danger)",
              }}
            >
              {error}
            </div>
          )}

          {!draft || tabs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                No Captured Tabs Found
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  maxWidth: 400,
                  margin: "0 auto 20px auto",
                }}
              >
                Capture your open research tabs first using "Capture & Close
                Tabs" before ending your day.
              </p>
              <button className="btn-ghost" onClick={onClose}>
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Stats Banner */}
              <div
                style={{
                  background: "rgba(99, 102, 241, 0.1)",
                  border: "1px solid rgba(99, 102, 241, 0.25)",
                  borderRadius: "var(--radius)",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      background: "var(--accent)",
                      color: "white",
                      padding: "2px 10px",
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {selectedUrls.size} tabs
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    Ready to structure into a session
                  </span>
                </div>

                <button
                  className="btn-ghost"
                  type="button"
                  onClick={() => setShowSourcesList(!showSourcesList)}
                  style={{ fontSize: 12, padding: "4px 10px" }}
                >
                  {showSourcesList
                    ? "Hide tab list"
                    : `Inspect ${draft.sources.length} tabs ▼`}
                </button>
              </div>

              {/* Collapsible Sources Review List */}
              {showSourcesList && (
                <div
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: 12,
                    maxHeight: 220,
                    overflowY: "auto",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: 8,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Check tabs to include in this session:</span>
                    <span>
                      {selectedUrls.size}/{draft.sources.length} selected
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {draft.sources.map((source) => {
                      const isSelected = selectedUrls.has(source.url);
                      return (
                        <label
                          key={source.url}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "6px 8px",
                            borderRadius: 4,
                            cursor: "pointer",
                            background: isSelected
                              ? "var(--bg-secondary)"
                              : "transparent",
                            opacity: isSelected ? 1 : 0.5,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTabSelection(source.url)}
                            style={{ accentColor: "var(--accent)" }}
                          />
                          <img
                            src={getFaviconUrl(source)}
                            alt=""
                            style={{ width: 14, height: 14, borderRadius: 2 }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: 12,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={source.title}
                          >
                            <span style={{ fontWeight: 500 }}>
                              {cleanTitle(source.title) || source.title}
                            </span>
                            <span
                              style={{
                                color: "var(--text-muted)",
                                marginLeft: 8,
                                fontSize: 11,
                              }}
                            >
                              {source.domain}
                            </span>
                          </div>
                          {source.capturedAt && (
                            <span
                              style={{
                                fontSize: 10,
                                color: "var(--text-muted)",
                                flexShrink: 0,
                              }}
                            >
                              {formatTime(source.capturedAt)}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Title Input */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  Session Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Kubernetes & AWS DevOps Research"
                  style={{ fontSize: 15, fontWeight: 500 }}
                />
              </div>

              {/* Detected Topics */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  Detected Topics
                </label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  {topics.map((topic) => (
                    <span
                      key={topic}
                      style={{
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border)",
                        padding: "4px 10px",
                        borderRadius: 16,
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>{topic}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTopic(topic)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          padding: 0,
                          cursor: "pointer",
                          fontSize: 14,
                          lineHeight: 1,
                        }}
                        title="Remove topic"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTopic();
                      }
                    }}
                    placeholder="+ Add custom topic..."
                    style={{
                      padding: "4px 10px",
                      fontSize: 12,
                      maxWidth: 240,
                    }}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={handleAddTopic}
                    style={{ padding: "4px 10px", fontSize: 12 }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  Summary
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={4}
                  style={{
                    width: "100%",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "10px 12px",
                    color: "var(--text-primary)",
                    fontSize: 13,
                    lineHeight: 1.5,
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Key Learnings */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  Key Learnings
                </label>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  {keyLearnings.map((learning, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        background: "var(--bg-primary)",
                        padding: "8px 12px",
                        borderRadius: "var(--radius)",
                        border: "1px solid var(--border)",
                        fontSize: 13,
                        lineHeight: 1.4,
                      }}
                    >
                      <span
                        style={{
                          color: "var(--accent)",
                          marginTop: 2,
                          userSelect: "none",
                        }}
                      >
                        •
                      </span>
                      <span style={{ flex: 1 }}>{learning}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLearning(idx)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          padding: 0,
                          cursor: "pointer",
                          fontSize: 16,
                          lineHeight: 1,
                        }}
                        title="Remove learning"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={newLearning}
                    onChange={(e) => setNewLearning(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddLearning();
                      }
                    }}
                    placeholder="+ Add a key takeaway..."
                    style={{ padding: "6px 10px", fontSize: 13, flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={handleAddLearning}
                    style={{ padding: "6px 12px", fontSize: 12 }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Open Questions */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  Open Questions
                </label>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  {openQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        background: "var(--bg-primary)",
                        padding: "8px 12px",
                        borderRadius: "var(--radius)",
                        border: "1px solid var(--border)",
                        fontSize: 13,
                        lineHeight: 1.4,
                      }}
                    >
                      <span
                        style={{
                          color: "#f59e0b",
                          fontWeight: 700,
                          marginTop: 1,
                          userSelect: "none",
                        }}
                      >
                        ?
                      </span>
                      <span style={{ flex: 1 }}>{q}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          padding: 0,
                          cursor: "pointer",
                          fontSize: 16,
                          lineHeight: 1,
                        }}
                        title="Remove question"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddQuestion();
                      }
                    }}
                    placeholder="+ Add an open question..."
                    style={{ padding: "6px 10px", fontSize: 13, flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={handleAddQuestion}
                    style={{ padding: "6px 12px", fontSize: 12 }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Clear captured tab groups option */}
              {hasTabGroups && (
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    padding: "8px 0",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={clearTabGroups}
                    onChange={(e) => setClearTabGroups(e.target.checked)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span>
                    Archive and clear captured tab groups after saving session
                  </span>
                </label>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {draft && tabs.length > 0 && (
          <footer
            style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              background: "var(--bg-tertiary)",
            }}
          >
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={isSaving || selectedUrls.size === 0}
              style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                fontWeight: 600,
                color: "white",
                boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
              }}
            >
              {isSaving ? "Saving..." : "💾 Save Session"}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
