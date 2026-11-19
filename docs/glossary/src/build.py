import json, re, csv, sys, collections
import pymorphy3
D = sys.argv[1]
terms = json.load(open(D + '/terms.json'))
tr = {}
for line in open(D + '/tr.txt', encoding='utf-8'):
    n, ru, en = line.rstrip('\n').split('|')
    tr[n] = (ru, en)
M = {'uk': pymorphy3.MorphAnalyzer(lang='uk'), 'ru': pymorphy3.MorphAnalyzer(lang='ru')}
CASES = ['nomn', 'gent', 'datv', 'accs', 'ablt', 'loct']
GENERIC = {'Сон', 'Стрес', 'Травма', 'Опік', 'Показання', 'Харчування', 'Результат лікування',
           'Очікуваний результат', 'Ефективність лікування', 'Безпека лікування', 'Медицина майбутнього', 'Шкіра'}

def variants(term):
    """Основной вариант + синонимы из скобок."""
    m = re.match(r'^(.*?)\s*\((.*)\)\s*(.*)$', term)
    if not m:
        return [term.strip()]
    before, inside, after = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
    if after:  # «Окислювальний (оксидативний) стрес» → два варианта
        return [f'{before} {after}', f'{inside} {after}']
    parts = [before]
    # «PRP (Platelet-Rich Plasma, плазма збагачена тромбоцитами)»: латиница отдельно, остальное одной фразой
    lat = re.match(r'^([A-Za-z][A-Za-z\- ]+),\s*(.+)$', inside)
    parts += [lat.group(1), lat.group(2)] if lat else [inside]
    return parts

def is_abbr(w):
    core = re.sub(r'[^A-Za-zА-Яа-яІіЇїЄєҐґ]', '', w)
    return sum(c.isupper() for c in core) >= 2 or bool(re.search(r'[A-Za-z]', w))

def pick(morph, word):
    ps = morph.parse(word)
    top = ps[0]
    if top.tag.POS in ('ADJF', 'PRTF'): return None
    for p in ps:
        if p.tag.POS == 'NOUN' and 'nomn' in p.tag: return p
    return None

OVR = {
 ('uk','біологічний вік'): 'біологічний вік|біологічного віку|біологічному віку|біологічним віком|біологічному віці',
 ('uk','клітинний вік'): 'клітинний вік|клітинного віку|клітинному віку|клітинним віком|клітинному віці',
 ('uk','функціональний вік'): 'функціональний вік|функціонального віку|функціональному віку|функціональним віком|функціональному віці',
 ('uk','комплексний чекап'): 'комплексний чекап|комплексного чекапу|комплексному чекапу|комплексним чекапом|комплексному чекапі|комплексні чекапи|комплексних чекапів|комплексними чекапами',
 ('uk','секретом'): 'секретом|секретому|секретомом|секретомі',
 ('ru','секретом'): 'секретом|секретома|секретому|секретомом|секретоме',
 ('uk','сенолітики'): 'сенолітики|сенолітиків|сенолітикам|сенолітиками|сенолітиках|сенолітик|сенолітика|сенолітиком',
 ('ru','сенолитики'): 'сенолитики|сенолитиков|сенолитикам|сенолитиками|сенолитиках|сенолитик|сенолитика|сенолитиком',
 ('uk','екзосоми'): 'екзосоми|екзосом|екзосомам|екзосомами|екзосомах|екзосома|екзосоми|екзосомі|екзосому|екзосомою',
 ('ru','экзосомы'): 'экзосомы|экзосом|экзосомам|экзосомами|экзосомах|экзосома|экзосомы|экзосоме|экзосому|экзосомой',
 ('ru','нутрицевтики'): 'нутрицевтики|нутрицевтиков|нутрицевтикам|нутрицевтиками|нутрицевтиках|нутрицевтик|нутрицевтика|нутрицевтиком',
 ('ru','нутриенты'): 'нутриенты|нутриентов|нутриентам|нутриентами|нутриентах|нутриент|нутриента|нутриентом',
 ('ru','цитокины'): 'цитокины|цитокинов|цитокинам|цитокинами|цитокинах|цитокин|цитокина|цитокином',
 ('ru','криообразец'): 'криообразец|криообразца|криообразцу|криообразцом|криообразце|криообразцы|криообразцов|криообразцам|криообразцами|криообразцах',
 ('uk','вільні радикали'): 'вільні радикали|вільних радикалів|вільним радикалам|вільними радикалами|вільних радикалах|вільний радикал|вільного радикала|вільним радикалом',
 ('uk','зморшки'): 'зморшки|зморшок|зморшкам|зморшками|зморшках|зморшка|зморшку|зморшкою|зморшці',
 ('uk','скаффолд'): 'скаффолд|скаффолда|скаффолду|скаффолдом|скаффолді|скаффолди|скаффолдів|скаффолдам|скаффолдами|скаффолдах',
 ('ru','гипоэстрогения'): 'гипоэстрогения|гипоэстрогении|гипоэстрогению|гипоэстрогенией',
 ('uk','плазма збагачена тромбоцитами'): 'плазма, збагачена тромбоцитами|плазма збагачена тромбоцитами|плазми, збагаченої тромбоцитами|плазмі, збагаченій тромбоцитами|плазму, збагачену тромбоцитами|плазмою, збагаченою тромбоцитами',
 ('ru','плазма, обогащённая тромбоцитами'): 'плазма, обогащённая тромбоцитами|плазма, обогащенная тромбоцитами|плазмы, обогащённой тромбоцитами|плазмы, обогащенной тромбоцитами|плазме, обогащённой тромбоцитами|плазму, обогащённую тромбоцитами|плазмой, обогащённой тромбоцитами',
}

def adj_parse(morph, word):
    for p in morph.parse(word):
        if p.tag.POS in ('ADJF', 'PRTF') and 'nomn' in p.tag: return p
    return None

def inflect_phrase(lang, phrase, notes):
    phrase = re.sub("[’ʼ']", "'", phrase)
    morph = M[lang]
    if (lang, phrase.lower()) in OVR:
        notes.add(f'{lang}: форми «{phrase}» задано вручну')
        return list(OVR[(lang, phrase.lower())].split('|'))
    words = phrase.split()
    out = {(phrase.lower() if not any(is_abbr(w) for w in words) else phrase).replace("'", '’'): 1}
    # голова — первое существительное в именительном; прилагательные перед ним согласуются
    head_i = None
    for i, w in enumerate(words):
        last = w.split('-')[-1]
        if is_abbr(w): continue
        if pick(morph, last.lower()):
            head_i = i; break
        if not adj_parse(morph, last.lower()):
            break
    if head_i is None:
        if not all(is_abbr(w) for w in words):
            notes.add(f'{lang}: не просклонялось «{phrase}»')
        return list(out)
    hw = words[head_i]; hpre, hlast = (hw.rsplit('-', 1)[0].lower() + '-', hw.rsplit('-', 1)[1]) if '-' in hw else ('', hw)
    hp = pick(morph, hlast.lower())
    if not hp.is_known:
        notes.add(f'{lang}: словник не знає «{hlast}» — форми за схожим словом')
    if head_i + 1 < len(words) and lang:
        tail = words[head_i + 1:]
        # хвост после головы (род. падеж, «після опіків») не меняем; согласованные причастия после головы — на проверку
        if any(adj_parse(morph, t.lower()) for t in tail[:1]):
            notes.add(f'{lang}: слово після головного «{tail[0]}» — перевірити узгодження')
    num_head = 'plur' if 'plur' in hp.tag else 'sing'
    for num in (['sing', 'plur'] if num_head == 'sing' else ['plur']):
        for case in CASES:
            if lang == 'uk' and num == 'sing':
                f = hp.inflect({case} | ({hp.tag.gender} if hp.tag.gender else set()))
                if f and 'plur' in f.tag: f = None
            else:
                f = hp.inflect({case, num})
            if not f: continue
            fvars = [x.word for x in hp.lexeme if case in x.tag and ((num == 'plur') == ('plur' in x.tag)) and (num == 'plur' or not hp.tag.gender or hp.tag.gender in x.tag)] or [f.word]
            fvars = list(dict.fromkeys([f.word] + fvars))
            for fw in fvars:
              parts = []
              ok = True
              for i, w in enumerate(words):
                  if i < head_i:
                      pre, last = (w.rsplit('-', 1)[0] + '-', w.rsplit('-', 1)[1]) if '-' in w else ('', w)
                      ap = adj_parse(morph, last.lower())
                      if not ap: ok = False; break
                      c = case
                      # знахідний неістот = називний (крім жіночого однини)
                      if case == 'accs' and hp.tag.animacy != 'anim' and not (num == 'sing' and hp.tag.gender == 'femn'):
                          c = 'nomn'
                      want = {c}
                      if num == 'plur': want.add('plur')
                      else:
                          if lang == 'ru': want.add('sing')
                          if hp.tag.gender: want.add(hp.tag.gender)
                      if c == 'accs' and lang == 'ru' and hp.tag.animacy == 'anim' and not (num == 'sing' and hp.tag.gender == 'femn'): want.add('anim')
                      af = ap.inflect(want)
                      if af and c == 'loct' and lang == 'uk' and num == 'sing' and af.word.endswith('ім'):
                          alt = [x for x in ap.lexeme if 'loct' in x.tag and hp.tag.gender in x.tag and not x.word.endswith('ім')]
                          if alt: af = alt[0]
                      if not af:
                          if not ap.is_known: notes.add(f'{lang}: «{last}» — форми не згенеровано')
                          ok = False; break
                      parts.append(pre.lower() + af.word)
                  elif i == head_i:
                      parts.append(hpre + fw)
                  else:
                      parts.append(w if is_abbr(w) else w.lower())
              if ok:
                  out[' '.join(parts).replace("'", '’')] = 1
    return list(out)

def en_forms(phrase):
    out = {phrase.lower() if not re.search(r'[A-Z]{2}', phrase) else phrase: 1}  # dict, чтобы порядок был стабильным
    m = re.match(r'^(.*?)([A-Za-z]+)$', phrase)
    if not m or re.search(r'[A-Z]{2}', phrase): return out
    pre, last = m.groups(); lw = last.lower()
    if re.search(r'(ing|ness|ism|sis|tion|ity|ics|ogy|ance|ence|ment|th|ion|age|ure|ia|um)$', lw) and not lw.endswith('ance'): return out
    if lw.endswith('s') and not re.search(r'(ss|is|us)$', lw):
        sing = lw[:-3] + 'y' if lw.endswith('ies') else (lw[:-2] if re.search(r'(ches|shes|xes)$', lw) else lw[:-1])
        out[(pre + sing).lower()] = 1
    elif not lw.endswith('s'):
        pl = lw[:-1] + 'ies' if re.search(r'[^aeiou]y$', lw) else (lw + 'es' if re.search(r'(ch|sh|x)$', lw) else lw + 's')
        out[(pre + pl).lower()] = 1
    return out

TL = dict(zip('абвгґдезиіклмнопрстуфхцчшщ', 'a b v h g d e z y i k l m n o p r s t u f kh ts ch sh shch'.split()))
TL.update({'ж': 'zh', 'ь': '', '’': '', "'": '', 'ʼ': ''})
FIRST = {'є': 'ye', 'ї': 'yi', 'й': 'y', 'ю': 'yu', 'я': 'ya'}
MID = {'є': 'ie', 'ї': 'i', 'й': 'i', 'ю': 'iu', 'я': 'ia'}
def slug(s):
    s = re.sub(r'\s*\(.*?\)\s*', ' ', s).strip().lower().replace('зг', 'zgh')
    out, start = [], True
    for ch in s:
        if ch in FIRST: out.append(FIRST[ch] if start else MID[ch]); start = False
        elif ch in TL: out.append(TL[ch]); start = False
        elif ch.isascii() and ch.isalnum(): out.append(ch); start = False
        else: out.append('-'); start = True
    return re.sub(r'-+', '-', ''.join(out)).strip('-')

rows, owner = [], collections.defaultdict(set)
for n, letter, uk, med, simple in terms:
    ru, en = tr[n]
    notes = set()
    fu, fr, fe = [], [], []
    nr = lambda x: x.replace('®', '').strip()  # знак ® в тексте статей обычно не пишут
    for v in variants(nr(uk)):
        fu += inflect_phrase('uk', v, notes)
    for v in variants(nr(ru)):
        fr += inflect_phrase('ru', v, notes)
    for v in variants(nr(en)):
        fe += list(en_forms(v))
    dedup = lambda xs: list(dict.fromkeys(xs))
    fu, fr, fe = dedup(fu), dedup(fr), dedup(fe)
    if len(uk.split()) > 1 and not any('не знає' in x for x in notes):
        pass
    for lang, fs in (('uk', fu), ('ru', fr), ('en', fe)):
        for f in fs: owner[(lang, f.lower())].add(n)
    rows.append(dict(id=n, anchor=slug(uk), letter=letter, term_uk=variants(uk)[0], term_ru=variants(ru)[0], term_en=variants(en)[0],
                     title_uk=uk, definition_uk=med, simple_uk=simple,
                     autolink='0' if uk in GENERIC else '1',
                     forms_uk=' | '.join(fu), forms_ru=' | '.join(fr), forms_en=' | '.join(fe), notes=notes))
# одинаковые формы у разных терминов
for (lang, f), ns in owner.items():
    if len(ns) > 1:
        for r in rows:
            if r['id'] in ns: r['notes'].add(f'{lang}: форма «{f}» є і в № ' + ', '.join(sorted(ns - {r["id"]}, key=int)))
# дубли якорей
cnt = collections.Counter(r['anchor'] for r in rows)
for r in rows:
    if cnt[r['anchor']] > 1: r['notes'].add('якір повторюється')
cols = ['id', 'anchor', 'letter', 'title_uk', 'term_uk', 'term_ru', 'term_en', 'definition_uk', 'simple_uk', 'autolink', 'forms_uk', 'forms_ru', 'forms_en', 'notes']
with open(D + '/out/smartcell-abetka-terms.csv', 'w', encoding='utf-8-sig', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=cols)
    w.writeheader()
    for r in rows:
        r = dict(r); r['notes'] = '; '.join(sorted(r['notes'])); w.writerow({k: r[k] for k in cols})
print(len(rows), 'rows;', sum(1 for r in rows if r['notes']), 'with notes')
