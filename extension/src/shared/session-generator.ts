import type {
  CapturedTab,
  TabInfo,
  ResearchSource,
  SessionDraft,
  ResearchState,
  Session,
} from "./types";

/** Comprehensive list of common stop words to ignore when extracting topics. */
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
  "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
  "but", "by", "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does",
  "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had",
  "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "her", "here", "hers", "herself",
  "him", "himself", "his", "how", "how's", "i", "if", "in", "into", "is", "isn't", "it", "it's",
  "its", "itself", "just", "me", "more", "most", "my", "myself", "no", "nor", "not", "of", "off",
  "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
  "same", "she", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the",
  "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "this",
  "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "were",
  "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who",
  "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "your", "yours",
  // Generic web page filler words
  "home", "homepage", "welcome", "official", "site", "page", "guide", "tutorial", "overview",
  "introduction", "intro", "docs", "documentation", "reference", "api", "dashboard", "portal",
  "github", "google", "search", "free", "best", "top", "using", "learn", "app", "web", "online",
  "getting", "started", "start", "read", "view", "edit", "create", "new", "index",
]);

/** Known technical terms and domains to recognize with high confidence. */
const KNOWN_ENTITIES: Record<string, string> = {
  kubernetes: "Kubernetes",
  k8s: "Kubernetes",
  aws: "AWS",
  amazon: "AWS",
  docker: "Docker",
  devops: "DevOps",
  react: "React",
  reactjs: "React",
  nextjs: "Next.js",
  "next.js": "Next.js",
  vite: "Vite",
  vitejs: "Vite",
  typescript: "TypeScript",
  javascript: "JavaScript",
  python: "Python",
  golang: "Go",
  rust: "Rust",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  mongodb: "MongoDB",
  redis: "Redis",
  graphql: "GraphQL",
  rest: "REST API",
  tailwind: "Tailwind CSS",
  tailwindcss: "Tailwind CSS",
  zustand: "Zustand",
  redux: "Redux",
  gemini: "Gemini AI",
  openai: "OpenAI",
  anthropic: "Claude AI",
  linux: "Linux",
  git: "Git",
  vercel: "Vercel",
  cloudflare: "Cloudflare",
  architecture: "System Architecture",
  performance: "Performance",
  security: "Security",
  database: "Databases",
  microservices: "Microservices",
  frontend: "Frontend",
  backend: "Backend",
  testing: "Testing & QA",
};

/** Clean domain name from URL. */
export function getCleanDomain(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Clean title by stripping common branding suffixes. */
export function cleanTitle(title: string): string {
  if (!title) return "";
  return title
    .replace(
      /\s*[-–—|•·»]\s*(Wikipedia|GitHub|Stack Overflow|Medium|YouTube|Reddit|Google Search|Docs|Documentation|Dev\.to|Twitter|X|Substack|Hacker News)$/i,
      "",
    )
    .trim();
}

/**
 * Deterministically extract 3 to 6 key research topics from tab titles and URLs.
 */
export function extractTopics(tabs: { title: string; url: string }[]): string[] {
  if (tabs.length === 0) return ["General Research"];

  const entityScores = new Map<string, number>();
  const tokenScores = new Map<string, number>();

  for (const tab of tabs) {
    const title = cleanTitle(tab.title || "");
    const domain = getCleanDomain(tab.url || "").toLowerCase();

    // Check domain for known entities
    for (const [key, label] of Object.entries(KNOWN_ENTITIES)) {
      if (domain.includes(key)) {
        entityScores.set(label, (entityScores.get(label) || 0) + 3);
      }
    }

    // Tokenize title words and phrases
    const words = title
      .toLowerCase()
      .replace(/[^a-z0-9.+#-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    for (const word of words) {
      if (KNOWN_ENTITIES[word]) {
        const label = KNOWN_ENTITIES[word];
        entityScores.set(label, (entityScores.get(label) || 0) + 2);
      } else if (!STOP_WORDS.has(word)) {
        tokenScores.set(word, (tokenScores.get(word) || 0) + 1);
      }
    }

    // Check two-word bigrams for common concepts
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (KNOWN_ENTITIES[bigram]) {
        const label = KNOWN_ENTITIES[bigram];
        entityScores.set(label, (entityScores.get(label) || 0) + 3);
      }
    }
  }

  // Combine top scored entities
  const topics: string[] = [];
  const sortedEntities = [...entityScores.entries()].sort((a, b) => b[1] - a[1]);
  for (const [entity] of sortedEntities) {
    if (!topics.includes(entity)) {
      topics.push(entity);
    }
    if (topics.length >= 4) break;
  }

  // If we need more topics, pull high-frequency general tokens
  if (topics.length < 3) {
    const sortedTokens = [...tokenScores.entries()]
      .filter(([token]) => token.length > 3)
      .sort((a, b) => b[1] - a[1]);

    for (const [token] of sortedTokens) {
      const capitalized = token.charAt(0).toUpperCase() + token.slice(1);
      if (!topics.map((t) => t.toLowerCase()).includes(token)) {
        topics.push(capitalized);
      }
      if (topics.length >= 4) break;
    }
  }

  // If still empty, fall back to top domains
  if (topics.length === 0) {
    const domainCounts = new Map<string, number>();
    for (const tab of tabs) {
      const domain = getCleanDomain(tab.url);
      if (domain) {
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
      }
    }
    const topDomains = [...domainCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [d] of topDomains.slice(0, 3)) {
      topics.push(d);
    }
  }

  return topics.length > 0 ? topics : ["Research Overview"];
}

/**
 * Auto-generate a clean, descriptive session title from topics and date.
 */
export function generateSessionTitle(
  topics: string[],
  sources: ResearchSource[],
): string {
  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  if (topics.length >= 2) {
    return `${topics[0]} & ${topics[1]} Research`;
  }
  if (topics.length === 1 && topics[0] !== "General Research") {
    return `${topics[0]} Exploration — ${dateStr}`;
  }
  if (sources.length > 0 && sources[0].domain) {
    return `Research on ${sources[0].domain} — ${dateStr}`;
  }
  return `Research Session — ${dateStr}`;
}

/**
 * Generate a clear research objective statement (Feature 4).
 */
export function generateObjective(
  topics: string[],
  sources: ResearchSource[],
): string {
  if (topics.length >= 2) {
    return `Investigating ${topics.slice(0, 3).join(", ")} architectures, documentation, and implementation approaches across ${sources.length} captured source(s).`;
  }
  if (topics.length === 1 && topics[0] !== "General Research") {
    return `Exploring ${topics[0]} capabilities, integration patterns, and best practices.`;
  }
  if (sources.length > 0 && sources[0].domain) {
    return `Reviewing technical resources and documentation on ${sources[0].domain}.`;
  }
  return `Synthesizing exploratory research across ${sources.length} captured sources.`;
}

/**
 * Deterministically generate a concise, structured research summary.
 */
export function generateSummary(
  sources: ResearchSource[],
  topics: string[],
): string {
  const count = sources.length;
  const uniqueDomains = Array.from(
    new Set(sources.map((s) => s.domain).filter(Boolean)),
  );
  const domainSample = uniqueDomains.slice(0, 3).join(", ");

  let summary = `This session aggregates ${count} research source${count === 1 ? "" : "s"} across ${uniqueDomains.length} domain${uniqueDomains.length === 1 ? "" : "s"}`;
  if (domainSample) {
    summary += ` (including ${domainSample})`;
  }
  summary += ". ";

  if (topics.length > 0) {
    summary += `Primary research topics identified: ${topics.join(", ")}. `;
  }

  // Highlight key sources
  const sampleTitles = sources
    .slice(0, 3)
    .map((s) => cleanTitle(s.title))
    .filter(Boolean);

  if (sampleTitles.length > 0) {
    summary += `Key areas explored include: ${sampleTitles.join("; ")}.`;
  }

  summary += "\n\n(Synthesized deterministically from captured tab titles and URL metadata.)";
  return summary;
}

/**
 * Extract grounded key learnings based strictly on the captured titles and metadata.
 */
export function generateKeyLearnings(
  sources: ResearchSource[],
  topics: string[],
): string[] {
  const learnings: string[] = [];

  // Check for comparisons
  const comparisons = sources.filter((s) =>
    /\b(vs|versus|comparison|difference|alternatives?)\b/i.test(s.title),
  );
  if (comparisons.length > 0) {
    learnings.push(
      `Comparative investigation: Explored trade-offs and options in "${cleanTitle(comparisons[0].title)}".`,
    );
  }

  // Check for documentation / guides
  const docs = sources.filter((s) =>
    /\b(guide|docs|documentation|reference|tutorial|api|manual|handbook)\b/i.test(
      `${s.title} ${s.url}`,
    ),
  );
  if (docs.length > 0) {
    const focusTopic = topics[0] || "core tools";
    learnings.push(
      `Technical reference: Reviewed implementation guides and documentation for ${focusTopic} (${docs.length} documentation source${docs.length === 1 ? "" : "s"}).`,
    );
  }

  // Check for issues / troubleshooting
  const troubleshooting = sources.filter((s) =>
    /\b(issue|error|bug|fix|crash|stackoverflow|troubleshoot|problem)\b/i.test(
      `${s.title} ${s.url}`,
    ),
  );
  if (troubleshooting.length > 0) {
    learnings.push(
      `Troubleshooting and edge cases: Investigated resolutions for ${cleanTitle(troubleshooting[0].title)}.`,
    );
  }

  // Check for open-source repositories / packages
  const repos = sources.filter((s) =>
    /github\.com|npmjs\.com|pypi\.org/i.test(s.url),
  );
  if (repos.length > 0) {
    learnings.push(
      `Tooling & libraries: Assessed open-source components across ${repos.length} repository/package source${repos.length === 1 ? "" : "s"}.`,
    );
  }

  // If fewer than 2 specific learnings, add topic-grounded breadcrumb
  if (learnings.length < 2 && topics.length > 0) {
    learnings.push(
      `Breadcrumb mapping: Traced active research workflow focused on ${topics.slice(0, 2).join(" and ")}.`,
    );
  }

  // Mandatory transparent fidelity notice
  learnings.push(
    "Metadata note: Key learnings represent high-level topic breadcrumbs; consult source links for full in-depth content.",
  );

  return learnings;
}

/**
 * Generate analytical insights based on source composition (Feature 4).
 */
export function generateInsights(
  sources: ResearchSource[],
  topics: string[],
): string[] {
  const insights: string[] = [];
  const uniqueDomains = Array.from(
    new Set(sources.map((s) => s.domain).filter(Boolean)),
  );

  if (uniqueDomains.length > 2) {
    insights.push(
      `Multi-source verification: Findings span ${uniqueDomains.length} different domains, indicating cross-referenced research across independent sources.`,
    );
  }

  const hasDocs = sources.some((s) =>
    /docs|documentation|reference|api/i.test(`${s.title} ${s.url}`),
  );
  const hasCommunity = sources.some((s) =>
    /stackoverflow|github|reddit|forum|medium|dev\.to/i.test(
      `${s.title} ${s.url}`,
    ),
  );

  if (hasDocs && hasCommunity) {
    insights.push(
      "Balanced documentation & community insights: Research blends authoritative documentation with real-world implementation discussions.",
    );
  }

  if (topics.length >= 2) {
    insights.push(
      `Ecosystem intersection: The intersection of ${topics[0]} and ${topics[1]} represents the primary technical focus of this session.`,
    );
  }

  if (insights.length === 0) {
    insights.push(
      "Exploratory phase: Early discovery across captured web resources.",
    );
  }

  return insights;
}

/**
 * Identify where research stopped to facilitate continuity (Feature 4).
 */
export function generateStoppingPoint(sources: ResearchSource[]): string {
  if (sources.length === 0) return "No active stopping point recorded.";
  const lastSource = sources[sources.length - 1];
  const timeStr = lastSource.capturedAt
    ? ` at ${new Date(lastSource.capturedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
    : "";
  return `Last active source was "${cleanTitle(lastSource.title)}" (${lastSource.domain || "web"})${timeStr}. Use "Continue Research" to restore tabs and resume.`;
}

/**
 * Deterministically extract or synthesize open research questions.
 */
export function generateOpenQuestions(
  sources: ResearchSource[],
  topics: string[],
): string[] {
  const questions: string[] = [];

  // Extract explicit questions from titles
  for (const source of sources) {
    const title = cleanTitle(source.title);
    if (
      title.includes("?") ||
      /^(how|why|what|when|where|which|can|should|is|are)\b/i.test(title)
    ) {
      const q = title.endsWith("?") ? title : `${title}?`;
      if (!questions.includes(q)) {
        questions.push(q);
      }
    }
    if (questions.length >= 2) break;
  }

  // Synthesize practical next-step questions from topics
  const primaryTopic = topics[0] || "findings";
  const secondaryTopic = topics[1];

  if (questions.length < 3) {
    questions.push(
      `How do findings in ${primaryTopic} integrate with existing system constraints?`,
    );
  }

  if (questions.length < 3 && secondaryTopic) {
    questions.push(
      `What are the performance and complexity trade-offs between ${primaryTopic} and ${secondaryTopic}?`,
    );
  } else if (questions.length < 3) {
    questions.push(
      `What are the immediate prototype or verification steps to test these ${primaryTopic} insights?`,
    );
  }

  return questions.slice(0, 3);
}

/**
 * Derive or backfill a complete ResearchState for any session (Feature 4).
 */
export function deriveResearchState(session: Partial<Session>): ResearchState {
  const sources: ResearchSource[] =
    session.sources ??
    session.tabs?.map((t) => ({
      title: t.title,
      url: t.url,
      domain: getCleanDomain(t.url),
    })) ??
    [];

  const topics = session.topics && session.topics.length > 0
    ? session.topics
    : extractTopics(sources);

  const objective =
    session.objective ||
    session.researchState?.objective ||
    generateObjective(topics, sources);

  const learnings =
    session.keyLearnings && session.keyLearnings.length > 0
      ? session.keyLearnings
      : session.researchState?.learnings && session.researchState.learnings.length > 0
        ? session.researchState.learnings
        : generateKeyLearnings(sources, topics);

  const insights =
    session.insights && session.insights.length > 0
      ? session.insights
      : session.researchState?.insights && session.researchState.insights.length > 0
        ? session.researchState.insights
        : generateInsights(sources, topics);

  const unresolved =
    session.openQuestions && session.openQuestions.length > 0
      ? session.openQuestions
      : session.researchState?.unresolved && session.researchState.unresolved.length > 0
        ? session.researchState.unresolved
        : generateOpenQuestions(sources, topics);

  const stoppingPoint =
    session.stoppingPoint ||
    session.researchState?.stoppingPoint ||
    generateStoppingPoint(sources);

  return {
    objective,
    learnings,
    insights,
    unresolved,
    stoppingPoint,
  };
}

/**
 * Main entry point: generate a structured research session draft from a list of tabs.
 */
export function generateResearchSessionDraft(
  tabs: (CapturedTab | TabInfo)[],
): SessionDraft {
  const sources: ResearchSource[] = tabs.map((t) => ({
    title: t.title || "Untitled Tab",
    url: t.url,
    favIconUrl: "favIconUrl" in t ? t.favIconUrl : undefined,
    domain: getCleanDomain(t.url),
    capturedAt: "capturedAt" in t ? t.capturedAt : Date.now(),
  }));

  const topics = extractTopics(sources);
  const title = generateSessionTitle(topics, sources);
  const objective = generateObjective(topics, sources);
  const summary = generateSummary(sources, topics);
  const keyLearnings = generateKeyLearnings(sources, topics);
  const insights = generateInsights(sources, topics);
  const openQuestions = generateOpenQuestions(sources, topics);
  const stoppingPoint = generateStoppingPoint(sources);

  return {
    title,
    tabCount: sources.length,
    sources,
    topics,
    summary,
    keyLearnings,
    insights,
    openQuestions,
    objective,
    stoppingPoint,
  };
}
