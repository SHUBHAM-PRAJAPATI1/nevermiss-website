-- Master Register: Beyond Maya becomes a Scripts-only pipeline. Run once in Supabase SQL editor.
alter table register_entries add column if not exists format text;

update register_entries e set format = case when e.sub ilike '%long%' then 'long' else 'short' end
from register_sections s
where e.section_id = s.id and s.name ilike 'Beyond Maya%';

-- planned = Script ready, active = Recorded, waiting = Ready to upload, done = Uploaded
update register_entries e set sub = 'Scripts', status = case when e.status = 'done' then 'done' else 'planned' end, prio = ''
from register_sections s
where e.section_id = s.id and s.name ilike 'Beyond Maya%';

update register_sections set subs = array['Scripts'] where name ilike 'Beyond Maya%';
