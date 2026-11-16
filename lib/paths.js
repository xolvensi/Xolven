const fs = require('fs');
const os = require('os');
const path = require('path');

// Deploys rebuild the app folder, so chats, users and audio live in a folder
// outside it. Falls back to the app folder when that location is not writable.
function resolveDataDir() {
  const dir = process.env.XOLVEN_DATA_DIR || path.join(os.homedir(), '.xolven');
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return dir;
  } catch (err) {
    return null;
  }
}

module.exports = { dataDir: resolveDataDir() };
