-- Aptitude & objective mocks: MCQ-only papers, marked automatically.
alter table public.mocks drop constraint if exists mocks_format_check;
alter table public.mocks add constraint mocks_format_check check (format in ('2026', 'mixed', 'mini', 'aptitude'));
