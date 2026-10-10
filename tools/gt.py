"""Ground truth: run instances through the official EN 16931 XSLT and the compiled XRechnung XSLT on Saxon-HE."""
import sys, json, re, os
from saxonche import PySaxonProcessor
from lxml import etree
B='/home/claude/eos/build/gt'
proc=PySaxonProcessor(license=False); xp=proc.new_xslt30_processor()
_cache={}
def exe(name):
    if name not in _cache: _cache[name]=xp.compile_stylesheet(stylesheet_file=f'{B}/{name}')
    return _cache[name]
SVRL={'s':'http://purl.oclc.org/dsdl/svrl'}
def syntax_of(path):
    root=etree.parse(path).getroot(); q=etree.QName(root)
    if q.localname=='CrossIndustryInvoice': return 'CII'
    if q.localname in('Invoice','CreditNote'): return 'UBL'
    return None
def run(path, which):
    syn=syntax_of(path)
    if not syn: return None
    if which.startswith('PINTAUNZ') and syn!='UBL': return None
    out=exe(f'{which}-{syn}-validation.xsl').transform_to_string(source_file=path)
    doc=etree.fromstring(out.encode('utf-8'))
    res=[]
    for el in doc.xpath('//s:failed-assert|//s:successful-report',namespaces=SVRL):
        res.append([el.get('id'), el.get('flag') or '', el.get('location')])
    return res
if __name__=='__main__':
    files=sys.argv[1:]
    out={}
    for f in files:
        try: out[f]={'EN16931':run(f,'EN16931'),'XRechnung':run(f,'XRechnung')}
        except Exception as e: out[f]={'error':str(e)}
    json.dump(out, sys.stdout, indent=1)
