import type {
  CapturedTab,
  TabInfo,
  ResearchSource,
  SessionDraft,
  ResearchState,
  Session,
  TopicCluster,
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

/** Predefined taxonomy categories for high-signal topic clustering. */
interface TaxonomyCategory {
  id: string;
  name: string;
  icon: string;
  defaultTitle: string;
  keywords: string[];
  domains: string[];
}

export const TAXONOMIES: TaxonomyCategory[] = [
  {
    id: "devops",
    name: "DevOps & Cloud Infrastructure",
    icon: "🛠️",
    defaultTitle: "DevOps & Cloud Infrastructure",
    keywords: [
      "devops", "kubernetes", "k8s", "docker", "container", "containers", "aws", "amazon web services",
      "cloud", "ci/cd", "cicd", "pipeline", "jenkins", "terraform", "ansible", "linux", "helm",
      "infrastructure", "deployment", "deployments", "monitoring", "prometheus", "grafana",
      "microservices", "cluster", "clusters", "ingress", "pod", "pods", "node", "nodes", "serverless",
      "ec2", "s3", "eks", "iam", "sysadmin", "sre", "gitlab", "github actions", "observability",
      "production-grade", "scheduling", "kubeadm"
    ],
    domains: [
      "kubernetes.io", "aws.amazon.com", "docker.com", "terraform.io", "hashicorp.com",
      "devops.com", "redhat.com", "digitalocean.com", "jenkins.io", "helm.sh"
    ],
  },
  {
    id: "finance",
    name: "Silver ETFs, Stocks & Markets",
    icon: "📈",
    defaultTitle: "Silver ETFs & Financial Markets",
    keywords: [
      "silver", "gold", "etf", "etfs", "stock", "stocks", "share", "shares", "equity", "market", "markets",
      "investing", "invest", "investment", "investments", "finance", "financial", "trading", "trade", "trader",
      "nasdaq", "nyse", "portfolio", "bullion", "commodity", "commodities", "slv", "silver trust",
      "dividend", "dividends", "mutual fund", "crypto", "bitcoin", "sec", "earnings", "valuation",
      "sp500", "s&p", "dow jones", "bonds", "yield", "wall street", "index fund", "futures", "options",
      "ishares", "vanguard", "precious metals", "kitco", "bullionvault"
    ],
    domains: [
      "investing.com", "finance.yahoo.com", "etf.com", "bloomberg.com", "marketwatch.com", "fool.com",
      "seekingalpha.com", "cnbc.com", "wsj.com", "reuters.com", "moneycontrol.com", "tradingview.com",
      "zerodha.com", "nasdaq.com", "investopedia.com", "morningstar.com", "kitco.com"
    ],
  },
  {
    id: "sports",
    name: "Cricket & Sports Updates",
    icon: "🏏",
    defaultTitle: "Cricket & Sports Updates",
    keywords: [
      "cricket", "match", "score", "scores", "ipl", "bcci", "icc", "test match", "odi", "t20",
      "wicket", "wickets", "batsman", "bowler", "innings", "cup", "tournament", "sports", "football",
      "soccer", "premier league", "nba", "tennis", "olympics", "stadium", "championship", "live score",
      "athletics", "fifa", "cricketer", "espn", "cricinfo", "cricbuzz", "f1", "formula 1", "runs", "over"
    ],
    domains: [
      "espncricinfo.com", "cricbuzz.com", "espn.com", "skysports.com", "sportskeeda.com", "iplt20.com",
      "icc-cricket.com", "goal.com", "premierleague.com", "cricwaves.com", "cricket.com"
    ],
  },
  {
    id: "ai_ml",
    name: "AI & Machine Learning",
    icon: "🤖",
    defaultTitle: "AI & Machine Learning Research",
    keywords: [
      "ai", "artificial intelligence", "machine learning", "deep learning", "llm", "gpt", "gemini",
      "claude", "openai", "anthropic", "neural network", "prompt", "embeddings", "rag", "huggingface",
      "transformers", "agent", "nlp", "pytorch", "tensorflow", "model", "models"
    ],
    domains: [
      "openai.com", "anthropic.com", "huggingface.co", "ai.google.dev", "paperswithcode.com", "arxiv.org"
    ],
  },
  {
    id: "web_dev",
    name: "Web & Software Engineering",
    icon: "💻",
    defaultTitle: "Web & Software Engineering",
    keywords: [
      "react", "reactjs", "nextjs", "next.js", "vite", "vitejs", "typescript", "javascript", "python",
      "golang", "rust", "css", "html", "tailwind", "graphql", "rest api", "database", "postgresql",
      "postgres", "mongodb", "redis", "node", "nodejs", "frontend", "fullstack", "npm", "w3schools"
    ],
    domains: [
      "react.dev", "nextjs.org", "vite.dev", "vitejs.dev", "developer.mozilla.org", "npmjs.com",
      "pypi.org", "stackoverflow.com", "w3schools.com"
    ],
  },
];

/**
 * Automatically cluster a set of tabs into topic-based groups.
 * Enables turning 3 DevOps tabs, 4 Silver/Stocks tabs, and 2 Cricket tabs
 * into 3 separate focused research sessions in one click.
 */
export function clusterTabsByTopic(
  tabs: (CapturedTab | TabInfo)[],
): TopicCluster[] {
  if (tabs.length === 0) return [];

  const assigned = new Map<string, (CapturedTab | TabInfo)[]>();
  const unassigned: (CapturedTab | TabInfo)[] = [];

  for (const tab of tabs) {
    const title = (tab.title || "").toLowerCase();
    const url = (tab.url || "").toLowerCase();
    const domain = getCleanDomain(tab.url || "").toLowerCase();

    let bestTaxonomy: TaxonomyCategory | null = null;
    let highestScore = 0;

    for (const tax of TAXONOMIES) {
      let score = 0;

      // Check domain match
      for (const d of tax.domains) {
        if (domain.includes(d) || url.includes(d)) {
          score += 15;
        }
      }

      // Check keywords in title & URL
      for (const kw of tax.keywords) {
        const regex = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
        if (regex.test(title)) {
          score += 7;
        } else if (title.includes(kw)) {
          score += 4;
        }
        if (url.includes(kw)) {
          score += 3;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestTaxonomy = tax;
      }
    }

    if (bestTaxonomy && highestScore >= 3) {
      const list = assigned.get(bestTaxonomy.id) || [];
      list.push(tab);
      assigned.set(bestTaxonomy.id, list);
    } else {
      unassigned.push(tab);
    }
  }

  const clusters: TopicCluster[] = [];

  // Create clusters for each matched taxonomy
  for (const tax of TAXONOMIES) {
    const clusterTabs = assigned.get(tax.id);
    if (clusterTabs && clusterTabs.length > 0) {
      const draft = generateResearchSessionDraft(clusterTabs);
      draft.title = `${tax.defaultTitle}`;
      clusters.push({
        id: tax.id,
        categoryName: tax.name,
        categoryIcon: tax.icon,
        tabs: clusterTabs,
        draft,
      });
    }
  }

  // Handle any unassigned tabs
  if (unassigned.length > 0) {
    // If multiple unassigned tabs share a domain, group them together
    const domainMap = new Map<string, (CapturedTab | TabInfo)[]>();
    for (const tab of unassigned) {
      const d = getCleanDomain(tab.url) || "General";
      const list = domainMap.get(d) || [];
      list.push(tab);
      domainMap.set(d, list);
    }

    // If single domain has multiple tabs, create a domain-focused cluster
    const leftovers: (CapturedTab | TabInfo)[] = [];
    for (const [dom, domTabs] of domainMap.entries()) {
      if (domTabs.length >= 2 && dom !== "General") {
        const draft = generateResearchSessionDraft(domTabs);
        draft.title = `Research on ${dom}`;
        clusters.push({
          id: `domain-${dom}`,
          categoryName: `${dom} Research`,
          categoryIcon: "🌐",
          tabs: domTabs,
          draft,
        });
      } else {
        leftovers.push(...domTabs);
      }
    }

    if (leftovers.length > 0) {
      const draft = generateResearchSessionDraft(leftovers);
      draft.title = `General & Exploratory Research`;
      clusters.push({
        id: "general",
        categoryName: "General Research",
        categoryIcon: "🌐",
        tabs: leftovers,
        draft,
      });
    }
  }

  return clusters;
}
