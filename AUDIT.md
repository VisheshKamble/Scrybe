# Scrybe — UI/UX & Conversion Audit

**A note before the audit, in the interest of not wasting your time:** I read every line of the frontend (and the backend routes/tasks it talks to) before writing this. Scrybe is not the vibe-coded landing-page-with-no-substance I expected going in — the marketing site is genuinely well-composed (real type scale, a coherent violet-on-cream identity, restrained motion, no template tells). There's also no billing, onboarding, or "Pro" tier in this codebase at all, so the specific traps you mentioned catching before (upgrade modal firing pre-value, three upsell touchpoints, onboarding ignoring the user's stated goal) **don't exist here** — I'm not going to invent them to pad this doc.

What I found instead is arguably worse for a product this well-dressed: **the core promise on the marketing site is not what the app actually does once you're inside it.** The site sells "click a timestamp, jump straight there" — the app has a video player component that is never rendered anywhere. It sells a 4-agent pipeline you can watch work — the app shows you a bare spinner. It sells video comparison — submitting one silently strands you with no way to ever see the result. These are the moments a first-time user churns, and no amount of landing-page polish recovers from them.

Two passes follow: the ruthless-founder teardown, then a first-time-user walkthrough. Findings are merged and de-duplicated below, sorted by impact.

---

## 🔴 Critical — fix before anything else

### 1. Timestamp citations click into a dead end everywhere
`TimestampCitation.jsx` renders a `<button onClick={() => onClick?.(seconds)}>` — but **no caller anywhere in the app passes `onClick`.** In `ChapterList.jsx`, claims render a `TimestampCitation` with no `onClick` prop; chapters don't even get one (just plain text). In `Chat.jsx`, the same component is used the same unwired way. There's a fully-built `VideoPlayer.jsx` component that accepts `youtubeId` + `seekSeconds` and is **never imported by any page.**

This is your headline feature — "click it, jump straight there" is on the landing page in Features.jsx — and it does nothing. A user's first real interaction with the product's signature capability is a button that visibly responds to hover and then goes nowhere. That's not a rough edge, that's the product not doing the thing it was demoed doing thirty seconds earlier on the homepage.
**Fix:** Render `VideoPlayer` on both Report and Chat, hold `seekSeconds` in state, wire every `TimestampCitation` (chapters too, not just claims) to update it and scroll the player into view.

### 2. Compare has no result page — it's a one-way door
`Compare.jsx` posts to `/compare`, gets a `job_id` back, and shows a static toast: *"Comparison started — job {id}."* That's it. No polling, no route, no way — ever, in the same session or a later one — to see the comparison you just asked for. The backend already exposes `GET /compare/{job_id}/status`, which returns the finished result once ready; the frontend just never calls it again.

A user who fills in two URLs, writes a thoughtful "focus" query, and clicks Compare gets a string of text and a dead end. That's the single fastest way to make someone close the tab and not come back — they did the work of trying your headline B2B-ish feature and got nothing for it.
**Fix:** Navigate to a real `/app/compare/:jobId` result page immediately on submit, poll status the same way Report does, render the synthesized comparison plus each video's own chapters/claims when done.

### 3. Processing screen doesn't show what's actually happening
The landing page has an entire component (`PipelineDemo.jsx`) built to *dramatize* the 4-agent pipeline running step by step — it's the best-looking thing on the site. The real processing screen (`Report.jsx` → `ProcessingState`) throws that away and shows two pill labels, "Queued" / "Processing," with a generic spinner. For a pipeline that downloads a video, runs Whisper, samples keyframes through a vision model, and streams a synthesis pass — this can genuinely take a minute or more. A spinner with two possible states, for that long, reads as "is this stuck?"
**Fix:** Reuse the pipeline-step visualization language from the homepage on the real processing screen — same four agents, same visual grammar — driven by elapsed time against a realistic estimate. You don't have granular backend progress events, and you don't need them to stop looking broken; you need the same craft you already spent on the fake version applied to the real one.

### 4. Nothing survives a page refresh or a closed tab
There is no persistence anywhere on the client: no history of past analyses, no way to get back to a report or chat except pasting the exact URL back in, and reloading the Chat page **erases the entire conversation**. Once you navigate to `/app`, every video you've ever analyzed is gone as if it never existed.
For a tool where a single run costs real processing time (and, per the About section, is deliberately scoped away from arbitrary bulk use), throwing away the output the moment someone closes a tab is a retention killer — there is no reason to come back tomorrow if today's work isn't there when they do.
**Fix:** A lightweight local history (localStorage is enough — no auth system exists to hang a backend one off of): every submitted video and comparison gets a durable entry with a way back in. Persist chat threads per `videoId` the same way.

---

## 🟠 High impact

### 5. The failed state has no way forward
`ProcessingState` for `status === 'failed'` tells the user to "try submitting the video again" — in text. There's no button. The only path back to the upload form is the browser's back button or manually editing the URL. Every other primary action in this app is a real button; this is the one place a user is most likely stuck at, and it's the one place that isn't clickable.

### 6. No client-side URL validation before a round trip
Upload and Compare both submit straight to the backend and wait for a generic `"Failed to submit video"` / `"Failed to start comparison"` string back. A pasted non-YouTube URL, a typo, or an empty-ish string all produce the same unhelpful round trip. This is a cheap, high-value fix: validate the shape of a YouTube URL client-side and give instant feedback instead of a network-latency-gated error.

### 7. In-app nav loses the plot once you're deep in a flow
`AppShell`'s header only ever shows two links: **Upload** and **Compare**. Once you're on a Report or in Chat, there's no breadcrumb back to "the video I'm currently looking at," no indication of which video's report you're chatting about, and no way to get from Chat back to that video's Report short of the browser back button. Combined with finding #4 (no history), getting lost inside your own analysis is easy.

### 8. Chapters and claims use inconsistent affordances for the same data
Claims get a clickable `TimestampCitation` pill; chapters — which have the exact same `start_seconds`/`end_seconds` shape — get plain, unstyled monospace text. Same report, same page, two different visual languages for "this points to a moment in the video." Once timestamps are wired up (fix #1), this inconsistency needs to go away too or half the report will still look inert next to the half that now works.

### 9. First-time visitor to Upload/Compare needs a YouTube URL already in hand
The landing page promises "no sign-up walls between you and the report" — genuinely great positioning — but then the actual Upload screen offers nothing to click if you don't already have a URL copied. No example video, no "try one of these," nothing to lower the activation-energy of the very first action. The best conversion move you have (an instant, no-commitment first run) is currently gated behind "go find a YouTube link yourself first."

---

## 🟢 Nice to have

### 10. Export buttons give no feedback while the file is being generated
`ExportButton` is a plain `<a href download>` — clicking "Export PDF" gives zero indication anything happened until the browser's own download UI shows up (and WeasyPrint PDF generation is not instant). A brief loading state prevents the "did that even work?" double-click.

### 11. Mobile nav pills have no overflow strategy
`Navbar`'s desktop link row and the in-app `AppShell` nav both assume enough horizontal room for every item as a pill. It holds up fine down to small-tablet widths in this codebase specifically (verified against the actual breakpoints used — this one, to be clear, is not currently broken), but it's brittle: adding the History link this doc recommends elsewhere needs a wrap/scroll strategy rather than one more pill jammed in, especially in `AppShell` which has no hamburger fallback at all today.

### 12. Comparison's "focus" input has no examples
The optional "what should the comparison focus on?" field is the most interesting lever in the whole Compare flow, and it's a bare placeholder with no example of a good answer. A couple of ghost-text-adjacent example chips ("pricing claims," "which one explains X better") would raise the odds someone uses it instead of leaving it blank.

---

## What I implemented directly

Since you asked for the redesign itself and not just the list, I went ahead and shipped fixes for everything in Critical and High Impact, plus #10 from Nice to Have, in the same visual language the app already has (I didn't reskin what wasn't broken):

- Wired a real, shared video player into Report and Chat, with every timestamp — chapters and claims alike — seeking it.
- Built `/app/compare/:jobId`, a real result page for comparisons, with the same processing → done lifecycle as Report.
- Replaced the two-pill processing screen with a live version of the homepage's pipeline visualization, driven by real elapsed time.
- Added local history (`/app/history`) — every video and comparison you run gets a durable entry with a working link back in, and Chat threads now persist per video.
- Fixed the failed state to have an actual retry button.
- Added client-side YouTube URL validation with inline feedback on both Upload and Compare.
- Added a persistent "current video" breadcrumb in the app header once you're inside a report/chat, plus a History nav item.
- Added two one-click example videos on the empty Upload screen.
- Gave export buttons a loading state.

Items #11 and #12 are addressed as part of the above (nav now has a working overflow strategy since History was added; focus field now has example chips) even though they were filed as nice-to-have.
