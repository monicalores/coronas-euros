(() => {
  'use strict';

  // Tipo de cambio fijo: 1 corona danesa = 0,1334 euros.
  const EUR_PER_DKK = 0.1334;
  const STORE_KEY = 'dkk-eur-state';
  const MAX_DIGITS = 9;

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
    input: $('input'),
    result: $('result'),
    swap: $('swap'),
    chips: $('chips'),
    keypad: $('keypad'),
  };

  const load = () => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  };
  const saved = load();

  const state = {
    amount: typeof saved.amount === 'string' ? saved.amount : '100',
    dir: saved.dir === 'eur2dkk' ? 'eur2dkk' : 'dkk2eur',
  };

  const persist = () => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        amount: state.amount, dir: state.dir,
      }));
    } catch { /* almacenamiento no disponible */ }
  };

  const money = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });
  const rateFmt = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const intFmt = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });

  const sizeClass = (node, text) => {
    node.classList.toggle('long', text.length > 9 && text.length <= 12);
    node.classList.toggle('xlong', text.length > 12);
  };

  const CHIP_VALUES = { dkk2eur: [50, 100, 200, 500], eur2dkk: [10, 20, 50, 100] };

  function renderChips() {
    const dkk = state.dir === 'dkk2eur';
    el.chips.replaceChildren(...CHIP_VALUES[state.dir].map((v) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = dkk ? `${v} kr` : `${v} €`;
      b.addEventListener('click', () => { state.amount = String(v); render(); });
      return b;
    }));
  }

  function render() {
    const dkk = state.dir === 'dkk2eur';
    const amt = parseFloat(state.amount.replace(',', '.')) || 0;
    const result = dkk ? amt * EUR_PER_DKK : amt / EUR_PER_DKK;

    const [intPart, decPart] = state.amount.split(',');
    const inputLabel = intFmt.format(parseInt(intPart || '0', 10)) + (decPart !== undefined ? ',' + decPart : '');
    const resultLabel = money.format(result);

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
    let a = state.amount;
    if (k === 'back') {
      a = a.length > 1 ? a.slice(0, -1) : '0';
    } else if (k === ',') {
      if (!a.includes(',')) a += ',';
    } else if (/^\d$/.test(k)) {
      const dec = a.split(',')[1];
      if (dec !== undefined && dec.length >= 2) return;
      if (a.replace(',', '').length >= MAX_DIGITS) return;
      a = a === '0' ? k : a + k;
    } else {
      return;
    }
    state.amount = a;
    render();
  }

  // Eventos
  el.keypad.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-key]');
    if (btn) press(btn.dataset.key);
  });

  el.swap.addEventListener('click', () => {
    state.dir = state.dir === 'dkk2eur' ? 'eur2dkk' : 'dkk2eur';
    el.swap.classList.toggle('flipped');
    renderChips();
    render();
  });

  // Teclado físico (escritorio)
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === ',' || e.key === '.') press(',');
    else if (e.key === 'Backspace') press('back');
    else if (e.key === 'Escape' || e.key === 'Delete') { state.amount = '0'; render(); }
    else return;
    e.preventDefault();
  });

  renderChips();
  render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
