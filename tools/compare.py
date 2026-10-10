"""Compare the browser rule engine (fontoxpath runner, Node) against Saxon ground truth.
usage: compare.py KEY1,KEY2 glob..."""
import sys, json, subprocess, glob, os, collections
sys.path.insert(0, os.path.dirname(__file__))
import gt
keys=sys.argv[1].split(',')
files=[]
for pat in sys.argv[2:]: files += sorted(glob.glob(pat, recursive=True))
files=[f for f in files if f.endswith('.xml')]
print(len(files),'files; rule sets',keys)
js={}
for i in range(0,len(files),60):
    out=subprocess.run(['node','/home/claude/eos/tools/jsrun.mjs',sys.argv[1],*files[i:i+60]],capture_output=True,text=True)
    if out.returncode!=0: print(out.stderr[:3000]); sys.exit(1)
    js.update(json.loads(out.stdout))
agree=0; n=0; diffs=[]; skipped=0; errs=collections.Counter(); rule_miss=collections.Counter(); rule_extra=collections.Counter(); fired=collections.Counter()
for f in files:
    j=js[f]
    if 'error' in j: skipped+=1; continue
    ok=True; any_set=False
    for k in keys:
        if j.get(k) is None: continue
        try: g=gt.run(f,k)
        except Exception as e:
            skipped+=1; ok=None; break
        if g is None: continue
        any_set=True
        a=collections.Counter((x[0],x[1]) for x in j[k]); b=collections.Counter((x[0],x[1]) for x in g)
        for r in b: fired[r[0]]+=1
        for e in j.get(k+'_errors',[]): errs[(e.get('id') or e.get('context'), e['message'][:110])]+=1
        if a!=b:
            ok=False; miss=b-a; extra=a-b
            for r in miss: rule_miss[r]+=miss[r]
            for r in extra: rule_extra[r]+=extra[r]
            diffs.append((os.path.basename(f),k,'missing in JS:',dict(miss),'extra in JS:',dict(extra)))
    if ok is None or not any_set: continue
    n+=1; agree+=ok
print('agree',agree,'of',n,'(skipped',skipped,') | distinct rules that fired in ground truth:',len(fired))
if errs: print('engine errors:'); [print('  ',k,v) for k,v in errs.most_common(25)]
if rule_miss: print('rules missing in JS:',rule_miss.most_common(30))
if rule_extra: print('rules extra in JS:',rule_extra.most_common(30))
for d in diffs[:12]: print(d)
