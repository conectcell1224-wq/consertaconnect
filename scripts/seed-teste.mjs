// Cria (ou atualiza) um usuário de teste confirmado e popula dados de exemplo.
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const email = "teste.conserta@example.com";
const senha = "teste123456";

// 1. Procura usuário existente
const { data: lista } = await sb.auth.admin.listUsers({ perPage: 1000 });
let user = lista?.users?.find((u) => u.email === email);

if (!user) {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: "Teste Conserta" }
  });
  if (error) {
    console.error("❌ criar usuário:", error.message);
    process.exit(1);
  }
  user = data.user;
  console.log("✅ usuário criado:", user.id);
} else {
  console.log("ℹ️  usuário já existe:", user.id);
  await sb.auth.admin.updateUserById(user.id, { password: senha, email_confirm: true });
}

// 2. Garante profile (o trigger pode não ter rodado)
await sb.from("profiles").upsert({
  id: user.id,
  nome: "Teste Conserta",
  email
});

// 3. Limpa e repopula dados de exemplo
await sb.from("ordens").delete().eq("user_id", user.id);
await sb.from("clientes").delete().eq("user_id", user.id);

const { data: cs, error: ce } = await sb
  .from("clientes")
  .insert([
    { user_id: user.id, nome: "Maria Silva", telefone: "(11) 98876-5432", email: "maria@email.com", cpf_cnpj: "123.456.789-00", endereco: "Rua das Flores, 120 — São Paulo/SP" },
    { user_id: user.id, nome: "João Pereira", telefone: "(11) 97654-3210", email: "joao.pereira@email.com", endereco: "Av. Paulista, 900 — São Paulo/SP" },
    { user_id: user.id, nome: "Ana Costa", telefone: "(21) 96543-2109" }
  ])
  .select();

if (ce) { console.error("❌ clientes:", ce.message); process.exit(1); }
console.log(`✅ ${cs.length} clientes`);

const { data: os, error: oe } = await sb
  .from("ordens")
  .insert([
    { user_id: user.id, cliente_id: cs[0].id, aparelho: "iPhone 13", marca: "Apple", modelo: "A2633", imei: "356789012345678", defeito: "Tela trincada após queda. Touch funcionando parcialmente.", status: "em_reparo", prioridade: "alta", valor_pecas: 480, valor_mao_obra: 120, previsao_em: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10) },
    { user_id: user.id, cliente_id: cs[1].id, aparelho: "Galaxy S22", marca: "Samsung", modelo: "SM-S901E", defeito: "Não carrega. Suspeita de conector de carga oxidado.", status: "aguardando_peca", prioridade: "normal", valor_pecas: 85, valor_mao_obra: 60 },
    { user_id: user.id, cliente_id: cs[2].id, aparelho: "Notebook Dell Inspiron", marca: "Dell", modelo: "15 3520", defeito: "Superaquecimento e desligamento. Limpeza + troca de pasta térmica.", status: "entregue", prioridade: "baixa", valor_pecas: 45, valor_mao_obra: 150, entregue_em: new Date().toISOString() },
    { user_id: user.id, cliente_id: cs[0].id, aparelho: "Moto G84", marca: "Motorola", modelo: "XT2347", defeito: "Não liga após contato com água.", status: "pronto", prioridade: "urgente", valor_pecas: 210, valor_mao_obra: 180 }
  ])
  .select();

if (oe) { console.error("❌ ordens:", oe.message); process.exit(1); }
console.log(`✅ ${os.length} ordens`);

console.log("\n🔑 Login de teste:", email, "/", senha);
