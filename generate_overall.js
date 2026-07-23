const fs = require('fs');
const path = require('path');

// ─── Load all JSON files ─────────────────────────────────────────────
const rawDirs = [
  { dir: '4.2', file: 'SnareBears_booty_4.2_4.2.1.json', label: '4.2' },
  { dir: '4.3', file: 'SnareBears_booty_4.3_4.3.1_4.3.2.json', label: '4.3' },
  { dir: '4.4', file: 'SnareBears_booty_4.4.json', label: '4.4' },
  { dir: '4.5', file: 'SnareBears_booty_4.5.json', label: '4.5' },
  { dir: '4.6', file: 'SnareBears_booty_4.6.json', label: '4.6' },
  { dir: '4.7', file: 'SnareBears_booty_4.7.json', label: '4.7' },
  { dir: '4.8', file: 'SnareBears_booty_4.8.json', label: '4.8' },
];

const patches = [];
for (const pd of rawDirs) {
  const fp = path.resolve(__dirname, 'Booty Reports', 'Raw Data', pd.dir, pd.file);
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  patches.push({ ...pd, hits: data, count: data.length });
  console.log(`${pd.label}: ${data.length} hits`);
}

// ─── Flatten all hits ────────────────────────────────────────────────
const allHits = [];
for (const p of patches) {
  for (const h of p.hits) {
    allHits.push({ ...h, patch: p.label });
  }
}
console.log(`\nTotal hits: ${allHits.length}`);

// ─── Overall totals ──────────────────────────────────────────────────
const totalValue = allHits.reduce((s, h) => s + h.value, 0);
const totalHits = allHits.length;

// ─── Split-share per person per patch, then aggregate ────────────────
const patchRaiders = {}; // patch -> { name: { hits, splitShare, patchValue } }
const overallRaiders = {}; // name -> { hits, splitShare, patchValue, patches }

for (const p of patches) {
  patchRaiders[p.label] = {};
  for (const h of p.hits) {
    const names = h.plunderers.split(',').map(n => n.trim());
    const share = h.value / names.length;
    for (const name of names) {
      if (!patchRaiders[p.label][name]) {
        patchRaiders[p.label][name] = { hits: 0, splitShare: 0, patchValue: 0 };
      }
      patchRaiders[p.label][name].hits++;
      patchRaiders[p.label][name].splitShare += share;
    }
  }
}

// Aggregate across patches
for (const p of patches) {
  for (const [name, data] of Object.entries(patchRaiders[p.label])) {
    if (!overallRaiders[name]) {
      overallRaiders[name] = { hits: 0, splitShare: 0, patches: new Set() };
    }
    overallRaiders[name].hits += data.hits;
    overallRaiders[name].splitShare += data.splitShare;
    overallRaiders[name].patches.add(p.label);
  }
}

const raiderList = Object.entries(overallRaiders)
  .map(([name, d]) => ({ name, ...d, patchCount: d.patches.size }))
  .sort((a, b) => b.splitShare - a.splitShare);

console.log(`Unique raiders: ${raiderList.length}`);

// Top 10 plunderers by split-share
const topN = 10;
const topRaiders = raiderList.slice(0, topN);
const topNames = new Set(topRaiders.map(r => r.name));
const otherRaiders = raiderList.slice(topN);

// ─── Locations ───────────────────────────────────────────────────────
const locMap = {};
for (const h of allHits) {
  const loc = h.location;
  if (!locMap[loc]) {
    locMap[loc] = { hits: 0, value: 0, system: '', planet: '' };
  }
  locMap[loc].hits++;
  locMap[loc].value += h.value;
}

// Parse location data for system/planet labels
function parseLocation(loc) {
  const locLower = loc.toLowerCase();
  let system = 'STANTON SYSTEM';
  let planet = '';

  if (locLower.includes('ashland') || locLower.includes('seer') || locLower.includes('fallow')) {
    system = 'PYRO SYSTEM';
  } else if (locLower.includes('bueno') || locLower.includes('golden')) {
    system = 'NYX SYSTEM';
  }

  // Parse planet from location string
  const planetMap = {
    'rustville': { planet: 'Crusader', file: 'Crusader.jpg' },
    'chawla': { planet: 'Hurston', file: 'Hurston.jpg' },
    'cellin': { planet: 'Aberdeen', file: 'Aberdeen.jpg' },
    'ashland': { planet: 'Bloom', file: 'Bloom.jpg' },
    'seer': { planet: 'Bloom', file: 'Bloom.jpg' },
    'fallow': { planet: 'Bloom', file: 'Bloom.jpg' },
    'tara mills': { planet: 'Crusader', file: 'Crusader.jpg' },
    'hurston': { planet: 'Hurston', file: 'Hurston.jpg' },
    'bueno': { planet: 'Bueno', file: 'Bueno.jpg' },
    'golden rivera': { planet: 'Bueno', file: 'Bueno.jpg' },
    'vostok': { planet: 'Cuicil', file: 'Cuicil.jpg' },
    'croatoa': { planet: 'Crusader', file: 'Crusader.jpg' },
    'stanton gateway': { planet: 'Bloom', file: 'Bloom.jpg' },
  };

  for (const [key, val] of Object.entries(planetMap)) {
    if (locLower.includes(key)) {
      planet = val.file;
      if (key === 'stanton gateway') system = 'PYRO SYSTEM';
      break;
    }
  }

  return { system, planet };
}

const locList = Object.entries(locMap)
  .map(([loc, data]) => {
    const parsed = parseLocation(loc);
    return { loc, ...data, pct: ((data.hits / totalHits) * 100).toFixed(1), ...parsed };
  })
  .sort((a, b) => b.hits - a.hits);

// ─── Ships ───────────────────────────────────────────────────────────
const shipMap = {};
const manufacturerMap = {};

for (const h of allHits) {
  if (!h.ship_type) continue;
  const ship = h.ship_type;
  if (!shipMap[ship]) {
    shipMap[ship] = { hits: 0, value: 0 };
  }
  shipMap[ship].hits++;
  shipMap[ship].value += h.value;

  // Determine manufacturer from ship name
  const shipLower = ship.toLowerCase();
  let manufacturer = 'Unknown';
  if (shipLower.includes('cutlass')) manufacturer = 'Roberts Space Industries';
  else if (shipLower.includes('mercury')) manufacturer = 'Roberts Space Industries';
  else if (shipLower.includes('hermes') || shipLower.includes('condor') || shipLower.includes('quetzal')) manufacturer = 'Roberts Space Industries';
  else if (shipLower.includes('carrack')) manufacturer = 'Aegis Dynamics';
  else if (shipLower.includes('freelancer')) manufacturer = 'Quantum Enterprises';
  else if (shipLower.includes('hornet')) manufacturer = 'Aegis Dynamics';
  else if (shipLower.includes('orca') || shipLower.includes('scarab')) manufacturer = 'Roberts Space Industries';
  else if (shipLower.includes('starfarer')) manufacturer = 'Yanmei Drazi';
  else if (shipLower.includes('polaris')) manufacturer = 'Sivesa Consortium';
  else if (shipLower.includes('avenger')) manufacturer = 'Aegis Dynamics';
  else if (shipLower.includes('cyclone') || shipLower.includes('haunt')) manufacturer = 'Aegis Dynamics';
  else if (shipLower.includes('mule') || shipLower.includes('prospect')) manufacturer = 'Drake Interplanetary';
  else if (shipLower.includes('razor') || shipLower.includes('sweep')) manufacturer = 'Drake Interplanetary';
  else if (shipLower.includes('imperial')) manufacturer = 'Drake Interplanetary';
  else if (shipLower.includes('c2') || shipLower.includes('hercules') || shipLower.includes('starlifter')) manufacturer = 'Roberts Space Industries';
  else if (shipLower.includes('asgard')) manufacturer = 'Anvil Aerospace';
  else if (shipLower.includes('phoenix')) manufacturer = 'Anvil Aerospace';
  else if (shipLower.includes('atlas')) manufacturer = 'Anvil Aerospace';
  else if (shipLower.includes('vanguard') || shipLower.includes('vipera')) manufacturer = 'Anvil Aerospace';
  else if (shipLower.includes('justice') || shipLower.includes('sentinel')) manufacturer = 'Aegis Dynamics';
  else if (shipLower.includes('apex')) manufacturer = 'Anvil Aerospace';
  else if (shipLower.includes('marauder') || shipLower.includes('andur')) manufacturer = 'Sivesa Consortium';
  else if (shipLower.includes('idris') || shipLower.includes('hall')) manufacturer = 'Aegis Dynamics';
  else if (shipLower.includes('daedalus')) manufacturer = 'Aegis Dynamics';
  else if (shipLower.includes('perseus')) manufacturer = 'Aegis Dynamics';
  else if (shipLower.includes('haunter') || shipLower.includes('scythe')) manufacturer = 'Drake Interplanetary';
  else if (shipLower.includes('superior') || shipLower.includes('visor')) manufacturer = 'Roberts Space Industries';
  else if (shipLower.includes('saga')) manufacturer = 'Yanmei Drazi';
  else if (shipLower.includes('raze') || shipLower.includes('saber')) manufacturer = 'Anvil Aerospace';
  else if (shipLower.includes('talon')) manufacturer = 'Anvil Aerospace';
  else if (shipLower.includes('dreadnought')) manufacturer = 'Aegis Dynamics';
  else if (shipLower.includes('raider')) manufacturer = 'Drake Interplanetary';
  else if (shipLower.includes('vulture')) manufacturer = 'Drake Interplanetary';
  else if (shipLower.includes('ironclad') || shipLower.includes('mantis') || shipLower.includes('spider')) manufacturer = 'Drake Interplanetary';
  else if (shipLower.includes('buccaneer') || shipLower.includes('ram')) manufacturer = 'Anvil Aerospace';
  else if (shipLower.includes('cutter') || shipLower.includes('side')) manufacturer = 'Roberts Space Industries';
  else if (shipLower.includes('warden')) manufacturer = 'Anvil Aerospace';

  if (!manufacturerMap[manufacturer]) manufacturerMap[manufacturer] = {};
  if (!manufacturerMap[manufacturer][ship]) manufacturerMap[manufacturer][ship] = 0;
  manufacturerMap[manufacturer][ship] += shipMap[ship].hits;
}

const shipList = Object.entries(shipMap)
  .map(([ship, data]) => ({
    ship,
    hits: data.hits,
    value: data.value,
    pct: ((data.hits / totalHits) * 100).toFixed(1),
    manufacturer: Object.entries(manufacturerMap)
      .filter(([, m]) => m[ship])
      .map(([m]) => m)[0] || 'Unknown'
  }))
  .sort((a, b) => b.hits - a.hits);

// ─── Commodities ─────────────────────────────────────────────────────
const compMap = {};
let totalCompInstances = 0;
for (const h of allHits) {
  if (!h.commodities) continue;
  const comms = h.commodities.split(',').map(c => c.trim());
  for (const c of comms) {
    if (!compMap[c]) compMap[c] = { instances: 0, value: 0 };
    compMap[c].instances++;
    totalCompInstances++;
  }
}

const compList = Object.entries(compMap)
  .map(([name, data]) => ({
    name,
    instances: data.instances,
    value: data.value,
    pct: ((data.instances / totalCompInstances) * 100).toFixed(1)
  }))
  .sort((a, b) => b.instances - a.instances);

const maxComp = compList.length > 0 ? compList[0].instances : 1;
const maxShipPct = shipList.length > 0 ? parseFloat(shipList[0].pct) : 1;
const maxLocPct = locList.length > 0 ? parseFloat(locList[0].pct) : 1;

// ─── Biggest score ───────────────────────────────────────────────────
const biggest = allHits.reduce((max, h) => h.value > max.value ? h : max);
const biggestPct = ((biggest.value / totalValue) * 100).toFixed(1);

// ─── Smallest score ──────────────────────────────────────────────────
const smallest = allHits.reduce((min, h) => h.value < min.value ? h : min);

// ─── Systems ─────────────────────────────────────────────────────────
const systemsHit = new Set();
const locSystems = new Set();
for (const h of allHits) {
  const parsed = parseLocation(h.location);
  locSystems.add(parsed.system);
  systemsHit.add(parsed.system);
}
const systemsArr = [...locSystems];

// ─── Date range ──────────────────────────────────────────────────────
const allTimestamps = allHits.map(h => new Date(h.timestamp));
const earliest = new Date(Math.min(...allTimestamps.map(t => t.getTime())));
const latest = new Date(Math.max(...allTimestamps.map(t => t.getTime())));
const dateRangeStr = `${earliest.toISOString().split('T')[0]} to ${latest.toISOString().split('T')[0]}`;
const weekSpan = Math.round((latest - earliest) / (1000 * 60 * 60 * 24) / 7);

// ─── Average hit value ───────────────────────────────────────────────
const avgHitValue = Math.round(totalValue / totalHits).toLocaleString();

// ─── Patches with activity ──────────────────────────────────────────
const patchCount = patches.length;

// ─── Total unique plunderers across all patches ─────────────────────
const totalUniqueRaiders = raiderList.length;

// ─── Find the most common single raider across patches ──────────────
const patchVariance = raiderList.map(r => r.patchCount).sort((a, b) => b - a);
const mostConsistent = raiderList.reduce((max, r) => r.patchCount > max.patchCount ? r : max, raiderList[0]);
const mostActive = raiderList.reduce((max, r) => r.hits > max.hits ? r : max, raiderList[0]);

// ─── Find biggest single hit per patch ──────────────────────────────
const patchBiggest = patches.map(p => {
  const b = p.hits.reduce((max, h) => h.value > max.value ? h : max);
  return { patch: p.label, ...b };
});
const allBiggest = patchBiggest.reduce((max, b) => b.value > max.value ? b : max);

// ─── Find the raider with the most total patch appearances ─────────
const mostPatches = mostConsistent;

// ─── Largest split-share single hit ─────────────────────────────────
const largestSingleSplit = allHits.reduce((max, h) => {
  const share = h.value / h.plunderers.split(',').length;
  return share > max.share ? { value: h.value, share, name: 'multiple' } : max;
}, { value: 0, share: 0 });

// ─── Generate HTML ──────────────────────────────────────────────────
const top3MaxHits = top3[0].hits;

function fmt(v) { return Math.round(v).toLocaleString(); }
function fmtM(v) { 
  const m = v / 1000000;
  return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
}

// Build raider roster (exclude top 3 from general roster)
const top3Names = new Set(top3.map(r => r.name));
const rosterRaiders = otherRaiders.sort((a, b) => b.hits - a.hits);

// Build raider small cards HTML
let raiderCards = '';
for (const r of rosterRaiders) {
  const pct = Math.round((r.hits / top3MaxHits) * 100);
  raiderCards += `
      <div class="raider-small-card">
        <div class="raider-small-info">
          <div class="raider-small-name">${r.name}</div>
          <div class="raider-small-stats">${r.hits} hits across ${r.patchCount} patches</div>
        </div>
        <div class="raider-small-value">${fmtM(r.splitShare)}</div>
      </div>`;
}

// Build top plunderers HTML
let topPlunderers = '';
for (let i = 0; i < top3.length; i++) {
  const r = top3[i];
  const barWidth = Math.round((r.hits / top3MaxHits) * 100);
  topPlunderers += `
    <div class="plunderer-row">
      <div class="plunderer-rank">#${i + 1}</div>
      <div class="plunderer-name">${r.name}</div>
      <div class="plunderer-raids">${r.hits} hits · ${r.patchCount} patches</div>
      <div class="bar-wrap"><div class="bar-fill" style="width:${barWidth}%"></div></div>
      <div class="plunderer-value">${fmt(r.splitShare)} aUEC</div>
    </div>`;
}

// Build locations HTML
let locationsHtml = '';
for (let i = 0; i < Math.min(locList.length, 5); i++) {
  const l = locList[i];
  const locLower = l.loc.toLowerCase();

  let imgTag = '';
  if (l.system === 'PYRO SYSTEM') {
    imgTag = `<img src="../sc-locations/Pyro/Planets/${l.planet}.jpg" class="location-img" alt="${l.loc}">`;
  } else if (l.system === 'NYX SYSTEM') {
    imgTag = `<img src="../sc-locations/Nyx/Planets/${l.planet}.jpg" class="location-img" alt="${l.loc}">`;
  } else {
    // Stanton - use planet image
    if (l.loc.includes('Rustville') || l.loc.includes('Croatoa') || l.loc.includes('CRU-L1') || l.loc.includes('CRU-L2')) {
      imgTag = `<img src="../sc-locations/Stanton/Planets/Crusader.jpg" class="location-img" alt="${l.loc}">`;
    } else if (l.loc.includes('Chawla') || l.loc.includes('Hurston') || l.loc.includes('HUR-L')) {
      imgTag = `<img src="../sc-locations/Stanton/Planets/Hurston.jpg" class="location-img" alt="${l.loc}">`;
    } else if (l.loc.includes('Cellin') || l.loc.includes('Aberdeen')) {
      imgTag = `<img src="../sc-locations/Stanton/Planets/Aberdeen.jpg" class="location-img" alt="${l.loc}">`;
    } else if (l.loc.includes('Stanton Gateway') || l.loc.includes('Ashland') || l.loc.includes('Seer')) {
      imgTag = `<img src="../sc-locations/Pyro/Planets/Bloom.jpg" class="location-img" alt="${l.loc}">`;
    } else if (l.loc.includes('Fallow')) {
      imgTag = `<img src="../sc-locations/Pyro/Planets/Bloom.jpg" class="location-img" alt="${l.loc}">`;
    } else {
      imgTag = `<img src="../sc-locations/Stanton/Planets/Crusader.jpg" class="location-img" alt="${l.loc}">`;
    }
  }

  let systemLabel = 'Stanton';
  if (l.system === 'PYRO SYSTEM') systemLabel = 'Pyro';
  if (l.system === 'NYX SYSTEM') systemLabel = 'Nyx';

  locationsHtml += `
        <div class="location-row">
          ${imgTag}
          <div>
            <div class="location-name">${l.loc}</div>
            <div class="location-sub">${l.system}</div>
          </div>
          <div>
            <div class="location-pct">${l.pct}%</div>
            <div class="location-count">${l.hits} hits</div>
          </div>
        </div>`;
}

// Build ships HTML
let shipsHtml = '';
for (let i = 0; i < Math.min(shipList.length, 5); i++) {
  const s = shipList[i];
  const shipName = s.ship;
  const shipPath = shipName.replace(/ /g, '%20');
  const mfr = s.manufacturer;

  let imgSrc = '';
  if (mfr === 'Roberts Space Industries') imgSrc = `../sc-ship-topdown-test/Roberts%20Space%20Industries/${shipPath}.png`;
  else if (mfr === 'Aegis Dynamics') imgSrc = `../sc-ship-topdown-test/Aegis%20Dynamics/${shipPath}.png`;
  else if (mfr === 'Quantum Enterprises') imgSrc = `../sc-ship-topdown-test/Quantum%20Enterprises/${shipPath}.png`;
  else if (mfr === 'Gines Dynamics') imgSrc = `../sc-ship-topdown-test/Gines%20Dynamics/${shipPath}.png`;
  else if (mfr === 'Yanmei Drazi') imgSrc = `../sc-ship-topdown-test/Yanmei%20Drazi/${shipPath}.png`;
  else if (mfr === 'Sivesa Consortium') imgSrc = `../sc-ship-topdown-test/Sivesa%20Consortium/${shipPath}.png`;
  else if (mfr === 'Drake Interplanetary') imgSrc = `../sc-ship-topdown-test/Drake%20Interplanetary/${shipPath}.png`;
  else if (mfr === 'Crusader Industries') imgSrc = `../sc-ship-topdown-test/Crusader%20Industries/${shipPath}.png`;
  else if (mfr === 'Anvil Aerospace') imgSrc = `../sc-ship-topdown-test/Anvil%20Aerospace/${shipPath}.png`;
  else imgSrc = `../sc-ship-topdown-test/Roberts%20Space%20Industries/${shipPath}.png`;

  const displayName = shipName.includes('C2') ? 'C2 Hercules Starlifter' :
                      shipName.includes('C1') ? 'C1 Spirit' :
                      shipName;

  shipsHtml += `
      <div class="ship-row">
        <div class="ship-thumb">
          <img src="${imgSrc}" alt="${displayName}">
        </div>
        <div>
          <div class="ship-name">${displayName}</div>
          <div class="ship-count">${s.hits} hits · ${mfr}</div>
        </div>
        <div class="ship-pct">${s.pct}%</div>
      </div>`;
}

// Build commodities HTML
let commoditiesHtml = '';
for (let i = 0; i < Math.min(compList.length, 5); i++) {
  const c = compList[i];
  const barWidth = Math.round((c.instances / maxComp) * 100);
  commoditiesHtml += `
    <div class="commodity-row">
      <div class="commodity-name">${c.name}</div>
      <div class="commodity-bar-wrap"><div class="commodity-bar" style="width:${barWidth}%"></div></div>
      <div class="commodity-pct">${c.pct}%</div>
    </div>`;
}

// ─── FUN FACTS ──────────────────────────────────────────────────────
const biggestSingleName = biggest.ship_type ? `${biggest.ship_type}` : 'Unknown vessel';
const biggestLocation = biggest.location;

// Find the most commonly active raider across patches
const patch5plus = raiderList.filter(r => r.patchCount >= 5);
const patchAll7 = raiderList.filter(r => r.patchCount === 7);

// Find the highest single split-share from one hit
let maxSingleSplit = { share: 0, hit: null };
for (const h of allHits) {
  const names = h.plunderers.split(',').map(n => n.trim());
  const share = h.value / names.length;
  if (share > maxSingleSplit.share) {
    maxSingleSplit = { share, hit: h };
  }
}

// Find which patch had the most hits
const patchByHits = patches.map(p => ({ label: p.label, count: p.count }))
  .sort((a, b) => b.count - a.count);
const busiestPatch = patchByHits[0];
const quietestPatch = patchByHits[patchByHits.length - 1];

// Find total patches
const totalPatches = patches.length;

// Find the raider who participated in the most hits total
const topHitCount = mostActive;

// Calculate total unique locations
const totalLocations = locList.length;

// Calculate average split-share per patch for top raider
const topRaider = top3[0];
const topRaiderPatches = topRaider.patchCount;
const topRaiderAvgPerPatch = Math.round(topRaider.splitShare / topRaiderPatches);

// Find the patch with the most diverse raiders
const patchesWithMostRaiders = [...patches]
  .map(p => {
    const names = new Set();
    for (const h of p.hits) {
      for (const n of h.plunderers.split(',')) names.add(n.trim());
    }
    return { label: p.label, count: names.size };
  })
  .sort((a, b) => b.count - a.count);

// Find total hits by the top 3 combined
const top3TotalHits = top3.reduce((s, r) => s + r.hits, 0);
const top3PctOfTotal = ((top3TotalHits / totalHits) * 100).toFixed(1);

// Find total value of all top 3 split-share
const top3TotalValue = top3.reduce((s, r) => s + r.splitShare, 0);
const top3PctOfValue = ((top3TotalValue / totalValue) * 100).toFixed(1);

const funFacts = [
  {
    title: `A Full Patch Legacy`,
    text: `Across <strong>${totalPatches} patches</strong> (${totalHits} total hits), the SnareBears have accumulated <strong>${fmt(totalValue)} aUEC</strong> in plunder — spanning from ${earliest.toISOString().split('T')[0]} to ${latest.toISOString().split('T')[0]}, a run of approximately <strong>${weekSpan} weeks</strong> of operations.`
  },
  {
    title: `${top3[0].name} Runs the Board`,
    text: `<strong>${top3[0].name}</strong> leads all raiders with <strong>${fmt(top3[0].splitShare)} aUEC</strong> and ${top3[0].hits} hits across ${top3[0].patchCount} patches — contributing <strong>${top3PctOfValue}%</strong> of all overall plunder. A near-unanimous #1.`
  },
  {
    title: `Top 3 Domination`,
    text: `The top three plunderers alone account for <strong>${top3TotalHits} of ${totalHits} hits (${top3PctOfTotal}%)</strong> and <strong>${top3PctOfValue}%</strong> of all value — ${top3.map(r => r.name).join(', ')} form an elite tier no one else has matched.`
  },
  {
    title: `${patchAll7.length === 0 ? patch5plus.length + ' Patches of Consistency' : 'Perfect Attendance'}`,
    text: patchAll7.length > 0
      ? `<strong>${patchAll7.map(r => r.name).join(', ')}</strong> ${patchAll7.length === 1 ? 'participated in every single patch' : `${patchAll7.length} raiders participated in all ${totalPatches} patches`} — true pillars of the organization.`
      : `<strong>${patch5plus.map(r => r.name).join(', ')}</strong> ${patch5plus.length} raider${patch5plus.length > 1 ? 's were active' : ' was active'} across <strong>${patch5plus.length >= 5 ? '5 or more' : 'most'} of the ${totalPatches} patches</strong>, showing remarkable consistency through every phase of operations.`
  },
  {
    title: `The ${fmt(biggest.value).replace(/,/g, ',')} Score`,
    text: `The biggest single score of <strong>${fmt(biggest.value)} aUEC</strong> at <strong>${biggestLocation}</strong> on a ${biggest.ship_type || 'unknown ship'}${biggest.commodities ? ` carrying ${biggest.commodities}` : ''} remains the standout moment of the entire run.`
  },
  {
    title: `${locList[0].loc} — Ground Zero`,
    text: `<strong>${locList[0].loc}</strong> was the most targeted location with <strong>${locList[0].hits} hits (${locList[0].pct}%)</strong>, cementing its place as the primary hunting ground across all patches.`
  },
  {
    title: `${compList[0].name} — Most Wanted Cargo`,
    text: `<strong>${compList[0].name}</strong> appeared in <strong>${compList[0].instances} instances</strong> (${compList[0].pct}%), making it the most frequently targeted commodity across all patches and the most reliable target for the organization.`
  },
  {
    title: `${shipList[0].ship} — Favorite Target`,
    text: `The <strong>${shipList[0].ship}</strong> was targeted <strong>${shipList[0].hits} times (${shipList[0].pct}%)</strong>, more than any other ship class — a testament to its vulnerability and value on the open markets.`
  },
  {
    title: `${totalLocations} Unique Hunting Grounds`,
    text: `The SnareBears struck across <strong>${totalLocations} distinct locations</strong> spanning ${systemsArr.join(' and ')} — demonstrating broad geographic reach and the ability to operate in any environment.`
  },
  {
    title: `${totalUniqueRaiders} Total Raiders, ${weekSpan}+ Weeks of Action`,
    text: `A total of <strong>${totalUniqueRaiders} unique individuals</strong> participated in SnareBears operations at some point. <strong>${mostPatches.name}</strong> was the most consistent, hitting across ${mostPatches.patchCount} patches, while <strong>${topHitCount.name}</strong> logged the most total hits at ${topHitCount.hits}.`
  },
];

let funFactsHtml = '';
for (const ff of funFacts) {
  funFactsHtml += `
      <div class="fun-fact-item">
        <div class="fun-fact-bullet">▸</div>
        <div class="fun-fact-text">
          <strong>${ff.title}</strong> — ${ff.text}
        </div>
      </div>`;
}

// Build systems label
const systemsLabel = systemsArr.length === 1
  ? systemsArr[0].toUpperCase()
  : systemsArr.map(s => s === 'STANTON SYSTEM' ? 'STANTON' : s).join(' + ');

// ─── Helper: get ship image path ──────────────────────────────────
function getShipImagePath(shipName, manufacturer) {
  const safe = (shipName || 'Unknown').replace(/ /g, '%20');
  const mfrPaths = {
    'Roberts Space Industries': '../sc-ship-topdown-test/Roberts%20Space%20Industries/',
    'Aegis Dynamics': '../sc-ship-topdown-test/Aegis%20Dynamics/',
    'Quantum Enterprises': '../sc-ship-topdown-test/Quantum%20Enterprises/',
    'Gines Dynamics': '../sc-ship-topdown-test/Gines%20Dynamics/',
    'Yanmei Drazi': '../sc-ship-topdown-test/Yanmei%20Drazi/',
    'Sivesa Consortium': '../sc-ship-topdown-test/Sivesa%20Consortium/',
    'Drake Interplanetary': '../sc-ship-topdown-test/Drake%20Interplanetary/',
    'Crusader Industries': '../sc-ship-topdown-test/Crusader%20Industries/',
    'Anvil Aerospace': '../sc-ship-topdown-test/Anvil%20Aerospace/',
  };
  return (mfrPaths[manufacturer] || '../sc-ship-topdown-test/') + safe + '.png';
}

// ─── Full HTML ──────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SnareBears — Overall Organization Totals</title>
  <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg:        #07090f;
      --bg2:       #0c1020;
      --bg3:       #111828;
      --bg4:       #181e2e;
      --red:       #1c4e78;
      --red2:      #2568a0;
      --red-dim:   rgba(28,78,120,0.15);
      --gold:      #b08a28;
      --gold2:     #b08a28;
      --yellow:    #b08a28;
      --text:      #7a9ab8;
      --bright:    #c8dce8;
      --dim:       #3a5068;
      --border:    #141e2c;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Share Tech Mono', 'Courier New', monospace;
      width: 1200px;
      margin: 0 auto;
      padding: 36px 40px;
      position: relative;
    }

    /* Subtle noise texture */
    body::after {
      content: '';
      position: fixed;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent 0px, transparent 3px,
        rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px
      );
      pointer-events: none;
      z-index: 9999;
    }

    /* Diagonal stripe texture helper */
    .stripes {
      background-image: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 4px,
        rgba(28,78,120,0.04) 4px,
        rgba(28,78,120,0.04) 8px
      );
    }

    /* ─── HEADER ───────────────────────────────────────── */
    .header {
      display: flex;
      align-items: center;
      gap: 30px;
      padding-bottom: 28px;
      margin-bottom: 28px;
      border-bottom: 1px solid var(--border);
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: -1px; left: 0;
      width: 60%;
      height: 1px;
      background: linear-gradient(to right, var(--gold), transparent);
    }

    .logo {
      width: 110px;
      height: auto;
      filter: drop-shadow(0 0 10px rgba(28,78,120,0.5));
      flex-shrink: 0;
    }

    .header-center { flex: 1; }
    .header-eyebrow {
      font-size: 16px;
      letter-spacing: 5px;
      color: var(--text);
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .header-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 38px;
      font-weight: 900;
      color: var(--bright);
      letter-spacing: 3px;
      text-shadow: none;
      line-height: 1;
    }
    .header-sub {
      font-size: 13px;
      letter-spacing: 3px;
      color: var(--text);
      margin-top: 10px;
    }
    .header-sub span { color: var(--yellow); }

    .header-skull {
      font-size: 100px;
      line-height: 1;
      opacity: 0.07;
      position: absolute;
      right: 0; top: -10px;
      user-select: none;
    }

    /* ─── STATS ROW ────────────────────────────────────── */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-top: 2px solid var(--red);
      padding: 18px 16px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .stat-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(150deg, rgba(28,78,120,0.10) 0%, transparent 55%);
    }
    .stat-value {
      font-family: 'Orbitron', sans-serif;
      font-size: 30px;
      font-weight: 700;
      color: var(--bright);
      text-shadow: none;
      line-height: 1.1;
    }
    .stat-label {
      font-size: 12px;
      letter-spacing: 3px;
      color: var(--text);
      text-transform: uppercase;
      margin-top: 6px;
    }

    /* ─── SECTION HEADERS ──────────────────────────────── */
    .section { margin-bottom: 28px; }
    .section-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 13px;
      letter-spacing: 4px;
      color: var(--bright);
      text-transform: uppercase;
      padding: 8px 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-title::before { content: '▸'; color: var(--red); font-size: 14px; }
    .section-subtitle {
      font-size: 13px;
      letter-spacing: 2px;
      color: var(--text);
      margin-bottom: 12px;
      text-transform: uppercase;
    }

    /* ─── PLUNDERERS ───────────────────────────────────── */
    .plunderer-row {
      display: grid;
      grid-template-columns: 32px 1fr 140px minmax(0,1fr) 240px;
      align-items: center;
      gap: 16px;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
    }
    .plunderer-rank {
      font-family: 'Orbitron', sans-serif;
      color: var(--yellow);
      font-size: 16px;
      font-weight: 700;
    }
    .plunderer-name { color: var(--bright); font-size: 15px; }
    .plunderer-raids { color: var(--text); font-size: 13px; text-align: right; }
    .bar-wrap {
      background: var(--bg3);
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      border-radius: 4px;
      background: linear-gradient(to right, var(--red), var(--red2));
      box-shadow: none;
    }
    .plunderer-value {
      color: var(--yellow);
      font-size: 17px;
      text-align: right;
      text-shadow: none;
    }

    /* ─── RAIDER GRID ──────────────────────────────────── */
    .raider-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 16px;
    }
    .raider-small-card {
      background: var(--bg2);
      border: 1px solid var(--border);
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
    }
    .raider-small-card::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 2px;
      background: var(--red);
    }
    .raider-small-info {
      display: flex;
      flex-direction: column;
    }
    .raider-small-name {
      color: var(--bright);
      font-size: 14px;
      font-weight: bold;
    }
    .raider-small-stats {
      color: var(--text);
      font-size: 12px;
      letter-spacing: 1px;
      margin-top: 2px;
      text-transform: uppercase;
    }
    .raider-small-value {
      font-family: 'Orbitron', sans-serif;
      color: var(--gold);
      font-size: 14px;
      font-weight: 700;
    }

    /* ─── TWO COLUMN ───────────────────────────────────── */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-bottom: 28px;
    }

    .section-flex-col {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .hits-list {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 355px;
    }

    /* ─── LOCATIONS ────────────────────────────────────── */
    .location-row {
      display: grid;
      grid-template-columns: 58px 1fr auto;
      align-items: center;
      gap: 14px;
      padding: 11px 0;
      border-bottom: 1px solid var(--border);
    }
    .location-img {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid rgba(37,104,160,0.8);
      box-shadow: none;
    }
    .location-name { color: var(--bright); font-size: 15px; line-height: 1.4; }
    .location-sub { color: var(--text); font-size: 13px; margin-top: 3px; }
    .location-pct {
      font-family: 'Orbitron', sans-serif;
      color: var(--gold);
      font-size: 18px;
      font-weight: 700;
      text-align: right;
    }
    .location-count { color: var(--text); font-size: 13px; text-align: right; margin-top: 2px; }

    /* ─── SHIPS ────────────────────────────────────────── */
    .ship-row {
      display: grid;
      grid-template-columns: 90px 1fr auto;
      align-items: center;
      gap: 14px;
      padding: 9px 0;
      border-bottom: 1px solid var(--border);
      height: 71px;
    }
    .ship-thumb {
      width: 90px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .ship-thumb img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 0 4px rgba(176,138,40,0.2));
      mix-blend-mode: screen;
    }
    .ship-name { color: var(--bright); font-size: 15px; }
    .ship-count { color: var(--text); font-size: 13px; margin-top: 3px; }
    .ship-pct {
      font-family: 'Orbitron', sans-serif;
      color: var(--gold);
      font-size: 18px;
      font-weight: 700;
      text-align: right;
      text-shadow: none;
    }

    /* ─── COMMODITIES ──────────────────────────────────── */
    .commodity-row {
      display: grid;
      grid-template-columns: 230px minmax(0,1fr) 72px;
      align-items: center;
      gap: 16px;
      padding: 9px 0;
      border-bottom: 1px solid var(--border);
    }
    .commodity-name { color: var(--bright); font-size: 15px; }
    .commodity-bar-wrap {
      background: var(--bg3);
      height: 10px;
      border-radius: 5px;
      overflow: hidden;
    }
    .commodity-bar {
      height: 100%;
      border-radius: 5px;
      background: linear-gradient(to right, var(--red), var(--red2));
      box-shadow: none;
    }
    .commodity-pct {
      font-family: 'Orbitron', sans-serif;
      color: var(--gold);
      font-size: 18px;
      font-weight: 700;
      text-align: right;
    }

    /* ─── BIGGEST SCORE ────────────────────────────────── */
    .biggest-score {
      background: var(--bg2);
      border: 1px solid var(--yellow);
      box-shadow: none;
      padding: 26px 30px;
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 28px;
      align-items: center;
      position: relative;
      overflow: hidden;
    }
    .biggest-score::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        45deg,
        transparent, transparent 6px,
        rgba(28,78,120,0.03) 6px, rgba(28,78,120,0.03) 12px
      );
    }
    .biggest-score::after {
      content: '';
      position: absolute;
      top: 8px; right: 8px;
      width: 20px; height: 20px;
      border-top: 2px solid var(--yellow);
      border-right: 2px solid var(--yellow);
    }
    .score-skull { font-size: 54px; opacity: 0.5; }
    .score-label {
      font-size: 13px; letter-spacing: 4px;
      color: var(--text); text-transform: uppercase;
      margin-bottom: 6px;
    }
    .score-amount {
      font-family: 'Orbitron', sans-serif;
      font-size: 36px; font-weight: 900;
      color: var(--yellow);
      text-shadow: none;
    }
    .score-amount-unit {
      font-size: 18px;
      font-weight: 400;
      letter-spacing: 2px;
      opacity: 0.75;
    }
    .score-details {
      display: flex; gap: 36px; margin-top: 14px; flex-wrap: wrap;
    }
    .score-detail-label {
      font-size: 13px; letter-spacing: 2px;
      color: var(--text); text-transform: uppercase;
    }
    .score-detail-value { color: var(--bright); font-size: 16px; margin-top: 3px; }

    .score-ship-thumb {
      width: 220px; height: 130px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .score-ship-thumb img {
      max-width: 100%; max-height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 0 6px rgba(176,138,40,0.2));
      mix-blend-mode: screen;
    }

    /* ─── FUN FACTS ────────────────────────────────────── */
    .fun-facts {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-left: 3px solid var(--red);
      padding: 22px 28px;
    }
    .fun-fact-item {
      display: flex;
      gap: 16px;
      padding: 11px 0;
      border-bottom: 1px solid var(--border);
      align-items: flex-start;
    }
    .fun-fact-item:last-child { border-bottom: none; }
    .fun-fact-bullet {
      color: var(--red2);
      font-size: 18px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .fun-fact-text {
      color: var(--text);
      font-size: 16px;
      line-height: 1.65;
    }
    .fun-fact-text strong { color: var(--bright); }

    /* ─── FOOTER ───────────────────────────────────────── */
    .footer {
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--text);
      font-size: 11px;
      letter-spacing: 2px;
    }
    .footer span { text-transform: uppercase; }
  </style>
</head>
<body>

  <!-- ══ HEADER ════════════════════════════════════════════ -->
  <div class="header stripes">
    <img src="../Assets/sb_logo_intro.png" alt="SnareBears" class="logo">
    <div class="header-center">
      <div class="header-eyebrow">Black Ledger Report</div>
      <div class="header-title">ORGANIZATION TOTALS</div>
      <div class="header-sub">
        <span>${dateRangeStr}</span>
        &nbsp;·&nbsp; ~${weekSpan} WEEKS &nbsp;·&nbsp; ${systemsLabel}
        &nbsp;·&nbsp; ${totalPatches} PATCHES
      </div>
    </div>
    <div class="header-skull">☠</div>
  </div>

  <!-- ══ AT A GLANCE ═══════════════════════════════════════ -->
  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-value">${totalHits}</div>
      <div class="stat-label">Total Hits</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${(totalValue / 1000000).toFixed(1)}M</div>
      <div class="stat-label">aUEC Plundered</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalUniqueRaiders}</div>
      <div class="stat-label">Total Raiders</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${systemsLabel}</div>
      <div class="stat-label">Active Sectors</div>
    </div>
  </div>

  <!-- ══ TOP PLUNDERERS ════════════════════════════════════ -->
  <div class="section">
    <div class="section-title">Field Performance — Top Raiders</div>

${topPlunderers}

    <!-- ── Full Raider Roster ── -->
    <div class="section-subtitle" style="margin-top: 24px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">Active Raiders — Organization Totals</div>
    <div class="raider-grid">
${raiderCards}
    </div>
  </div>

  <!-- ══ LOCATIONS + SHIPS ═════════════════════════════════ -->
  <div class="two-col">

    <!-- LOCATIONS -->
    <div class="section section-flex-col">
      <div class="section-title">Top Hunting Grounds</div>

      <div class="hits-list">
${locationsHtml}
      </div>
    </div>

    <!-- SHIPS -->
    <div class="section">
      <div class="section-title">Favourite Targets — Ship Types</div>
      <div class="hits-list">
${shipsHtml}
      </div>
    </div>

  </div>

  <!-- ══ HOTTEST COMMODITIES ═══════════════════════════════ -->
  <div class="section">
    <div class="section-title">Hottest Commodities</div>
    <div class="section-subtitle">Based on commodity-type instances across all hits</div>

${commoditiesHtml}
  </div>

  <!-- ══ BIGGEST SCORE ══════════════════════════════════════ -->
  <div class="section">
    <div class="section-title">Biggest Score</div>
    <div class="biggest-score">
      <div class="score-skull">☠</div>
      <div>
        <div class="score-label">Top Haul — All Time</div>
        <div class="score-amount">${fmt(biggest.value)} <span class="score-amount-unit">aUEC</span></div>
        <div class="score-details">
          <div class="score-detail">
            <div class="score-detail-label">Victim</div>
            <div class="score-detail-value">${biggest.victim}</div>
          </div>
          <div class="score-detail">
            <div class="score-detail-label">Location</div>
            <div class="score-detail-value">${biggestLocation}</div>
          </div>
          <div class="score-detail">
            <div class="score-detail-label">Commodities</div>
            <div class="score-detail-value">${biggest.commodities || 'N/A'}</div>
          </div>
          <div class="score-detail">
            <div class="score-detail-label">Crew</div>
            <div class="score-detail-value">${biggest.plunderers}</div>
          </div>
        </div>
      </div>
      <div class="score-ship-thumb">
        <img src="${getShipImagePath(biggest.ship_type, shipList[0] ? shipList[0].manufacturer : 'Unknown')}" alt="${biggest.ship_type}">
      </div>
    </div>
  </div>

  <!-- ══ FUN FACTS ═════════════════════════════════════════ -->
  <div class="section">
    <div class="section-title">Fun Facts</div>
    <div class="fun-facts">

${funFactsHtml}

    </div>
  </div>

  <!-- ══ FOOTER ════════════════════════════════════════════ -->
  <div class="footer">
    <span>☠ Snare Bears — Piracy Operations</span>
    <span>Aggregated: ${dateRangeStr} · Source: All ${totalPatches} Patch JSON Files</span>
  </div>

</body>
</html>`;

// ─── Write file ──────────────────────────────────────────────────────
const outPath = path.resolve(__dirname, 'infographics', 'SnareBears_Overall_Infographic.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(`\nWritten: ${outPath}`);
console.log(`\nStats summary:`);
console.log(`  Total hits: ${totalHits}`);
console.log(`  Total value: ${fmt(totalValue)} aUEC`);
console.log(`  Unique raiders: ${totalUniqueRaiders}`);
console.log(`  Date range: ${dateRangeStr}`);
console.log(`  Top 3: ${top3.map(r => r.name).join(', ')}`);
console.log(`  Patches: ${totalPatches}`);
console.log(`  Systems: ${systemsArr.join(', ')}`);
