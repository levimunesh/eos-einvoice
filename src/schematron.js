// Schematron runner: evaluates the official EN 16931 / XRechnung rule tables with an XPath 3.1 engine.
// The rule tables are generated from the official .sch sources by tools/sch2json.mjs.
// XPath 3.1 engine: fontoxpath 3.34.0 (MIT) built from source with an exact-decimal arithmetic patch (see vendor/README).
import { evaluateXPath, evaluateXPathToNodes, evaluateXPathToBoolean, evaluateXPathToString, registerCustomXPathFunction, registerXQueryModule } from '../vendor/fontoxpath-eos.js';

let registered = false;
const EPS = 1e-9;
function registerFunctions() {
  if (registered) return;
  registered = true;
  // u:slack — |exp - val| <= slack (decimal semantics; EPS absorbs binary floating point noise)
  registerCustomXPathFunction({ namespaceURI: 'utils', localName: 'slack' }, ['xs:decimal', 'xs:decimal', 'xs:decimal'], 'xs:boolean',
    (_ctx, exp, val, slack) => (exp + slack + EPS >= val) && (exp - slack - EPS <= val));
  registerCustomXPathFunction({ namespaceURI: 'utils', localName: 'decimalOrZero' }, ['item()*'], 'xs:decimal',
    (_ctx, seq) => {
      if (!seq || seq.length === 0) return 0;
      const first = seq[0];
      const s = (first && typeof first === 'object' && 'textContent' in first) ? first.textContent : String(first);
      const n = Number(String(s).trim());
      if (Number.isNaN(n)) throw new Error('FORG0001: cannot cast to xs:decimal');
      return n;
    });
  registerCustomXPathFunction({ namespaceURI: 'xrechnung', localName: 'checkIBAN' }, ['xs:string'], 'xs:boolean',
    (_ctx, iban) => checkIBAN(iban));
}

export function checkIBAN(iban) {
  const n = String(iban).replace(/\s/g, '').trim();
  if (!/^[A-Z]{2}[0-9]{2}[a-zA-Z0-9]{0,30}$/.test(n)) return false;
  const re = n.slice(4) + n.slice(0, 2).toUpperCase() + n.slice(2, 4);
  let digits = '';
  for (const ch of re) { const cp = ch.codePointAt(0); digits += cp > 64 ? String(cp - 55) : String(cp - 48); }
  try { return BigInt(digits) % 97n === 1n; } catch { return false; }
}

// Split an XSLT match pattern on top-level '|' and turn each alternative into an XPath that selects every matching node.
export function contextToXPath(ctx) {
  const alts = []; let depth = 0, quote = null, cur = '';
  for (let i = 0; i < ctx.length; i++) {
    const c = ctx[i];
    if (quote) { cur += c; if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; cur += c; continue; }
    if (c === '[' || c === '(') depth++;
    if (c === ']' || c === ')') depth--;
    if (c === '|' && depth === 0) { alts.push(cur); cur = ''; continue; }
    cur += c;
  }
  alts.push(cur);
  return alts.map(a => a.trim()).map(a => (a.startsWith('/') ? a : '//' + a)).join(' | ');
}

const VAR_RE = /\$([A-Za-z_][\w.-]*)/g;
function varsIn(expr) { const s = new Set(); let m; VAR_RE.lastIndex = 0; while ((m = VAR_RE.exec(expr))) s.add(m[1]); return s; }

// Prepare a rule table: resolve let dependencies so each test becomes one self-contained XPath expression.
const XS = 'http://www.w3.org/2001/XMLSchema';
// Helper functions defined inside a rule set (xsl:function with params, variables and one result) become XQuery functions.
// Each rule set gets its own module namespace so that two rule sets can define the same function name.
function registerTableFunctions(table) {
  const fns = table.functions || []; if (!fns.length) return { imports: null, map: {} };
  const byPrefix = new Map();
  for (const f of fns) { const pfx = f.name.split(':')[0]; if (!byPrefix.has(pfx)) byPrefix.set(pfx, []); byPrefix.get(pfx).push(f); }
  const map = {}; for (const [pfx, list] of byPrefix) map[pfx] = `${list[0].ns || pfx}#${table.name}`;
  const imports = {};
  for (const [pfx, list] of byPrefix) {
    let mod = `module namespace ${pfx} = "${map[pfx]}"; declare namespace xs = "${XS}"; declare namespace xsd = "${XS}";`;
    for (const [p, uri] of Object.entries(table.ns)) if (!(p in map) && p !== 'xs' && p !== 'xsd') mod += ` declare namespace ${p} = "${uri}";`;
    for (const f of list) {
      const params = f.params.map(p => `$${p.name} as ${p.as}`).join(', ');
      // XSLT evaluates variables lazily; inline each one where it is used so that an unused failing cast does not raise an error
      let result = f.body.select; const done = [];
      for (const l of f.lets) { let v = l.value; for (const d of done) v = v.replace(d.re, () => `(${d.value})`); done.push({ re: new RegExp('\\$' + l.name.replace(/[-.]/g, m => '\\' + m) + '(?![\\w.-])', 'g'), value: v }); }
      for (const d of done) result = result.replace(d.re, () => `(${d.value})`);
      const body = f.body.valueOf && /^xs:boolean$/.test(f.as) ? `xs:boolean(string((${result})))` : `(${result})`;
      mod += ` declare %public function ${f.name}(${params}) as ${f.as} { ${body} };`;
    }
    registerXQueryModule(mod.replace(/\bxsd:(?=[a-zA-Z])/g, 'xs:')); imports[pfx] = map[pfx];
  }
  return { imports, map };
}

export function compileRules(table) {
  registerFunctions();
  const fn = registerTableFunctions(table);
  const globals = new Map(table.lets.map(l => [l.name, l.value]));
  const nsResolver = prefix => fn.map[prefix] ?? table.ns[prefix] ?? (prefix === 'xs' || prefix === 'xsd' ? XS : null);
  const wrap = (expr, ruleLets) => {
    // collect needed lets (rule lets in order, then globals), transitively
    const local = new Map(ruleLets.map(l => [l.name, l.value]));
    const need = []; const seen = new Set();
    const visit = name => {
      if (seen.has(name)) return; seen.add(name);
      const isLocal = local.has(name); const val = isLocal ? local.get(name) : globals.get(name);
      if (val === undefined) return;
      for (const d of varsIn(val)) if (d !== name) visit(d);
      need.push({ name, val, isLocal });
    };
    for (const v of varsIn(expr)) visit(v);
    // rule-level lets may be declared in an order that depends on earlier ones; `need` is already dependency-ordered
    let out = '';
    for (const n of need) out += n.isLocal ? `let $${n.name} := (${n.val}) return ` : `let $${n.name} := (root(.)/(${n.val})) return `;
    return out + `(${expr})`;
  };
  const patterns = table.patterns.map(p => ({
    id: p.id,
    rules: p.rules.map(r => ({
      context: r.context,
      xpath: wrap(contextToXPath(r.context), []),
      checks: r.checks.map(c => ({ ...c, expr: wrap(c.test, r.lets), textExprs: c.text.map(part => (typeof part === 'object' && part.select) ? wrap(part.select, r.lets) : null) })),
    })),
  }));
  const opts = { namespaceResolver: nsResolver }; if (fn.imports) { opts.moduleImports = fn.imports; opts.language = evaluateXPath.XQUERY_3_1_LANGUAGE; }
  return { name: table.name, title: table.title, nsResolver, opts, patterns };
}

function pathOf(node) {
  const segs = [];
  for (let n = node; n && n.nodeType === 1; n = n.parentNode) {
    let i = 1; for (let s = n.previousSibling; s; s = s.previousSibling) if (s.nodeType === 1 && s.nodeName === n.nodeName) i++;
    segs.unshift(`${n.nodeName}[${i}]`);
  }
  return '/' + segs.join('/');
}

// Run a compiled rule table over a DOM document. Returns the list of findings.
export function validate(doc, compiled) {
  const opts = compiled.opts;
  const findings = []; const engineErrors = [];
  for (const p of compiled.patterns) {
    const matched = new Set();
    for (const r of p.rules) {
      let nodes;
      try { nodes = evaluateXPathToNodes(r.xpath, doc, null, null, opts); }
      catch (e) { engineErrors.push({ where: 'context', context: r.context, message: String(e.message || e) }); continue; }
      for (const node of nodes) {
        if (matched.has(node)) continue;
        matched.add(node);
        for (const c of r.checks) {
          let ok;
          try { ok = evaluateXPathToBoolean(c.expr, node, null, null, opts); }
          catch (e) { engineErrors.push({ where: 'test', id: c.id, message: String(e.message || e) }); continue; }
          const fired = c.t === 'a' ? !ok : ok;
          if (!fired) continue;
          let text = '';
          c.text.forEach((part, i) => {
            if (typeof part === 'string') text += part;
            else if (part.name) text += node.nodeName;
            else { try { text += evaluateXPathToString(c.textExprs[i], node, null, null, opts); } catch { /* leave blank */ } }
          });
          findings.push({ id: c.id, flag: c.flag, text: text.trim(), location: pathOf(node), node });
        }
      }
    }
  }
  return { findings, engineErrors };
}
