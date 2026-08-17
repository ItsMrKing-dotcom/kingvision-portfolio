const state = {
  content: null
};

async function loadContent() {
  try {
    const res = await fetch('/content.json');
    state.content = await res.json();
    renderContent();
  } catch (e) {
    console.warn('Could not load content.json', e);
  }
}

function renderContent() {
  if (!state.content) return;
  
  // Profile
  const prof = document.getElementById('profile-content');
  if (prof) prof.textContent = state.content.profile || '';
  
  // System
  const sys = document.getElementById('system-content');
  if (sys) sys.textContent = state.content.system || '';
  
  // Access
  const acc = document.getElementById('access-content');
  if (acc) acc.textContent = state.content.access || '';
  
  // Media
  const media = document.getElementById('media');
  media.innerHTML = '';
  (state.content.media || []).forEach(item => {
    const card = document.createElement('a');
    card.className = 'media-card';
    card.href = item.link || '#';
    card.target = item.link ? '_blank' : '_self';
    card.rel = item.link ? 'noopener noreferrer' : '';
    card.innerHTML = `
      ${item.thumbnail ? `<img src="${item.thumbnail}" alt="${item.title}" class="media-thumb" />` : ''}
      <div class="media-title">${item.title || ''}</div>
      <div class="media-desc">${item.description || ''}</div>
    `;
    media.appendChild(card);
  });
}

function setupNav() {
  const links = document.querySelectorAll('.top-bar a');
  const sections = document.querySelectorAll('.section');
  
  function showSection(id) {
    sections.forEach(s => s.hidden = s.id !== id);
  }
  
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.dataset.section;
      showSection(id);
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  });
  
  // Default
  showSection('profile');
}

function setupVHS() {
  const vhsStatic = document.getElementById('vhsStatic');
  const vhsTracking = document.getElementById('vhsTracking');
  
  // Occasional static
  setInterval(() => {
    if (Math.random() < 0.08) {
      vhsStatic.classList.add('active');
      setTimeout(() => vhsStatic.classList.remove('active'), 60 + Math.random()*80);
    }
  }, 900);
  
  // Occasional tracking lines
  setInterval(() => {
    if (Math.random() < 0.06) {
      vhsTracking.classList.add('active');
      setTimeout(() => vhsTracking.classList.remove('active'), 180 + Math.random()*120);
    }
  }, 1200);
}

function setupCRT() {
  const overlay = document.getElementById('crtOverlay');
  const video = overlay.querySelector('video');
  
  // Show CRT ID on first load for ~3–4 seconds (optional)
  if (!sessionStorage.getItem('crtShown')) {
    overlay.hidden = false;
    video.play();
    setTimeout(() => {
      overlay.hidden = true;
      sessionStorage.setItem('crtShown', 'true');
    }, 3800);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  loadContent();
  setupNav();
  setupVHS();
  setupCRT();
});
