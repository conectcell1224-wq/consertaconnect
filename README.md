# 🔧 ConsertaConnect

Sistema web de gestão para assistência técnica de celulares e eletrônicos.
Controle de **ordens de serviço**, **clientes**, **status**, **valores** e **histórico** — tudo em uma interface única, sem instalação.

**Stack:** HTML + CSS + JavaScript puro (ES Modules) · **Supabase** (Postgres + Auth + RLS)

---

## ✨ Funcionalidades

| Módulo | O que faz |
|---|---|
| **Autenticação** | Cadastro e login por e-mail/senha com Supabase Auth |
| **Painel** | OS abertas, prontas, aguardando peça, faturado e a receber |
| **Ordens de serviço** | Criar, editar, excluir, filtrar por status e buscar por aparelho/cliente/IMEI |
| **Clientes** | Cadastro completo com telefone, e-mail, CPF/CNPJ, endereço e observações |
| **Histórico** | Timeline automática a cada mudança de status da OS |
| **Financeiro** | Peças + mão de obra = total calculado no banco |

Cada técnico vê **apenas os próprios dados** — isolamento garantido por Row Level Security no Postgres.

---

## 🚀 Rodando localmente

O app é 100% estático, mas usa ES Modules — precisa de um servidor HTTP (não abre com duplo clique em `file://`).

```powershell
# Na pasta do projeto
npx serve .
# ou
python -m http.server 8080
```

Depois abra `http://localhost:3000` (serve) ou `http://localhost:8080`.

---

## 🗄️ Configurando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Abra **SQL Editor** e cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql), depois **RUN**
3. Copie a **Project URL** e a **anon public key** (Settings → API)
4. Cole em [`js/supabase-client.js`](js/supabase-client.js):

```js
export const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
export const SUPABASE_ANON_KEY = "sua-chave-anon";
```

5. Em **Authentication → Providers → Email**, desative **"Confirm email"** se quiser testar sem confirmar e-mail
6. (Opcional) Rode [`supabase/seed.sql`](supabase/seed.sql) para popular dados de exemplo

> ⚠️ A chave **anon** é pública por design — quem protege os dados é o RLS.
> **Nunca** use a `service_role` key no front-end.

### ⚡ Atalho para este projeto

O projeto já vem apontando para o Supabase configurado. Falta apenas **um passo manual**:

1. Acesse o SQL Editor do projeto
2. Cole **todo** o conteúdo de `supabase/schema.sql`
3. Clique em **Run**

Depois disso, recarregue o app — o banner amarelo de aviso desaparece.

> O app detecta automaticamente se o schema está aplicado e mostra o banner
> "⚠️ Banco de dados não configurado" enquanto as tabelas não existirem.


---

## 📁 Estrutura

```
consertaconnect/
├── index.html              # Shell da aplicação
├── css/
│   └── style.css           # Tema escuro, responsivo
├── js/
│   ├── supabase-client.js  # Cliente Supabase (URL + anon key)
│   └── app.js              # Lógica: auth, views, CRUD, modais
└── supabase/
    ├── schema.sql          # Tabelas, enums, RLS, triggers, view
    └── seed.sql            # Dados de exemplo (opcional)
```

---

## 🗃️ Modelo de dados

```
profiles ──1:1── auth.users
    │
    └──1:N── clientes
    │
    └──1:N── ordens ──1:N── os_itens
                 │
                 └──1:N── os_historico
```

| Tabela | Descrição |
|---|---|
| `profiles` | Técnico/usuário; criado automaticamente no cadastro |
| `clientes` | Clientes da assistência |
| `ordens` | Ordens de serviço (status, prioridade, valores, datas) |
| `os_itens` | Peças e serviços avulsos da OS |
| `os_historico` | Timeline gerada por trigger a cada mudança de status |

**Status:** `aguardando` → `em_analise` → `aguardando_peca` → `em_reparo` → `pronto` → `entregue` (ou `cancelado`)

---

## 🔒 Segurança

- Row Level Security ativado em **todas** as tabelas
- Policies `auth.uid() = user_id` em cada tabela
- `os_itens` e `os_historico` validam acesso via `EXISTS` na OS pai
- Todos os dados renderizados passam por escaping HTML (proteção XSS)
- `valor_total` é coluna gerada no banco — não pode ser manipulado pelo cliente

---

## 📄 Licença

MIT
