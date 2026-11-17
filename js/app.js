// =========================================================
//  ConsertaConnect — app principal
// =========================================================
import { supabase } from "./supabase-client.js";

/* ------------------------- Estado ------------------------- */
const state = {
  user: null,
  profile: null,
  view: "dashboard",
  ordens: [],
  clientes: [],
  filtroStatus: "",
  buscaOrdens: "",
  buscaClientes: ""
};

/* ------------------------- Helpers ------------------------ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const STATUS = {
  aguardando: "Aguardando",
  em_analise: "Em análise",
  aguardando_peca: "Aguardando peça",
  em_reparo: "Em reparo",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado"
};

const PRIORIDADES = { baixa: "Baixa", normal: "Normal", alta: "Alta", urgente: "Urgente" };

const brl = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const dataBR = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("pt-BR");
};

const dataHoraBR = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

/** Escapa HTML para evitar XSS ao renderizar dados do usuário */
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

let toastTimer = null;
function toast(msg, tipo = "") {
  const el = $("#toast");
  el.textContent = msg;
  el.className = "toast " + tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 3000);
}

function badge(status) {
  return `<span class="badge badge-${esc(status)}">${esc(STATUS[status] || status)}</span>`;
}

function prioTag(p) {
  if (p === "baixa" || p === "normal") return "";
  return `<span class="prio prio-${esc(p)}">${esc(PRIORIDADES[p])}</span>`;
}

/* -------------------------- Auth -------------------------- */
async function initAuth() {
  const { data } = await supabase.auth.getSession();
  await aplicarSessao(data.session);

  supabase.auth.onAuthStateChange(async (_evt, session) => {
    await aplicarSessao(session);
  });

  $("#form-login").addEventListener("submit", onLogin);
  $("#form-cadastro").addEventListener("submit", onCadastro);

  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const alvo = tab.dataset.tab;
      $("#form-login").classList.toggle("hidden", alvo !== "login");
      $("#form-cadastro").classList.toggle("hidden", alvo !== "cadastro");
    });
  });

  $("#btn-sair").addEventListener("click", async () => {
    await supabase.auth.signOut();
    toast("Sessão encerrada");
  });
}

async function aplicarSessao(session) {
  if (!session) {
    state.user = null;
    state.profile = null;
    $("#app").classList.add("hidden");
    $("#tela-auth").classList.remove("hidden");
    return;
  }
  const jaEstavaLogado = !!state.user;
  state.user = session.user;

  const { data: prof } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  state.profile = prof || {
    nome: session.user.user_metadata?.nome || session.user.email.split("@")[0],
    email: session.user.email
  };

  $("#user-nome").textContent = state.profile.nome || "";

  $("#tela-auth").classList.add("hidden");
  $("#app").classList.remove("hidden");

  if (!jaEstavaLogado) {
    await carregarTudo();
  }
}

function msgForm(sel, texto, ok = false) {
  const el = $(sel + " [data-msg]");
  if (!el) return;
  el.textContent = texto;
  el.className = "auth-msg" + (ok ? " ok" : "");
}

async function onLogin(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "Entrando...";
  msgForm("#form-login", "");

  const { error } = await supabase.auth.signInWithPassword({
    email: fd.get("email").trim(),
    password: fd.get("senha")
  });

  btn.disabled = false;
  btn.textContent = "Entrar";

  if (error) {
    msgForm("#form-login", traduzErro(error.message));
    return;
  }
  e.target.reset();
  toast("Bem-vindo!", "ok");
}

async function onCadastro(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "Criando...";
  msgForm("#form-cadastro", "");

  const { data, error } = await supabase.auth.signUp({
    email: fd.get("email").trim(),
    password: fd.get("senha"),
    options: { data: { nome: fd.get("nome").trim() } }
  });

  btn.disabled = false;
  btn.textContent = "Criar conta";

  if (error) {
    msgForm("#form-cadastro", traduzErro(error.message));
    return;
  }

  if (!data.session) {
    msgForm(
      "#form-cadastro",
      "Conta criada! Confirme seu e-mail para entrar. (Verifique a caixa de entrada)",
      true
    );
    return;
  }
  e.target.reset();
  toast("Conta criada com sucesso!", "ok");
}

function traduzErro(msg = "") {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("user already registered")) return "Este e-mail já tem conta. Faça login.";
  if (m.includes("password should be at least")) return "A senha precisa ter ao menos 6 caracteres.";
  if (m.includes("unable to validate email")) return "E-mail inválido ou domínio não aceito.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde alguns minutos.";
  if (m.includes("could not find the table") || m.includes("schema cache"))
    return "⚠️ Banco não configurado: rode supabase/schema.sql no SQL Editor do Supabase.";
  if (m.includes("permission denied") || m.includes("row-level security"))
    return "Sem permissão. Verifique se as policies (RLS) foram criadas.";
  if (m.includes("failed to fetch") || m.includes("networkerror"))
    return "Sem conexão com o Supabase. Verifique a URL e sua internet.";
  return msg;
}

/* -------------------- Navegação / views ------------------- */
function irPara(view) {
  state.view = view;
  $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
  if (view === "dashboard") renderDashboard();
  if (view === "ordens") renderOrdens();
  if (view === "clientes") renderClientes();
}

/* ------------------------ Carregar ------------------------ */
async function carregarTudo() {
  const { erro } = await carregarOrdens();
  await carregarClientes();

  if (erro) mostrarBannerDB();
  else removerBannerDB();

  renderDashboard();
}

/** Aviso fixo quando o schema não foi aplicado no Supabase */
function mostrarBannerDB() {
  if ($("#banner-db")) return;
  const el = document.createElement("div");
  el.id = "banner-db";
  el.className = "banner-db";
  el.innerHTML = `
    <div>
      <strong>⚠️ Banco de dados não configurado</strong>
      <span>As tabelas do ConsertaConnect ainda não existem no seu projeto Supabase.
      Abra o <b>SQL Editor</b>, cole o conteúdo de <code>supabase/schema.sql</code> e clique em <b>Run</b>.</span>
    </div>
    <button class="btn btn-primary" onclick="location.reload()">Já rodei — recarregar</button>
  `;
  $(".main").prepend(el);
}

function removerBannerDB() {
  const el = $("#banner-db");
  if (el) el.remove();
}

async function carregarOrdens() {
  const { data, error } = await supabase
    .from("ordens")
    .select("*, clientes(nome, telefone)")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error(error);
    toast(traduzErro(error.message), "err");
    state.ordens = [];
    return { erro: error };
  }
  state.ordens = data || [];
  return { erro: null };
}

async function carregarClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    console.error(error);
    state.clientes = [];
    return;
  }
  state.clientes = data || [];
}

/* ------------------------ Dashboard ----------------------- */
function renderDashboard() {
  const abertas = state.ordens.filter((o) => !["entregue", "cancelado"].includes(o.status));
  const prontas = state.ordens.filter((o) => o.status === "pronto");
  const peca = state.ordens.filter((o) => o.status === "aguardando_peca");
  const entregues = state.ordens.filter((o) => o.status === "entregue");

  const soma = (arr) => arr.reduce((s, o) => s + Number(o.valor_total || 0), 0);

  const valores = {
    os_abertas: abertas.length,
    os_prontas: prontas.length,
    aguardando_peca: peca.length,
    faturado: brl(soma(entregues)),
    a_receber: brl(soma(abertas))
  };

  $$(".stat").forEach((card) => {
    const k = card.dataset.stat;
    card.querySelector(".stat-value").textContent = valores[k] ?? "—";
  });

  const recentes = state.ordens.slice(0, 6);
  const box = $("#ultimas-ordens");

  if (!recentes.length) {
    box.innerHTML = `<div class="empty"><span>🔧</span>Nenhuma ordem ainda. Clique em "+ Nova OS".</div>`;
    return;
  }

  box.innerHTML = recentes
    .map(
      (o) => `
      <div class="row" data-os="${esc(o.id)}">
        <div class="row-main">
          <div class="row-title">${esc(o.aparelho)}${o.marca ? " · " + esc(o.marca) : ""}</div>
          <div class="row-sub">${esc(o.clientes?.nome || "Sem cliente")} · ${dataBR(o.entrada_em)}</div>
        </div>
        ${badge(o.status)}
        <div class="mono">${brl(o.valor_total)}</div>
      </div>`
    )
    .join("");

  $$("#ultimas-ordens .row").forEach((r) =>
    r.addEventListener("click", () => abrirOS(r.dataset.os))
  );
}

/* -------------------------- Ordens ------------------------ */
function ordensFiltradas() {
  const q = state.buscaOrdens.toLowerCase().trim();
  return state.ordens.filter((o) => {
    if (state.filtroStatus && o.status !== state.filtroStatus) return false;
    if (!q) return true;
    const alvo = [
      o.aparelho, o.marca, o.modelo, o.imei, o.defeito,
      o.clientes?.nome, o.clientes?.telefone, String(o.numero)
    ].join(" ").toLowerCase();
    return alvo.includes(q);
  });
}

function renderOrdens() {
  const box = $("#lista-ordens");
  const lista = ordensFiltradas();

  if (!lista.length) {
    box.innerHTML = `<div class="empty" style="grid-column:1/-1"><span>📋</span>${
      state.ordens.length ? "Nenhuma OS corresponde ao filtro." : "Nenhuma ordem cadastrada ainda."
    }</div>`;
    return;
  }

  box.innerHTML = lista
    .map(
      (o) => `
      <article class="os-card" data-status="${esc(o.status)}" data-os="${esc(o.id)}">
        <div class="os-top">
          <div>
            <div class="os-num">OS #${esc(o.numero)}</div>
            <div class="os-aparelho">${esc(o.aparelho)}</div>
            <div class="os-cliente">${esc(o.clientes?.nome || "Sem cliente")}</div>
          </div>
          ${badge(o.status)}
        </div>
        <div class="muted" style="font-size:13px">${esc((o.defeito || "Sem descrição do defeito").slice(0, 90))}</div>
        <div class="os-bottom">
          <span class="os-valor">${brl(o.valor_total)}</span>
          ${prioTag(o.prioridade)}
        </div>
      </article>`
    )
    .join("");

  $$("#lista-ordens .os-card").forEach((c) =>
    c.addEventListener("click", () => abrirOS(c.dataset.os))
  );
}

/* --------------------- Modal genérico -------------------- */
function abrirModal(titulo, html) {
  $("#modal-titulo").textContent = titulo;
  $("#modal-corpo").innerHTML = html;
  $("#modal").classList.remove("hidden");
  const first = $("#modal-corpo input, #modal-corpo select, #modal-corpo textarea");
  if (first) first.focus();
}
function fecharModal() {
  $("#modal").classList.add("hidden");
  $("#modal-corpo").innerHTML = "";
}

/* ------------------------- Nova OS ------------------------ */
function modalNovaOS() {
  const opcoes = state.clientes
    .map((c) => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`)
    .join("");

  abrirModal(
    "Nova ordem de serviço",
    `
    <form id="form-os" class="form-grid">
      <label class="full">Cliente
        <select name="cliente_id">
          <option value="">— Sem cliente cadastrado —</option>
          ${opcoes}
        </select>
      </label>
      <label class="full">Aparelho *
        <input name="aparelho" required placeholder="Ex: iPhone 13, Galaxy S22, Notebook Dell">
      </label>
      <label>Marca<input name="marca" placeholder="Apple"></label>
      <label>Modelo<input name="modelo" placeholder="A2633"></label>
      <label class="full">IMEI / Nº de série<input name="imei" placeholder="Opcional"></label>
      <label class="full">Defeito relatado *
        <textarea name="defeito" required placeholder="O que o cliente relatou?"></textarea>
      </label>
      <label>Prioridade
        <select name="prioridade">
          ${Object.entries(PRIORIDADES).map(([k, v]) => `<option value="${k}"${k === "normal" ? " selected" : ""}>${v}</option>`).join("")}
        </select>
      </label>
      <label>Previsão de entrega<input type="date" name="previsao_em"></label>
      <label>Valor peças (R$)<input type="number" name="valor_pecas" step="0.01" min="0" value="0"></label>
      <label>Mão de obra (R$)<input type="number" name="valor_mao_obra" step="0.01" min="0" value="0"></label>

      <div class="modal-actions full">
        <button type="button" class="btn" data-fechar>Cancelar</button>
        <button type="submit" class="btn btn-primary">Criar OS</button>
      </div>
    </form>`
  );

  $("#modal-corpo [data-fechar]").addEventListener("click", fecharModal);

  $("#form-os").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Salvando...";

    const payload = {
      user_id: state.user.id,
      cliente_id: fd.get("cliente_id") || null,
      aparelho: fd.get("aparelho").trim(),
      marca: fd.get("marca").trim() || null,
      modelo: fd.get("modelo").trim() || null,
      imei: fd.get("imei").trim() || null,
      defeito: fd.get("defeito").trim(),
      prioridade: fd.get("prioridade"),
      previsao_em: fd.get("previsao_em") || null,
      valor_pecas: Number(fd.get("valor_pecas")) || 0,
      valor_mao_obra: Number(fd.get("valor_mao_obra")) || 0
    };

    const { error } = await supabase.from("ordens").insert(payload).select().single();

    btn.disabled = false;
    btn.textContent = "Criar OS";

    if (error) {
      toast(traduzErro(error.message), "err");
      return;
    }
    fecharModal();
    toast("OS criada!", "ok");
    await carregarOrdens();
    renderOrdens();
    renderDashboard();
  });
}

/* ---------------------- Detalhe OS ----------------------- */
async function abrirOS(id) {
  const { data: os, error } = await supabase
    .from("ordens")
    .select("*, clientes(*)")
    .eq("id", id)
    .single();

  if (error) {
    toast("Erro ao abrir OS", "err");
    return;
  }

  const { data: hist } = await supabase
    .from("os_historico")
    .select("*")
    .eq("os_id", id)
    .order("criado_em", { ascending: false });

  const statusOpts = Object.entries(STATUS)
    .map(([k, v]) => `<option value="${k}"${k === os.status ? " selected" : ""}>${v}</option>`)
    .join("");

  const prioOpts = Object.entries(PRIORIDADES)
    .map(([k, v]) => `<option value="${k}"${k === os.prioridade ? " selected" : ""}>${v}</option>`)
    .join("");

  abrirModal(
    `OS #${os.numero} — ${os.aparelho}`,
    `
    <div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin-bottom:16px">
      <div class="card stat"><span class="stat-label">Status</span><strong class="stat-value" style="font-size:16px">${esc(STATUS[os.status])}</strong></div>
      <div class="card stat"><span class="stat-label">Total</span><strong class="stat-value" style="font-size:20px">${brl(os.valor_total)}</strong></div>
      <div class="card stat"><span class="stat-label">Entrada</span><strong class="stat-value" style="font-size:14px">${dataBR(os.entrada_em)}</strong></div>
    </div>

    <form id="form-os-edit" class="form-grid">
      <label class="full">Status
        <select name="status">${statusOpts}</select>
      </label>
      <label>Prioridade<select name="prioridade">${prioOpts}</select></label>
      <label>Previsão<input type="date" name="previsao_em" value="${esc(os.previsao_em || "")}"></label>
      <label>Valor peças<input type="number" name="valor_pecas" step="0.01" min="0" value="${Number(os.valor_pecas)}"></label>
      <label>Mão de obra<input type="number" name="valor_mao_obra" step="0.01" min="0" value="${Number(os.valor_mao_obra)}"></label>
      <label class="full">Diagnóstico
        <textarea name="diagnostico">${esc(os.diagnostico || "")}</textarea>
      </label>
      <label class="full">Solução aplicada
        <textarea name="solucao">${esc(os.solucao || "")}</textarea>
      </label>

      <div class="modal-actions full">
        <button type="button" class="btn btn-danger left" data-excluir>Excluir OS</button>
        <button type="button" class="btn" data-fechar>Fechar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>

    <div class="card" style="margin-top:18px;margin-bottom:0">
      <h3>Histórico</h3>
      <div class="timeline">
        ${
          (hist || []).length
            ? hist
                .map(
                  (h) => `
          <div class="tl-item">
            <div class="tl-dot"></div>
            <div>
              <div class="tl-text">${esc(h.nota || STATUS[h.status] || "Atualização")}</div>
              <div class="tl-date">${dataHoraBR(h.criado_em)}</div>
            </div>
          </div>`
                )
                .join("")
            : `<div class="muted" style="font-size:13px">Sem movimentações.</div>`
        }
      </div>
    </div>

    <div class="muted" style="font-size:12.5px;margin-top:16px;line-height:1.7">
      <strong>Cliente:</strong> ${esc(os.clientes?.nome || "—")} ${os.clientes?.telefone ? "· " + esc(os.clientes.telefone) : ""}<br>
      <strong>Defeito:</strong> ${esc(os.defeito || "—")}<br>
      ${os.imei ? `<strong>IMEI:</strong> ${esc(os.imei)}<br>` : ""}
      ${os.marca || os.modelo ? `<strong>Marca/Modelo:</strong> ${esc(os.marca || "—")} / ${esc(os.modelo || "—")}` : ""}
    </div>`
  );

  $("#modal-corpo [data-fechar]").addEventListener("click", fecharModal);

  $("#modal-corpo [data-excluir]").addEventListener("click", async () => {
    if (!confirm(`Excluir a OS #${os.numero}? Esta ação não pode ser desfeita.`)) return;
    const { error: delErr } = await supabase.from("ordens").delete().eq("id", os.id);
    if (delErr) return toast(traduzErro(delErr.message), "err");
    fecharModal();
    toast("OS excluída", "ok");
    await carregarOrdens();
    renderOrdens();
    renderDashboard();
  });

  $("#form-os-edit").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Salvando...";

    const payload = {
      status: fd.get("status"),
      prioridade: fd.get("prioridade"),
      previsao_em: fd.get("previsao_em") || null,
      valor_pecas: Number(fd.get("valor_pecas")) || 0,
      valor_mao_obra: Number(fd.get("valor_mao_obra")) || 0,
      diagnostico: fd.get("diagnostico").trim() || null,
      solucao: fd.get("solucao").trim() || null
    };

    if (payload.status === "entregue" && !os.entregue_em) {
      payload.entregue_em = new Date().toISOString();
    }

    const { error: upErr } = await supabase.from("ordens").update(payload).eq("id", os.id);

    btn.disabled = false;
    btn.textContent = "Salvar";

    if (upErr) return toast(traduzErro(upErr.message), "err");

    fecharModal();
    toast("OS atualizada", "ok");
    await carregarOrdens();
    renderOrdens();
    renderDashboard();
  });
}

/* ------------------------- Clientes ----------------------- */
function clientesFiltrados() {
  const q = state.buscaClientes.toLowerCase().trim();
  if (!q) return state.clientes;
  return state.clientes.filter((c) =>
    [c.nome, c.telefone, c.email, c.cpf_cnpj].join(" ").toLowerCase().includes(q)
  );
}

function renderClientes() {
  const box = $("#lista-clientes");
  const lista = clientesFiltrados();

  if (!lista.length) {
    box.innerHTML = `<div class="empty"><span>👤</span>${
      state.clientes.length ? "Nenhum cliente corresponde à busca." : "Nenhum cliente cadastrado ainda."
    }</div>`;
    return;
  }

  box.innerHTML = lista
    .map((c) => {
      const total = state.ordens.filter((o) => o.cliente_id === c.id).length;
      return `
      <div class="row">
        <div class="row-main">
          <div class="row-title">${esc(c.nome)}</div>
          <div class="row-sub">${esc(c.telefone || "sem telefone")}${c.email ? " · " + esc(c.email) : ""} · ${total} OS</div>
        </div>
        <div class="row-actions">
          <button class="btn btn-ghost" data-editar="${esc(c.id)}">Editar</button>
        </div>
      </div>`;
    })
    .join("");

  $$("#lista-clientes [data-editar]").forEach((b) =>
    b.addEventListener("click", () => modalCliente(b.dataset.editar))
  );
}

function modalCliente(id = null) {
  const c = id ? state.clientes.find((x) => x.id === id) : null;

  abrirModal(
    c ? "Editar cliente" : "Novo cliente",
    `
    <form id="form-cliente" class="form-grid">
      <label class="full">Nome *
        <input name="nome" required value="${esc(c?.nome || "")}" placeholder="Nome completo">
      </label>
      <label>Telefone
        <input name="telefone" value="${esc(c?.telefone || "")}" placeholder="(11) 90000-0000">
      </label>
      <label>E-mail
        <input type="email" name="email" value="${esc(c?.email || "")}" placeholder="cliente@email.com">
      </label>
      <label class="full">CPF / CNPJ
        <input name="cpf_cnpj" value="${esc(c?.cpf_cnpj || "")}" placeholder="Opcional">
      </label>
      <label class="full">Endereço
        <input name="endereco" value="${esc(c?.endereco || "")}" placeholder="Rua, número, bairro">
      </label>
      <label class="full">Observações
        <textarea name="obs">${esc(c?.obs || "")}</textarea>
      </label>

      <div class="modal-actions full">
        <button type="button" class="btn" data-fechar>Cancelar</button>
        <button type="submit" class="btn btn-primary">${c ? "Salvar" : "Cadastrar"}</button>
      </div>
    </form>`
  );

  $("#modal-corpo [data-fechar]").addEventListener("click", fecharModal);

  $("#form-cliente").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;

    const payload = {
      user_id: state.user.id,
      nome: fd.get("nome").trim(),
      telefone: fd.get("telefone").trim() || null,
      email: fd.get("email").trim() || null,
      cpf_cnpj: fd.get("cpf_cnpj").trim() || null,
      endereco: fd.get("endereco").trim() || null,
      obs: fd.get("obs").trim() || null
    };

    const q = c
      ? supabase.from("clientes").update(payload).eq("id", c.id)
      : supabase.from("clientes").insert(payload);

    const { error } = await q;
    btn.disabled = false;

    if (error) return toast(traduzErro(error.message), "err");

    fecharModal();
    toast(c ? "Cliente atualizado" : "Cliente cadastrado", "ok");
    await carregarClientes();
    renderClientes();
  });
}

/* ------------------------- Bootstrap ---------------------- */
function bindUI() {
  $$(".nav-btn").forEach((b) => b.addEventListener("click", () => irPara(b.dataset.view)));

  $("#btn-nova-os").addEventListener("click", modalNovaOS);
  $("#btn-novo-cliente").addEventListener("click", () => modalCliente());
  $("#btn-atualizar").addEventListener("click", async () => {
    await carregarTudo();
    toast("Dados atualizados");
  });

  $("#busca-ordens").addEventListener("input", (e) => {
    state.buscaOrdens = e.target.value;
    renderOrdens();
  });
  $("#filtro-status").addEventListener("change", (e) => {
    state.filtroStatus = e.target.value;
    renderOrdens();
  });
  $("#busca-clientes").addEventListener("input", (e) => {
    state.buscaClientes = e.target.value;
    renderClientes();
  });

  $("#modal-fechar").addEventListener("click", fecharModal);
  $("#modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") fecharModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fecharModal();
  });
}

bindUI();
initAuth();
