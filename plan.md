Yes. Since your goal is **to get a working Chrome Extension locally first**, I would make the antigravity prompts much more implementation-focused than the Blueprint plan.

For the first local prototype, I strongly recommend:

**React + TypeScript + Tailwind + Chrome Manifest V3 + local storage first**, with the architecture kept ready for a backend later.

That lets you actually install the extension in Chrome and test the core loop before dealing with authentication, PostgreSQL, vector databases, and multiple AI providers.

Use these prompts **one at a time**, in order. After each feature, let antigravity implement it, run the relevant checks, and verify it locally before moving to the next.

---

# Feature 1 — Chrome Extension Foundation

Give this to Antigravity first:

You are building Research Brain V1, a Chrome Extension-first product.

Read the existing repository and the Blueprint files before making changes:

- blueprint/project-plan.md
- blueprint/build-plan.md
- blueprint/context/project-overview.md
- existing package.json and project configuration

Do not replace the existing framework unless the repository is not yet scaffolded.

Implement ONLY Feature 1: Chrome Extension Foundation.

Goal:

Create a locally runnable Chrome Extension using the repository's existing frontend stack, preferably React + TypeScript + Tailwind if already present.

Requirements:

1. Create a Chrome Manifest V3 extension.
2. Create a background service worker.
3. Create the extension popup.
4. Create a full extension application/page that can be opened from the extension.
5. Establish clean separation between:
   - popup UI
   - extension application UI
   - background service worker
   - content scripts, where needed
   - shared types/utilities
6. Use TypeScript throughout.
7. Add only the minimum Chrome permissions required for the current feature.
8. Add extension-safe storage abstraction using chrome.storage.
9. Add basic navigation between the popup and full extension page.
10. Create a simple Research Brain UI shell containing:
   - Research Brain title
   - Search Memory placeholder
   - End My Day button
   - Recent Sessions placeholder
11. Make the extension visually clean and usable, but do not spend time on advanced design.
12. Make sure the generated build can be loaded using Chrome:
   chrome://extensions → Developer mode → Load unpacked.
13. Make the build output predictable and document the local build/load commands.
14. Do not implement research capture, AI, backend, vector search, projects, or Brain Chat yet.

Important constraints:

- Do not introduce unnecessary libraries.
- Do not create fake backend APIs.
- Do not build features outside Feature 1.
- Preserve existing project conventions.
- Keep the architecture extensible for future features.

Verification:

1. Run the repository's existing lint/typecheck/build commands.
2. Fix any errors caused by your implementation.
3. Verify that the Chrome extension build succeeds.
4. Verify that the popup loads.
5. Verify that the full extension page loads.
6. Report the exact local commands I should run to build and load the extension.

At the end, summarize:
- files changed
- commands used
- verification results
- how to load the extension in Chrome

Do not move on to Feature 2.

---

# Feature 2 — Research Capture

Once Feature 1 works in Chrome:

Continue the Research Brain V1 implementation.

First inspect the current repository and the existing Feature 1 implementation. Read the Blueprint project/build plans and preserve the current architecture.

Implement ONLY Feature 2: Research Capture.

Goal:

Research Brain should be able to capture the user's current Chrome research context locally.

For this local prototype, prioritize reliable Chrome functionality over backend integration.

Implement:

1. Capture currently open Chrome tabs.
2. Capture for each tab:
   - tab ID
   - URL
   - title
   - window ID
   - group ID where available
   - timestamp
3. Add a background service worker responsible for capture orchestration.
4. Create a typed ResearchTab model.
5. Create a typed ResearchActivity model.
6. Store captured data using chrome.storage.local.
7. Add a "Capture Research" action to the extension UI.
8. Show the number of captured tabs after capture.
9. Show captured tabs in the extension UI.
10. Allow the user to open a captured source from the UI.
11. Add basic deduplication so repeatedly capturing the same tab does not create uncontrolled duplicates.
12. Preserve timestamps for later session generation.
13. Capture tab groups where Chrome exposes them.
14. Keep the capture implementation modular so page-content capture can be added later.
15. Do not yet implement AI summarization.
16. Do not yet implement semantic search.
17. Do not yet implement external backend APIs.
18. Do not yet implement ChatGPT/Gemini/Copilot scraping unless it is required to establish a clean abstraction. For this feature, the basic tab capture is the priority.

Privacy:

- Make capture explicit.
- Show the user what was captured.
- Do not silently capture all browsing activity.
- Do not collect unrelated information beyond what is needed for this feature.

UX:

The extension should show something similar to:

Research Brain

[Capture Research]

Captured:
12 tabs

Recent Capture
- Title
  URL
  timestamp

Verification:

1. Run typecheck/lint/build.
2. Fix errors.
3. Build the Chrome extension.
4. Load it into Chrome.
5. Open several tabs.
6. Click Capture Research.
7. Confirm all expected tabs appear.
8. Close/reopen the extension and verify captured data persists.

Do not move on to Feature 3.

---

# Feature 3 — End My Day

This is where the prototype starts becoming interesting.

Continue Research Brain V1 from the existing implementation.

Read the Blueprint plans and inspect the existing capture implementation.

Implement ONLY Feature 3: End My Day.

Goal:

Turn the captured Chrome research context into a Research Session.

For this local prototype, use a deterministic/local summarization strategy if no AI API is configured. Do not block the feature on external API credentials.

Implement:

1. Add an "End My Day" action in the extension.
2. When clicked, show an End My Day review modal/page.
3. Display:
   - number of tabs captured
   - captured tab titles
   - source URLs
   - capture timestamp
4. Generate a Research Session object.
5. The session should contain:
   - session ID
   - title
   - createdAt
   - captured tab IDs
   - sources
   - summary
   - topics
   - key learnings
   - open questions
6. Create a sensible session title from the captured research content.
7. Generate a basic summary from the captured titles/metadata.
8. Extract basic topics from the research content.
9. Generate basic key-learning placeholders only where justified by available data.
10. Do not invent facts that were never captured.
11. Clearly mark information as unavailable when the captured data is insufficient.
12. Allow the user to review the generated session before saving.
13. Provide:
   - Save Session
   - Cancel
14. Persist saved Research Sessions using chrome.storage.local.
15. After saving, show a confirmation.
16. Add the saved session to Recent Sessions.
17. Make the flow usable without a backend.

Very important:

Do NOT pretend that title/URL metadata is equivalent to page content.

If the current capture layer does not contain enough information to generate meaningful learnings, say so in the UI rather than hallucinating.

UX target:

End My Day

52 tabs captured

Detected topics:
- Kubernetes
- AWS
- DevOps

Summary:
...

Key Learnings:
...

Open Questions:
...

[Cancel] [Save Session]

Do not implement semantic search, Brain Chat, projects, or internet research yet.

Verification:

Run lint/typecheck/build and test the actual extension in Chrome.

Manually verify:
- capture research
- click End My Day
- review session
- save session
- close popup
- reopen extension
- confirm the session remains available

Do not move on to Feature 4.

---

# Feature 4 — Session Detail

Continue Research Brain V1.

Inspect the current implementation and Blueprint plans.

Implement ONLY Feature 4: Session Detail and Research State.

Goal:

Make a saved research session useful even when the original browser tabs are closed.

Implement a Session Detail experience containing:

1. Session title.
2. Date/time.
3. Research objective where available.
4. Summary.
5. Topics.
6. Key learnings.
7. Insights if available.
8. Open questions.
9. Captured sources.
10. Original source URLs.
11. Number of captured tabs.
12. Continue Research action.
13. Delete Session action.

Add a Research State model/concept.

Research State should represent:

- what the user was researching
- what was learned
- what remains unresolved
- where the research stopped

Do not create a complex graph database or separate graph infrastructure.

Use the current local storage architecture.

Important:

- Never fabricate a user's conclusion.
- Clearly distinguish captured information from generated interpretation.
- Every source shown in the session must link to the original URL.
- Preserve the original timestamp.

UX should feel like a research notebook generated automatically from the browser session, not like browser history.

Verification:

- open a previously saved session
- verify all information is displayed
- open source links
- delete a session
- verify deletion persists after reopening the extension
- run build/typecheck/lint

Do not move on to Feature 5.

---

# Feature 5 — Research Memory + Search

Now introduce actual retrieval.

For the first local test, you can use a lightweight local search before introducing pgvector.

Continue Research Brain V1.

Read the current implementation and Blueprint plans.

Implement ONLY Feature 5: Research Memory and Search.

Goal:

Allow the user to search their saved research using natural language.

For this first local prototype, do NOT introduce PostgreSQL, Qdrant, or a remote vector database yet.

Build a modular local retrieval layer that can later be replaced with embeddings/vector search.

Search across:

- Research Sessions
- session titles
- summaries
- topics
- learnings
- open questions
- captured tab titles
- URLs

Implement:

1. Search input in the Research Brain UI.
2. Natural-language search.
3. Local relevance ranking.
4. Result grouping by session.
5. Highlight relevant text where practical.
6. Show source URLs.
7. Show session dates.
8. Show related sessions.
9. Allow the user to open the matching Session Detail page.
10. Allow the user to open the original source.

Example queries:

"What did I learn about MCP?"

"What did I research about AWS?"

"When did I research DCF?"

"Show me my Kubernetes research."

Create a clean SearchResult model.

Keep the retrieval interface abstract enough that a future semantic/vector implementation can replace the local search implementation without rewriting the UI.

Important:

- Do not hallucinate answers.
- Search only stored data.
- Clearly show when there are no matching memories.
- Do not perform internet searches.
- Do not add Brain Chat yet.

UX target:

Search Memory

[ What did I learn about MCP? ]

Results

MCP Research
September 30
Relevant memory...

Sources:
...

Verification:

Create several test sessions through the actual UI.

Test multiple natural-language queries.

Verify:
- relevant sessions appear
- irrelevant sessions rank lower
- source links work
- dates are shown
- no-result searches are handled
- data survives extension restart

Run all available checks and build the extension.

Do not move on to Feature 6.

---

# Feature 6 — Brain Chat

Now you can make the “AI Brain” experience.

For your first local test, configure it so it can work with an API key if provided, but don't compromise the rest of the extension if no key exists.

Continue Research Brain V1.

Inspect the existing memory/search implementation before changing anything.

Implement ONLY Feature 6: Brain Chat.

Goal:

Allow the user to ask conversational questions about their stored research.

Create a Brain Chat experience inside the extension.

Examples:

"What have I learned about silver demand?"

"What did I conclude about DCF?"

"What sources did I use for Kubernetes networking?"

"What questions were still unanswered?"

Architecture:

1. User submits a question.
2. Research Brain retrieves relevant stored memory.
3. Retrieved memory is passed to the answer-generation layer.
4. The answer-generation layer returns a grounded response.
5. The UI displays supporting citations.

For local development:

- create a clear AI provider abstraction
- support an environment/configured API key when available
- provide a deterministic local fallback when no API key is configured
- never hardcode API keys into the extension
- never expose secret API credentials in client-side source code

The answer-generation layer must distinguish:

REMEMBERED:
Information directly found in stored research.

SYNTHESIZED:
A conclusion created by combining retrieved research.

UNKNOWN:
Information not supported by stored research.

Every answer should show citations containing, where available:

- session title
- session date
- source title
- source URL

Create a reusable Citation model.

Do not perform internet searches.

Do not implement autonomous agents.

Do not implement rabbit holes.

Do not implement Projects yet.

Verification:

Test:

"What did I research about AWS?"

"What did I learn about MCP?"

"What was my conclusion about silver?"

Verify that answers are grounded in stored sessions.

Verify citations link back to the actual stored sources.

Test the system without an API key and make sure the extension still behaves correctly.

Run lint/typecheck/build.

Do not move on to Feature 7.

---

# Feature 7 — Continue Research

This feature is crucial because it differentiates your product from bookmarks.

Continue Research Brain V1.

Inspect the existing Session Detail, capture, memory, and Brain Chat implementations.

Implement ONLY Feature 7: Continue Research.

Goal:

Allow the user to resume previous research without simply reopening every old tab.

When the user clicks Continue Research from a saved session, show a continuation experience containing:

1. Where I left off.
2. Research objective.
3. Current Research State.
4. Key learnings.
5. Open questions.
6. Important sources.
7. Suggested next starting point.

Provide these actions:

- Continue From Last Thinking
- Open Important Sources
- Open Selected Sources
- Restore Session
- Ask Research Brain

Behavior:

Continue From Last Thinking:
Show the Research State and allow the user to start from that context.

Open Important Sources:
Open only the highest-value stored sources.

Open Selected Sources:
Allow the user to select which sources to reopen.

Restore Session:
Recreate the previous tab set where possible.

Ask Research Brain:
Open Brain Chat with the previous session already selected as context.

Important:

Do NOT make "restore all tabs" the default behavior.

The product's value is research continuity, not tab restoration.

Use Chrome APIs safely and handle tabs that can no longer be opened.

If a source is unavailable, display the source as unavailable instead of failing the entire workflow.

Verification:

1. Save a research session.
2. Close its original browser tabs.
3. Reopen Research Brain.
4. Open the session.
5. Click Continue Research.
6. Continue from the saved context.
7. Open important sources.
8. Restore selected sources.
9. Restore the complete session.

Run all checks and build the extension.

Do not move on to Feature 8.

---

# Feature 8 — Home Dashboard

Continue Research Brain V1.

Inspect the existing extension features.

Implement ONLY Feature 8: Home / Research Brain Dashboard.

Create the primary extension experience.

The dashboard should provide:

## Header

Research Brain

## Primary Search

Ask:

"What did I learn about...?"

## Primary Action

[End My Day]

## Recent Sessions

Show the most recent saved sessions with:

- title
- date
- topics
- short summary
- Continue Research action

## Recent Activity

Show recent captured research activity.

## Last Research Session

Provide an obvious Continue Research action.

## Projects

Show projects if they exist, otherwise an appropriate empty state.

## Suggested Topics

Display recurring topics based only on stored research.

Keep the design simple and fast.

The dashboard should feel like a personal research command center.

Important:

- do not introduce a large dashboard framework
- do not add unnecessary analytics
- do not create features not defined in the Blueprint plan
- keep all existing workflows working

Ensure the extension is responsive within Chrome's available surfaces.

Verification:

- dashboard loads quickly
- End My Day works
- Search works
- sessions open
- Continue Research works
- Brain Chat works
- empty states work for a brand-new installation
- build/typecheck/lint pass

Do not move on to Feature 9.

---

# Feature 9 — Lightweight Research Projects

Continue Research Brain V1.

Inspect the current application and Blueprint plans.

Implement ONLY Feature 9: Lightweight Research Projects.

Goal:

Allow users to turn recurring research into a persistent project.

Implement:

1. Create Project.
2. Project title.
3. Project objective.
4. Project description where useful.
5. Add/remove Research Sessions from a project.
6. Show project sessions.
7. Show project sources.
8. Show project insights.
9. Show project open questions.
10. Show project Research State.
11. Open a session from the project.
12. Search within project memory.
13. Delete/archive project.

Add optional project suggestions based on repeated topics/session relationships.

Suggestions must remain user-controlled.

Example:

"You have 4 research sessions related to Silver Investing."

[Create Project]

Do not build:

- collaboration
- permissions
- team projects
- advanced graph visualization
- project automation
- autonomous research

Keep projects lightweight.

Verification:

- create project
- attach sessions
- remove sessions
- open project
- open session from project
- search project
- delete project
- verify persistence after extension restart

Run build/typecheck/lint.

Do not move on to Feature 10.

---

# Feature 10 — Privacy & Transparency

Continue Research Brain V1.

Implement ONLY Feature 10: Privacy and Trust Controls.

Goal:

Make it obvious what Research Brain captures and give the user control over their data.

Implement:

1. Capture status.
2. Pause Capture.
3. Resume Capture.
4. Captured-data viewer.
5. Show:
   - what was captured
   - when it was captured
   - source URL
   - session association
6. Delete individual research session.
7. Delete captured research data.
8. Domain exclusion list.
9. Prevent capture on excluded domains.
10. Clear empty/paused states.
11. Confirmation before destructive deletion.
12. Provide a simple privacy/settings screen.

The UX should communicate:

"What was captured?"

"When was it captured?"

"Why was it captured?"

Important:

- do not claim security mechanisms that are not actually implemented
- do not silently collect information
- do not expand permissions unnecessarily
- keep privacy controls understandable

Verification:

- pause capture
- verify capture stops
- resume capture
- exclude a domain
- verify excluded domain is not captured
- delete sessions
- verify deletion is permanent from local storage
- inspect extension permissions
- build/typecheck/lint

Do not move on to Feature 11.

---

# Feature 11 — V1 End-to-End Validation

This should be the final prompt.

Research Brain V1 is now implemented.

Do NOT add new product features.

Perform a complete V1 audit and local validation against:

- blueprint/project-plan.md
- blueprint/build-plan.md
- blueprint/context/project-overview.md

Validate the complete user journey:

```text id="u42v6f"
Install Extension
      ↓
Open Research Tabs
      ↓
Capture Research
      ↓
End My Day
      ↓
Review Session
      ↓
Save Session
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

Test the following:

## Chrome Extension

- installation
- popup
- extension page
- service worker
- permissions
- storage

## Capture

- multiple tabs
- duplicate capture behavior
- timestamps
- persistence

## End My Day

- session generation
- review
- save
- persistence

## Memory

- search
- relevance
- no-result behavior

## Brain Chat

- grounded answers
- citations
- unsupported questions
- no API-key behavior

## Continue Research

- context restoration
- selected sources
- complete session restoration

## Projects

- project creation
- session association
- persistence

## Privacy

- pause capture
- resume capture
- domain exclusions
- deletion

Also check:

- TypeScript errors
- lint errors
- build errors
- broken imports
- Chrome Manifest V3 issues
- service-worker issues
- storage issues
- extension navigation issues
- performance problems
- obvious UX problems

Do not redesign the application or introduce new infrastructure.

Fix only issues required for V1 correctness and reliability.

At the end produce:

1. V1 feature-by-feature status.
2. Bugs found.
3. Bugs fixed.
4. Remaining limitations.
5. Exact local commands to run.
6. Exact Chrome installation/test procedure.
7. Recommended next steps for V2.

Most importantly, validate whether this product actually proves:

> "I can close my research because Research Brain remembers where I left off."

---

# How I would actually run this in antigravity

Don't paste all 11 prompts together.

Use the Blueprint lifecycle for each one:

```text
/feature
```

Review the generated feature specification.

Then:

```text
/implement
```

Then:

```text
/check
```

Then:

```text
/audit current
```

Then:

```text
/complete
```

Then move to the next feature.

For your **first local test**, I would stop after **Feature 7** before building Projects. At that point you already have the genuinely interesting loop:

```text
Chrome
  ↓
Capture
  ↓
End My Day
  ↓
Save Research
  ↓
Close Browser
  ↓
Come Back
  ↓
Search Memory
  ↓
Ask Brain
  ↓
Continue Research
```

That is the **minimum viable Research Brain** worth putting in Chrome and actually using yourself.

One important adjustment: **don't let Antigravity build PostgreSQL + pgvector + FastAPI + OAuth + multiple AI integrations before you have tested this browser loop.** For a local proof-of-concept, `chrome.storage.local` plus a replaceable retrieval/AI abstraction will let you discover whether the product experience is actually valuable before infrastructure becomes the project.