const fs = require('fs');
const geo = JSON.parse(fs.readFileSync('ne_50m_raw.geojson', 'utf8'));

// The 199 countries (NE names)
const INCLUDE = new Set([
  // Africa
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi',
  'Cabo Verde', 'Cameroon', 'Central African Republic', 'Chad', 'Comoros',
  'Democratic Republic of the Congo', 'Republic of the Congo', 'Djibouti',
  'Egypt', 'Equatorial Guinea', 'Eritrea', 'Ethiopia', 'Gabon', 'Gambia',
  'Ghana', 'Guinea', 'Guinea-Bissau', 'Ivory Coast', 'Kenya', 'Lesotho',
  'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania',
  'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria',
  'Rwanda', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia',
  'South Africa', 'South Sudan', 'Sudan', 'United Republic of Tanzania',
  'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe', 'eSwatini',
  'São Tomé and Principe', 'SÃ£o TomÃ© and Principe',
  // Americas
  'Antigua and Barbuda', 'Argentina', 'The Bahamas', 'Barbados', 'Belize',
  'Bolivia', 'Brazil', 'Canada', 'Chile', 'Colombia', 'Costa Rica',
  'Cuba', 'Dominica', 'Dominican Republic', 'Ecuador', 'El Salvador',
  'Grenada', 'Guatemala', 'Guyana', 'Haiti', 'Honduras', 'Jamaica',
  'Mexico', 'Nicaragua', 'Panama', 'Paraguay', 'Peru',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
  'Suriname', 'Trinidad and Tobago', 'United States of America', 'Uruguay',
  'Venezuela',
  // Asia
  'Afghanistan', 'Armenia', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Bhutan',
  'Brunei', 'Cambodia', 'China', 'Cyprus', 'East Timor', 'Georgia',
  'India', 'Indonesia', 'Iran', 'Iraq', 'Israel', 'Japan', 'Jordan',
  'Kazakhstan', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Lebanon', 'Malaysia',
  'Maldives', 'Mongolia', 'Myanmar', 'Nepal', 'North Korea', 'Oman',
  'Pakistan', 'Philippines', 'Qatar', 'Russia', 'Saudi Arabia', 'Singapore',
  'South Korea', 'Sri Lanka', 'Syria', 'Tajikistan', 'Thailand', 'Turkey',
  'Turkmenistan', 'United Arab Emirates', 'Uzbekistan', 'Vietnam', 'Yemen',
  // Europe
  'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium',
  'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Czechia', 'Denmark',
  'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland',
  'Ireland', 'Italy', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands',
  'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania',
  'Republic of Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden',
  'Switzerland', 'Ukraine', 'United Kingdom', 'Vatican', 'San Marino',
  // Oceania
  'Australia', 'Fiji', 'Kiribati', 'Marshall Islands',
  'Federated States of Micronesia', 'Nauru', 'New Zealand', 'Palau',
  'Papua New Guinea', 'Samoa', 'Solomon Islands', 'Tonga', 'Tuvalu',
  'Vanuatu',
  // Non-UN but commonly included
  'Kosovo', 'Palestine', 'Taiwan',
  // Territories commonly included in geography games
  'Greenland', 'Western Sahara',
]);

// Rename to common English names
const RENAME = {
  'United Republic of Tanzania': 'Tanzania',
  'Republic of Serbia': 'Serbia',
  'The Bahamas': 'Bahamas',
  'Federated States of Micronesia': 'Micronesia',
  'Cabo Verde': 'Cape Verde',
  'East Timor': 'Timor-Leste',
  'Ivory Coast': "C\u00f4te d'Ivoire",
  'eSwatini': 'Eswatini',
  'São Tomé and Principe': "S\u00e3o Tom\u00e9 and Pr\u00edncipe",
  'SÃ£o TomÃ© and Principe': "S\u00e3o Tom\u00e9 and Pr\u00edncipe",
  'Vatican': 'Vatican City',
};

// Merge these territories into their parent country
const MERGE_INTO = {
  'Somaliland': 'Somalia',
  'Northern Cyprus': 'Cyprus',
};

// Step 1: collect features to keep, and queue merges
const kept = [];
const mergeQueues = {};

for (const f of geo.features) {
  const name = f.properties.ADMIN;

  if (MERGE_INTO[name]) {
    const target = MERGE_INTO[name];
    if (!mergeQueues[target]) mergeQueues[target] = [];
    mergeQueues[target].push(f.geometry);
    continue;
  }

  if (INCLUDE.has(name)) {
    kept.push(f);
  }
}

// Step 2: merge geometries
for (const f of kept) {
  const name = f.properties.ADMIN;
  if (!mergeQueues[name]) continue;

  let coords = [];
  if (f.geometry.type === 'MultiPolygon') {
    coords = [...f.geometry.coordinates];
  } else if (f.geometry.type === 'Polygon') {
    coords = [f.geometry.coordinates];
  }

  for (const g of mergeQueues[name]) {
    if (g.type === 'MultiPolygon') {
      coords.push(...g.coordinates);
    } else if (g.type === 'Polygon') {
      coords.push(g.coordinates);
    }
  }

  f.geometry = { type: 'MultiPolygon', coordinates: coords };
}

// Step 3: Douglas-Peucker simplification
// Tolerance in degrees — 0.03 ≈ ~3km, removes fine coastline detail while keeping country shapes
const TOLERANCE = 0.015;

function sqDist(p, a, b) {
  let dx = b[0] - a[0], dy = b[1] - a[1];
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
    if (t > 1) { a = b; }
    else if (t > 0) { a = [a[0] + dx * t, a[1] + dy * t]; }
  }
  dx = p[0] - a[0]; dy = p[1] - a[1];
  return dx * dx + dy * dy;
}

function simplifyRing(coords, tolerance) {
  if (coords.length <= 4) return coords; // minimum for a valid ring
  const sqTol = tolerance * tolerance;
  const len = coords.length;
  const keep = new Uint8Array(len);
  keep[0] = 1; keep[len - 1] = 1;
  const stack = [[0, len - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxSqDist = 0, index = 0;
    for (let i = first + 1; i < last; i++) {
      const d = sqDist(coords[i], coords[first], coords[last]);
      if (d > maxSqDist) { maxSqDist = d; index = i; }
    }
    if (maxSqDist > sqTol) {
      keep[index] = 1;
      if (index - first > 1) stack.push([first, index]);
      if (last - index > 1) stack.push([index, last]);
    }
  }
  const result = [];
  for (let i = 0; i < len; i++) {
    if (keep[i]) result.push(coords[i]);
  }
  // Ensure ring is closed
  if (result.length >= 3) {
    const f = result[0], l = result[result.length - 1];
    if (f[0] !== l[0] || f[1] !== l[1]) result.push([...f]);
  }
  return result.length >= 4 ? result : coords;
}

function simplifyGeometry(geom, tolerance) {
  if (geom.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geom.coordinates.map(ring => simplifyRing(ring, tolerance)),
    };
  }
  if (geom.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geom.coordinates.map(polygon =>
        polygon.map(ring => simplifyRing(ring, tolerance))
      ),
    };
  }
  return geom;
}

// Step 4: build clean output with simplified geometry
const result = {
  type: 'FeatureCollection',
  features: kept.map(f => {
    const neName = f.properties.ADMIN;
    const displayName = RENAME[neName] || neName;
    return {
      type: 'Feature',
      geometry: simplifyGeometry(f.geometry, TOLERANCE),
      properties: {
        ADMIN: displayName,
        NAME: displayName,
        ISO_A3: f.properties.ISO_A3 || 'UNK',
        CONTINENT: f.properties.CONTINENT,
        REGION_UN: f.properties.REGION_UN,
      }
    };
  })
};

// Write
const out = JSON.stringify(result);
fs.writeFileSync('public/data/countries.geojson', out);

const finalNames = result.features.map(f => f.properties.ADMIN).sort();
console.log('Total countries:', result.features.length);
console.log('File size:', (out.length / 1024).toFixed(0), 'KB');
console.log('');

// Verify against target 199
const TARGET = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria','Azerbaijan',
  'Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi',
  'Cambodia','Cameroon','Canada','Cape Verde','Central African Republic','Chad','Chile','China','Colombia','Comoros','Costa Rica','Croatia','Cuba','Cyprus','Czechia',
  "C\u00f4te d'Ivoire",
  'Democratic Republic of the Congo','Denmark','Djibouti','Dominica','Dominican Republic',
  'Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Eswatini','Estonia','Ethiopia',
  'Fiji','Finland','France',
  'Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana',
  'Haiti','Honduras','Hungary',
  'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy',
  'Jamaica','Japan','Jordan',
  'Kazakhstan','Kenya','Kiribati','Kosovo','Kuwait','Kyrgyzstan',
  'Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg',
  'Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar',
  'Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway',
  'Oman',
  'Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal',
  'Qatar',
  'Republic of the Congo','Romania','Russia','Rwanda',
  'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino',
  "S\u00e3o Tom\u00e9 and Pr\u00edncipe",
  'Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria',
  'Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu',
  'Uganda','Ukraine','United Arab Emirates','United Kingdom','United States of America','Uruguay','Uzbekistan',
  'Vanuatu','Vatican City','Venezuela','Vietnam',
  'Yemen',
  'Zambia','Zimbabwe',
  'Taiwan','Palestine',
  'Greenland','Western Sahara',
];

const targetSet = new Set(TARGET);
const finalSet = new Set(finalNames);
const missing = [...targetSet].filter(n => !finalSet.has(n));
const extra = finalNames.filter(n => !targetSet.has(n));

if (missing.length) {
  console.log('MISSING (' + missing.length + '):');
  missing.forEach(n => console.log('  -', n));
}
if (extra.length) {
  console.log('EXTRA (' + extra.length + '):');
  extra.forEach(n => console.log('  +', n));
}
if (!missing.length && !extra.length) {
  console.log('PERFECT 197 match!');
}
