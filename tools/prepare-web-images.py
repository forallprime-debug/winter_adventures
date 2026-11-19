"""Create web-sized assets; keep the original Figma PNG files untouched."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1]
records = []
for source in (root / 'assets').rglob('*.png'):
    if 'preview' in source.name:
        continue
    image = Image.open(source).convert('RGBA')
    # 2x the UI's rendered size; preserve aspect ratio and transparency.
    limit = 128 if source.name.startswith('point-') else 128 if source.name == 'star.png' else 320 if source.name == 'character.png' else 200 if source.name == 'snowman.png' else 256 if source.name.startswith('star-') else 768 if source.parent.name == 'tiles' else 1600
    image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
    background = source.parent.name == 'winter' or source.name == 'map.png'
    if background:
        image = image.convert('RGB')
    target = source.with_suffix('.webp')
    image.save(target, 'WEBP', lossless=not background, quality=88 if background else 100, method=6, exact=True)
    records.append((source.stat().st_size, target.stat().st_size))
print(f'{len(records)} images: {sum(a for a,b in records):,} -> {sum(b for a,b in records):,} bytes')
