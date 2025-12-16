#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const util = require('util');

// Hardcoded base64 AES key (insecure; do not commit to public repos)
process.env.AES_KEY = '2VNK5/bCKuB8RCIRCmY+WYgFda1PISt3yyeyEdH222E=';

// Require modules after AES_KEY is set so encryption.js picks it up
const db = require('./db');
const { decrypt } = require('./encryption');

const query = util.promisify(db.query).bind(db);

function safeDecrypt(val) {
  if (val === null || val === undefined) return '';
  if (typeof val !== 'string') return String(val);
  if (!val.includes(':')) return val; // not in expected encrypted format
  try {
    return decrypt(val);
  } catch (e) {
    console.warn('[export_db_csv] decrypt failed, returning original value:', e.message);
    return val;
  }
}

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  return '"' + s.replace(/"/g, '""') + '"';
}

(async function main() {
  try {
    console.log('[export_db_csv] querying database...');
    const envRows = await query('SELECT device_id, timestamp, temperature_c, humidity_percent, co_ppm, co2_ppm FROM environment_readings');
    const alertRows = await query('SELECT device_id, timestamp, event_type, acknowledged FROM alerts');

    const outDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

    // environment_readings.csv
    const envHeader = 'device_id,timestamp,temperature_c,humidity_percent,co_ppm,co2_ppm\n';
    const envLines = envRows.map(r => {
      const deviceId = safeDecrypt(r.device_id);
      const ts = r.timestamp; // timestamps are stored plaintext; leave as-is
      const temp = safeDecrypt(r.temperature_c);
      const hum = safeDecrypt(r.humidity_percent);
      const co = safeDecrypt(r.co_ppm);
      const co2 = safeDecrypt(r.co2_ppm);
      // quote and escape fields to be safe
      return [escapeCsv(deviceId), escapeCsv(ts), escapeCsv(temp), escapeCsv(hum), escapeCsv(co), escapeCsv(co2)].join(',');
    });
    fs.writeFileSync(path.join(outDir, 'environment_readings.csv'), envHeader + envLines.join('\n') + '\n', 'utf8');
    console.log('[export_db_csv] wrote environment_readings.csv');

    // alerts.csv
    const alertHeader = 'device_id,timestamp,event_type,acknowledged\n';
    const alertLines = alertRows.map(r => {
      const deviceId = safeDecrypt(r.device_id);
      const ts = r.timestamp; // timestamps stored plaintext
      const event = safeDecrypt(r.event_type);
      const ack = r.acknowledged;
      return [escapeCsv(deviceId), escapeCsv(ts), escapeCsv(event), escapeCsv(ack)].join(',');
    });
    fs.writeFileSync(path.join(outDir, 'alerts.csv'), alertHeader + alertLines.join('\n') + '\n', 'utf8');
    console.log('[export_db_csv] wrote alerts.csv');

    console.log('[export_db_csv] done. Files in:', outDir);
    process.exit(0);
  } catch (err) {
    console.error('[export_db_csv] error:', err);
    process.exit(1);
  }
})();
