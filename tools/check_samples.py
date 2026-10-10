"""Check generated invoices against every official artefact available: CII D16B XSD, Factur-X 1.09 EN16931 XSD + Schematron,
CEN EN 16931 Schematron, XRechnung Schematron (for XRechnung-profile files), and the in-browser JS engine."""
import sys, glob, os, json, subprocess
sys.path.insert(0, os.path.dirname(__file__)); import gt
from lxml import etree
FX='/usr/local/lib/python3.13/dist-packages/facturx/xsd_and_schematron/facturx-en16931'
D16B="/home/claude/gh/eInvoicing-EN16931/cii/schema/D16B SCRDM (Subset)/uncoupled clm/CII/uncefact/data/standard/CrossIndustryInvoice_100pD16B.xsd"
xsd_d16b=etree.XMLSchema(etree.parse(D16B)); xsd_fx=etree.XMLSchema(etree.parse(f'{FX}/Factur-X_EN16931.xsd'))
fx_xsl=gt.xp.compile_stylesheet(stylesheet_file=f'{FX}/FACTUR-X_EN16931.xslt')
files=[]
for a in sys.argv[1:]: files+=sorted(glob.glob(a))
js=json.loads(subprocess.run(['node','/home/claude/eos/tools/jsrun.mjs','EN16931,XRechnung,FRCTC',*files],capture_output=True,text=True).stdout)
bad=0
for f in files:
    doc=etree.parse(f); spec=doc.xpath('string(//*[local-name()="GuidelineSpecifiedDocumentContextParameter"]/*[local-name()="ID"])')
    xr='xrechnung' in spec
    r=[]
    if not xsd_d16b.validate(doc): r.append('D16B XSD: '+str(xsd_d16b.error_log.last_error))
    if not xr:
        if not xsd_fx.validate(doc): r.append('Factur-X XSD: '+str(xsd_fx.error_log.last_error))
        out=fx_xsl.transform_to_string(source_file=f); sv=etree.fromstring(out.encode())
        fa=sv.xpath('//s:failed-assert',namespaces=gt.SVRL)
        for x in fa: r.append('Factur-X rule: '+' '.join(''.join(x.itertext()).split())[:230])
    en=gt.run(f,'EN16931'); xrr=gt.run(f,'XRechnung') if xr else []
    fr=doc.xpath('string(//*[local-name()="SellerTradeParty"]/*[local-name()="PostalTradeAddress"]/*[local-name()="CountryID"])')=='FR'
    if fr:
        gfr=gt.run(f,'FRCTC')
        for i,fl,loc in gfr: r.append(f'BR-FR {i} [{fl or "fatal"}]')
        if sorted((a,b) for a,b,_ in js[f]['FRCTC'])!=sorted((a,b) for a,b,_ in gfr): r.append('JS/Saxon mismatch BR-FR '+str(js[f]['FRCTC'])[:300])
    for i,fl,loc in en: r.append(f'EN16931 {i} [{fl}]')
    for i,fl,loc in xrr:
        if fl!='information': r.append(f'XRechnung {i} [{fl}]')
    j=js[f]; jen=sorted((a,b) for a,b,_ in j['EN16931']); jxr=sorted((a,b) for a,b,_ in j['XRechnung']) if xr else []
    if jen!=sorted((a,b) for a,b,_ in en): r.append('JS/Saxon mismatch EN16931 '+str(jen))
    if xr and jxr!=sorted((a,b) for a,b,_ in gt.run(f,'XRechnung')): r.append('JS/Saxon mismatch XRechnung '+str(jxr))
    print(('OK   ' if not r else 'FAIL ')+os.path.basename(f)+('  [XRechnung]' if xr else '  [EN 16931 + BR-FR]' if fr else '  [EN 16931]'))
    for x in r: print('     ',x); bad+=1
print('problems:',bad)
