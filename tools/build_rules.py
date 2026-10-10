"""Assemble the official rule sets the same way the KoSIT build does, and compile
ground-truth XSLT with the ISO Schematron skeleton (run on Saxon-HE)."""
import os, shutil, sys
from saxonche import PySaxonProcessor
GH='/home/claude/gh'; OUT='/home/claude/eos/build'
XR=f'{GH}/xrechnung-schematron'; ISO=f'{GH}/Schematron_schematron/trunk/schematron/code'
proc=PySaxonProcessor(license=False); xp=proc.new_xslt30_processor()

def transform(src, xsl, dst, params=None):
    ex=xp.compile_stylesheet(stylesheet_file=xsl)
    for k,v in (params or {}).items(): ex.set_parameter(k, proc.make_string_value(v))
    ex.transform_to_file(source_file=src, output_file=dst)

# 1. merge Peppol rules into the XRechnung schematron (peppol-into-xr.xsl)
os.makedirs(f'{XR}/build/schematron/tmp', exist_ok=True)
shutil.copy(f'{XR}/src/validation/schematron/common.sch', f'{XR}/build/schematron/common.sch')
for syn in ('ubl','cii'):
    src=f'{XR}/src/validation/schematron/{syn}/XRechnung-{syn.upper()}-validation.sch'
    tmp=f'{XR}/build/schematron/tmp/XRechnung-{syn.upper()}-validation.sch'
    txt=open(src,encoding='utf-8').read().replace('@xr-schematron.version.full@','2.6.0').replace('@xrechnung.version@','3.0.2')
    open(tmp,'w',encoding='utf-8').write(txt)
    os.makedirs(f'{XR}/build/schematron/{syn}', exist_ok=True)
    merged=f'{XR}/build/schematron/{syn}/XRechnung-{syn.upper()}-validation.sch'
    transform(tmp, f'{XR}/src/xsl/peppol-into-xr.xsl', merged, {'syntax':syn.upper()})
    print('merged', merged, os.path.getsize(merged))

# 2. compile to XSLT with the ISO skeleton (include -> abstract expand -> svrl)
def compile_sch(sch, out):
    a=out+'.1'; b=out+'.2'
    transform(sch, f'{ISO}/iso_dsdl_include.xsl', a)
    transform(a, f'{ISO}/iso_abstract_expand.xsl', b)
    transform(b, f'{ISO}/iso_svrl_for_xslt2.xsl', out, {'allow-foreign':'true'})
    os.remove(a); os.remove(b)
    print('compiled', out, os.path.getsize(out))
os.makedirs(f'{OUT}/gt', exist_ok=True)
for syn in ('ubl','cii'):
    merged=f'{XR}/build/schematron/{syn}/XRechnung-{syn.upper()}-validation.sch'
    compile_sch(merged, f'{OUT}/gt/XRechnung-{syn.upper()}-validation.xsl')
    shutil.copy(f'{GH}/eInvoicing-EN16931/{syn}/xslt/EN16931-{syn.upper()}-validation.xslt', f'{OUT}/gt/EN16931-{syn.upper()}-validation.xsl')

# 3. French BR-FR (Flux 2) and Peppol PINT A-NZ rule sets: compile for ground truth
INTL=f'{GH}/intl'
for name,src in (('FRCTC-CII',f'{INTL}/fr/20260903_BR-FR-Flux2-Schematron-CII_V1.4.0.04.sch'),('FRCTC-UBL',f'{INTL}/fr/20260903_BR-FR-Flux2-Schematron-UBL_V1.4.0.04.sch'),
                 ('PINTAUNZ1-UBL',f'{INTL}/aunz/PINT-UBL-validation-preprocessed.sch'),('PINTAUNZ2-UBL',f'{INTL}/aunz/PINT-jurisdiction-aligned-rules.sch')):
    compile_sch(src, f'{OUT}/gt/{name}-validation.xsl')
