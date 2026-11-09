(() => {
  'use strict';

  // Tipo de cambio fijo: 1 corona danesa = 0,1334 euros.
  const EUR_PER_DKK = 0.1334;
  const STORE_KEY = 'dkk-eur-state';
  const MAX_DIGITS = 9;
  const MAX_EXPR = 40;
  const OPS = ['+', '−', '×', '÷'];

  const $ = (id) => document.getElementById(id);
  const el = {
    rateValue: $('rate-value'),
    rateInverse: $('rate-inverse'),
    fromName: $('from-name'),
    fromCode: $('from-code'),
    fromSymbol: $('from-symbol'),
    toName: $('to-name'),
    toCode: $('to-code'),
    toSymbol: $('to-symbol'),
    expr: $('expr'),
    input: $('input'),
    result: $('result'),
    swap: $('swap'),
    keypad: $('keypad'),
  };

  const load = () => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  };
  const saved = load();

  const validExpr = (e) => typeof e === 'string' && /^[0-9,+−×÷]{1,40}$/.test(e);
  const state = {
    expr: validExpr(saved.expr) ? saved.expr : (validExpr(saved.amount) ? saved.amount : '100'),
    dir: saved.dir === 'eur2dkk' ? 'eur2dkk' : 'dkk2eur',
    fresh: false, // true justo después de pulsar «=»
  };

  const persist = () => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ expr: state.expr, dir: state.dir }));
    } catch { /* almacenamiento no disponible */ }
  };

  const money = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });
  const total = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2, useGrouping: 'always' });
  const rateFmt = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const intFmt = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });

  const isOp = (c) => OPS.includes(c);
  const lastNumber = (e) => (e.match(/[0-9,]*$/) || [''])[0];
  const toExpr = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
  const num = (s) => parseFloat(s.replace(',', '.'));

  // Evalúa la expresión respetando la prioridad de × y ÷ sobre + y −.
  function evaluate(e) {
    const toks = e.match(/[0-9]+(?:,[0-9]*)?|,[0-9]*|[+−×÷]/g) || [];
    while (toks.length && isOp(toks[toks.length - 1])) toks.pop();
    if (!toks.length) return 0;
    const terms = [];
    const signs = [];
    let cur = num(toks[0]) || 0;
    for (let i = 1; i < toks.length; i += 2) {
      const op = toks[i];
      const n = num(toks[i + 1]) || 0;
      if (op === '×') cur *= n;
      else if (op === '÷') cur = n === 0 ? NaN : cur / n;
      else { terms.push(cur); signs.push(op); cur = n; }
    }
    terms.push(cur);
    return terms.reduce((acc, t, i) => (i === 0 ? t : signs[i - 1] === '+' ? acc + t : acc - t), 0);
  }

  const sizeClass = (node, text) => {
    node.classList.toggle('long', text.length > 9 && text.length <= 12);
    node.classList.toggle('xlong', text.length > 12);
  };

  function render() {
    const dkk = state.dir === 'dkk2eur';
    const e = state.expr;
    const hasOp = /[+−×÷]/.test(e);
    const amt = evaluate(e);
    const ok = Number.isFinite(amt);

    let inputLabel;
    if (hasOp) {
      inputLabel = ok ? total.format(amt) : '—';
    } else {
      const [intPart, decPart] = e.split(',');
      inputLabel = intFmt.format(parseInt(intPart || '0', 10)) + (decPart !== undefined ? ',' + decPart : '');
    }
    const result = dkk ? amt * EUR_PER_DKK : amt / EUR_PER_DKK;
    const resultLabel = ok ? money.format(result) : '—';

    el.expr.textContent = hasOp ? e.replace(/([+−×÷])/g, ' $1 ') : '';
    el.input.textContent = inputLabel;
    el.result.textContent = resultLabel;
    sizeClass(el.input, inputLabel);
    sizeClass(el.result, resultLabel);

    el.fromName.textContent = dkk ? 'Coronas danesas' : 'Euros';
    el.fromCode.textContent = dkk ? 'DKK' : 'EUR';
    el.fromSymbol.textContent = dkk ? 'kr' : '€';
    el.toName.textContent = dkk ? 'Euros' : 'Coronas danesas';
    el.toCode.textContent = dkk ? 'EUR' : 'DKK';
    el.toSymbol.textContent = dkk ? '€' : 'kr';

    el.rateValue.textContent = rateFmt.format(1 / EUR_PER_DKK);
    el.rateInverse.textContent = rateFmt.format(EUR_PER_DKK);

    persist();
  }

  function press(k) {
    let e = state.expr;
    let fresh = false;

    if (k === 'C') {
      e = '0';
    } else if (k === 'back') {
      e = e.length > 1 ? e.slice(0, -1) : '0';
    } else if (k === '=') {
      const v = evaluate(e);
      if (!Number.isFinite(v)) return;
      e = toExpr(v);
      fresh = true;
    } else if (k === '%') {
      const n = lastNumber(e);
      if (!n || n === ',') return;
      e = e.slice(0, e.length - n.length) + toExpr(num(n) / 100);
    } else if (isOp(k)) {
      if (e.endsWith(',')) e = e.slice(0, -1);
      e = isOp(e.slice(-1)) ? e.slice(0, -1) + k : e + k;
    } else if (k === ',') {
      if (state.fresh) e = '0';
      const n = lastNumber(e);
      if (n.includes(',')) return;
      e += n === '' ? '0,' : ',';
    } else if (k === '0' || k === '00' || /^[1-9]$/.test(k)) {
      if (state.fresh) e = '0';
      const n = lastNumber(e);
      const dec = n.split(',')[1];
      if (dec !== undefined && dec.length + k.length > 2) return;
      if (n.replace(',', '').length + k.length > MAX_DIGITS) return;
      if (k === '00' && (n === '' || n === '0')) e = n === '' ? e + '0' : e;
      else if (n === '0') e = e.slice(0, -1) + k;
      else e += k;
    } else {
      return;
    }

    if (e.length > MAX_EXPR) return;
    state.expr = e;
    state.fresh = fresh;
    render();
  }

  // Eventos
  el.keypad.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-key]');
    if (btn) press(btn.dataset.key);
  });

  el.swap.addEventListener('click', () => {
    state.dir = state.dir === 'dkk2eur' ? 'eur2dkk' : 'dkk2eur';
    el.swap.classList.toggle('flipped');
    render();
  });

  // Teclado físico (escritorio)
  const KEYMAP = { '+': '+', '-': '−', '*': '×', 'x': '×', '/': '÷', '%': '%', '=': '=', 'Enter': '=', ',': ',', '.': ',', 'Backspace': 'back', 'Escape': 'C', 'Delete': 'C' };
  window.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = /^\d$/.test(ev.key) ? ev.key : KEYMAP[ev.key];
    if (!k) return;
    ev.preventDefault();
    press(k);
  });

  render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
