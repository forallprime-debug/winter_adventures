from pathlib import Path
import re,math,shutil,xml.etree.ElementTree as ET
base=Path('assets/game-hud')
s=(base/'progress-full-figma.svg').read_text()
stops=[(0,(34,144,249)),(69.5338,(51,217,155)),(197.101,(221,186,32)),(341.256,(245,110,37)),(355.913,(33,140,255)),(360,(34,144,249))]
def color(a):
 for (a0,c0),(a1,c1) in zip(stops,stops[1:]):
  if a<=a1:return '#'+''.join(f'{round(x+(y-x)*(a-a0)/(a1-a0)):02x}' for x,y in zip(c0,c1))
def point(a):
 a=math.radians(90+a);return f'{105+94*math.cos(a):.5f} {105+94*math.sin(a):.5f}'
segments=[]
for i in range(720):
 a=i/2;b=min(360,a+.54)
 segments.append(f'<path d="M {point(a)} A 94 94 0 0 1 {point(b)}" stroke="{color((a+b)/2)}" stroke-width="22"/>')
s=re.sub(r'<g clip-path="url\(#paint0_angular_0_16_clip_path\)".*?</foreignObject></g></g>', '<g mask="url(#stroke0_0_16)">'+''.join(segments)+'</g>',s,flags=re.S)
# SVG-only replacement preserves the Figma clipping path and inner lighting filter.
assert '<foreignObject' not in s and '<image' not in s
ET.fromstring(s)
(base/'progress-full.svg').write_text(s)
shutil.copyfile(base/'ring-figma.svg',base/'progress-track.svg')
shutil.copyfile(base/'checkpoint-figma.svg',base/'checkpoint.svg')
shutil.copyfile(base/'star-figma.png',base/'star.png')
for name in ['progress-full.svg','progress-track.svg','checkpoint.svg','star.png']:
 shutil.copyfile(base/name,Path('assets/hud-lab')/name)
for name in ['game-hud.js','hud-lab.js']:
 p=Path(name);v=p.read_text().replace('r="94.5"','r="94"').replace('stroke-width="21"','stroke-width="22"');p.write_text(v)
for name in ['index.html','hud-lab.html']:
 p=Path(name);v=p.read_text();v=re.sub(r'(assets/(?:game-hud|hud-lab)/(?:progress-full.svg|progress-track.svg|star.png))(?:\?[^\"]*)?',r'\1?v=figma-vector-1',v);v=re.sub(r'((?:game-hud|hud-lab)\.(?:js|css))(?:\?[^\"]*)?',r'\1?v=figma-vector-1',v);p.write_text(v)
print('Updated local game and HUD lab; ring is SVG-only, Figma star retained as PNG.')
