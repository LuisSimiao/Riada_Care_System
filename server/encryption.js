const crypto = require('crypto');
const ENCRYPTION_KEY = process.env.AES_KEY
  ? Buffer.from(process.env.AES_KEY, 'base64')
  : crypto.randomBytes(32); // fallback for dev
const IV_LENGTH = 16; // AES block size

function encrypt(text) {
  if (typeof text !== 'string') text = String(text);
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  if (typeof text !== 'string' || !text.includes(':')) return text;
  const parts = text.split(':');
  if (parts.length < 2 || parts[0].length !== 32) return text; // 16 bytes IV in hex = 32 chars
  let iv = Buffer.from(parts.shift(), 'hex');
  let encryptedText = parts.join(':');
  let decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
