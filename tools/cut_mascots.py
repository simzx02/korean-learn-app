# Cut the mascot artwork out of the six character sheets (no redrawing): app icon, hero, four views, six poses each.
import sys, os
from PIL import Image
import numpy as np
SRC, OUT = sys.argv[1], sys.argv[2]
SHEETS = {
 'pipi': ('07fca8ac', dict(views=(20,1075,775,1300), acts=(10,1740,790,1905), icon=(493,647,773,942), hero=(338,20,793,535)), ['stand','walk','running','jump','sit','wave']),
 'momo': ('475818cc', dict(views=(30,755,1000,990), acts=(15,1305,1010,1490), icon=(772,475,996,680), hero=(460,0,1024,405)), ['sit','walk','running','jump','angry','wave']),
 'bobo': ('ca49b3c4', dict(views=(30,725,1000,950), acts=(5,1275,1020,1472), icon=(757,442,998,660), hero=(426,0,1024,372)), ['sit','walk','running','jump','happy','wave']),
 'nini': ('494e519e', dict(views=(30,740,1000,955), acts=(10,1275,1015,1468), icon=(783,442,1003,655), hero=(440,0,1024,360)), ['sit','walk','running','jump','shy','wave']),
 'koko': ('c6007866', dict(views=(30,730,1000,965), acts=(20,1270,1010,1475), icon=(750,438,985,662), hero=(470,0,1024,362)), ['sit','walk','running','jump','curious','wave']),
 'tutu': ('80dca93d', dict(views=(30,762,1000,990), acts=(10,1300,1015,1485), icon=(753,460,998,682), hero=(450,0,1024,385)), ['sit','walk','running','jump','hungry','wave']),
}
VIEWS = ['front', 'side', 'back', 'quarter']
def segments(band, n):
    a = np.asarray(band.convert('RGB')).astype(int)
    ink = ((255 - a.min(axis=2)) > 14).sum(axis=0) > 2          # columns that hold something other than white
    runs, start = [], None
    for x, v in enumerate(list(ink) + [False]):
        if v and start is None: start = x
        if not v and start is not None: runs.append([start, x]); start = None
    merged = []
    for r in runs:                                               # join pieces separated by small gaps (motion marks, sparkles)
        if merged and r[0] - merged[-1][1] < 14: merged[-1][1] = r[1]
        else: merged.append(r)
    while len(merged) > n:                                       # still too many: fold the narrowest into its nearest neighbour
        i = min(range(len(merged)), key=lambda k: merged[k][1] - merged[k][0])
        j = i - 1 if i == len(merged) - 1 or (i > 0 and merged[i][0] - merged[i-1][1] <= merged[i+1][0] - merged[i][1]) else i + 1
        lo, hi = min(i, j), max(i, j); merged[lo] = [merged[lo][0], merged[hi][1]]; del merged[hi]
    if len(merged) != n:                                         # pale characters: cut at the emptiest column near each even split
        dens = np.convolve(((255 - a.min(axis=2)) > 10).sum(axis=0), np.ones(9) / 9, mode='same'); w = band.width / n; cuts = [0]
        for i in range(1, n):
            lo, hi = int(i * w - 48), int(i * w + 48)
            cuts.append(min(range(lo, hi), key=lambda x: (round(dens[x], 1), abs(x - i * w))))
        cuts.append(band.width); return [(cuts[i], cuts[i + 1]) for i in range(n)], False
    return [tuple(m) for m in merged], True
def square(im, pad=10):
    a = np.asarray(im.convert('RGB')).astype(int); ink = (255 - a.min(axis=2)) > 14
    ys, xs = np.where(ink)
    if len(xs): im = im.crop((max(0, xs.min() - 2), max(0, ys.min() - 2), min(im.width, xs.max() + 3), min(im.height, ys.max() + 3)))
    s = max(im.size) + 2 * pad
    out = Image.new('RGB', (s, s), 'white'); out.paste(im, ((s - im.width) // 2, (s - im.height) // 2)); return out
report = {}
for name, (fid, box, poses) in SHEETS.items():
    im = Image.open(f'{SRC}/{fid}-image.png').convert('RGB'); d = f'{OUT}/{name}'; os.makedirs(d, exist_ok=True)
    im.crop(box['icon']).save(f'{d}/icon.webp', quality=90)
    im.crop(box['hero']).save(f'{d}/hero.webp', quality=88)
    for key, names in (('views', VIEWS), ('acts', poses)):
        band = im.crop(box[key]); segs, auto = segments(band, len(names)); report[f'{name}/{key}'] = ('auto' if auto else 'EQUAL', [b - a for a, b in segs])
        for (x0, x1), nm in zip(segs, names):
            square(band.crop((max(0, x0 - 3), 0, min(band.width, x1 + 3), band.height))).save(f'{d}/{nm}.webp', quality=90)
for k, v in report.items(): print(k, v)
# contact sheet for checking
rows = []
for name, (_, _, poses) in SHEETS.items():
    tiles = [Image.open(f'{OUT}/{name}/{n}.webp').resize((120, 120)) for n in VIEWS + poses] + [Image.open(f'{OUT}/{name}/icon.webp').resize((120, 120))]
    row = Image.new('RGB', (120 * len(tiles), 120), '#cfe3f7')
    for i, t in enumerate(tiles): row.paste(t, (i * 120 + 0, 0))
    rows.append(row)
sheet = Image.new('RGB', (rows[0].width, 122 * len(rows)), '#888')
for i, r in enumerate(rows): sheet.paste(r, (0, i * 122))
sheet.save('/tmp/contact.png')
