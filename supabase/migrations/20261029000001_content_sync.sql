-- Content sync bookkeeping and mock days.
alter table public.settings add column if not exists content_version text;
alter table public.settings add column if not exists content_synced_at timestamptz;
alter table public.daily_plans add column if not exists mock_id text references public.mocks (id);
alter table public.interview_answers add column if not exists self_rating jsonb;
alter table public.interview_answers add column if not exists duration_s int;
