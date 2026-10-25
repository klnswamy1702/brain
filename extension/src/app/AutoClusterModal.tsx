import { useState, useEffect } from "react";
import type {
  CapturedTab,
  TabInfo,
  Session,
  TopicCluster,
  ResearchSource,
} from "../shared/types";
import { clusterTabsByTopic, cleanTitle } from "../shared/session-generator";

interface AutoClusterModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: (CapturedTab | TabInfo)[];
  hasTabGroups: boolean;
  onSaveClusters: (sessions: Session[], clearGroups: boolean) => Promise<void>;
  onSwitchToSingleSession: () => void;
}

export function AutoClusterModal({
  isOpen,
  onClose,
  tabs,
  hasTabGroups,
  onSaveClusters,
  onSwitchToSingleSession,
}: AutoClusterModalProps) {
  const [clusters, setClusters] = useState<TopicCluster[]>([]);
  const [clusterTitles, setClusterTitles] = useState<Record<string, string>>({});
  const [expandedClusterIds, setExpandedClusterIds] = useState<Set<string>>(
    new Set(),
  );
  const [clearTabGroups, setClearTabGroups] = useState(hasTabGroups);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cluster tabs on open
  useEffect(() => {
    if (!isOpen) return;

    if (tabs.length === 0) {
      setClusters([]);
      setClusterTitles({});
      return;
    }

    const detected = clusterTabsByTopic(tabs);
    setClusters(detected);

    const initialTitles: Record<string, string> = {};
    for (const c of detected) {
      initialTitles[c.id] = c.draft.title;
    }
    setClusterTitles(initialTitles);
    setClearTabGroups(hasTabGroups);
    setError(null);
  }, [isOpen, tabs, hasTabGroups]);

  if (!isOpen) return null;

  const toggleExpandSources = (clusterId: string) => {
    setExpandedClusterIds((prev) => {
      const next = new Set(prev);
      if (next.has(clusterId)) next.delete(clusterId);
      else next.add(clusterId);
      return next;
    });
  };

  const handleTitleChange = (clusterId: string, val: string) => {
    setClusterTitles((prev) => ({
      ...prev,
      [clusterId]: val,
    }));
  };

  const handleSaveAllClusters = async () => {
    if (clusters.length === 0) return;

    setIsSaving(true);
    setError(null);

    const now = Date.now();
    const sessionsToSave: Session[] = clusters.map((c) => {
      const finalTitle =
        (clusterTitles[c.id] || c.draft.title).trim() || c.categoryName;
      return {
        id: crypto.randomUUID(),
        title: finalTitle,
        createdAt: now,
        endedAt: now,
        tabCount: c.draft.sources.length,
        sources: c.draft.sources,
        summary: c.draft.summary,
        topics: c.draft.topics,
        keyLearnings: c.draft.keyLearnings,
        insights: c.draft.insights,
        openQuestions: c.draft.openQuestions,
        objective: c.draft.objective,
        stoppingPoint: c.draft.stoppingPoint,
        researchState: {
          objective: c.draft.objective,
          learnings: c.draft.keyLearnings,
          insights: c.draft.insights,
          unresolved: c.draft.openQuestions,
          stoppingPoint: c.draft.stoppingPoint,
        },
      };
    });

    try {
      await onSaveClusters(sessionsToSave, clearTabGroups);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save clustered sessions");
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
          maxWidth: 780,
          maxHeight: "92vh",
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
              <span style={{ fontSize: 22 }}>✨</span>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                Auto-Cluster Research by Topic
              </h2>
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                marginTop: 4,
              }}
            >
              Automatically groups your research tabs into focused, separate
              sessions
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="btn-ghost"
              type="button"
              onClick={onSwitchToSingleSession}
              style={{ fontSize: 12, padding: "4px 10px" }}
              title="Switch to single session mode"
            >
              📦 Single Session Mode
            </button>
            <button
              onClick={onClose}
              className="btn-ghost"
              style={{
                padding: "4px 10px",
                fontSize: 18,
                lineHeight: 1,
                borderRadius: "50%",
              }}
              title="Close modal"
            >
              ×
            </button>
          </div>
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

          {clusters.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                No Tabs Found to Cluster
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  maxWidth: 400,
                  margin: "0 auto 20px auto",
                }}
              >
                Open or capture some research tabs first.
              </p>
              <button className="btn-ghost" onClick={onClose}>
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Summary Banner */}
              <div
                style={{
                  background: "rgba(139, 92, 246, 0.12)",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  borderRadius: "var(--radius)",
                  padding: "12px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      background: "var(--accent)",
                      color: "white",
                      padding: "2px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {clusters.length} Topic Clusters
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
                    Found across {tabs.length} captured tabs
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  Each cluster will become its own session
                </span>
              </div>

              {/* Cluster Cards List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {clusters.map((cluster) => {
                  const isExpanded = expandedClusterIds.has(cluster.id);
                  const currentTitle =
                    clusterTitles[cluster.id] ?? cluster.draft.title;

                  return (
                    <div
                      key={cluster.id}
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        padding: "18px 20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      {/* Cluster Card Header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 20 }}>
                            {cluster.categoryIcon}
                          </span>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "var(--text-primary)",
                            }}
                          >
                            {cluster.categoryName}
                          </span>
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
                            {cluster.tabs.length} tabs
                          </span>
                        </div>

                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => toggleExpandSources(cluster.id)}
                          style={{ fontSize: 11, padding: "3px 8px" }}
                        >
                          {isExpanded
                            ? "Hide Tabs ▲"
                            : `View ${cluster.tabs.length} Tabs ▼`}
                        </button>
                      </div>

                      {/* Editable Session Title */}
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            color: "var(--text-secondary)",
                            marginBottom: 4,
                          }}
                        >
                          Session Title
                        </label>
                        <input
                          type="text"
                          value={currentTitle}
                          onChange={(e) =>
                            handleTitleChange(cluster.id, e.target.value)
                          }
                          style={{ fontSize: 14, fontWeight: 500 }}
                        />
                      </div>

                      {/* Detected Topics pills */}
                      {cluster.draft.topics &&
                        cluster.draft.topics.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 6,
                            }}
                          >
                            {cluster.draft.topics.map((t, idx) => (
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

                      {/* Summary preview */}
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          lineHeight: 1.5,
                          background: "var(--bg-secondary)",
                          padding: "8px 12px",
                          borderRadius: 6,
                        }}
                      >
                        {cluster.draft.summary}
                      </div>

                      {/* Collapsible Tabs List */}
                      {isExpanded && (
                        <div
                          style={{
                            borderTop: "1px solid var(--border)",
                            paddingTop: 10,
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          {cluster.draft.sources.map((s, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 8px",
                                borderRadius: 4,
                                background: "var(--bg-secondary)",
                              }}
                            >
                              <img
                                src={getFaviconUrl(s)}
                                alt=""
                                style={{
                                  width: 14,
                                  height: 14,
                                  borderRadius: 2,
                                  flexShrink: 0,
                                }}
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
                                title={s.title}
                              >
                                <span style={{ fontWeight: 500 }}>
                                  {cleanTitle(s.title) || s.title}
                                </span>
                                <span
                                  style={{
                                    color: "var(--text-muted)",
                                    marginLeft: 8,
                                    fontSize: 11,
                                  }}
                                >
                                  {s.domain}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                    Archive and clear captured tab groups after saving sessions
                  </span>
                </label>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {clusters.length > 0 && (
          <footer
            style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--bg-tertiary)",
            }}
          >
            <button
              type="button"
              className="btn-ghost"
              onClick={onSwitchToSingleSession}
              style={{ fontSize: 13 }}
            >
              📦 Combine into 1 Session
            </button>

            <div style={{ display: "flex", gap: 10 }}>
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
                onClick={handleSaveAllClusters}
                disabled={isSaving}
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                  fontWeight: 600,
                  color: "white",
                  boxShadow: "0 2px 10px rgba(139, 92, 246, 0.35)",
                }}
              >
                {isSaving
                  ? "Saving Sessions..."
                  : `✨ Save as ${clusters.length} Separate Sessions`}
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
