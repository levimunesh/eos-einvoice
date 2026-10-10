"""Compare the JS structure check with real XSD validation (lxml/libxml2), on official files and on mutated copies."""
import sys, glob, os, json, subprocess, random, copy, collections
from lxml import etree
FXU='/usr/local/lib/python3.13/dist-packages/facturx/xsd_and_schematron/ubl-2.1/maindoc/'
XSD={'CrossIndustryInvoice':etree.XMLSchema(etree.parse("/home/claude/gh/eInvoicing-EN16931/cii/schema/D16B SCRDM (Subset)/uncoupled clm/CII/uncefact/data/standard/CrossIndustryInvoice_100pD16B.xsd")),
     'Invoice':etree.XMLSchema(etree.parse(FXU+'UBL-Invoice-2.1.xsd')),'CreditNote':etree.XMLSchema(etree.parse(FXU+'UBL-CreditNote-2.1.xsd'))}
def xsd_errors(doc):
    ln=etree.QName(doc.getroot()).localname
    x=XSD.get(ln)
    if x is None: return None
    x.validate(doc); return [(e.type_name, e.message) for e in x.error_log]
def js(files):
    res={}
    for i in range(0,len(files),150):
        o=subprocess.run(['node','/home/claude/eos/tools/structrun.mjs',*files[i:i+150]],capture_output=True,text=True)
        if o.returncode: print(o.stderr[:1500]); sys.exit(1)
        res.update(json.loads(o.stdout))
    return res
files=[]
for a in sys.argv[1:]: files+=sorted(glob.glob(a,recursive=True))
files=[f for f in files if f.endswith('.xml')]
# --- 1. originals
J=js(files); agree=0; fp=[]; fn=collections.Counter(); fnex=[]; valid=[]
for f in files:
    try: doc=etree.parse(f)
    except Exception: continue
    xe=xsd_errors(doc)
    if xe is None: continue
    jv=len(J[f])==0; xv=len(xe)==0
    if xv: valid.append(f)
    if jv==xv: agree+=1
    elif not jv and xv: fp.append((f,J[f][:2]))
    else:
        fn[xe[0][0]]+=1
        if len(fnex)<6: fnex.append((os.path.basename(f),xe[0]))
print('originals:',len(files),'agree',agree,'| JS false alarms',len(fp),'| JS misses (by XSD error type)',dict(fn))
for x in fp[:10]: print('  FALSE ALARM',x)
for x in fnex: print('  miss e.g.',x)
# --- 2. mutations of valid files
random.seed(7); os.makedirs('/home/claude/eos/build/mut',exist_ok=True)
muts=[]
def elements(root): return [e for e in root.iter() if isinstance(e.tag,str)]
for f in random.sample(valid,min(len(valid),70)):
    base=etree.parse(f)
    for n in range(12):
        doc=copy.deepcopy(base); root=doc.getroot(); els=elements(root); kind=random.choice(['swap','rename','delete','dup','attr','text','leafchild','baddec'])
        try:
            if kind=='swap':
                e=random.choice([x for x in els if len(x)>=2]); i=random.randrange(len(e)-1); a,b=e[i],e[i+1]
                if a.tag==b.tag: continue
                e.remove(b); e.insert(i,b)
            elif kind=='rename':
                e=random.choice(els[1:]); e.tag=etree.QName(etree.QName(e).namespace,'Bogus'+etree.QName(e).localname).text
            elif kind=='delete':
                e=random.choice(els[1:]); e.getparent().remove(e)
            elif kind=='dup':
                e=random.choice(els[1:]); p=e.getparent(); p.insert(p.index(e)+1,copy.deepcopy(e))
            elif kind=='attr':
                e=random.choice(els[1:]); e.set('bogusAttr','1')
            elif kind=='text':
                e=random.choice([x for x in els if len(x)>=1]); e.text='stray text'
            elif kind=='leafchild':
                e=random.choice([x for x in els if len(x)==0]); etree.SubElement(e,e.tag).text='x'
            elif kind=='baddec':
                c=[x for x in els if len(x)==0 and (x.text or '').replace('.','',1).replace('-','',1).isdigit() and 'Amount' in x.tag]
                if not c: continue
                random.choice(c).text='12,50'
        except (IndexError,ValueError): continue
        p=f'/home/claude/eos/build/mut/{len(muts):05d}.xml'; doc.write(p,xml_declaration=True,encoding='UTF-8'); muts.append((p,kind))
J=js([p for p,_ in muts]); stat=collections.Counter(); ex=[]
for p,kind in muts:
    xe=xsd_errors(etree.parse(p)); jv=len(J[p])==0; xv=len(xe)==0
    key=('same' if jv==xv else ('JS false alarm' if xv else 'JS miss'))
    stat[(kind,key)]+=1
    if jv!=xv and len(ex)<14: ex.append((kind,key,xe[:1],J[p][:1]))
tot=collections.Counter()
for (k,key),v in stat.items(): tot[key]+=v
print('mutations:',len(muts),dict(tot)); 
for k in sorted(set(k for k,_ in stat)): print('  ',k,{key:v for (kk,key),v in stat.items() if kk==k})
for e in ex: print('  ',e)
