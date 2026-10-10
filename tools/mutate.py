"""Create semantically broken copies of valid invoices, to compare rule engines on failing cases.
usage: mutate.py OUTDIR PER_FILE glob..."""
import sys, glob, os, copy, random, re
from lxml import etree
out=sys.argv[1]; per=int(sys.argv[2]); files=[]
for a in sys.argv[3:]: files+=sorted(glob.glob(a))
os.makedirs(out,exist_ok=True); random.seed(11); n=0
num=re.compile(r'^-?\d+(\.\d+)?$')
for f in files:
    try: base=etree.parse(f)
    except Exception: continue
    for k in range(per):
        doc=copy.deepcopy(base); els=[e for e in doc.getroot().iter() if isinstance(e.tag,str)][1:]
        leaves=[e for e in els if len(e)==0 and (e.text or '').strip()]
        kind=random.choice(['delete','delete','number','number','text','dup','attr','empty','zero','swapval'])
        try:
            if kind=='delete': e=random.choice(els); e.getparent().remove(e)
            elif kind=='number':
                c=[e for e in leaves if num.match(e.text.strip())]; e=random.choice(c); v=e.text.strip()
                e.text=random.choice([str(round(float(v)+random.choice([1,0.01,-0.01,100]),2)), v+'5' if '.' in v else v+'.123', '-'+v.lstrip('-')])
            elif kind=='text': e=random.choice(leaves); e.text=random.choice(['XX','ZZZ','0','abc 123',e.text.strip()[::-1], e.text.strip()+'9'])
            elif kind=='dup': e=random.choice(els); p=e.getparent(); p.insert(p.index(e)+1,copy.deepcopy(e))
            elif kind=='attr':
                c=[e for e in els if e.attrib]; e=random.choice(c); a=random.choice(list(e.attrib)); 
                if random.random()<0.5: del e.attrib[a]
                else: e.set(a,random.choice(['XXX','0000','EUR','ZZ']))
            elif kind=='empty': e=random.choice(leaves); e.text=''
            elif kind=='zero':
                c=[e for e in leaves if num.match(e.text.strip())]; random.choice(c).text='0'
            elif kind=='swapval':
                a,b=random.sample(leaves,2); a.text,b.text=b.text,a.text
        except (IndexError,ValueError): continue
        doc.write(f'{out}/{n:05d}_{kind}.xml',xml_declaration=True,encoding='UTF-8'); n+=1
print('mutations written:',n)
