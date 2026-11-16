const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MEDIA_DIR = process.env.MEDIA_DIR || path.join(__dirname, '..', 'data', 'media');

function saveAudio(buffer) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  const name = Date.now() + '-' + crypto.randomBytes(4).toString('hex') + '.ogg';
  fs.writeFileSync(path.join(MEDIA_DIR, name), buffer);
  return name;
}

function exists(file) {
  return fs.existsSync(path.join(MEDIA_DIR, file));
}

module.exports = { MEDIA_DIR, saveAudio, exists };
