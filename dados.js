"use strict";

/*
 * Gera um conjunto de vendas fictício e determinístico (sempre o mesmo),
 * para a demonstração funcionar sem servidor nem banco de dados.
 */
const DADOS = (() => {
  // Gerador pseudoaleatório com semente fixa (mulberry32)
  let seed = 20261014;
  const rand = () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const regioes = ["Sudeste", "Sul", "Nordeste", "Centro-Oeste", "Norte"];
  const pesoRegiao = [0.42, 0.2, 0.18, 0.12, 0.08];
  const produtos = [
    { nome: "Fone Bluetooth", categoria: "Eletrônicos", preco: 189.9 },
    { nome: "Carregador Turbo", categoria: "Eletrônicos", preco: 79.9 },
    { nome: "Smartwatch Fit", categoria: "Eletrônicos", preco: 399.0 },
    { nome: "Cadeira Ergonômica", categoria: "Escritório", preco: 899.0 },
    { nome: "Mesa Regulável", categoria: "Escritório", preco: 1290.0 },
    { nome: "Luminária LED", categoria: "Escritório", preco: 119.9 },
    { nome: "Tênis Corrida", categoria: "Esporte", preco: 349.9 },
    { nome: "Garrafa Térmica", categoria: "Esporte", preco: 69.9 },
    { nome: "Tapete de Yoga", categoria: "Esporte", preco: 99.9 },
    { nome: "Cafeteira Espresso", categoria: "Casa", preco: 649.0 },
    { nome: "Jogo de Panelas", categoria: "Casa", preco: 459.0 },
    { nome: "Aspirador Robô", categoria: "Casa", preco: 1499.0 },
    { nome: "Kit Skincare", categoria: "Beleza", preco: 159.9 },
    { nome: "Secador Profissional", categoria: "Beleza", preco: 289.0 },
  ];

  const escolherRegiao = () => {
    let r = rand(), acc = 0;
    for (let i = 0; i < regioes.length; i++) { acc += pesoRegiao[i]; if (r < acc) return regioes[i]; }
    return regioes[0];
  };

  // 24 meses até o mês atual, com tendência de alta e sazonalidade no fim do ano
  const hoje = new Date();
  const vendas = [];
  for (let m = 23; m >= 0; m--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - m, 1);
    const mes = d.getMonth();
    const tendencia = 1 + (23 - m) * 0.025;
    const sazonal = mes === 10 ? 1.35 : mes === 11 ? 1.55 : mes === 0 ? 0.85 : 1;
    const pedidos = Math.round((110 + rand() * 30) * tendencia * sazonal);
    const diasNoMes = new Date(d.getFullYear(), mes + 1, 0).getDate();
    for (let i = 0; i < pedidos; i++) {
      const p = pick(produtos);
      const qtd = 1 + Math.floor(rand() ** 2 * 4);
      const desconto = rand() < 0.2 ? 0.9 : 1;
      vendas.push({
        data: new Date(d.getFullYear(), mes, 1 + Math.floor(rand() * diasNoMes)),
        produto: p.nome,
        categoria: p.categoria,
        regiao: escolherRegiao(),
        qtd,
        valor: Math.round(p.preco * qtd * desconto * 100) / 100,
      });
    }
  }
  return { vendas, regioes, categorias: [...new Set(produtos.map((p) => p.categoria))] };
})();
