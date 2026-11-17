# 🚀 Passos finais — ConsertaConnect

O código está pronto em `d:\ia\consertaconnect`. Faltam **duas coisas manuais**
que exigem sua ação (não consigo fazer por você).

---

## 1️⃣ Aplicar o schema no Supabase (obrigatório)

Sem isso o app abre, mas mostra o banner **"⚠️ Banco de dados não configurado"**.

1. Acesse: https://supabase.com/dashboard/project/nbxilqepnkdidwhwyprh/sql/new
2. Abra o arquivo `supabase/schema.sql` deste projeto
3. **Copie todo o conteúdo** e cole no SQL Editor
4. Clique em **Run** (ou Ctrl+Enter)

### (Opcional) Popular com dados de exemplo

```powershell
# Roda na pasta d:\ia (usa o .env que já existe lá)
cd d:\ia
$env:SUPABASE_URL = (Get-Content .env | Select-String "^SUPABASE_URL=").Line -replace '^SUPABASE_URL=',''
$env:SUPABASE_SERVICE_ROLE_KEY = (Get-Content .env | Select-String "^SUPABASE_SERVICE_ROLE_KEY=").Line -replace '^SUPABASE_SERVICE_ROLE_KEY=',''
node d:\ia\consertaconnect\scripts\seed-teste.mjs
```

Isso cria o usuário de teste `teste.conserta@example.com` / `teste123456` com 4 OS e 3 clientes.

> O script usa `service_role` — **só rode localmente**, nunca no navegador.

---

## 2️⃣ Instalar o Git e publicar no GitHub

O Git **não está instalado** nesta máquina. A instalação via `winget` pede
permissão de administrador (UAC), que você precisa aprovar.

### Instalar o Git

```powershell
winget install --id Git.Git -e --source winget
```

> Vai abrir uma janela pedindo permissão de administrador — clique em **Sim**.
> Depois **feche e reabra o VS Code** para o `git` entrar no PATH.

### Publicar no GitHub

```powershell
cd d:\ia\consertaconnect

git init
git add .
git commit -m "feat: sistema de ordens de servico para assistencia tecnica"
git branch -M main
git remote add origin https://github.com/conectcell1224-wq/consertaconnect.git
git push -u origin main
```

Na primeira vez vai pedir autenticação — o Git Credential Manager abre uma
janela do navegador para você autorizar.

---

## ✅ Verificação

Depois de rodar o schema, abra o app:

```powershell
cd d:\ia\consertaconnect
node "C:\Program Files\nodejs\node_modules\npm\bin\npx-cli.js" --yes serve . -l 3000
```

Acesse http://localhost:3000 e:

- [ ] O banner amarelo de aviso **não** aparece
- [ ] É possível criar conta
- [ ] É possível criar uma OS
- [ ] O painel mostra os números

---

## 📋 Checklist de status

| Item | Status |
|---|---|
| Código do app (HTML/CSS/JS) | ✅ Pronto |
| Schema SQL com RLS e triggers | ✅ Pronto |
| Cliente Supabase configurado | ✅ Conectando |
| Usuário de teste criado | ✅ `teste.conserta@example.com` |
| Tabelas no banco | ❌ Rodar `schema.sql` |
| Git instalado | ❌ Requer admin |
| Push para o GitHub | ❌ Após instalar Git |
