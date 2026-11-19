"""Build a three-lane onset chart from decoded 44.1 kHz stereo int16 PCM."""
import array, hashlib, json, math, sys
from pathlib import Path
samples=array.array('h');samples.frombytes(Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/game2-pcm.raw').read_bytes())
rate=44100;hop=441;frames=min(9000,len(samples)//(hop*2))
bands=[[],[],[]];energy=[];low=mid=0.
a=1-math.exp(-2*math.pi*180/rate);b=1-math.exp(-2*math.pi*1800/rate)
for f in range(frames):
 sums=[0.,0.,0.];full=0.
 for i in range(f*hop*2,(f+1)*hop*2,8):
  x=(samples[i]+samples[i+1])/65536
  # Decimated analysis, with filter coefficients adjusted to its sample rate.
  low+=(1-(1-a)**4)*(x-low);mid+=(1-(1-b)**4)*(x-mid)
  for j,v in enumerate((low,mid-low,x-mid)):sums[j]+=v*v
  full+=x*x
 energy.append(math.sqrt(full/111))
 for j in range(3):bands[j].append(math.log1p(100*math.sqrt(sums[j]/111)))
flux=[]
for band in bands:
 base=0.;out=[]
 for v in band:out.append(max(0,v-base));base+=.35*(v-base)
 scale=sorted(out)[int(len(out)*.95)] or 1
 flux.append([min(4,v/scale) for v in out])
pulse=[sum(flux[j][i]*weight for j,weight in enumerate((.5,.3,.2))) for i in range(frames)]
lag=max(range(38,81),key=lambda k:sum(pulse[i]*pulse[i-k] for i in range(k,frames))/math.sqrt(sum(v*v for v in pulse[k:])*sum(v*v for v in pulse[:-k])))
notes=[];last=[-10]*3
for i in range(300, min(frames-1,8850)):
 t=i*.01
 if energy[i]<.012 or pulse[i]<pulse[i-1] or pulse[i]<=pulse[i+1]:continue
 local=pulse[max(0,i-50):i+50];mean=sum(local)/len(local)
 std=math.sqrt(sum((v-mean)**2 for v in local)/len(local))
 if pulse[i]<max(.18,mean+.45*std) or notes and t-notes[-1]['time']<.36:continue
 lane=max(range(3),key=lambda j:flux[j][i])
 if t-last[lane]<.65:lane=min(range(3),key=lambda j:last[j])
 notes.append(dict(time=round(t,3),lane=lane,duration=0,end=round(t,3)));last[lane]=t
bundle=dict(version=1,duration=90,title='Ксения Ишкина — Утиные истории',audio='Music/duck-tales-90.m4a',sourceSha256=hashlib.sha256(Path('Music/Kseniia_Ishkina_-_Utinye_istorii_50024733.mp3').read_bytes()).hexdigest(),analysis={'method':'three-band energy onset detection','sampleRate':rate,'channels':2,'hopSeconds':.01,'estimatedBpm':round(6000/lag)},modes={})
for mode,ns in [('classic',notes),('pulse',[n for i,n in enumerate(notes) if i%2==0])]:bundle['modes'][mode]=dict(bpm=round(6000/lag),notes=ns)
Path('charts-duck-tales.json').write_text(json.dumps(bundle,ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps({'bpm':round(6000/lag),'counts':{k:len(v['notes']) for k,v in bundle['modes'].items()},'lanes':[sum(n['lane']==l for n in notes) for l in range(3)]}))
assert len(notes)>50
for mode in bundle['modes'].values():
 assert all(3<=n['time']<=88.5 and n['lane'] in range(3) for n in mode['notes'])
 assert all(b['time']-a['time']>=.35 for a,b in zip(mode['notes'],mode['notes'][1:]))
