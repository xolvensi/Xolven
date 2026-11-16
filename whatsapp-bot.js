// Standalone runner: connects WhatsApp without the dashboard and prints the QR in the terminal.
require('dotenv').config();
if (process.argv[2]) process.env.WHATSAPP_OWNER_ID = process.argv[2];

const qrcode = require('qrcode-terminal');
const whatsapp = require('./lib/whatsapp');

whatsapp.start({
  onQr: (qr) => {
    console.log('\nEscanea este código QR con WhatsApp (Dispositivos vinculados):\n');
    qrcode.generate(qr, { small: true });
  },
});
