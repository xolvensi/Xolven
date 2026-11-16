const store = require('./store');
const ai = require('./ai');
const media = require('./media');
const fictionalClients = require('../data/fictional-clients.json');

// Demo names for the WhatsApp test chats. The test phone's first chat was created
// with the WhatsApp profile name, so it is renamed once and keeps its phone number.
const DEMO_AUDIO = { clientId: 'michael-carter', file: 'michael-carter.ogg' };
const RENAMES = [{ from: 'Santiago Nuñez', to: 'Ryan Mitchell' }];

// Original sample chats (and an earlier name of the voice-note demo chat), removed so
// only the WhatsApp test conversations remain.
const REMOVE_IDS = [
  'maria', 'diego', 'laura', 'sofia', 'roberto',
  'casa-luna', 'limpieza-brillante', 'studio-norte',
  'emily-carter',
];

async function applySeed() {
  const removed = store.removeClientsById(REMOVE_IDS);
  if (removed) console.log('[seed] Removed', removed, 'sample chats');

  const added = store.seedClients(fictionalClients);
  if (added) console.log('[seed] Added', added, 'demo clients');

  media.ensureBundled(DEMO_AUDIO.file);
  if (media.exists(DEMO_AUDIO.file) && store.attachAudio(DEMO_AUDIO.clientId, 0, DEMO_AUDIO.file)) {
    console.log('[seed] Attached demo voice note to', DEMO_AUDIO.clientId);
  }

  for (const { from, to } of RENAMES) {
    const client = store.renameClientByName(from, to);
    if (!client) continue;
    console.log('[seed] Renamed', from, 'to', to);
    try {
      const profile = await ai.generateClientProfile(client);
      store.updateClientProfile(client.id, profile);
    } catch (err) {
      console.error('[seed] Could not refresh profile after rename:', err.message);
    }
  }
}

function aliasName(name) {
  const found = RENAMES.find((r) => r.from.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() === String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
  return found ? found.to : name;
}

module.exports = { applySeed, aliasName };
