import json
from collections import defaultdict

with open('Booty Reports/Raw Data/4.5/SnareBears_booty_4.5.json', encoding='utf-8') as f:
    data = json.load(f)

shares = defaultdict(float)
hits = defaultdict(int)

for entry in data:
    value = entry['value']
    plunderers = [p.strip() for p in entry['plunderers'].split(',')]
    split = value / len(plunderers)
    for p in plunderers:
        shares[p] += split
        hits[p] += 1

ranked = sorted(shares.items(), key=lambda x: -x[1])

for i, (name, total) in enumerate(ranked[:10], 1):
    print(f"#{i} {name}: {hits[name]} hits, {int(total):,} aUEC")
