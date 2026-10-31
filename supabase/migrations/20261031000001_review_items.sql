-- Daily tests can bring back questions seen 2+ weeks ago (labelled "Review") so every category
-- appears every day once its new questions run low.
alter table public.daily_plans add column if not exists review_item_ids text[] not null default '{}';
