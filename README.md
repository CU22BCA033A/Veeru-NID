# NID Prep Studio

Veeru's 100-day preparation platform for **NID DAT 2027 (B.Des)**. It has two engines:
- a quick-practice engine: MCQs, visual puzzles, short ideation answers
- a studio engine: timed paper drawing tasks with photo upload and rubric feedback

There are two roles, `student` (Veeru) and `mentor` (GB). Running it costs **₹0** on the free tiers of Vercel and Supabase.

### What's inside

| For Veeru | For GB (mentor) |
|---|---|
| **Today**: countdown, the day's steps (warm-up → test → result → homework → studio task → reflection) | **Overview**: alerts, streak, readiness, a ready-to-send 9 pm summary (copy or WhatsApp) |
| **Daily test**: 40 questions (12–15 during board exams), never repeated across 100 days, tuned to ~72% success, weakest topics first | **Review**: score studio sheets on the 60-mark rubric; Veeru sees "GB says" |
| **Homework**: every mistake comes back with its concept card plus two new variants; spaced reviews after 1/3/7/16 days | **Mocks**: mark uploaded mock answers |
| **Studio**: 417 timed drawing briefs, phone-camera upload with corner crop, self-scoring, portfolio wall | **Content**: browse/edit/retire questions, handle reports, import real PYQs |
| **Mocks**: 19 full and mini papers, on-screen timer or printable, per-question analysis | **Images**: upload the 104 photos that unlock photo questions (see `IMAGES_NEEDED.md`) |
| **Learn**: 92 concept cards, 12 exam-strategy guides, 120 tips, search | **Settings**: phases, exam dates, logins, "Sync content now" |
| **Progress**: accuracy, speed, category radar, rubric trend, readiness, 100-day calendar | |
| **Interview practice** (Mains), journal, mistake notebook, exam-day checklist | |

About 5,900 questions: ~5,400 auto-generated visual puzzles (mirror, water images, paper folding, cubes, dice, counting, series, embedded figures, views…) plus ~620 hand-written MCQs and creative prompts. Works offline once a page has been opened, and installs to the home screen.

---

## Publish it (about 15 minutes, no coding)

You need free accounts on **GitHub** (you have one), **[Supabase](https://supabase.com)** and **[Vercel](https://vercel.com)**. Sign in to both with GitHub.

### Step 1: Create the database (Supabase)

1. Supabase → **New project**. Name it `nid-prep` and choose a strong database password (save it somewhere). For **Region**, pick **Mumbai (ap-south-1)**. Wait about 2 minutes while it starts.
2. Open **SQL Editor → New query**.
3. Open [`supabase/setup.sql`](supabase/setup.sql) in this repo and click **Raw**. Select all, copy, and paste it into the editor. Press **Run**. You should see *"Success. No rows returned"*.
4. Go to **Project Settings → API Keys** (on some dashboards: **Project Settings → API**) and keep the tab open. You need three values:
   - **Project URL**: just `https://<project-id>.supabase.co`, nothing after `.co`. It's on the project home page (**Connect** button) and at the top of Project Settings → Data API. If you paste the longer Data API address ending in `/rest/v1/`, the app trims it automatically.
   - **anon / public** key (or the new **publishable** key, `sb_publishable_…`)
   - **service_role** key (or the new **secret** key, `sb_secret_…`). ⚠️ Keep this one private.

### Step 2: Put the website online (Vercel)

1. Vercel → **Add New… → Project** → find **Veeru-NID** → **Import**.
2. Leave every build setting as it is (Vercel detects Next.js). Open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key |

3. Click **Deploy**. When it finishes you get a link like `https://veeru-nid.vercel.app`.

> If you deployed before adding the variables, add them under **Settings → Environment Variables**. Then go to **Deployments → ⋯ → Redeploy**, because the variables only take effect after a new build.

### Step 3: Create the two accounts (in the app)

1. Open `https://<your-app>.vercel.app/setup`.
2. Veeru's username is already filled in as **`Veeru04`**. Type the password he will use (spaces are allowed; it's case-sensitive). Then choose GB's username (default `GB-mentor`) and password.
3. Paste the **service_role / secret key** once; this proves you own the project. Press **Create accounts & load content** and wait up to a minute.
4. You land on the sign-in page. Sign in with the **username** (not an email) and password. The setup page then locks itself for good.

### Step 4: Put it on Veeru's phone

Open the link in Chrome on his phone, sign in, then tap **⋮ → Add to Home screen** (or **Install app**). It opens like an app, and pages he has opened keep working without internet. Answers submitted offline are sent when the connection returns.

### Step 5 (optional, any time): add the photos

About 120 questions use real photos: light and shade, textures, materials, street scenes, and "name what you see" pictures of instruments, monuments, paintings, textiles and famous chairs. They stay hidden until a photo exists. GB opens **Images** in the mentor menu, where each card says exactly what to shoot, and uploads from the phone camera. The full list is also in [`IMAGES_NEEDED.md`](IMAGES_NEEDED.md). Open-licence photos (Wikimedia, Unsplash, Pexels) are fine too; pick the licence and paste the source link.

### Updating later

Every push to `main` on GitHub redeploys automatically. If an update adds new database migrations, open the new file in `supabase/migrations/` and run it in the SQL Editor the same way you did in step 1. After content updates, GB presses **Settings → Sync content now**; it adds new questions and tasks and keeps his retire/verify decisions.

> **Already ran an older `setup.sql`?** Run [`supabase/migrations/20261029000001_content_sync.sql`](supabase/migrations/20261029000001_content_sync.sql) once in the SQL Editor. A fresh project only needs `setup.sql`, which already includes it.

### Good to know

- The Supabase free tier **pauses a project after 7 days of no use**. Daily practice keeps it awake. If it pauses, click **Restore** in Supabase.
- AI feedback is **off** (`AI_PROVIDER=none`), so nothing costs money. Studio work is scored by Veeru's self-assessment plus GB's review.
- Optional free AI sheet critique: get a free key from Google AI Studio and add `AI_PROVIDER=gemini` and `AI_API_KEY=<key>` in Vercel's environment variables, then redeploy. `AI_DAILY_CALL_CAP` (default 20) limits calls per day. Free tiers may use uploads for training; sheets contain no personal data, but it's your choice.
- Change a username or password: GB opens **Settings → Veeru's login** (or his own). If GB is locked out, use Supabase → **Authentication → Users** → the user → **Update password**.

---

## Developer setup (local)

```bash
npm install
npx supabase start            # needs Docker; prints API URL + keys
cp .env.example .env.local    # fill NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY
npm run content:seed
npm run setup:users -- --student-username Veeru04 --student-password local-test-student-pw --mentor-username GB-mentor --mentor-password local-test-mentor-pw
npm run dev
```

Alternatively, with the Supabase CLI against a hosted project, run `npx supabase link --project-ref <ref>` and then `npx supabase db push`.

## Checks

| Command | What it does |
|---|---|
| `npm run typecheck` | TypeScript strict |
| `npm test` | Vitest unit tests (calendar, streaks, setup.sql in sync, …) |
| `PGHOST=… scripts/test-db.sh` | Applies the migrations to plain Postgres with Supabase shims and asserts the RLS rules |
| `npm run build && npm run e2e` | Playwright against the local stack: daily loop, studio, mocks, mentor tools, offline, axe accessibility scan. Uses the local test accounts above (override with `E2E_STUDENT_PASSWORD` etc.) and resets its own test data |
| `npm run content:validate` | Schema, duplicate and near-duplicate checks for every authored item |
| `npm run db:bundle` | Regenerates `supabase/setup.sql` from `supabase/migrations/`. Run it after adding a migration |

## Content

- `content/exam-facts.json`: dates and exam pattern. The mentor can override these in Settings.
- `content/phases.json`: the 100-day phases and the daily mix for each phase.
- `content/taxonomy.json`: categories and subtopics.
- `content/checklists.json`: logistics, stationery kit and exam-day checklists.

- `content/items`, `content/studio`, `content/mocks`, `content/concepts`, `content/tips.json`: the authored bank. Most are built by `scripts/build-*.ts`; run `npm run content:index` after changing them.
- Generated puzzles come from `lib/generators/` (seeded, each checked by a unit test).

See `DECISIONS.md` for product calls.
