const state = {
  content: null
};

async function loadContent() {
  try {
    const res = await fetch('/content.json');
    if (!res.ok) throw new Error(`Content request failed: ${res.status}`);
    state.content = await res.json();
    renderContent();
  } catch (error) {
    console.warn('Could not load content.json', error);
  }
}

function renderContent() {
  if (!state.content) return;

  const profile = document.getElementById('profile-content');
  if (profile) profile.textContent = state.content.profile || '';

  const system = document.getElementById('system-content');
  if (system) system.textContent = state.content.system || '';

  const access = document.getElementById('access-content');
  if (access) access.textContent = state.content.access || '';

  const media = document.getElementById('media');
  if (!media) return;

  media.innerHTML = '';
  (state.content.media || []).forEach(item => {
    const card = document.createElement('a');
    card.className = 'media-card';
    card.href = item.link || '#';
    card.target = item.link ? '_blank' : '_self';
    card.rel = item.link ? 'noopener noreferrer' : '';

    if (item.thumbnail) {
      const image = document.createElement('img');
      image.src = item.thumbnail;
      image.alt = item.title || '';
      image.className = 'media-thumb';
      card.appendChild(image);
    }

    const title = document.createElement('div');
    title.className = 'media-title';
    title.textContent = item.title || '';
    card.appendChild(title);

    const description = document.createElement('div');
    description.className = 'media-desc';
    description.textContent = item.description || '';
    card.appendChild(description);

    media.appendChild(card);
  });
}

function setupNav() {
  const links = document.querySelectorAll('.top-bar a');
  const sections = document.querySelectorAll('.section');

  function showSection(id) {
    sections.forEach(section => {
      section.hidden = section.id !== id;
    });
  }

  links.forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      showSection(link.dataset.section);
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  });

  showSection('profile');
}

function setupVHS() {
  const vhsStatic = document.getElementById('vhsStatic');
  const vhsTracking = document.getElementById('vhsTracking');

  setInterval(() => {
    if (Math.random() < 0.08) {
      vhsStatic.classList.add('active');
      setTimeout(() => vhsStatic.classList.remove('active'), 60 + Math.random() * 80);
    }
  }, 900);

  setInterval(() => {
    if (Math.random() < 0.06) {
      vhsTracking.classList.add('active');
      setTimeout(() => vhsTracking.classList.remove('active'), 180 + Math.random() * 120);
    }
  }, 1200);
}

function setupCRT() {
  const overlay = document.getElementById('crtOverlay');
  const video = overlay.querySelector('video');

  if (!sessionStorage.getItem('crtShown')) {
    overlay.hidden = false;
    video.play().catch(() => {});
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
