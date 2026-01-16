// MQTT connection test script
// Usage examples (PowerShell):
// set OPENAI_API_KEY=... ; node .\server\test_mqtt_connection.js
// Or set broker options:
// $env:MQTT_BROKER='mqtt.example.local'; $env:MQTT_PORT='8883'; $env:MQTT_USER='user'; $env:MQTT_PASS='pass'; node .\server\test_mqtt_connection.js

const mqtt = require('mqtt');
const fs = require('fs');

// Hardcoded broker credentials (as requested)
const BROKER = 'mqtt.livy.systems';
const PORT = '8883';
const PROTOCOL = 'mqtts'; // mqtt, mqtts
const USER = 'wN5Bw9ZFjAsz';
const PASS = 'TqJhQhdi8DzZot20bZWJDIVBNTznuPZWSDTjkhNVCq41U0N2NRbhM6oFrUMryCRT';
const CLIENT_ID = 'iVXKvsJmWMD9';
const PROTOCOL_VERSION = parseInt(process.env.MQTT_PROTOCOL_VERSION || '4', 10); // 4 => MQTT 3.1.1, 5 => MQTT 5.0
const CA_PATH = process.env.MQTT_CA_PATH; // optional path to CA pem
const CERT_PATH = process.env.MQTT_CERT_PATH; // optional client cert
const KEY_PATH = process.env.MQTT_KEY_PATH; // optional client key
const REJECT_UNAUTHORIZED = process.env.MQTT_REJECT_UNAUTHORIZED === 'false' ? false : true;

const url = `${PROTOCOL}://${BROKER}:${PORT}`;
console.log(`Connecting to ${url} as ${CLIENT_ID} (protocolVersion ${PROTOCOL_VERSION})`);

const options = {
  clientId: CLIENT_ID,
  protocolVersion: PROTOCOL_VERSION,
  username: USER || undefined,
  password: PASS || undefined,
  rejectUnauthorized: REJECT_UNAUTHORIZED,
  connectTimeout: 30_000,
  keepalive: 30,
  reconnectPeriod: 5000
};

try {
  if (CA_PATH && fs.existsSync(CA_PATH)) {
    options.ca = fs.readFileSync(CA_PATH);
    console.log('Loaded CA from', CA_PATH);
  }
  if (CERT_PATH && fs.existsSync(CERT_PATH) && KEY_PATH && fs.existsSync(KEY_PATH)) {
    options.cert = fs.readFileSync(CERT_PATH);
    options.key = fs.readFileSync(KEY_PATH);
    console.log('Loaded client cert/key');
  }
} catch (err) {
  console.error('Failed loading TLS files:', err.message);
}

let client = null;
let attemptedInsecure = false;

function attachListeners(c) {
  c.on('connect', (connack) => {
    console.log(`[connect] connected, connack:`, connack);

    // Inspect TLS socket info if available
    try {
      const stream = c.stream; // may be a TLSSocket for mqtts
      if (stream && typeof stream.getPeerCertificate === 'function') {
        console.log('[tls] authorized:', stream.authorized);
        try {
          const peer = stream.getPeerCertificate(true);
          console.log('[tls] peer cert subject:', peer && peer.subject ? peer.subject : peer);
        } catch (e) {
          console.log('[tls] failed getPeerCertificate:', e && e.message);
        }
      }
    } catch (err) {
      console.log('[tls] inspect failed', err && err.message);
    }

    // Subscribe to a test topic
    c.subscribe('alive/#', { qos: 0 }, (err, granted) => {
      if (err) console.error('[subscribe] error', err);
      else console.log('[subscribe] granted', granted);
    });

    // Publish a test message
    const payload = JSON.stringify({ clientId: c.options && c.options.clientId ? c.options.clientId : CLIENT_ID, ts: new Date().toISOString() });
    c.publish('test/connection', payload, { qos: 0, retain: false }, (err) => {
      if (err) console.error('[publish] error', err);
      else console.log(`[publish] test/connection -> ${payload}`);
    });
  });

  c.on('reconnect', () => console.log('[reconnect] trying to reconnect'));
  c.on('close', () => console.log('[close] connection closed'));
  c.on('offline', () => console.log('[offline] client offline'));
  c.on('end', () => console.log('[end] client ended'));
  c.on('error', (err) => {
    const msg = err && err.message ? err.message : String(err);
    console.error('[error]', msg);
    // If cert verification failed, retry once with insecure option
    if (!attemptedInsecure && /unable to verify the first certificate/i.test(msg)) {
      attemptedInsecure = true;
      console.warn('[info] Certificate verification failed — retrying once with rejectUnauthorized=false (insecure)');
      try {
        c.end(true);
      } catch (e) {}
      setTimeout(() => startClient(true), 500);
    }
  });

  c.on('message', (topic, message) => {
    console.log('[message]', topic, message.toString());
  });
}

function startClient(forceInsecure = false) {
  if (client) {
    try { client.end(true); } catch (e) {}
    client = null;
  }
  if (forceInsecure) {
    options.rejectUnauthorized = false;
    // make client id unique for the attempt
    options.clientId = CLIENT_ID + '-insecure';
  }
  console.log(`[info] Starting client (rejectUnauthorized=${options.rejectUnauthorized})`);
  client = mqtt.connect(url, options);
  attachListeners(client);
}

// Start initial connect
startClient(false);

// Exit after timeout (30s) to avoid hanging
const EXIT_AFTER_MS = parseInt(process.env.MQTT_TEST_TIMEOUT_MS || '30000', 10);
console.log(`[info] Test will end after ${EXIT_AFTER_MS}ms (or Ctrl-C to cancel)`);
setTimeout(() => {
  try {
    console.log('[info] Ending client and exiting');
    client.end(true, () => process.exit(0));
  } catch (e) {
    console.log('[info] Forced exit');
    process.exit(0);
  }
}, EXIT_AFTER_MS);
