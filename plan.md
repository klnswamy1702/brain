# Research Brain — Build Plan

> **OneTab's simplicity + superintelligence + memory.**
> A Chrome Extension that captures your research, remembers it, and helps you continue where you left off.

**Stack:** React + TypeScript + Tailwind · Chrome Manifest V3 · `chrome.storage.local` · No backend for V1

**How to build:** One feature at a time, in order. Build → load in Chrome → verify → next feature.

---

## Phase 1 — Core Loop (Get it running in Chrome)

### Feature 1: Chrome Extension Foundation

**Goal:** A locally installable Chrome Extension shell.

**What to build:**

1. Chrome Manifest V3 with minimum required permissions
2. Background service worker
3. Extension popup UI
4. Full extension page (opened from popup)
5. Clean separation: popup / extension page / service worker / content scripts / shared types
6. TypeScript throughout
7. Storage abstraction using `chrome.storage.local`
8. Navigation between popup and full extension page
9. UI shell with:
   - Research Brain title/branding
   - "Search Memory" placeholder
   - "End My Day" button
   - Recent Sessions placeholder
10. Build output that loads via `chrome://extensions` → Developer mode → Load unpacked

**Constraints:**

- No research capture, AI, backend, vector search, or Brain Chat yet
- No unnecessary libraries
- No fake APIs
- Keep architecture extensible

**Verification:**

- [ ] Lint/typecheck/build pass
- [ ] Extension loads in Chrome
- [ ] Popup renders
- [ ] Full extension page renders
- [ ] Document exact build + load commands

---

### Feature 2: Research Capture (Tab Collection)

**Goal:** Capture the user's open Chrome tabs into a local list — the core OneTab-like action.

**What to build:**

1. "Capture Research" action in the UI (like OneTab's "send tabs to list")
2. Capture for each tab: tab ID, URL, title, favicon, window ID, group ID, timestamp
3. Background service worker for capture orchestration
4. Typed `ResearchTab` and `ResearchActivity` models
5. Store captured data in `chrome.storage.local`
6. Show captured tab count after capture
7. Display captured tabs as a clean list (title + URL + timestamp)
8. Open any captured source from the list
9. Deduplication — re-capturing the same tab doesn't create duplicates
10. Capture tab groups where Chrome exposes them
11. Keep capture modular for future page-content capture

**Privacy:**

- Capture is explicit (user clicks the button)
- Show exactly what was captured
- No silent background capture

**UX target:**

```
Research Brain

[Capture Research]

Captured: 12 tabs

Recent Capture
 - Tab Title
   https://example.com
   Oct 21, 2026
```

**Constraints:**

- No AI summarization yet
- No semantic search yet
- No backend APIs

**Verification:**

- [ ] Open several tabs → click Capture Research → all tabs appear
- [ ] Close/reopen extension → captured data persists
- [ ] Re-capture → no duplicates
- [ ] Build passes

---

### Feature 3: End My Day (Session Generation)

**Goal:** Turn captured tabs into a Research Session — the moment raw tabs become structured knowledge.

**What to build:**

1. "End My Day" action in the extension
2. End My Day review modal/page showing:
   - Number of tabs captured
   - Captured tab titles and URLs
   - Capture timestamps
3. Generate a `ResearchSession` object:
   - session ID, title, createdAt
   - captured tab references
   - sources list
   - summary (generated from titles/metadata)
   - topics (extracted from content)
   - key learnings (only where justified by data)
   - open questions
4. Session title auto-generated from captured research content
5. User reviews the session before saving
6. Save / Cancel actions
7. Persist saved sessions in `chrome.storage.local`
8. Confirmation after save
9. Saved session appears in Recent Sessions

**Important:**

- Do NOT pretend title/URL metadata equals page content
- If data is insufficient for meaningful learnings, say so — don't hallucinate
- Use deterministic local summarization (no AI API required)

**UX target:**

```
End My Day

52 tabs captured

Detected topics:
 - Kubernetes
 - AWS
 - DevOps

Summary: ...

Key Learnings: ...

Open Questions: ...

[Cancel]  [Save Session]
```

**Verification:**

- [ ] Capture research → End My Day → review → save
- [ ] Session persists after closing/reopening extension
- [ ] Cancel discards the session
- [ ] Build passes

---

### Feature 4: Session Detail & Research State

**Goal:** Make a saved session useful even after original tabs are closed — your research notebook.

**What to build:**

1. Session Detail page showing:
   - Session title
   - Date/time
   - Research objective (where available)
   - Summary
   - Topics
   - Key learnings
   - Insights (if available)
   - Open questions
   - Captured sources with original URLs
   - Tab count
2. "Continue Research" action
3. "Delete Session" action
4. `ResearchState` model representing:
   - What was being researched
   - What was learned
   - What remains unresolved
   - Where research stopped

**Important:**

- Never fabricate conclusions
- Distinguish captured info from generated interpretation
- Every source links to the original URL
- Preserve original timestamps
- UX should feel like an auto-generated research notebook, not browser history

**Verification:**

- [ ] Open a saved session → all info displayed correctly
- [ ] Source links open correctly
- [ ] Delete session → deletion persists after restart
- [ ] Build passes

---

## Phase 2 — Intelligence Layer (Make it smart)

### Feature 5: Research Memory + Search

**Goal:** Search your saved research with natural language — "What did I learn about MCP?"

**What to build:**

1. Search input in the main Research Brain UI
2. Natural-language search across:
   - Session titles, summaries, topics
   - Learnings, open questions
   - Captured tab titles and URLs
3. Local relevance ranking
4. Results grouped by session
5. Highlight relevant text
6. Show source URLs and session dates
7. Show related sessions
8. Open matching Session Detail or original source
9. Clean `SearchResult` model
10. Abstract retrieval interface (swappable for future vector/embedding search)

**Example queries:**

- "What did I learn about MCP?"
- "What did I research about AWS?"
- "When did I research DCF?"
- "Show me my Kubernetes research"

**Constraints:**

- Search only stored data — no internet searches
- Show clear empty state for no results
- No Brain Chat yet

**Verification:**

- [ ] Create several sessions → search with various queries
- [ ] Relevant sessions rank higher
- [ ] Source links work
- [ ] No-result case handled gracefully
- [ ] Data survives extension restart
- [ ] Build passes

---

### Feature 6: Brain Chat

**Goal:** Ask conversational questions about your research and get grounded, cited answers.

**What to build:**

1. Brain Chat UI inside the extension
2. Flow: User question → retrieve relevant memory → generate grounded answer → display with citations
3. AI provider abstraction:
   - Works with API key when configured
   - Deterministic local fallback when no key exists
   - Never hardcode or expose API keys in client code
4. Answer classification:
   - **REMEMBERED** — directly from stored research
   - **SYNTHESIZED** — conclusion from combining research
   - **UNKNOWN** — not in stored research
5. Citation model showing: session title, date, source title, source URL
6. Every answer backed by citations

**Example queries:**

- "What have I learned about silver demand?"
- "What did I conclude about DCF?"
- "What sources did I use for Kubernetes networking?"
- "What questions were still unanswered?"

**Constraints:**

- No internet searches
- No autonomous agents
- No Projects yet
- Extension must work fully without an API key

**Verification:**

- [ ] Ask research questions → get grounded answers with citations
- [ ] Citations link to actual stored sources
- [ ] Works without API key (graceful fallback)
- [ ] Build passes

---

### Feature 7: Continue Research

**Goal:** Resume previous research with context, not just reopened tabs — this is what makes Brain different from bookmarks.

**What to build:**

1. Continue Research experience from a saved session:
   - Where I left off
   - Research objective
   - Current Research State
   - Key learnings
   - Open questions
   - Important sources
   - Suggested next starting point
2. Actions:
   - **Continue From Last Thinking** — show Research State, start from that context
   - **Open Important Sources** — open only highest-value stored sources
   - **Open Selected Sources** — user picks which to reopen
   - **Restore Session** — recreate the previous tab set
   - **Ask Research Brain** — open Brain Chat with session as context

**Important:**

- "Restore all tabs" is NOT the default — research continuity > tab restoration
- Handle tabs that can no longer be opened (show as unavailable)
- Use Chrome APIs safely

**Verification:**

- [ ] Save session → close tabs → reopen Brain → Continue Research
- [ ] Open important sources works
- [ ] Restore selected sources works
- [ ] Full session restore works
- [ ] Build passes

---

> **🎯 MVP checkpoint after Feature 7** — At this point you have the minimum viable Research Brain:
> `Capture → End My Day → Save → Close Browser → Come Back → Search Memory → Ask Brain → Continue Research`
> This is worth installing in Chrome and actually using before building more.

---

## Phase 3 — Polish & Power Features

### Feature 8: Home Dashboard

**Goal:** A personal research command center as the primary extension experience.

**What to build:**

1. **Header:** Research Brain branding
2. **Primary Search:** "What did I learn about...?"
3. **Primary Action:** End My Day button
4. **Recent Sessions:** title, date, topics, summary, Continue Research action
5. **Recent Activity:** latest captured research
6. **Last Research Session:** prominent Continue Research
7. **Projects:** show if they exist, otherwise empty state
8. **Suggested Topics:** recurring topics from stored research only

**Constraints:**

- No heavy dashboard frameworks
- No unnecessary analytics
- Keep all existing workflows working
- Responsive within Chrome's available surfaces
- Fast loading

**Verification:**

- [ ] Dashboard loads quickly
- [ ] All existing features (End My Day, Search, Sessions, Continue, Brain Chat) work from dashboard
- [ ] Empty state works for new installation
- [ ] Build passes

---

### Feature 9: Lightweight Research Projects

**Goal:** Group related research sessions into persistent projects.

**What to build:**

1. Create / delete / archive project
2. Project: title, objective, description
3. Add/remove sessions from a project
4. Project view: sessions, sources, insights, open questions, Research State
5. Open a session from within the project
6. Search within project memory
7. Optional project suggestions: "You have 4 sessions related to Silver Investing — [Create Project]"
8. Suggestions are user-controlled, not automatic

**Not building:**

- Collaboration, permissions, team features
- Advanced graph visualization
- Project automation or autonomous research

**Verification:**

- [ ] Create project → attach sessions → search within → delete project
- [ ] Persistence survives extension restart
- [ ] Build passes

---

### Feature 10: Privacy & Transparency

**Goal:** Make it obvious what Brain captures and give users full control over their data.

**What to build:**

1. Capture status indicator (active/paused)
2. Pause / Resume capture
3. Captured data viewer: what, when, source URL, session association
4. Delete individual sessions
5. Delete captured research data
6. Domain exclusion list (prevent capture on excluded domains)
7. Confirmation before destructive deletion
8. Simple privacy/settings screen

**UX communicates:**

- "What was captured?"
- "When was it captured?"
- "Why was it captured?"

**Constraints:**

- Don't claim security not actually implemented
- Don't silently collect information
- Don't expand permissions unnecessarily

**Verification:**

- [ ] Pause → verify capture stops → Resume → verify capture resumes
- [ ] Exclude domain → verify it's not captured
- [ ] Delete sessions → verify permanent deletion
- [ ] Inspect extension permissions
- [ ] Build passes

---

### Feature 11: V1 End-to-End Validation

**Goal:** Full audit — no new features, just make sure everything works together.

**Validate the complete journey:**

```
Install Extension
      ↓
Open Research Tabs
      ↓
Capture Research
      ↓
End My Day
      ↓
Review & Save Session
      ↓
Close Tabs / Browser
      ↓
Return Later
      ↓
Search Memory
      ↓
Ask Brain
      ↓
View Citations
      ↓
Continue Research
      ↓
Open Important Sources
      ↓
Resume Thinking
```

**Test areas:** Chrome Extension, Capture, End My Day, Memory/Search, Brain Chat, Continue Research, Projects, Privacy

**Also check:** TypeScript errors, lint errors, build errors, broken imports, Manifest V3 issues, service worker issues, storage issues, navigation, performance, UX

**Deliverables:**

1. Feature-by-feature status
2. Bugs found & fixed
3. Remaining limitations
4. Exact local commands to build & load
5. Chrome installation/test procedure
6. V2 recommendations

**The product must prove:** _"I can close my research because Research Brain remembers where I left off."_

---

## Build Workflow

For each feature:

```
Build → Load in Chrome → Verify → Fix issues → Next feature
```

**Stop after Feature 7 for your first real test.** That's the minimum viable loop worth using daily.

**Don't build PostgreSQL, pgvector, FastAPI, OAuth, or multi-provider AI before this local loop is tested.** `chrome.storage.local` + a replaceable retrieval/AI abstraction will prove whether the product is valuable.