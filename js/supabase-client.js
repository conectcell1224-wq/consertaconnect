// =========================================================
//  Cliente Supabase (módulo ES, carregado via CDN)
//  A chave ANON é pública por design — a segurança vem do RLS.
//  NUNCA coloque a service_role key aqui.
// =========================================================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const SUPABASE_URL = "https://nbxilqepnkdidwhwyprh.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ieGlscWVwbmtkaWR3aHd5cHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5Mjk2MzksImV4cCI6MjExMDUwNTYzOX0.Et7gGmmqUhuM-jtm_i04Nog-t8UPEzeGGI8MS1BtMY0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
