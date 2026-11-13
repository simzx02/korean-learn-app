# Build the app's data files.
#
#   python tools/parse_krdict.py <folder with krdict *.xml> krdict.json
#   python tools/build.py krdict.json <results.tsv from julienshim/combined_korean_vocabulary_list> .
#
# Inputs
#   krdict.json        NIKL 한국어기초사전 (Korean Learners' Dictionary), parsed. CC BY-SA 2.0 KR.
#   results.tsv        NIKL/TOPIK combined list; used only for frequency rank.
#   content/v*.txt     hand-written core words with translated example sentences.
#   content/g*.txt     hand-written grammar notes with translated examples.
#   tools/grammar_extra.txt   further patterns per level; definitions and examples come from krdict.
# Outputs: data/meta.json, data/L1.json … L6.json, data/grammar.json
import sys, json, csv, re, collections, unicodedata, hashlib, os

KR, TSV, APP = sys.argv[1], sys.argv[2], sys.argv[3]
UNIT, CORE_UNITS = 50, 20
TIER = {'초급': 0, '중급': 1, '고급': 2}
POS = {'명사': 'noun', '동사': 'verb', '형용사': 'adjective', '부사': 'adverb', '관형사': 'determiner', '접사': 'affix', '의존 명사': 'bound noun',
       '수사': 'numeral', '대명사': 'pronoun', '감탄사': 'interjection', '품사 없음': 'expression', '조사': 'particle', '보조 동사': 'auxiliary verb', '보조 형용사': 'auxiliary adjective', '어미': 'ending'}
CUR_POS = {'n': '명사', 'v': '동사', 'adj': '형용사', 'adv': '부사'}
POS_GROUP = {'명사': 'General nouns', '동사': 'Verbs', '형용사': 'Adjectives', '부사': 'Adverbs', '관형사': 'Determiners', '접사': 'Prefixes and suffixes',
             '의존 명사': 'Bound nouns', '수사': 'Numerals', '대명사': 'Pronouns', '감탄사': 'Interjections'}
MAJOR = ['개념', '인간', '삶', '식생활', '의생활', '주생활', '사회 생활', '경제 생활', '교육', '문화', '자연', '동식물', '정치와 행정', '종교']
CAT = {
 '개념 > 모양': 'Shapes', '개념 > 밝기': 'Light and dark', '개념 > 빈도': 'Frequency', '개념 > 색깔': 'Colors', '개념 > 성질': 'Qualities', '개념 > 세는 말': 'Counters',
 '개념 > 속도': 'Speed', '개념 > 수': 'Numbers', '개념 > 순서': 'Order', '개념 > 시간': 'Time', '개념 > 양': 'Quantity', '개념 > 온도': 'Temperature',
 '개념 > 위치 및 방향': 'Position and direction', '개념 > 의문': 'Question words', '개념 > 인칭': 'Personal pronouns', '개념 > 접속': 'Connectors', '개념 > 정도': 'Degree',
 '개념 > 지시': 'Pointing words', '개념 > 지역': 'Places and regions',
 '경제 생활 > 경제 산물': 'Economic products', '경제 생활 > 경제 상태': 'Economic conditions', '경제 생활 > 경제 수단': 'Money and means', '경제 생활 > 경제 행위': 'Buying, selling, earning',
 '경제 생활 > 경제 행위 장소': 'Shops and markets', '경제 생활 > 경제 행위 주체': 'Economic actors',
 '교육 > 교수 학습 주체': 'Teachers and learners', '교육 > 교수 학습 행위': 'Teaching and studying', '교육 > 교육 기관': 'Schools', '교육 > 전공과 교과목': 'Subjects and majors',
 '교육 > 학교 시설': 'School facilities', '교육 > 학문 용어': 'Academic terms', '교육 > 학문 행위': 'Research and scholarship', '교육 > 학습 관련 사물': 'Study materials',
 '동식물 > 곤충류': 'Insects', '동식물 > 동물 소리': 'Animal sounds', '동식물 > 동물류': 'Animals', '동식물 > 동물의 부분': 'Animal parts', '동식물 > 동식물 행위': 'Animal and plant life',
 '동식물 > 식물류': 'Plants', '동식물 > 식물의 부분': 'Plant parts',
 '문화 > 대중 문화': 'Popular culture', '문화 > 문학': 'Literature', '문화 > 문화 생활 장소': 'Cultural venues', '문화 > 문화 활동': 'Cultural activities', '문화 > 문화 활동 주체': 'Artists and audiences',
 '문화 > 미술': 'Fine art', '문화 > 예술': 'The arts', '문화 > 음악': 'Music', '문화 > 전통 문화': 'Traditional culture',
 '사회 생활 > 교통 수단': 'Vehicles', '사회 생활 > 교통 이용 장소': 'Stations and roads', '사회 생활 > 교통 이용 행위': 'Getting around', '사회 생활 > 말': 'Speech and language',
 '사회 생활 > 매체': 'Media', '사회 생활 > 사회 생활 상태': 'Social conditions', '사회 생활 > 사회 행사': 'Social events', '사회 생활 > 사회 활동': 'Social activity',
 '사회 생활 > 소통 수단': 'Means of communication', '사회 생활 > 언어 행위': 'Speaking and writing', '사회 생활 > 인간관계': 'Relationships', '사회 생활 > 직업': 'Occupations',
 '사회 생활 > 직위': 'Job titles', '사회 생활 > 직장': 'Workplaces', '사회 생활 > 직장 생활': 'Working life', '사회 생활 > 통신 행위': 'Phone and internet',
 '삶 > 가족 행사': 'Family occasions', '삶 > 병과 증상': 'Illness and symptoms', '삶 > 삶의 상태': 'States of life', '삶 > 삶의 행위': 'Life events', '삶 > 약품류': 'Medicines',
 '삶 > 여가 도구': 'Leisure equipment', '삶 > 여가 시설': 'Leisure facilities', '삶 > 여가 활동': 'Leisure activities', '삶 > 일상 행위': 'Daily routines', '삶 > 치료 시설': 'Hospitals and clinics',
 '삶 > 치료 행위': 'Medical treatment', '삶 > 친족 관계': 'Family members',
 '식생활 > 곡류': 'Grains', '식생활 > 과일': 'Fruit', '식생활 > 맛': 'Tastes', '식생활 > 식사 및 조리 행위': 'Eating and cooking', '식생활 > 식생활 관련 장소': 'Places to eat',
 '식생활 > 식재료': 'Ingredients', '식생활 > 음료': 'Drinks', '식생활 > 음식': 'Dishes', '식생활 > 조리 도구': 'Kitchen tools', '식생활 > 채소': 'Vegetables',
 '의생활 > 모자, 신발, 장신구': 'Hats, shoes, accessories', '의생활 > 미용 행위': 'Grooming', '의생활 > 옷 종류': 'Clothes', '의생활 > 옷감': 'Fabrics', '의생활 > 옷의 부분': 'Parts of clothes',
 '의생활 > 의복 착용 상태': 'How clothes fit', '의생활 > 의복 착용 행위': 'Putting on and taking off', '의생활 > 의생활 관련 장소': 'Clothing shops',
 '인간 > 감각': 'Senses', '인간 > 감정': 'Feelings', '인간 > 능력': 'Abilities', '인간 > 사람의 종류': 'Kinds of people', '인간 > 생리 현상': 'Bodily functions', '인간 > 성격': 'Personality',
 '인간 > 소리': 'Human sounds', '인간 > 신체 내부 구성': 'Inside the body', '인간 > 신체 변화': 'Changes in the body', '인간 > 신체 부위': 'Parts of the body', '인간 > 신체 행위': 'Body movements',
 '인간 > 신체에 가하는 행위': 'Actions on the body', '인간 > 용모': 'Appearance', '인간 > 인지 행위': 'Thinking and knowing', '인간 > 체력 상태': 'Physical condition', '인간 > 태도': 'Attitudes',
 '자연 > 기상 및 기후': 'Weather and climate', '자연 > 자원': 'Natural resources', '자연 > 재해': 'Disasters', '자연 > 지표면 사물': 'Things on the ground', '자연 > 지형': 'Landforms', '자연 > 천체': 'Sky and space',
 '정치와 행정 > 공공 기관': 'Public institutions', '정치와 행정 > 무기': 'Weapons', '정치와 행정 > 사법 및 치안 주체': 'Law and police (people)', '정치와 행정 > 사법 및 치안 행위': 'Law and order',
 '정치와 행정 > 정치 및 치안 상태': 'Political conditions', '정치와 행정 > 정치 및 행정 주체': 'Government and officials', '정치와 행정 > 정치 및 행정 행위': 'Politics and administration',
 '종교 > 신앙 대상': 'Objects of faith', '종교 > 종교 유형': 'Religions', '종교 > 종교 행위': 'Religious practice', '종교 > 종교 활동 도구': 'Religious objects', '종교 > 종교 활동 장소': 'Places of worship',
 '종교 > 종교어': 'Religious terms', '종교 > 종교인': 'Religious people',
 '주생활 > 가사 행위': 'Housework', '주생활 > 건물 종류': 'Buildings', '주생활 > 생활 용품': 'Household items', '주생활 > 주거 상태': 'Living conditions', '주생활 > 주거 지역': 'Residential areas',
 '주생활 > 주거 행위': 'Moving and dwelling', '주생활 > 주거 형태': 'Types of housing', '주생활 > 주택 구성': 'Parts of a house',
}
nfkc = lambda s: unicodedata.normalize('NFKC', s or '')
cjk = lambda s: ''.join(ch for ch in nfkc(s) if '一' <= ch <= '鿿' or '㐀' <= ch <= '䶿')
stable = lambda s: int(hashlib.md5(s.encode()).hexdigest()[:8], 16)
clean = lambda s: re.sub(r'\s+', ' ', s or '').strip()

E = json.load(open(KR, encoding='utf-8'))
rank = {}
for r in csv.DictReader(open(TSV, encoding='utf-8'), delimiter='\t', quoting=csv.QUOTE_NONE):
    w = re.sub(r'\d+$', '', r['word'])
    if r['rank'].isdigit(): rank[w] = min(rank.get(w, 10**9), int(r['rank']))

# ---------- vocabulary ----------
def senses_of(e, with_examples=True):
    out = []
    for i, s in enumerate([s for s in e['senses'] if s['en'] and s['en'][0]][:2]):
        ex = []
        if with_examples:
            sent = sorted({clean(x) for t, xs in s['ex'] if t == '문장' for x in xs if 6 <= len(clean(x)) <= 42}, key=len)
            phr = [clean(x) for t, xs in s['ex'] if t == '구' for x in xs if clean(x)]
            ex = (phr[:1] + sent[:2]) if i == 0 else sent[:1]
            if not ex: ex = phr[:2]
        lemma, d = clean(s['en'][0]), clean(s['en'][1])
        m = re.match(r'([^:.]{2,48}): (.+)', d)          # the dictionary romanizes culture-specific words and puts the gloss before a colon
        if m: lemma, d = m.group(1), m.group(2)
        out.append([lemma, d, ex])
    return out

words = {e['id']: e for e in E if e['unit'] == '단어'}
byword = collections.defaultdict(list)
for e in words.values(): byword[e['w']].append(e)
graded = {i: e for i, e in words.items() if e['lv'] in TIER and any(s['en'] and s['en'][0] for s in e['senses'])}

curated = {}   # id -> (level, meaning, examples)
synthetic = []
unmatched = 0
for lv in range(1, 7):
    for line in open(f'{APP}/content/v{lv}.txt', encoding='utf-8').read().strip().split('\n'):
        w, origin, pos, meaning, *ex = line.split('|')
        ex = [x.split('=', 1) for x in ex]
        want = cjk(origin)
        cands = byword.get(w, [])
        def score(e):
            return (e['id'] in graded) * 4 + (cjk(e['origin']) == want) * 8 + (e['pos'] == CUR_POS[pos]) * 2 - (e['id'] in curated) * 100
        best = max(cands, key=score, default=None)
        if best is not None and (cjk(best['origin']) == want or not want or not cjk(best['origin'])) and best['id'] not in curated:
            curated[best['id']] = (lv, meaning, ex)
        else:
            unmatched += 1
            synthetic.append({'id': 900000 + len(synthetic), 'w': w, 'pos': CUR_POS[pos], 'origin': origin.replace('+', ' ') if not re.match('[A-Z]', origin) else origin.split(' ', 1)[1],
                              'cat': '', 'lv': '', 'senses': [], 'cur': (lv, meaning, ex)})
for s in synthetic: words[s['id']] = s; curated[s['id']] = s['cur']

def sort_key(e):
    r = rank.get(e['w'])
    if e['id'] in curated: r = min(r or 10**9, 50)                                    # hand-picked words always sit in the core units
    return (r if r is not None else 10**6 + stable(str(e['id'])) % 10**6, e['id'])

tiers = [[], [], []]
for i, e in graded.items(): tiers[TIER[e['lv']]].append(e)
for i, (lv, _, _) in curated.items():
    if i not in graded: tiers[(lv - 1) // 2].append(words[i])
for t in tiers: t.sort(key=sort_key)
need = 2 * UNIT * CORE_UNITS - len(tiers[0])          # top up beginner tier to 2,000 with the most frequent intermediate words
if need > 0: tiers[0] += tiers[1][:need]; tiers[1] = tiers[1][need:]
levels = {}
for t, pair in zip(tiers, ((1, 2), (3, 4), (5, 6))):
    half = UNIT * CORE_UNITS if len(t) <= 2 * UNIT * CORE_UNITS else (len(t) + 1) // 2
    first, second, rest = [], [], []
    for e in t:
        lv = curated.get(e['id'], (0,))[0]
        if not lv: rest.append(e)
        elif lv == pair[1] or lv > pair[1]: second.append(e)       # keep my level where the dictionary tier allows it
        else: first.append(e)
    take = max(0, half - len(first))
    levels[pair[0]], levels[pair[1]] = sorted(first + rest[:take], key=sort_key), sorted(second + rest[take:], key=sort_key)

def group_of(e):
    if e['cat'] in CAT: return (MAJOR.index(e['cat'].split(' > ')[0]), CAT[e['cat']])
    return (99, POS_GROUP.get(e['pos'], 'Other words'))

def make_units(ws):
    ws = sorted(ws, key=lambda e: (group_of(e), sort_key(e)))
    chunks = [ws[i:i + UNIT] for i in range(0, len(ws), UNIT)]
    if len(chunks) > 1 and len(chunks[-1]) < UNIT // 2: chunks[-2] += chunks.pop()
    units = []
    for ch in chunks:
        top = [g for g, _ in collections.Counter(group_of(e)[1] for e in ch).most_common(2)]
        ch.sort(key=sort_key)
        units.append({'t': ' · '.join(top), 'ids': [e['id'] for e in ch], '_k': sorted(sort_key(e)[0] for e in ch)[len(ch) // 2]})
    units.sort(key=lambda u: u['_k'])
    for u in units: del u['_k']
    return units

meta = {'levels': {}}
os.makedirs(f'{APP}/data', exist_ok=True)
total = 0
for lv, ws in levels.items():
    core, ext = ws[:UNIT * CORE_UNITS], ws[UNIT * CORE_UNITS:]
    units = make_units(core)
    n_core = len(units)
    units += make_units(ext) if ext else []
    meta['levels'][lv] = {'core': n_core, 'units': units}
    out = {}
    homs = collections.Counter(e['w'] for e in ws)
    for e in ws:
        cur = curated.get(e['id'])
        rec = [e['w'], POS.get(e['pos'], e['pos']), nfkc(e['origin']), CAT.get(e['cat'], ''), senses_of(e, with_examples=not cur)]
        if cur: rec += [cur[1], cur[2]]
        out[e['id']] = rec
    json.dump(out, open(f'{APP}/data/L{lv}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    total += len(ws)
    print(f'L{lv}: {len(ws)} words, {n_core} core + {len(units) - n_core} extension units, curated {sum(e["id"] in curated for e in ws)}; first units:', [u['t'] for u in units[:4]])
print('total words', total, '| curated matched', len(curated) - len(synthetic), 'synthetic', len(synthetic))

# ---------- grammar ----------
gpool = collections.defaultdict(list)
for e in E:
    if e['unit'] == '문법‧표현' or e['pos'] in ('어미', '조사'): gpool[e['w']].append(e)
grammar = {lv: [] for lv in range(1, 7)}
for lv in range(1, 7):
    for line in open(f'{APP}/content/g{lv}.txt', encoding='utf-8').read().strip().split('\n'):
        p, meaning, form, note, *ex = line.split('|')
        grammar[lv].append({'p': p, 'm': meaning, 'f': form, 'n': note, 'x': [x.split('=', 1) for x in ex]})
for line in open(f'{APP}/tools/grammar_extra.txt', encoding='utf-8').read().strip().split('\n'):
    lv, p, key, gloss = line.split('|')
    e = max(gpool[key], key=lambda e: (e['unit'] == '문법‧표현', len(e['senses'])))
    ss = [s for s in e['senses'] if s['en'] and s['en'][1]][:3]
    out = []
    for s in ss:
        sent = sorted({clean(x) for t, xs in s['ex'] if t == '문장' for x in xs if 6 <= len(clean(x)) <= 48}, key=len)
        if not sent: sent = [clean(x) for t, xs in s['ex'] for x in xs]
        out.append([clean(s['en'][1]), sent[:3 if len(ss) == 1 else 1]])
    grammar[int(lv)].append({'p': p, 'm': gloss, 's': out, 'k': clean(ss[0]['note'])})
# interleave hand-written and dictionary-sourced patterns so each unit mixes both
for lv in grammar:
    a = [g for g in grammar[lv] if 'f' in g]; b = [g for g in grammar[lv] if 'f' not in g]; mix = []
    while a or b:
        if a: mix.append(a.pop(0))
        for _ in range(max(1, round(len(b) / max(1, len(a) + 1)))):
            if b: mix.append(b.pop(0))
    grammar[lv] = mix
    meta['levels'][lv]['grammar'] = len(mix)
json.dump(grammar, open(f'{APP}/data/grammar.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump(meta, open(f'{APP}/data/meta.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('grammar', {lv: len(g) for lv, g in grammar.items()}, sum(len(g) for g in grammar.values()))
