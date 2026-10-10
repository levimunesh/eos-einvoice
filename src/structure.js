// Structure check: element names, order, how often they occur, attributes and basic value types,
// using content models generated from the official XML Schemas (CII D16B, UBL 2.1) by tools/xsd2json.py.

const XSI = 'http://www.w3.org/2001/XMLSchema-instance';
const XMLNS = 'http://www.w3.org/2000/xmlns/';
const RE = {
  d: /^[+-]?(\d+(\.\d*)?|\.\d+)$/,
  b: /^(true|false|1|0)$/,
  D: /^-?\d{4,}-\d{2}-\d{2}(Z|[+-]\d{2}:\d{2})?$/,
  T: /^-?\d{4,}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
};
const KIND = { d: 'a number', b: 'true or false', D: 'a date (YYYY-MM-DD)', T: 'a date and time' };

function pathOf(node) {
  const segs = [];
  for (let n = node; n && n.nodeType === 1; n = n.parentNode) {
    let i = 1; for (let s = n.previousSibling; s; s = s.previousSibling) if (s.nodeType === 1 && s.nodeName === n.nodeName) i++;
    segs.unshift(`${n.nodeName}[${i}]`);
  }
  return '/' + segs.join('/');
}

export function checkStructure(doc, model, limit = 60) {
  const out = [];
  const root = doc.documentElement;
  const nsIdx = model.ns.indexOf(root.namespaceURI || '');
  const tid = model.roots[`${nsIdx}|${root.localName}`];
  if (tid === undefined) { out.push({ code: 'root', node: root, location: pathOf(root), message: `The root element “${root.nodeName}” is not a CII or UBL invoice.` }); return out; }
  const add = (code, node, message) => { if (out.length < limit) out.push({ code, node, location: pathOf(node), message }); };
  const label = p => p[1];

  function visit(el, t) {
    if (out.length >= limit || !t || t.m === 'any') return;
    // attributes
    const seen = new Set();
    if (el.attributes) for (let i = 0; i < el.attributes.length; i++) {
      const a = el.attributes[i];
      if (a.namespaceURI === XMLNS || a.name === 'xmlns' || a.name.startsWith('xmlns:') || a.namespaceURI === XSI) continue;
      seen.add(a.localName || a.name);
      if (!t.la && !(t.a && (a.localName || a.name) in t.a)) add('attr-unknown', el, `The attribute “${a.name}” is not allowed on <${el.nodeName}>.`);
    }
    for (const [name, req] of Object.entries(t.a || {})) if (req && !seen.has(name)) add('attr-missing', el, `<${el.nodeName}> needs the attribute “${name}”.`);
    const children = []; let text = '';
    for (let n = el.firstChild; n; n = n.nextSibling) { if (n.nodeType === 1) children.push(n); else if (n.nodeType === 3 || n.nodeType === 4) text += n.data; }
    if (t.m === 'leaf') {
      if (children.length) { add('leaf-children', el, `<${el.nodeName}> must contain a value only, but it contains the element <${children[0].nodeName}>.`); return; }
      const v = text.replace(/\s+/g, ' ').trim();
      if (RE[t.b] && !RE[t.b].test(v)) add('value', el, `The value “${v.slice(0, 40)}” in <${el.nodeName}> is not ${KIND[t.b]}.`);
      return;
    }
    if (!t.mixed && text.trim() !== '') add('text', el, `<${el.nodeName}> contains text (“${text.trim().slice(0, 30)}”) where only elements are allowed.`);
    const P = t.p;
    const match = (p, c) => p[1] === c.localName && model.ns[p[0]] === (c.namespaceURI || '');
    if (t.m === 'choice') {
      if (children.length !== 1) { add('choice', el, `<${el.nodeName}> must contain exactly one of: ${P.map(label).join(', ')}.`); }
      for (const c of children) { const p = P.find(pp => match(pp, c)); if (!p) add('unexpected', c, `<${c.nodeName}> is not allowed inside <${el.nodeName}>. Expected one of: ${P.map(label).join(', ')}.`); else visit(c, model.types[p[2]]); }
      return;
    }
    // sequence
    let i = 0, count = 0, broken = false;
    for (const c of children) {
      let j = -1;
      for (let k = i; k < P.length; k++) if (match(P[k], c)) { j = k; break; }
      if (j === -1) {
        const earlier = P.findIndex(pp => match(pp, c));
        if (earlier >= 0) add('order', c, `<${c.nodeName}> is in the wrong position inside <${el.nodeName}>: it must come before <${label(P[Math.min(i, P.length - 1)])}>.`);
        else add('unexpected', c, `<${c.nodeName}> is not allowed inside <${el.nodeName}>.`);
        broken = true; break;
      }
      if (j !== i) {
        // particles i..j-1 are finished: check their minimum counts
        if (count < P[i][3]) { add('missing', el, `<${el.nodeName}> is missing the required element <${label(P[i])}>.`); broken = true; break; }
        let miss = null; for (let k = i + 1; k < j; k++) if (P[k][3] > 0) { miss = P[k]; break; }
        if (miss) { add('missing', el, `<${el.nodeName}> is missing the required element <${label(miss)}> (expected before <${c.nodeName}>).`); broken = true; break; }
        i = j; count = 0;
      }
      count++;
      if (P[i][4] !== -1 && count > P[i][4]) { add('too-many', c, `<${c.nodeName}> may appear at most ${P[i][4] === 1 ? 'once' : P[i][4] + ' times'} inside <${el.nodeName}>.`); broken = true; break; }
    }
    if (!broken) {
      if (P.length && count < P[i][3]) add('missing', el, `<${el.nodeName}> is missing the required element <${label(P[i])}>.`);
      else for (let k = i + 1; k < P.length; k++) if (P[k][3] > 0) { add('missing', el, `<${el.nodeName}> is missing the required element <${label(P[k])}>.`); break; }
    }
    for (const c of children) { const p = P.find(pp => match(pp, c)); if (p) visit(c, model.types[p[2]]); }
  }
  visit(root, model.types[tid]);
  return out;
}
