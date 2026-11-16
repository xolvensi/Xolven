const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { dataDir } = require('./paths');

const BUNDLED_DIR = path.join(__dirname, '..', 'data', 'media');
const MEDIA_DIR = process.env.MEDIA_DIR || (dataDir ? path.join(dataDir, 'media') : BUNDLED_DIR);

function saveAudio(buffer) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  const name = Date.now() + '-' + crypto.randomBytes(4).toString('hex') + '.ogg';
  fs.writeFileSync(path.join(MEDIA_DIR, name), buffer);
  return name;
}

// Copies a file shipped with the app into the persistent media folder.
function ensureBundled(file) {
  const target = path.join(MEDIA_DIR, file);
  const source = path.join(BUNDLED_DIR, file);
  if (!fs.existsSync(target) && fs.existsSync(source)) {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    fs.copyFileSync(source, target);
  }
}

function exists(file) {
  return fs.existsSync(path.join(MEDIA_DIR, file));
}

module.exports = { MEDIA_DIR, saveAudio, ensureBundled, exists };
