# Parse NIKL 한국어기초사전 (krdict) LMF XML into a compact intermediate JSON.
# The upstream files are not always well-formed XML, so this reads them line by line.
import sys, glob, json, collections, re, html
src, out = sys.argv[1], sys.argv[2]
FEAT = re.compile(r'<feat att="([^"]*)" val="(.*)"\s*/>')
entries = []; e = s = None; ctx = []
for path in sorted(glob.glob(src + '/*.xml')):
    for line in open(path, encoding='utf-8'):
        t = line.strip()
        if t.startswith('<LexicalEntry'):
            e = {'id': int(re.search(r'val="(\d+)"', t).group(1)), 'w': '', 'hom': '0', 'unit': '', 'pos': '', 'lv': '', 'origin': '', 'cat': '', 'senses': []}; ctx = ['entry']
        elif t.startswith('</LexicalEntry'):
            entries.append(e); e = None; ctx = []
        elif e is None: continue
        elif t.startswith('<feat'):
            m = FEAT.match(t)
            if not m: continue
            a, v = m.group(1), html.unescape(m.group(2)).strip(); c = ctx[-1]
            if c == 'entry':
                k = {'homonym_number': 'hom', 'lexicalUnit': 'unit', 'partOfSpeech': 'pos', 'vocabularyLevel': 'lv', 'origin': 'origin', 'semanticCategory': 'cat'}.get(a)
                if k: e[k] = v
            elif c == 'Lemma' and a == 'writtenForm': e['w'] = v
            elif c == 'Sense':
                if a == 'definition': s['def'] = v
                elif a == 'annotation': s['note'] = v
            elif c == 'SenseExample':
                if a == 'type': s['ex'].append([v, []])
                elif a == 'example' and s['ex']: s['ex'][-1][1].append(v)
            elif c == 'Equivalent':
                if a == 'language': eq['lang'] = v
                elif a in ('lemma', 'definition'): eq[a] = v
        elif t.startswith('</'):
            tag = t[2:].split('>')[0]
            if ctx and ctx[-1] == tag:
                if tag == 'Equivalent' and eq.get('lang') == '영어' and s is not None: s['en'] = [eq.get('lemma', ''), eq.get('definition', '')]
                ctx.pop()
        elif t.startswith('<') and not t.startswith('<?') and not t.startswith('<!'):
            tag = re.match(r'<(\w+)', t).group(1)
            if t.endswith('/>'): continue
            ctx.append(tag)
            if tag == 'Sense' and ctx[-2] == 'entry': s = {'def': '', 'note': '', 'en': None, 'ex': []}; e['senses'].append(s)
            elif tag == 'Equivalent': eq = {}
json.dump(entries, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
c = collections.Counter
print(len(entries)); print(c(e['lv'] for e in entries)); print(c(e['unit'] for e in entries)); print(c(e['pos'] for e in entries).most_common(20))
print('graded by unit', c((e['unit'], e['lv']) for e in entries if e['lv'] in ('초급','중급','고급')))
print('graded gram pos', c((e['pos'], e['lv']) for e in entries if e['lv'] in ('초급','중급','고급') and e['pos'] in ('조사','어미','품사 없음','접사','보조 동사','보조 형용사','의존 명사')))
print('no en sense among graded', sum(1 for e in entries if e['lv'] in ('초급','중급','고급') and not any(x['en'] for x in e['senses'])))
