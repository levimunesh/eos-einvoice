#!/usr/bin/env python3
"""Compile an XML Schema (with its imports and includes) into the compact JSON content model read by src/xsdcheck.js.

  python3 -I tools/xsd2model.py                       # FA(3) defaults -> build/rules/fa3.json
  python3 -I tools/xsd2model.py --xsd main.xsd --out model.json --map URLPREFIX=LOCALDIR --dir LOCALDIR

Supported: import / include (remote schemaLocation mapped to local files), global and local elements (elementFormDefault,
form, ref, fixed, default, nillable), named and anonymous complex types, nested sequence / choice / all / group with
minOccurs / maxOccurs, wildcards (any, anyAttribute), complexContent extension and restriction, simpleContent extension and
restriction, attributes (use, fixed, attributeGroup), simple types by restriction (all length, digit, range, pattern,
enumeration and whiteSpace facets, flattened along the derivation chain), union and list, and every XSD 1.0 built-in type.
Not supported (a warning is printed): substitution groups, abstract, block / final, identity constraints (key / unique /
keyref), redefine, chameleon includes, regular-expression class subtraction and Unicode block escapes.

JSON layout (all ids are indexes into "t"):
  ns   namespace table; index 0 is the main schema's target namespace
  el   global elements:  "nsIdx|name": [typeId, opts?]
  tn   named types:      "nsIdx|name": typeId      (used for xsi:type)
  t    types. Simple atomic: {b: kind, w: 0 preserve|1 replace|2 collapse, d: base, e: enumeration, p: [[regex OR ...] AND ...],
       h: hints for p, l/nl/xl: length/min/max, td/fd: digits, mi/ma: min/max inclusive, me/xe: min/max exclusive}
       Union: {u: [ids]}   List: {li: id}
       Complex: {x: 0 empty|1 elements|2 mixed|3 simple|4 anything, c: particle, s: simple type id, a: {attr: [typeId, required, fixed?]}, aa: wildcard, d: base}
  particle: element ["name", typeId, min, max, {n: nsIdx, f: fixed, df: 1 has default, nil: 1}?]
            group   [1 sequence|2 choice|3 all, min, max, [particles]]        wildcard [0, min, max, namespaces, processContents]
       max -1 means unbounded.
"""
import sys, os, json, re, argparse
from lxml import etree

XS = 'http://www.w3.org/2001/XMLSchema'
FA3 = '/home/claude/gh/ksef-docs/faktury/schemy/FA/'
DEFAULTS = dict(xsd=FA3 + 'schemat_FA(3)_v1-0E.xsd', out='build/rules/fa3.json',
                map=['http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2022/01/05/eD/DefinicjeTypy/=' + FA3 + 'bazowe/'])


def q(t): return '{%s}%s' % (XS, t)
def ln(n): return etree.QName(n).localname
def xs_kids(n, *names): return [c for c in n if isinstance(c.tag, str) and c.tag.startswith('{%s}' % XS) and (not names or ln(c) in names)]


WARN = []
def warn(*a):
    m = ' '.join(str(x) for x in a)
    if m not in WARN: WARN.append(m); print('WARN', m, file=sys.stderr)


# ---------------------------------------------------------------- regular expressions: XSD dialect -> JavaScript (flag "u")
class Unsupported(Exception): pass

MULTI = {'d': r'\p{Nd}', 'D': r'\P{Nd}', 's': r' \t\n\r', 'i': r'\p{L}_:', 'c': r'\p{L}\p{N}\p{M}._:\-', 'W': r'\p{P}\p{Z}\p{C}'}

def xsd_re_to_js(p):
    out = []; i = 0; n = len(p); cls = False
    while i < n:
        c = p[i]
        if c == '\\':
            if i + 1 >= n: raise Unsupported('dangling backslash')
            e = p[i + 1]; i += 2
            if e in 'dD': out.append(MULTI[e])
            elif e in 'siW': out.append(MULTI[e] if cls else '[' + MULTI[e] + ']')
            elif e == 'c': out.append(MULTI[e] if cls else '[' + MULTI[e] + ']')
            elif e == 'S':
                if cls: raise Unsupported(r'\S inside a character class')
                out.append(r'[^ \t\n\r]')
            elif e == 'w':
                if cls: raise Unsupported(r'\w inside a character class')
                out.append(r'[^\p{P}\p{Z}\p{C}]')
            elif e in 'IC':
                if cls: raise Unsupported('\\' + e + ' inside a character class')
                out.append('[^' + MULTI[e.lower()] + ']')
            elif e in 'pP':
                m = re.match(r'\{([A-Za-z]{1,2})\}', p[i:])
                if not m: raise Unsupported('Unicode block escape')
                out.append('\\' + e + m.group(0)); i += len(m.group(0))
            elif e in 'nrt': out.append('\\' + e)
            elif e == '-': out.append(r'\-' if cls else '-')
            elif e in '\\|.?*+(){}[]^$/': out.append('\\' + e)
            else: raise Unsupported('escape \\' + e)
        elif cls:
            if c == ']': cls = False; out.append(']')
            elif c == '[' or (c == '-' and p[i + 1:i + 2] == '['): raise Unsupported('character class subtraction')
            else: out.append(c)
            i += 1
        else:
            if c == '[':
                cls = True; out.append('['); i += 1
                if p[i:i + 1] == '^': out.append('^'); i += 1
                continue
            if c == '.': out.append(r'[^\n\r]')
            elif c in '^$': out.append('\\' + c)        # no anchors in XSD: these are ordinary characters
            else: out.append(c)
            i += 1
    if cls: raise Unsupported('unterminated character class')
    return ''.join(out)


def pattern_hint(p):
    """A machine-readable description of simple patterns so the checker can explain them:
       ['n', intDigits, fracDigits]  plain decimal amount        ['@']  e-mail like
       ['c', kinds, literals, lengths]  kinds: d digits, U capitals, l small letters; lengths: [exact...] or [min, max, 0]"""
    m = re.fullmatch(r'-\?\(\[1-9\]\\d\{0,(\d+)\}\|0\)\(\\\.\\d\{1,(\d+)\}\)\?', p)
    if m: return ['n', int(m.group(1)) + 1, int(m.group(2))]
    if p == '(.)+@(.)+': return ['@']
    try:
        pos = [0]
        def lens_add(a, b):
            s = {x + y for x in a for y in b}
            return s if len(s) <= 200 else None
        def alt():
            kinds = set(); lits = set(); lens = set()
            while True:
                k, l, ls = seq(); kinds |= k; lits |= l
                lens = None if (lens is None or ls is None) else lens | ls
                if pos[0] < len(p) and p[pos[0]] == '|': pos[0] += 1; continue
                return kinds, lits, lens
        def seq():
            kinds = set(); lits = set(); lens = {0}
            while pos[0] < len(p) and p[pos[0]] not in '|)':
                k, l, ls = atom(); lo, hi = quant()
                kinds |= k; lits |= l
                if hi is None or ls is None or lens is None: lens = None
                else:
                    acc = None
                    for rep in range(lo, hi + 1):
                        cur = {0}
                        for _ in range(rep):
                            cur = lens_add(cur, ls)
                            if cur is None: break
                        if cur is None: acc = None; break
                        acc = cur if acc is None else acc | cur
                    lens = None if acc is None else lens_add(lens, acc)
            return kinds, lits, lens
        def atom():
            c = p[pos[0]]
            if c == '(':
                pos[0] += 1; r = alt()
                if p[pos[0]] != ')': raise ValueError
                pos[0] += 1; return r
            if c == '\\':
                e = p[pos[0] + 1]; pos[0] += 2
                if e == 'd': return {'d'}, set(), {1}
                if e in '.+*?-/|()[]{}\\^$': return set(), {e}, {1}
                raise ValueError
            if c == '[':
                j = p.index(']', pos[0] + 1); body = p[pos[0] + 1:j]; pos[0] = j + 1
                kinds = set(); lits = set()
                if body.startswith('^'): raise ValueError
                for part in re.findall(r'\\.|.-.|.', body):
                    if part == 'A-Z': kinds.add('U')
                    elif part == 'a-z': kinds.add('l')
                    elif re.fullmatch(r'\d-\d', part) or part == '\\d': kinds.add('d')
                    elif re.fullmatch(r'[A-Z]-[A-Z]', part): kinds.add('U')
                    elif re.fullmatch(r'[a-z]-[a-z]', part): kinds.add('l')
                    elif len(part) == 1 and part != '\\': (kinds.add('d') if part.isdigit() else lits.add(part))
                    elif len(part) == 2 and part[0] == '\\' and part[1] in '.+*?-/|()[]{}\\^$': lits.add(part[1])
                    else: raise ValueError
                return kinds, lits, {1}
            if c in '.*+?{}|)]': raise ValueError
            pos[0] += 1
            return ({'d'}, set(), {1}) if c.isdigit() else (set(), {c}, {1})
        def quant():
            if pos[0] >= len(p): return 1, 1
            c = p[pos[0]]
            if c == '?': pos[0] += 1; return 0, 1
            if c in '*+': pos[0] += 1; return (0 if c == '*' else 1), None
            m = re.match(r'\{(\d+)(,(\d*))?\}', p[pos[0]:])
            if m:
                pos[0] += len(m.group(0)); lo = int(m.group(1))
                hi = lo if m.group(2) is None else (int(m.group(3)) if m.group(3) else None)
                if hi is not None and hi - lo > 64: return lo, None
                return lo, hi
            return 1, 1
        kinds, lits, lens = alt()
        if pos[0] != len(p) or not (kinds or lits): return None
        if any(ord(c) > 126 or c.isspace() for c in lits): return None
        if lens is None: return ['c', ''.join(sorted(kinds)), ''.join(sorted(lits)), []]
        ls = sorted(lens)
        if len(ls) > 3: ls = [ls[0], ls[-1], 0] if ls == list(range(ls[0], ls[-1] + 1)) else []
        return ['c', ''.join(sorted(kinds)), ''.join(sorted(lits)), ls]
    except (ValueError, IndexError):
        return None


# ---------------------------------------------------------------- built-in simple types
P_NAME = r'[\p{L}_:][\p{L}\p{N}\p{M}._:\-]*'
P_NCNAME = r'[\p{L}_][\p{L}\p{N}\p{M}._\-]*'
BUILTINS = [
    ('anySimpleType', None, {'b': 'string', 'w': 0}),
    ('string', 'anySimpleType', {'b': 'string', 'w': 0}), ('normalizedString', 'string', {'w': 1}), ('token', 'normalizedString', {'w': 2}),
    ('language', 'token', {'p': [[r'[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*']]}), ('NMTOKEN', 'token', {'p': [[r'[\p{L}\p{N}\p{M}._:\-]+']]}),
    ('Name', 'token', {'p': [[P_NAME]]}), ('NCName', 'Name', {'p': [[P_NAME], [P_NCNAME]]}),
    ('ID', 'NCName', {}), ('IDREF', 'NCName', {}), ('ENTITY', 'NCName', {}),
    ('boolean', 'anySimpleType', {'b': 'boolean', 'w': 2}), ('decimal', 'anySimpleType', {'b': 'decimal', 'w': 2}),
    ('integer', 'decimal', {'b': 'integer'}),
    ('nonPositiveInteger', 'integer', {'ma': '0'}), ('negativeInteger', 'nonPositiveInteger', {'ma': '-1'}),
    ('long', 'integer', {'mi': str(-2 ** 63), 'ma': str(2 ** 63 - 1)}), ('int', 'long', {'mi': str(-2 ** 31), 'ma': str(2 ** 31 - 1)}),
    ('short', 'int', {'mi': '-32768', 'ma': '32767'}), ('byte', 'short', {'mi': '-128', 'ma': '127'}),
    ('nonNegativeInteger', 'integer', {'mi': '0'}), ('unsignedLong', 'nonNegativeInteger', {'ma': str(2 ** 64 - 1)}),
    ('unsignedInt', 'unsignedLong', {'ma': str(2 ** 32 - 1)}), ('unsignedShort', 'unsignedInt', {'ma': '65535'}), ('unsignedByte', 'unsignedShort', {'ma': '255'}),
    ('positiveInteger', 'nonNegativeInteger', {'mi': '1'}),
    ('float', 'anySimpleType', {'b': 'float', 'w': 2}), ('double', 'anySimpleType', {'b': 'float', 'w': 2}),
] + [(n, 'anySimpleType', {'b': n, 'w': 2}) for n in ('duration', 'dateTime', 'time', 'date', 'gYearMonth', 'gYear', 'gMonthDay', 'gDay', 'gMonth', 'hexBinary', 'base64Binary', 'anyURI', 'QName', 'NOTATION')]
BUILTIN_LISTS = [('NMTOKENS', 'NMTOKEN'), ('IDREFS', 'IDREF'), ('ENTITIES', 'ENTITY')]
FACET_KEY = {'length': 'l', 'minLength': 'nl', 'maxLength': 'xl', 'totalDigits': 'td', 'fractionDigits': 'fd',
             'minInclusive': 'mi', 'maxInclusive': 'ma', 'minExclusive': 'me', 'maxExclusive': 'xe'}
WS = {'preserve': 0, 'replace': 1, 'collapse': 2}
def ws_norm(v, w):
    if w == 0: return v
    v = re.sub(r'[\t\n\r]', ' ', v)
    return v if w == 1 else re.sub(r' +', ' ', v).strip(' ')


class Compiler:
    def __init__(self, maps, dirs):
        self.maps = maps; self.dirs = dirs
        self.docs = {}; self.G = {k: {} for k in ('element', 'complexType', 'simpleType', 'attribute', 'group', 'attributeGroup')}
        self.NS = []; self.T = []; self.named = {}; self.anon = {}; self.anon_ids = set(); self.el = {}
        self.main_tns = None

    # ---- loading
    def resolve(self, loc, base):
        if re.match(r'^[a-z]+://', loc):
            for prefix, d in self.maps:
                if loc.startswith(prefix): return os.path.join(d, loc[len(prefix):])
            for d in self.dirs + [base]:
                c = os.path.join(d, os.path.basename(loc))
                if os.path.exists(c): return c
            raise SystemExit('no local copy for ' + loc + ' (use --map URLPREFIX=DIR or --dir DIR)')
        return os.path.join(base, loc)

    def load(self, path):
        path = os.path.abspath(path)
        if path in self.docs: return
        root = etree.parse(path).getroot(); self.docs[path] = root
        tns = root.get('targetNamespace') or ''
        if self.main_tns is None: self.main_tns = tns; self.ns(tns)
        for ch in xs_kids(root):
            k = ln(ch)
            if k in ('import', 'include'):
                loc = ch.get('schemaLocation')
                if loc: self.load(self.resolve(loc, os.path.dirname(path)))
                elif k == 'include': warn('include without schemaLocation in', path)
            elif k in self.G: self.G[k][(tns, ch.get('name'))] = ch
            elif k == 'redefine': warn('redefine is not supported', path)
            elif k not in ('annotation', 'notation'): warn('ignored top-level', k, 'in', path)

    def schema_of(self, node): return node.getroottree().getroot()
    def tns_of(self, node): return self.schema_of(node).get('targetNamespace') or ''
    def qname(self, node, val):
        val = val.strip()
        if ':' in val:
            p, l = val.split(':', 1)
            if p not in node.nsmap: raise SystemExit('unbound prefix ' + val)
            return (node.nsmap[p], l)
        return (node.nsmap.get(None) or '', val)
    def ns(self, uri):
        if uri not in self.NS: self.NS.append(uri)
        return self.NS.index(uri)

    # ---- types
    def new(self, entry=None):
        self.T.append(entry); return len(self.T) - 1

    def builtin(self, name):
        key = (XS, name)
        if key in self.named: return self.named[key]
        if name == 'anyType':
            self.named[key] = tid = self.new({'x': 4}); return tid
        for n, item in BUILTIN_LISTS:
            if n == name:
                self.named[key] = tid = self.new(None); self.T[tid] = {'li': self.builtin(item), 'nl': 1}; return tid
        for n, base, facets in BUILTINS:
            if n == name:
                self.named[key] = tid = self.new(None)
                t = dict(self.T[self.builtin(base)]) if base else {}
                t.pop('d', None)
                if 'p' in facets: t['p'] = list(facets['p']); t['h'] = [0] * len(t['p'])
                t.update({k: v for k, v in facets.items() if k != 'p'})
                if base: t['d'] = self.builtin(base)
                else: t['d'] = self.builtin('anyType')
                self.T[tid] = t; return tid
        raise SystemExit('unknown built-in type xs:' + name)

    def type_id(self, qn):
        if qn[0] == XS: return self.builtin(qn[1])
        if qn in self.named: return self.named[qn]
        node = self.G['complexType'].get(qn)
        if node is None: node = self.G['simpleType'].get(qn)
        if node is None: raise SystemExit('unknown type %s' % (qn,))
        self.named[qn] = tid = self.new(None)
        self.T[tid] = self.complex(node) if ln(node) == 'complexType' else self.simple(node)
        return tid

    def anon_type(self, node):
        key = (self.schema_of(node).base, node.getroottree().getpath(node))    # lxml proxies are not stable objects
        if key in self.anon: return self.anon[key]
        self.anon[key] = tid = self.new(None); self.anon_ids.add(tid)
        self.T[tid] = self.complex(node) if ln(node) == 'complexType' else self.simple(node)
        return tid

    def type_ref(self, node, attr='type', default='anyType'):
        """type id for an element / attribute declaration or an extension / restriction base"""
        if node.get(attr): return self.type_id(self.qname(node, node.get(attr)))
        inline = xs_kids(node, 'complexType', 'simpleType')
        if inline: return self.anon_type(inline[0])
        return self.builtin(default)

    def simple(self, node):
        for a in ('final',):
            if node.get(a): warn('ignored', a, 'on simpleType', node.get('name'))
        r = xs_kids(node, 'restriction'); u = xs_kids(node, 'union'); li = xs_kids(node, 'list')
        if u:
            ids = [self.type_id(self.qname(u[0], m)) for m in (u[0].get('memberTypes') or '').split()] + [self.anon_type(s) for s in xs_kids(u[0], 'simpleType')]
            return {'u': ids, 'd': self.builtin('anySimpleType')}
        if li:
            item = self.type_id(self.qname(li[0], li[0].get('itemType'))) if li[0].get('itemType') else self.anon_type(xs_kids(li[0], 'simpleType')[0])
            return {'li': item, 'd': self.builtin('anySimpleType')}
        if not r: raise SystemExit('simpleType without restriction, union or list')
        base = self.type_ref(r[0], 'base', 'anySimpleType')
        return self.restrict(base, r[0])

    def restrict(self, base, rnode):
        b = self.T[base]
        if b is None: raise SystemExit('circular simple type definition')
        if 'x' in b:
            if b['x'] != 3: raise SystemExit('simple restriction of a non-simple type')
            b = self.T[b['s']]
        t = {k: (list(v) if isinstance(v, list) else v) for k, v in b.items()}
        t['d'] = base
        enums = []; pats = []
        for f in xs_kids(rnode):
            k = ln(f); v = f.get('value')
            if k == 'enumeration': enums.append(v)
            elif k == 'pattern': pats.append(v)
            elif k in FACET_KEY: t[FACET_KEY[k]] = int(v) if k in ('length', 'minLength', 'maxLength', 'totalDigits', 'fractionDigits') else v.strip()
            elif k == 'whiteSpace': t['w'] = WS[v]
            elif k not in ('annotation', 'simpleType', 'attribute', 'attributeGroup', 'anyAttribute'): warn('ignored facet', k)
        if pats:
            try: js = [xsd_re_to_js(p) for p in pats]
            except Unsupported as e: raise SystemExit('unsupported regular expression %r: %s' % (pats, e))
            t['p'] = t.get('p', []) + [js]
            t['h'] = t.get('h', [0] * (len(t['p']) - 1)) + [(pattern_hint(pats[0]) or 0) if len(pats) == 1 else 0]
        if enums:
            w = t.get('w', 2) if 'b' in t else 2
            vals = [ws_norm(v, w) if t.get('b') == 'string' else v.strip() for v in enums]
            if 'e' in t:
                keep = [v for v in vals if v in t['e']]
                if len(keep) != len(vals): warn('enumeration values outside the base enumeration dropped', set(vals) - set(keep))
                vals = keep
            t['e'] = vals
        return t

    # ---- attributes
    def attributes(self, node, attrs, extra):
        for a in xs_kids(node, 'attribute', 'attributeGroup', 'anyAttribute'):
            k = ln(a)
            if k == 'attributeGroup':
                g = self.G['attributeGroup'].get(self.qname(a, a.get('ref')))
                if g is None: raise SystemExit('unknown attributeGroup ' + a.get('ref'))
                self.attributes(g, attrs, extra); continue
            if k == 'anyAttribute':
                extra['aa'] = [self.wild_ns(a), a.get('processContents', 'strict')]; continue
            decl = a
            if a.get('ref'):
                qn = self.qname(a, a.get('ref')); decl = self.G['attribute'].get(qn)
                if decl is None:
                    if qn[0] == 'http://www.w3.org/XML/1998/namespace': key = '{%d}%s' % (self.ns(qn[0]), qn[1]); attrs[key] = [self.builtin('string'), 1 if a.get('use') == 'required' else 0]; continue
                    raise SystemExit('unknown attribute %s' % (qn,))
                ns = qn[0]; name = qn[1]
            else:
                form = a.get('form') or self.schema_of(a).get('attributeFormDefault', 'unqualified')
                ns = self.tns_of(a) if form == 'qualified' else ''; name = a.get('name')
            key = '{%d}%s' % (self.ns(ns), name) if ns else name
            if a.get('use') == 'prohibited': attrs.pop(key, None); continue
            spec = [self.type_ref(decl, 'type', 'anySimpleType'), 1 if a.get('use') == 'required' else 0]
            fixed = a.get('fixed') if a.get('fixed') is not None else decl.get('fixed')
            if fixed is not None: spec.append(fixed)
            attrs[key] = spec

    def wild_ns(self, node):
        v = (node.get('namespace') or '##any').split()
        if v == ['##any']: return 1
        if v == ['##other']: return [0, self.ns(self.tns_of(node))]
        return [1] + [self.ns(self.tns_of(node) if x == '##targetNamespace' else ('' if x == '##local' else x)) for x in v]

    # ---- content models
    def particle(self, node):
        k = ln(node)
        mn = int(node.get('minOccurs', '1')); mx = node.get('maxOccurs', '1'); mx = -1 if mx == 'unbounded' else int(mx)
        if mx == 0: return None
        if k == 'element':
            if node.get('ref'):
                qn = self.qname(node, node.get('ref')); decl = self.G['element'].get(qn)
                if decl is None: raise SystemExit('unknown element %s' % (qn,))
                ns, name = qn; tid, opts = self.global_element(qn)
                opts = dict(opts)
            else:
                form = node.get('form') or self.schema_of(node).get('elementFormDefault', 'unqualified')
                ns = self.tns_of(node) if form == 'qualified' else ''; name = node.get('name'); decl = node
                tid = self.type_ref(decl); opts = self.elem_opts(decl)
            if self.ns(ns) != 0: opts['n'] = self.ns(ns)
            return [name, tid, mn, mx] + ([opts] if opts else [])
        if k == 'any': return [0, mn, mx, self.wild_ns(node), node.get('processContents', 'strict')]
        if k == 'group':
            g = self.G['group'].get(self.qname(node, node.get('ref')))
            if g is None: raise SystemExit('unknown group ' + node.get('ref'))
            inner = [self.particle(c) for c in xs_kids(g, 'sequence', 'choice', 'all')]
            inner = inner[0] if inner else None
            if inner is None: return None
            return inner if (mn, mx) == (1, 1) else [1, mn, mx, [inner]]
        kind = {'sequence': 1, 'choice': 2, 'all': 3}[k]
        ch = [self.particle(c) for c in xs_kids(node, 'element', 'sequence', 'choice', 'all', 'group', 'any')]
        ch = [c for c in ch if c is not None]
        if not ch:
            if kind == 2 and mn > 0: warn('empty choice can never be satisfied'); return [2, mn, mx, []]
            return None
        if kind != 3 and len(ch) == 1 and (mn, mx) == (1, 1): return ch[0]
        if kind == 1:
            flat = []
            for c in ch:
                if not isinstance(c[0], str) and c[0] == 1 and (c[1], c[2]) == (1, 1): flat += c[3]
                else: flat.append(c)
            ch = flat
        return [kind, mn, mx, ch]

    def elem_opts(self, decl):
        o = {}
        if decl.get('fixed') is not None: o['f'] = decl.get('fixed')
        elif decl.get('default') is not None: o['df'] = 1
        if decl.get('nillable') in ('true', '1'): o['nil'] = 1
        for a in ('abstract', 'substitutionGroup', 'block', 'final'):
            if decl.get(a): warn('ignored', a, 'on element', decl.get('name'))
        if xs_kids(decl, 'key', 'unique', 'keyref'): warn('identity constraints are not checked on element', decl.get('name'))
        return o

    def global_element(self, qn):
        if qn not in self.el:
            decl = self.G['element'][qn]
            self.el[qn] = [None, {}]      # reserved (recursive references)
            self.el[qn] = [self.type_ref(decl), self.elem_opts(decl)]
        if self.el[qn][0] is None: raise SystemExit('recursive global element %s with an anonymous type is not supported' % (qn,))
        return self.el[qn]

    def complex(self, node):
        for a in ('abstract', 'block', 'final'):
            if node.get(a) and node.get(a) != 'false': warn('ignored', a, 'on complexType', node.get('name'))
        attrs = {}; extra = {}
        mixed = node.get('mixed') in ('true', '1')
        sc = xs_kids(node, 'simpleContent'); cc = xs_kids(node, 'complexContent')
        if sc:
            e = xs_kids(sc[0], 'extension', 'restriction')[0]
            base = self.type_ref(e, 'base', 'anySimpleType'); b = self.T[base]
            if b is None: raise SystemExit('circular type definition')
            if 'x' in b:
                attrs.update(b.get('a', {}));
                if 'aa' in b: extra['aa'] = b['aa']
                sid = b['s']
            else: sid = base
            if ln(e) == 'restriction':
                inline = xs_kids(e, 'simpleType')
                src = self.anon_type(inline[0]) if inline else sid
                if xs_kids(e, *FACET_KEY, 'enumeration', 'pattern', 'whiteSpace'):
                    sid = self.new(self.restrict(src, e)); self.anon_ids.add(sid)
                else: sid = src
            self.attributes(e, attrs, extra)
            t = {'x': 3, 's': sid, 'd': base}
        else:
            content = node; part = None; base = None
            if cc:
                if cc[0].get('mixed') is not None: mixed = cc[0].get('mixed') in ('true', '1')
                e = xs_kids(cc[0], 'extension', 'restriction')[0]; content = e
                base = self.type_ref(e, 'base', 'anyType'); b = self.T[base]
                if b is None: raise SystemExit('circular type definition')
                if b.get('x') == 3 or 'x' not in b: raise SystemExit('complexContent derived from a simple type')
                if ln(e) == 'extension':
                    part = b.get('c'); attrs.update(b.get('a', {}))
                    if b.get('x') == 2: mixed = True
                elif b.get('x') != 4: attrs.update(b.get('a', {}))
                if 'aa' in b: extra['aa'] = b['aa']
            own = [self.particle(c) for c in xs_kids(content, 'sequence', 'choice', 'all', 'group')]
            own = own[0] if own else None
            if part is not None and own is not None: part = [1, 1, 1, [part, own]]
            elif own is not None: part = own
            self.attributes(content, attrs, extra)
            t = {'x': 2 if mixed else (1 if part is not None else 0)}
            if part is not None: t['c'] = part
            t['d'] = base if base is not None else self.builtin('anyType')
        if attrs: t['a'] = attrs
        t.update(extra)
        return t

    # ---- output
    def finish(self):
        for qn in list(self.G['element']): self.global_element(qn)
        for kind in ('complexType', 'simpleType'):
            for qn in list(self.G[kind]): self.type_id(qn)
        for n, _, _ in BUILTINS: self.builtin(n)
        for n, _ in BUILTIN_LISTS: self.builtin(n)
        self.builtin('anyType')
        T = self.T
        # merge identical anonymous types (named types stay distinct: xsi:type depends on their identity)
        alias = {}
        def canon(i):
            while i in alias: i = alias[i]
            return i
        def remap(t, R):
            def particle(p):
                if isinstance(p[0], str): return [p[0], R(p[1])] + p[2:]
                if p[0] == 0: return p
                return [p[0], p[1], p[2], [particle(c) for c in p[3]]]
            o = dict(t)
            for k in ('d', 's', 'li'):
                if k in o: o[k] = R(o[k])
            if 'u' in o: o['u'] = [R(i) for i in o['u']]
            if 'a' in o: o['a'] = {k: [R(v[0])] + v[1:] for k, v in o['a'].items()}
            if 'c' in o: o['c'] = particle(o['c'])
            return o
        while True:
            seen = {}; changed = False
            for i in sorted(self.anon_ids):
                if i in alias: continue
                key = json.dumps(remap(T[i], canon), sort_keys=True)
                if key in seen: alias[i] = seen[key]; changed = True
                else: seen[key] = i
            if not changed: break
        live = [i for i in range(len(T)) if i not in alias]
        new_id = {old: n for n, old in enumerate(live)}
        f = lambda i: new_id[canon(i)]
        types = [remap(T[i], f) for i in live]
        key = lambda qn: '%d|%s' % (self.ns(qn[0]), qn[1])
        model = {
            'ns': None,
            'el': {key(qn): [f(v[0])] + ([v[1]] if v[1] else []) for qn, v in sorted(self.el.items())},
            'tn': {key(qn): f(i) for qn, i in sorted(self.named.items())},
            't': types,
        }
        model['ns'] = self.NS
        return model


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--xsd', default=DEFAULTS['xsd']); ap.add_argument('--out', default=DEFAULTS['out'])
    ap.add_argument('--map', action='append', default=None, help='URLPREFIX=LOCALDIR for remote schemaLocation values')
    ap.add_argument('--dir', action='append', default=[], help='directory searched (by file name) for remote schemas')
    a = ap.parse_args()
    maps = [m.split('=', 1) for m in (a.map if a.map is not None else DEFAULTS['map'])]
    c = Compiler(maps, a.dir); c.load(a.xsd); model = c.finish()
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, 'w', encoding='utf-8') as fh: json.dump(model, fh, separators=(',', ':'), ensure_ascii=False)
    ntypes = len(model['t'])
    print('wrote %s: %d bytes, %d types (%d named), %d global elements, %d namespaces, %d warnings' % (
        a.out, os.path.getsize(a.out), ntypes, len(model['tn']), len(model['el']), len(model['ns']), len(WARN)))


if __name__ == '__main__':
    main()
