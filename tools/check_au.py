"""Check generated Australian invoices: UBL 2.1 XSD, the official PINT A-NZ Schematron (shared + aligned rules, on Saxon), and the in-browser engine."""
import sys, glob, os, json, subprocess
sys.path.insert(0, os.path.dirname(__file__)); import gt
from lxml import etree
UBL='/usr/local/lib/python3.13/dist-packages/facturx/xsd_and_schematron/ubl-2.1/maindoc/'
xsd={'Invoice':etree.XMLSchema(etree.parse(UBL+'UBL-Invoice-2.1.xsd')),'CreditNote':etree.XMLSchema(etree.parse(UBL+'UBL-CreditNote-2.1.xsd'))}
files=[]
for a in sys.argv[1:]: files+=sorted(glob.glob(a))
js=json.loads(subprocess.run(['node','/home/claude/eos/tools/jsrun.mjs','PINTAUNZ1,PINTAUNZ2',*files],capture_output=True,text=True).stdout)
bad=0
for f in files:
    doc=etree.parse(f); r=[]; x=xsd[etree.QName(doc.getroot()).localname]
    if not x.validate(doc): r.append('UBL XSD: '+str(x.error_log.last_error))
    for k in ('PINTAUNZ1','PINTAUNZ2'):
        g=gt.run(f,k)
        for i,fl,loc in g: r.append(f'{k} {i} [{fl or "fatal"}] {loc}')
        if sorted((a,b) for a,b,_ in js[f][k])!=sorted((a,b) for a,b,_ in g): r.append('JS/Saxon mismatch '+k+' '+str(js[f][k])[:300])
    print(('OK   ' if not r else 'FAIL ')+os.path.basename(f))
    for m in r: print('     ',m); bad+=1
print('problems:',bad)
