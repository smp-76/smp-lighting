"""Static regression checks; Python standard library only."""
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
PAGES = ['index', 'catalog', 'series', 'selection', 'elektrosnabzhenie', 'privacy']

class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.tags=[]; self.ids=[]; self.refs=[]; self.meta={}; self.canonical=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs); self.tags.append(tag)
        if a.get('id'): self.ids.append(a['id'])
        if tag=='meta' and a.get('name'): self.meta[a['name']]=a.get('content','')
        if tag=='link' and a.get('rel')=='canonical': self.canonical.append(a.get('href'))
        for key in ('src','href'):
            if a.get(key): self.refs.append(a[key])
        assert tag!='form', 'Lead-capture forms must not be added'
        if tag in ('script','link'):
            ref=a.get('src') or (a.get('href') if a.get('rel')=='stylesheet' else '')
            assert not ref or not urlsplit(ref).netloc, 'External script/font/style dependency: '+str(ref)

catalog=json.loads((ROOT/'catalog-data.json').read_text()); series=catalog['series']; models=[m for s in series for m in s['models']]
assert len(series)==catalog['series_total']==174
assert len(models)==catalog['models_total']==18226
assert {s['brand'] for s in series}=={'FEREKS','LEDEL','LUXCORE','ARUNA','PLG'}
assert not any(str(m.get('sku','')).startswith('ALF-') for m in models)
assert all(m.get('efficacy') is not None for m in models)
assert all(isinstance(m.get('power'),int) for m in models)
spot=[m for s in series if s['brand']=='ARUNA' for m in s['models'] if 'SPOT S1R/2.5/' in str(m.get('sku'))]
assert len(spot)==81 and all(m['flux']==210 for m in spot)
assert len({s['id'] for s in series})==174
for s in series:
    if s.get('image'): assert (ROOT/s['image']).is_file(), s['image']
print('PASS data: 174 series / 18,226 models; all business control conditions')

snapshots=json.loads((ROOT/'tests'/'protected-hashes.json').read_text())
for filename, expected in snapshots.items():
    assert hashlib.sha256((ROOT/filename).read_bytes()).hexdigest()==expected, filename+' changed'
print('PASS full JSON contents, CNAME, robots and search verification files unchanged')

for name in PAGES:
    page=Page(); page.feed((ROOT/(name+'.html')).read_text())
    assert page.tags.count('h1')==1, name+' H1'
    assert page.tags.count('title')==1, name+' title'
    assert page.meta.get('description'), name+' description'
    assert page.canonical==['https://smp-76.ru/'+('' if name=='index' else name+'.html')], name+' canonical'
    assert len(page.ids)==len(set(page.ids)), name+' duplicate IDs'
    assert 'main-content' in page.ids
    for ref in page.refs:
        u=urlsplit(ref)
        if u.scheme or u.netloc: continue
        if not u.path:
            if u.fragment: assert unquote(u.fragment) in page.ids, (name,ref)
            continue
        target=ROOT/unquote(u.path).lstrip('/')
        if u.path=='/': target=ROOT/'index.html'
        assert target.is_file(), (name,ref)
        if u.fragment and target.suffix=='.html':
            p=Page(); p.feed(target.read_text()); assert unquote(u.fragment) in p.ids, (name,ref)
    print('PASS SEO, semantic structure and local links:',name+'.html')
for css in (ROOT/'css').glob('*.css'):
    for ref in re.findall(r'url\([\'\"]?([^\)\'\"]+)',css.read_text()):
        if not urlsplit(ref).scheme: assert (css.parent/ref).is_file(), (css.name,ref)
urls=[x.text for x in ElementTree.parse(ROOT/'sitemap.xml').iter() if x.tag.endswith('}loc')]
assert set(urls)=={'https://smp-76.ru/'+('' if n=='index' else n+'.html') for n in PAGES}
print('PASS CSS resources and sitemap coverage')
