import json
from collections import defaultdict

data = json.load(open('Booty Reports/Raw Data/4.3/SnareBears_booty_4.3_4.3.1_4.3.2.json', encoding='utf-8'))
plunderer_totals = defaultdict(float)

for entry in data:
    plunderers = [n.strip() for n in entry['plunderers'].split(',')]
    share = entry['value'] / len(plunderers)
    for n in plunderers:
        plunderer_totals[n] += share

top10 = sorted(plunderer_totals.items(), key=lambda x: -x[1])[:10]
print('Top 10:', [(n, round(v,2)) for n,v in top10])
print('Sum:', round(sum(plunderer_totals.values())))
