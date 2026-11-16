const store = require('./store');
const ai = require('./ai');
const fictionalClients = require('../data/fictional-clients.json');

// Demo names for the WhatsApp test chats. The test phone's first chat was created
// with the WhatsApp profile name, so it is renamed once and keeps its phone number.
const RENAMES = [{ from: 'Santiago Nuñez', to: 'Ryan Mitchell' }];

async function applySeed() {
  const added = store.seedClients(fictionalClients);
  if (added) console.log('[seed] Added', added, 'demo clients');

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

module.exports = { applySeed };
