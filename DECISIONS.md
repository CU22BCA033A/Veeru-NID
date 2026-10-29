# Decisions

Product and engineering calls made while building, with the reason. Newest at the bottom.

1. **Zero-cost stack.** No paid APIs. Vercel Hobby + Supabase Free. Seed content is authored directly in `/content` (in the repo), not generated through a paid API.
2. **AI critique is optional and off by default** (`AI_PROVIDER=none`). Studio feedback works fully through self-assessment against the rubric, a per-task examiner checklist, and mentor scoring. A free provider (Gemini / Groq free tier) can be switched on later through env vars. Free tiers may use submitted data for training, so it's the mentor's choice.
3. **Lower minimum items in P4/P5.** The brief requires ≥40 items/day, and it also says P4 should be 20–25 min/day during CBSE boards. These two rules can't both hold. So P1–P3 keep `minItems: 40`, P4 uses 12 and P5 uses 15. Exam day uses 0. The mentor can change all of these in `phases.json` / settings.
4. **Students can read item answers through the API.** The `items` rows (including answers) are readable by any signed-in user, which keeps RLS simple and offline caching possible. Veeru is the only student, so the only way to "cheat" is against himself.
5. **No public sign-up.** Accounts are created only by `npm run setup:users` (service role). The profile `role` can't be changed by the user (RLS check).
6. **Plan dates use IST calendar days**, whatever the device timezone is.
7. **Streaks skip rest and exam days.** Rest days (Day 49) and exam day (Day 50) never break a streak.
8. **Exam dates come from the brief.** Admin shows "verify on admissions.nid.edu". The Mains date is a placeholder (20 Apr 2027) marked tentative.
9. **One-time `/setup` page instead of CLI steps for publishing.** After deploying, the owner opens `/setup` and creates both accounts, which also loads the base content. To prove they own the project, they paste the Supabase service_role key; it is compared on the server with a timing-safe check and never stored. The page locks permanently once a mentor exists.
10. **`supabase/setup.sql`** is generated from the migrations (`npm run db:bundle`), so publishing needs only one paste into the SQL editor. A unit test fails if it falls out of sync.
11. **Both key-name styles are accepted** for env vars: `NEXT_PUBLIC_SUPABASE_ANON_KEY`/`…_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SECRET_KEY`, so either Supabase dashboard style works.
12. **Sign-in by username.** Usernames map to an internal address (`<username>@nidprep.example.com`) so Supabase email/password auth works without real emails. Veeru's username defaults to `Veeru04`. Passwords are never in the repo: they are typed once at `/setup` and can be changed in Settings.
13. **Current affairs are left to GB.** Authored GK sticks to stable facts. Anything time-sensitive belongs in `gk.current` with `valid_until` and "needs review", ideally imported by the mentor, because a wrong current-affairs "fact" costs more than a missing one.
14. **Photos are uploaded, not scraped.** Photo questions stay hidden until their image is uploaded with a licence. Hot-linking stock images would break and could breach licences; the sandbox used for building also blocked Wikimedia.
15. **Content sync preserves mentor decisions.** "Sync content now" upserts new and changed content but never revives a question GB retired or un-verifies one he checked.
16. **Generated puzzles are deduplicated by what the student sees** (stem + figure), not by seed, so two seeds that happen to draw the same puzzle count as one.
17. **Offline = network-first pages + a static fallback.** The service worker caches hashed assets and the pages Veeru has opened; answers made offline are queued by the app. Cached pages are wiped on sign-out. No background sync, to keep it simple and predictable.
18. **WCAG AA contrast in both themes**, enforced by an axe scan in the e2e suite. This darkened the accent from #d9481c to #b93d14 for text; the app icon keeps the brighter orange.
