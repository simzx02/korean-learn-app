# Import the supplied transparent pose files (original design) into assets/mascots/<id>/, resized for the web, plus a head icon.
import sys, os
from PIL import Image
import numpy as np
from scipy import ndimage
SRC, OUT = sys.argv[1], sys.argv[2]
POSES = {'stand': 'stand', 'walk': 'walk', 'run': 'running', 'jump': 'jump', 'sit': 'sit', 'wave': 'wave'}
tiles = []
for name in ['PiPi', 'Momo', 'Bobo', 'Nini', 'Koko', 'Tutu']:
    d = f'{OUT}/{name.lower()}'; os.makedirs(d, exist_ok=True)
    for src, dst in POSES.items():
        im = Image.open(f'{SRC}/{name}/{name}_{src}.webp').convert('RGBA'); arr = np.asarray(im).copy(); al = arr[..., 3]
        lab, n = ndimage.label(al > 24)                       # drop slivers of neighbouring poses: pieces that touch the edge of the file
        if n > 1:
            sizes = ndimage.sum(al > 24, lab, range(1, n + 1)); main = int(np.argmax(sizes)) + 1
            edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0, main}
            for k in edge: arr[lab == k] = 0
            im = Image.fromarray(arr); al = arr[..., 3]
        ys, xs = np.where(al > 24); raw = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        side = max(raw.size) + 24; sq = Image.new('RGBA', (side, side), (255, 255, 255, 0)); sq.paste(raw, ((side - raw.width) // 2, (side - raw.height) // 2))
        if side > 520: sq = sq.resize((520, 520), Image.LANCZOS)
        sq.save(f'{d}/{dst}.webp', quality=90); tiles.append(sq.resize((150, 150)))
        if dst == 'stand':
            h = int(raw.height * 0.7); top = raw.crop((0, 0, raw.width, h)); s2 = max(raw.width, h) + 16
            ic = Image.new('RGBA', (s2, s2), (255, 255, 255, 0)); ic.paste(top, ((s2 - raw.width) // 2, s2 - h)); ic = ic.resize((256, 256), Image.LANCZOS)
            ic.save(f'{d}/icon.webp', quality=90); tiles.append(ic.resize((150, 150)))
            print(name, im.size, 'transparent share', round(float((al < 10).mean()), 2))
sheet = Image.new('RGB', (150 * 7, 150 * 6), '#dcecfb')
for i, t in enumerate(tiles): sheet.paste(t, ((i % 7) * 150, (i // 7) * 150), t)
sheet.save('/tmp/contact_orig.png')
