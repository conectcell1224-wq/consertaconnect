-- Recarrega o schema cache do PostgREST e confirma que as tabelas respondem.
-- Rode no SQL Editor do Supabase.
notify pgrst, 'reload schema';
notify pgrst, 'reload config';
