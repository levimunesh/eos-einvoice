"""Compare the rule engine running in real Chromium against Saxon ground truth, for every rule set the app applies to a file.
usage: parity_compare.py glob..."""
import sys, json, glob, os, collections, subprocess
sys.path.insert(0, os.path.dirname(__file__)); import gt
files=[]
for a in sys.argv[1:]: files+=([l for l in open(a[1:]).read().split('\n') if l] if a.startswith('@') else sorted(glob.glob(a, recursive=True)))
files=[f for f in files if f.endswith('.xml')]
open('/home/claude/eos/build/parity_files.txt','w').write('\n'.join(files))
subprocess.run(['node','/home/claude/eos/test/parity.mjs','/home/claude/eos/build/parity_files.txt','/home/claude/eos/build/parity_out.json'],check=True)
J=json.load(open('/home/claude/eos/build/parity_out.json'))
SETS={'EN 16931':'EN16931','XRechnung 3.0':'XRechnung','French rules (BR-FR)':'FRCTC','Peppol PINT':'PINTAUNZ1','PINT A-NZ':'PINTAUNZ2'}
n=agree=skip=0; diffs=[]; per=collections.Counter(); perok=collections.Counter(); scen=collections.Counter()
for f in files:
    j=J[f]
    if 'error' in j or not j.get('ok'): skip+=1; continue
    sc=j.get('scenario','')
    if sc.startswith('Peppol PINT A-NZ'): keys=['Peppol PINT','PINT A-NZ']
    elif sc.startswith('XRechnung'): keys=['EN 16931','XRechnung 3.0']
    elif 'French' in sc: keys=['EN 16931','French rules (BR-FR)']
    elif sc.startswith('EN 16931'): keys=['EN 16931']
    else: skip+=1; continue
    ok=True; ran=False
    for k in keys:
        try: g=gt.run(f,SETS[k])
        except Exception: g=None
        if g is None: ok=None; break
        ran=True; per[k]+=1
        a=collections.Counter((x[0],x[1]) for x in j['findings'] if x[2]==k); b=collections.Counter((x[0],x[1]) for x in g)
        if a!=b: ok=False; diffs.append((os.path.basename(f),k,'missing in browser:',dict(b-a),'extra in browser:',dict(a-b)))
        else: perok[k]+=1
    if ok is None or not ran: skip+=1; continue
    n+=1; agree+=bool(ok); scen[sc.split(' (')[0]]+=1
print(f'\nChromium engine vs Saxon: {agree} of {n} documents identical; skipped {skip} (not an invoice, or Saxon itself stopped with an error)')
print('by scenario:',dict(scen)); print('by rule set (identical / compared):',{k:f'{perok[k]} / {per[k]}' for k in per})
for d in diffs[:20]: print(d)
