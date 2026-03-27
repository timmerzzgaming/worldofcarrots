/**
 * Download US states GeoJSON from US Census Bureau cartographic boundary files
 * and process it into a clean format for the game.
 *
 * Usage: node scripts/build-us-states.js
 * Output: public/data/us-states.geojson
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

// US Census Bureau 20m cartographic boundary — public domain
const SOURCE_URL = 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json';

// Fallback: Census Bureau direct (500k resolution, smaller file)
const FALLBACK_URL = 'https://eric.clst.org/assets/wiki/uploads/Stuff/gz_2010_us_040_00_500k.json';

const OUTPUT = path.join(__dirname, '..', 'public', 'data', 'us-states.geojson');

// Region assignments for each state
const STATE_REGIONS = {
  'Alabama': 'Southeast', 'Alaska': 'West', 'Arizona': 'Southwest', 'Arkansas': 'Southeast',
  'California': 'West', 'Colorado': 'West', 'Connecticut': 'Northeast', 'Delaware': 'Northeast',
  'Florida': 'Southeast', 'Georgia': 'Southeast', 'Hawaii': 'West', 'Idaho': 'West',
  'Illinois': 'Midwest', 'Indiana': 'Midwest', 'Iowa': 'Midwest', 'Kansas': 'Midwest',
  'Kentucky': 'Southeast', 'Louisiana': 'Southeast', 'Maine': 'Northeast', 'Maryland': 'Northeast',
  'Massachusetts': 'Northeast', 'Michigan': 'Midwest', 'Minnesota': 'Midwest',
  'Mississippi': 'Southeast', 'Missouri': 'Midwest', 'Montana': 'West', 'Nebraska': 'Midwest',
  'Nevada': 'West', 'New Hampshire': 'Northeast', 'New Jersey': 'Northeast',
  'New Mexico': 'Southwest', 'New York': 'Northeast', 'North Carolina': 'Southeast',
  'North Dakota': 'Midwest', 'Ohio': 'Midwest', 'Oklahoma': 'Southwest', 'Oregon': 'West',
  'Pennsylvania': 'Northeast', 'Rhode Island': 'Northeast', 'South Carolina': 'Southeast',
  'South Dakota': 'Midwest', 'Tennessee': 'Southeast', 'Texas': 'Southwest', 'Utah': 'West',
  'Vermont': 'Northeast', 'Virginia': 'Southeast', 'Washington': 'West',
  'West Virginia': 'Southeast', 'Wisconsin': 'Midwest', 'Wyoming': 'West',
};

const STATE_ABBREVS = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI',
  'Wyoming': 'WY',
};

// 10-color palette index per state for the colorful map (manually assigned to avoid neighbor conflicts)
const STATE_COLOR_INDEX = {
  'Alabama': 0, 'Alaska': 2, 'Arizona': 3, 'Arkansas': 4, 'California': 5,
  'Colorado': 1, 'Connecticut': 6, 'Delaware': 7, 'Florida': 8, 'Georgia': 9,
  'Hawaii': 3, 'Idaho': 0, 'Illinois': 2, 'Indiana': 5, 'Iowa': 3,
  'Kansas': 6, 'Kentucky': 7, 'Louisiana': 1, 'Maine': 0, 'Maryland': 4,
  'Massachusetts': 2, 'Michigan': 8, 'Minnesota': 9, 'Mississippi': 5,
  'Missouri': 0, 'Montana': 4, 'Nebraska': 8, 'Nevada': 7, 'New Hampshire': 3,
  'New Jersey': 1, 'New Mexico': 9, 'New York': 5, 'North Carolina': 3,
  'North Dakota': 6, 'Ohio': 1, 'Oklahoma': 2, 'Oregon': 9, 'Pennsylvania': 8,
  'Rhode Island': 0, 'South Carolina': 6, 'South Dakota': 2, 'Tennessee': 4,
  'Texas': 7, 'Utah': 6, 'Vermont': 8, 'Virginia': 9, 'Washington': 1,
  'West Virginia': 2, 'Wisconsin': 0, 'Wyoming': 3,
};

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'GeoMaster-Build' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('Downloading US states GeoJSON...');

  let raw;
  try {
    raw = await fetch(SOURCE_URL);
  } catch (e) {
    console.log('Primary source failed, trying fallback...');
    raw = await fetch(FALLBACK_URL);
  }

  const geojson = JSON.parse(raw);
  console.log(`Loaded ${geojson.features.length} features`);

  // Filter to 50 states only, normalize properties
  const states = geojson.features
    .filter((f) => {
      const name = f.properties.NAME || f.properties.name;
      return name && STATE_ABBREVS[name];
    })
    .map((f) => {
      const name = f.properties.NAME || f.properties.name;
      return {
        type: 'Feature',
        properties: {
          NAME: name,
          ABBREV: STATE_ABBREVS[name],
          REGION: STATE_REGIONS[name],
          COLOR_IDX: STATE_COLOR_INDEX[name] ?? 0,
        },
        geometry: f.geometry,
      };
    });

  console.log(`Processed ${states.length} states`);

  if (states.length !== 50) {
    console.warn(`WARNING: Expected 50 states, got ${states.length}`);
    const found = new Set(states.map(s => s.properties.NAME));
    const missing = Object.keys(STATE_ABBREVS).filter(n => !found.has(n));
    if (missing.length) console.warn('Missing:', missing.join(', '));
  }

  const output = {
    type: 'FeatureCollection',
    features: states,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(output));
  const sizeMB = (Buffer.byteLength(JSON.stringify(output)) / 1024 / 1024).toFixed(2);
  console.log(`Written ${OUTPUT} (${sizeMB} MB, ${states.length} states)`);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
