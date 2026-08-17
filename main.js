const state = {
  content: null
};

async function loadContent() {
  const res = await fetch('/content.json');
  state.content = await res.json();
  renderContent();
  autoOpenKVTV();
}

function renderContent() {
  if (!state.content) return;

  document.getElementById('profile-content').textContent = state.content.profile;
  document.getElementById('access-content').textContent = state.content.access;
  document.getElementById('system-content').textContent = state.content.system;
}

function autoOpenKVTV() {
  openCRTMenu();
}

function openCRTMenu() {
  const overlay = document.getElementById('crtOverlay');
  const menu = document.getElementById('crtMenu');
  const frame = document.getElementById('crtFrame');

  overlay.hidden = false;
  menu.style.display = 'block';
  frame.style.display = 'none';

  // VHS static burst
  document.getElementById('vhsStatic').classList.add('active');
  setTimeout(() => {
    document.getElementById('vhsStatic').classList.remove('active');
  }, 300);
}

function loadChannel(id) {
  const channel = state.content.kvtv.channels.find(c => c.id === id);
  if (!channel) return;

  const menu = document.getElementById('crtMenu');
  const frame = document.getElementById('crtFrame');

  menu.style.display = 'none';
  frame.style.display = 'block';
  frame.src = channel.url;

  // VHS glitch
  document.getElementById('vhsTracking').classList.add('active');
  setTimeout(() => {
    document.getElementById('vhsTracking').classList.remove('active');
  }, 400);
}

document.addEventListener('keydown', e => {
  if (e.key === '1') loadChannel(1);
  if (e.key === '2') loadChannel(2);
  if (e.key === 'Escape') closeCRT();
});

document.addEventListener('click', e => {
  if (e.target.textContent.includes('1')) loadChannel(1);
  if (e.target.textContent.includes('2')) loadChannel(2);
});

function closeCRT() {
  document.getElementById('crtOverlay').hidden = true;
}

window.addEventListener('DOMContentLoaded', loadContent);
