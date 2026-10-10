"""Convert the official XML Schemas (CII D16B, UBL 2.1 Invoice/CreditNote) into a compact content-model table
for the in-browser structure check: element names, order, occurrence, attributes and basic value types."""
import os, json, sys
from lxml import etree
XS='http://www.w3.org/2001/XMLSchema'
def q(tag): return '{%s}%s'%(XS,tag)
class Schemas:
    def __init__(self):
        self.docs={}      # path -> root
        self.elements={}  # (ns,name) -> element node
        self.types={}     # (ns,name) -> type node
        self.attrs={}     # (ns,name) -> attribute node
        self.tns={}       # node root -> target ns
    def load(self,path):
        path=os.path.abspath(path)
        if path in self.docs: return
        root=etree.parse(path).getroot(); self.docs[path]=root
        tns=root.get('targetNamespace') or ''
        for ch in root:
            if not isinstance(ch.tag,str): continue
            ln=etree.QName(ch).localname
            if ln in('import','include'):
                loc=ch.get('schemaLocation')
                if loc: self.load(os.path.join(os.path.dirname(path),loc))
            elif ln=='element': self.elements[(tns,ch.get('name'))]=ch
            elif ln in('complexType','simpleType'): self.types[(tns,ch.get('name'))]=ch
            elif ln=='attribute': self.attrs[(tns,ch.get('name'))]=ch
    def tns_of(self,node): return node.getroottree().getroot().get('targetNamespace') or ''
    def qname(self,node,val):
        if val is None: return None
        if ':' in val:
            p,l=val.split(':',1); return (node.nsmap.get(p),l)
        return (node.nsmap.get(None) or self.tns_of(node), val)

S=Schemas()
CII="/home/claude/gh/eInvoicing-EN16931/cii/schema/D16B SCRDM (Subset)/uncoupled clm/CII/uncefact/data/standard/CrossIndustryInvoice_100pD16B.xsd"
UBL='/usr/local/lib/python3.13/dist-packages/facturx/xsd_and_schematron/ubl-2.1/maindoc/'
for p in (CII, UBL+'UBL-Invoice-2.1.xsd', UBL+'UBL-CreditNote-2.1.xsd'): S.load(p)

NS=[]; 
def nsidx(ns):
    if ns not in NS: NS.append(ns)
    return NS.index(ns)
TYPES=[]; TYPEID={}
DEC={'decimal','integer','int','long','short','nonNegativeInteger','positiveInteger','negativeInteger','nonPositiveInteger','unsignedInt','unsignedLong','byte'}
def builtin_kind(name):
    if name in DEC: return 'd'
    if name=='boolean': return 'b'
    if name=='date': return 'D'
    if name=='dateTime': return 'T'
    return 's'

def simple_kind(tq, node=None, depth=0):
    """Resolve a simple type (by qname or inline node) to a builtin kind."""
    if node is None:
        if tq[0]==XS: return builtin_kind(tq[1])
        node=S.types.get(tq)
        if node is None: return 's'
    ln=etree.QName(node).localname
    if ln=='simpleType':
        r=node.find(q('restriction'))
        if r is not None:
            if r.get('base'): return simple_kind(S.qname(r,r.get('base')),None,depth+1)
            inner=r.find(q('simpleType'))
            return simple_kind(None,inner,depth+1) if inner is not None else 's'
        return 's'   # list / union
    if ln=='complexType':
        sc=node.find(q('simpleContent'))
        if sc is not None:
            e=sc.find(q('extension')); e=e if e is not None else sc.find(q('restriction'))
            if e is not None and e.get('base'): return simple_kind(S.qname(e,e.get('base')),None,depth+1)
    return 's'

def collect_attrs(node, out, lax):
    for a in node.findall(q('attribute')):
        name=a.get('name')
        if name is None and a.get('ref'):
            rq=S.qname(a,a.get('ref')); name=rq[1]
            if rq[0] and rq[0]!=XS and rq[0]!='http://www.w3.org/XML/1998/namespace': name=rq[1]
        if a.get('use')=='prohibited': continue
        out[name]=1 if a.get('use')=='required' else 0
    if node.find(q('anyAttribute')) is not None: lax[0]=True

def build_type(tq, node=None):
    """Returns type id."""
    key=tq if node is None else ('anon',id(node))
    if key in TYPEID: return TYPEID[key]
    tid=len(TYPES); TYPEID[key]=tid; TYPES.append(None)
    if node is None:
        if tq[0]==XS: TYPES[tid]={'m':'leaf','b':builtin_kind(tq[1]),'a':{}}; return tid
        node=S.types.get(tq)
        if node is None: TYPES[tid]={'m':'any'}; print('WARN unknown type',tq,file=sys.stderr); return tid
    ln=etree.QName(node).localname
    if ln=='simpleType': TYPES[tid]={'m':'leaf','b':simple_kind(None,node),'a':{}}; return tid
    attrs={}; lax=[False]
    sc=node.find(q('simpleContent'))
    if sc is not None:
        # walk the extension/restriction chain collecting attributes
        cur=node
        while cur is not None and etree.QName(cur).localname=='complexType':
            s2=cur.find(q('simpleContent'))
            if s2 is None: break
            e=s2.find(q('extension')); e=e if e is not None else s2.find(q('restriction'))
            if e is None: break
            a2={}; collect_attrs(e,a2,lax)
            for k,v in a2.items(): attrs.setdefault(k,v)
            bq=S.qname(e,e.get('base')) if e.get('base') else None
            cur=S.types.get(bq) if bq and bq[0]!=XS else None
        t={'m':'leaf','b':simple_kind(None,node),'a':attrs}
        if lax[0]: t['la']=1
        TYPES[tid]=t; return tid
    particles=[]; mode='seq'; ok=True
    def add_group(g, into):
        nonlocal ok
        for ch in g:
            if not isinstance(ch.tag,str): continue
            l=etree.QName(ch).localname
            if l=='element':
                mn=int(ch.get('minOccurs','1')); mx=ch.get('maxOccurs','1'); mx=-1 if mx=='unbounded' else int(mx)
                if ch.get('ref'):
                    eq=S.qname(ch,ch.get('ref')); decl=S.elements.get(eq)
                    if decl is None: ok=False; continue
                    tnode=None; tqn=S.qname(decl,decl.get('type')) if decl.get('type') else None
                    inline=decl.find(q('complexType')); inline=inline if inline is not None else decl.find(q('simpleType'))
                    t_id=build_type(tqn) if tqn else (build_type(None,inline) if inline is not None else build_type((XS,'string')))
                    into.append([nsidx(eq[0]),eq[1],t_id,mn,mx])
                else:
                    form_ns=S.tns_of(ch)
                    tqn=S.qname(ch,ch.get('type')) if ch.get('type') else None
                    inline=ch.find(q('complexType')); inline=inline if inline is not None else ch.find(q('simpleType'))
                    t_id=build_type(tqn) if tqn else (build_type(None,inline) if inline is not None else build_type((XS,'string')))
                    into.append([nsidx(form_ns),ch.get('name'),t_id,mn,mx])
            elif l=='annotation': continue
            elif l=='sequence' and ch.get('minOccurs','1')=='1' and ch.get('maxOccurs','1')=='1': add_group(ch,into)
            else: ok=False
    content=node
    cc=node.find(q('complexContent'))
    if cc is not None:
        e=cc.find(q('extension'))
        if e is None: ok=False
        else:
            base=S.types.get(S.qname(e,e.get('base')))
            if base is not None:
                bseq=base.find(q('sequence'))
                if bseq is not None: add_group(bseq,particles)
                collect_attrs(base,attrs,lax)
            content=e
    seq=content.find(q('sequence')); cho=content.find(q('choice')); al=content.find(q('all'))
    if seq is not None:
        if seq.find(q('any')) is not None: ok=False
        else: add_group(seq,particles)
    elif cho is not None:
        mode='choice'
        if cho.get('minOccurs','1')!='1' or cho.get('maxOccurs','1')!='1': ok=False
        add_group(cho,particles)
    elif al is not None: ok=False
    collect_attrs(content,attrs,lax)
    if not ok: TYPES[tid]={'m':'any'}; return tid
    t={'m':mode,'p':particles,'a':attrs}
    if node.get('mixed')=='true': t['mixed']=1
    if lax[0]: t['la']=1
    TYPES[tid]=t; return tid

roots={}
for (ns,name) in [('urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100','CrossIndustryInvoice'),('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2','Invoice'),('urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2','CreditNote')]:
    decl=S.elements[(ns,name)]
    roots[f'{nsidx(ns)}|{name}']=build_type(S.qname(decl,decl.get('type')))
out={'ns':NS,'roots':roots,'types':TYPES}
json.dump(out,open('build/rules/structure.json','w'),separators=(',',':'))
print('types',len(TYPES),'any',sum(1 for t in TYPES if t['m']=='any'),'bytes',os.path.getsize('build/rules/structure.json'),'namespaces',len(NS))
print([ (i,t) for i,t in enumerate(TYPES) if t['m']=='any'][:10])
