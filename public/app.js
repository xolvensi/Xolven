const TAG_CLASS = {
  SOLD: 'tag-sold',
  AGREED: 'tag-agreed',
  PENDING: 'tag-pending',
  DEADLINE: 'tag-deadline',
};

const CLIENTS = {
  maria: {
    name: 'Maria Gonzalez',
    initials: 'MG',
    avatarBg: '#2EB84A',
    phone: '+1 305 555 0148',
    owner: 'Carlos R.',
    lastMessage: 'Can I get an update on the invoice?',
    hasPending: true,
    summary: 'Long-time client since 2024, runs a small retail brand. Generally responsive and pays on time, but the latest invoice has been pending for 12 days. Prefers WhatsApp over email for all communication.',
    facts: [
      { label: 'SOLD', text: 'Logo redesign + monthly maintenance plan.' },
      { label: 'AGREED', text: '$200/mo payment plan starting March.' },
      { label: 'PENDING', text: 'March invoice unpaid, final product photos not received.' },
      { label: 'DEADLINE', text: 'Logo revisions due this Friday.' },
    ],
    history: [
      { time: '9:14 AM', from: 'Maria', text: 'Hey, just checking on the invoice status, can you confirm what I owe this month?' },
      { time: '9:20 AM', from: 'Carlos', text: 'Sure, sending it over today along with the updated design files.' },
      { time: '2:03 PM', from: 'Maria', text: 'Perfect, thank you!' },
    ],
  },
  diego: {
    name: 'Diego Fernandez',
    initials: 'DF',
    avatarBg: '#378ADD',
    phone: '+1 786 555 0391',
    owner: 'Ana P.',
    lastMessage: 'Voice note (0:42)',
    hasPending: false,
    summary: 'New client onboarded last month for a social media package. Communicates mostly through voice notes, informal tone. No open issues currently, relationship is healthy.',
    facts: [
      { label: 'SOLD', text: 'Social media management package.' },
      { label: 'AGREED', text: 'Growth plan, $119/mo, content calendar every Friday.' },
      { label: 'PENDING', text: 'Nothing open right now.' },
      { label: 'DEADLINE', text: 'Next content batch due this Friday.' },
    ],
    history: [
      { time: 'Mon', from: 'Diego', text: 'Voice note transcript: loved the last post, keep that style going.' },
      { time: 'Mon', from: 'Ana', text: 'Glad to hear it! Next batch goes out Friday as usual.' },
    ],
  },
  laura: {
    name: 'Laura Mendez',
    initials: 'LM',
    avatarBg: '#D85A30',
    phone: '+1 954 555 0217',
    owner: 'Carlos R.',
    lastMessage: 'Necesito el contrato actualizado',
    hasPending: true,
    summary: 'Mixed Spanish/English communicator, runs a wholesale food business. Has an open request for an updated contract that has not been addressed in over a week.',
    facts: [
      { label: 'SOLD', text: 'Yearly Agency tier contract, renewed in January.' },
      { label: 'AGREED', text: 'Second brand can be added to the same account.' },
      { label: 'PENDING', text: 'Updated contract copy requested, no reply sent yet.' },
      { label: 'DEADLINE', text: 'Contract copy promised for tomorrow.' },
    ],
    history: [
      { time: 'Fri', from: 'Laura', text: 'Necesito el contrato actualizado para mi contador, me lo pueden mandar?' },
      { time: 'Fri', from: 'Carlos', text: 'Claro, te lo envio manana sin falta.' },
    ],
  },
};

const CLIENT_ORDER = ['maria', 'diego', 'laura'];

let selectedId = 'maria';

function renderClientList() {
  const list = document.getElementById('client-list');
  list.innerHTML = '';

  CLIENT_ORDER.forEach((id) => {
    const c = CLIENTS[id];
    const row = document.createElement('button');
    row.className = 'client-row' + (id === selectedId ? ' selected' : '');
    row.type = 'button';
    row.setAttribute('aria-label', 'Open ' + c.name);

    const avatar = document.createElement('div');
    avatar.className = 'avatar avatar-sm';
    avatar.style.background = c.avatarBg;
    avatar.textContent = c.initials;

    const info = document.createElement('div');
    info.className = 'client-info';
    const name = document.createElement('div');
    name.className = 'client-name';
    name.textContent = c.name;
    const last = document.createElement('div');
    last.className = 'client-last';
    last.textContent = c.lastMessage;
    info.append(name, last);

    row.append(avatar, info);

    if (c.hasPending) {
      const dot = document.createElement('div');
      dot.className = 'pending-dot';
      dot.setAttribute('aria-label', 'Has open items');
      row.append(dot);
    }

    row.addEventListener('click', () => {
      selectedId = id;
      renderClientList();
      renderProfile();
    });

    list.append(row);
  });
}

function renderProfile() {
  const c = CLIENTS[selectedId];

  const avatar = document.getElementById('profile-avatar');
  avatar.style.background = c.avatarBg;
  avatar.textContent = c.initials;

  document.getElementById('profile-name').textContent = c.name;
  document.getElementById('profile-meta').textContent = c.phone + ' · owned by ' + c.owner;
  document.getElementById('profile-summary').textContent = c.summary;

  const facts = document.getElementById('profile-facts');
  facts.innerHTML = '';
  c.facts.forEach((f) => {
    const row = document.createElement('div');
    row.className = 'fact-row';

    const tag = document.createElement('div');
    tag.className = 'tag ' + (TAG_CLASS[f.label] || '');
    tag.textContent = f.label;

    const text = document.createElement('div');
    text.className = 'fact-text';
    text.textContent = f.text;

    row.append(tag, text);
    facts.append(row);
  });

  const history = document.getElementById('profile-history');
  history.innerHTML = '';
  c.history.forEach((m) => {
    const row = document.createElement('div');
    row.className = 'history-row';

    const time = document.createElement('div');
    time.className = 'history-time';
    time.textContent = m.time;

    const bubble = document.createElement('div');
    bubble.className = 'history-bubble';
    const from = document.createElement('div');
    from.className = 'history-from';
    from.textContent = m.from;
    const text = document.createElement('div');
    text.className = 'history-text';
    text.textContent = m.text;
    bubble.append(from, text);

    row.append(time, bubble);
    history.append(row);
  });
}

renderClientList();
renderProfile();
