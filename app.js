"use strict";

const $ = (s) => document.querySelector(s);
const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlCurto = (n) => n >= 1e6 ? `R$ ${(n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
  : n >= 1e3 ? `R$ ${(n / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil` : brl(n);
const num = (n) => n.toLocaleString("pt-BR");
const mesLabel = (d) => d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(". de ", "/").replace(".", "");
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/* ---------- Filtros ---------- */

DADOS.regioes.forEach((r) => $("#fRegiao").insertAdjacentHTML("beforeend", `<option>${r}</option>`));
DADOS.categorias.forEach((c) => $("#fCategoria").insertAdjacentHTML("beforeend", `<option>${c}</option>`));

function janela(meses, deslocamento = 0) {
  const hoje = new Date();
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1 - deslocamento * meses, 1);
  const inicio = new Date(fim.getFullYear(), fim.getMonth() - meses, 1);
  return { inicio, fim };
}

function filtrar(meses, deslocamento = 0) {
  const { inicio, fim } = janela(meses, deslocamento);
  const reg = $("#fRegiao").value, cat = $("#fCategoria").value;
  return DADOS.vendas.filter((v) => v.data >= inicio && v.data < fim && (!reg || v.regiao === reg) && (!cat || v.categoria === cat));
}

const somar = (lista) => lista.reduce((s, v) => s + v.valor, 0);
function agrupar(lista, chave) {
  const m = new Map();
  lista.forEach((v) => m.set(v[chave], (m.get(v[chave]) || 0) + v.valor));
  return m;
}

/* ---------- KPIs ---------- */

function kpi(label, valor, atual, anterior, fmt = (x) => x) {
  const d = anterior ? ((atual - anterior) / anterior) * 100 : 0;
  const cls = d >= 0 ? "up" : "down";
  return `<div class="kpi"><div class="label">${label}</div><div class="value">${fmt(valor)}</div>
    <div class="delta ${cls}">${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% <span>vs. período anterior</span></div></div>`;
}

/* ---------- Gráficos ---------- */

const charts = {};
function chart(id, config) {
  charts[id]?.destroy();
  charts[id] = new Chart($(id), config);
}

function baseOptions(extra = {}) {
  const grid = css("--line"), tick = css("--muted");
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => ` ${brl(c.parsed.y ?? c.parsed.x ?? c.parsed)}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: tick }, border: { color: grid } },
      y: { grid: { color: grid }, ticks: { color: tick, callback: (v) => brlCurto(v) }, border: { display: false } },
    },
    ...extra,
  };
}

/* ---------- Tabela ---------- */

let ordem = { campo: "receita", asc: false };

function renderTabela(lista) {
  const total = somar(lista) || 1;
  const m = new Map();
  lista.forEach((v) => {
    const r = m.get(v.produto) || { nome: v.produto, categoria: v.categoria, qtd: 0, receita: 0 };
    r.qtd += v.qtd; r.receita += v.valor;
    m.set(v.produto, r);
  });
  const linhas = [...m.values()].sort((a, b) => {
    const x = a[ordem.campo], y = b[ordem.campo];
    const c = typeof x === "string" ? x.localeCompare(y, "pt-BR") : x - y;
    return ordem.asc ? c : -c;
  });
  const max = Math.max(...linhas.map((l) => l.receita), 1);
  $("#topBody").innerHTML = linhas.map((l) => `<tr>
    <td>${l.nome}</td><td class="muted">${l.categoria}</td>
    <td class="r">${num(l.qtd)}</td><td class="r">${brl(l.receita)}</td>
    <td class="r"><div class="share"><i style="width:${(l.receita / max) * 80}px"></i>${((l.receita / total) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</div></td>
  </tr>`).join("") || `<tr><td colspan="5" class="muted">Sem vendas para este filtro.</td></tr>`;
  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.classList.toggle("sorted", th.dataset.sort === ordem.campo);
    th.classList.toggle("asc", th.dataset.sort === ordem.campo && ordem.asc);
  });
}

document.querySelectorAll("th[data-sort]").forEach((th) => th.addEventListener("click", () => {
  const campo = th.dataset.sort;
  ordem = { campo, asc: ordem.campo === campo ? !ordem.asc : campo === "nome" || campo === "categoria" };
  renderTabela(filtrar(Number($("#fPeriodo").value)));
}));

/* ---------- Render ---------- */

let atualFiltrado = [];

function render() {
  const meses = Number($("#fPeriodo").value);
  const atual = filtrar(meses), anterior = filtrar(meses, 1);
  atualFiltrado = atual;
  const { inicio, fim } = janela(meses);
  $("#range").textContent = `${inicio.toLocaleDateString("pt-BR")} a ${new Date(fim - 1).toLocaleDateString("pt-BR")}`;

  const receita = somar(atual), receitaAnt = somar(anterior);
  const unidades = atual.reduce((s, v) => s + v.qtd, 0), unidadesAnt = anterior.reduce((s, v) => s + v.qtd, 0);
  const ticket = atual.length ? receita / atual.length : 0, ticketAnt = anterior.length ? receitaAnt / anterior.length : 0;
  $("#kpis").innerHTML =
    kpi("Receita", receita, receita, receitaAnt, brl) +
    kpi("Pedidos", atual.length, atual.length, anterior.length, num) +
    kpi("Ticket médio", ticket, ticket, ticketAnt, brl) +
    kpi("Unidades vendidas", unidades, unidades, unidadesAnt, num);

  // Receita mensal
  const meseslista = [];
  for (let i = 0; i < meses; i++) meseslista.push(new Date(inicio.getFullYear(), inicio.getMonth() + i, 1));
  const porMes = meseslista.map((m) => somar(atual.filter((v) => v.data.getFullYear() === m.getFullYear() && v.data.getMonth() === m.getMonth())));
  const melhor = porMes.indexOf(Math.max(...porMes));
  $("#trendNote").textContent = porMes[melhor] ? `Melhor mês: ${mesLabel(meseslista[melhor])}` : "";
  const accent = css("--accent");
  chart("#cMensal", {
    type: "line",
    data: { labels: meseslista.map(mesLabel), datasets: [{
      data: porMes, borderColor: accent, backgroundColor: accent + "22", fill: true, tension: .35,
      pointRadius: 3, pointBackgroundColor: accent, borderWidth: 2,
    }] },
    options: baseOptions(),
  });

  // Por categoria (barras horizontais, ordenadas)
  const cats = [...agrupar(atual, "categoria")].sort((a, b) => b[1] - a[1]);
  const paleta = ["--c1", "--c2", "--c3", "--c4", "--c5"].map(css);
  const corCat = Object.fromEntries(DADOS.categorias.map((c, i) => [c, paleta[i % paleta.length]]));
  const optsH = baseOptions({ indexAxis: "y" });
  optsH.scales = {
    x: { grid: { color: css("--line") }, ticks: { color: css("--muted"), callback: (v) => brlCurto(v) }, border: { display: false } },
    y: { grid: { display: false }, ticks: { color: css("--fg") }, border: { color: css("--line") } },
  };
  chart("#cCategoria", {
    type: "bar",
    data: { labels: cats.map((c) => c[0]), datasets: [{ data: cats.map((c) => c[1]), backgroundColor: cats.map((c) => corCat[c[0]]), borderRadius: 6 }] },
    options: optsH,
  });

  // Por região
  const regs = [...agrupar(atual, "regiao")].sort((a, b) => b[1] - a[1]);
  chart("#cRegiao", {
    type: "bar",
    data: { labels: regs.map((r) => r[0]), datasets: [{ data: regs.map((r) => r[1]), backgroundColor: accent, borderRadius: 6, maxBarThickness: 48 }] },
    options: baseOptions(),
  });

  renderTabela(atual);
}

["#fPeriodo", "#fRegiao", "#fCategoria"].forEach((s) => $(s).addEventListener("change", render));

/* ---------- Exportar ---------- */

$("#exportBtn").onclick = () => {
  const linhas = [["data", "produto", "categoria", "regiao", "quantidade", "valor"]]
    .concat(atualFiltrado.map((v) => [v.data.toISOString().slice(0, 10), v.produto, v.categoria, v.regiao, v.qtd, v.valor.toFixed(2).replace(".", ",")]));
  const csv = linhas.map((l) => l.join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = "vendas-filtradas.csv";
  a.click();
  URL.revokeObjectURL(a.href);
};

/* ---------- Tema ---------- */

const root = document.documentElement;
try { const t = localStorage.getItem("tema-dash"); if (t) root.dataset.theme = t; } catch (_) {}
$("#themeBtn").onclick = () => {
  const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = dark ? "light" : "dark";
  try { localStorage.setItem("tema-dash", root.dataset.theme); } catch (_) {}
  render();
};
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);

render();
