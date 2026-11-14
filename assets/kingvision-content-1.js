const state = { content: null };

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function loadContent() {
  try {
    const response = await fetch('/content.json');
    if (!response.ok) throw new Error(`Content request failed: ${response.status}`);
    state.content = await response.json();
    renderArchive();
    setupSignalPlayer();
  } catch (error) {
    console.warn('Could not load content.json', error);
    for (const id of ['media', 'terminalLinks']) {
      const element = document.getElementById(id);
      if (element) {
        element.innerHTML =
          '<p class="fine-print">Archive index is temporarily unavailable. Direct records remain in <a href="#access">ACCESS</a>.</p>';
      }
    }
  }
}

function encodeMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return encodeURI(url);
}

function renderArchive() {
  const archive = state.content?.archive;
  const catContainer = document.getElementById('terminalCategories');
  const links = document.getElementById('terminalLinks');
  const promptEl = document.getElementById('terminalPrompt');
  const countEl = document.getElementById('terminalCount');
  if (!archive || !catContainer || !links) return;

  const categories = archive.categories || [];
  const records = archive.records || [];
  state.archive = {
    categories,
    records,
    activeCategory: state.archive?.activeCategory || categories[0]?.id || 'records',
    selectedRecord: state.archive?.selectedRecord || null,
  };

  function renderCategoryTabs() {
    catContainer.replaceChildren();
    categories.forEach((cat, idx) => {
      const catCount = records.filter((r) => r.category === cat.id).length;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'terminal-cat-btn';
      btn.role = 'tab';
      btn.dataset.category = cat.id;
      btn.setAttribute('aria-selected', cat.id === state.archive.activeCategory ? 'true' : 'false');
      btn.innerHTML = `<span>${cat.label}</span><span class="terminal-cat-count">(${catCount})</span>`;
      btn.addEventListener('click', () => {
        state.archive.activeCategory = cat.id;
        renderCategoryTabs();
        renderRecordList();
      });
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const dir = e.key === 'ArrowRight' ? 1 : -1;
          const next = (idx + dir + categories.length) % categories.length;
          const nextCat = categories[next];
          state.archive.activeCategory = nextCat.id;
          renderCategoryTabs();
          renderRecordList();
          catContainer.children[next]?.focus();
        }
      });
      catContainer.appendChild(btn);
    });
  }

  function renderRecordList() {
    const activeCat = categories.find((c) => c.id === state.archive.activeCategory);
    const items = records.filter((r) => r.category === state.archive.activeCategory);
    if (promptEl) {
      promptEl.textContent = `> ${activeCat?.label || 'ARCHIVE'} // ${activeCat?.description || ''}`;
    }
    if (countEl) {
      countEl.textContent = `${items.length} RECORDS`;
    }
    links.replaceChildren();
    items.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'terminal-record-btn';
      if (state.archive.selectedRecord?.id === item.id) btn.classList.add('is-selected');
      btn.dataset.recordId = item.id;

      const idSpan = document.createElement('span');
      idSpan.className = 'terminal-rec-id';
      idSpan.textContent = item.id;

      const copyDiv = document.createElement('div');
      copyDiv.className = 'terminal-rec-copy';
      const titleEl = document.createElement('strong');
      titleEl.textContent = item.title;
      const descEl = document.createElement('small');
      descEl.textContent = `${item.group} · ${item.description}`;
      copyDiv.append(titleEl, descEl);

      const badge = document.createElement('span');
      badge.className = item.type === 'video' ? 'terminal-rec-badge' : 'terminal-rec-badge is-static';
      badge.textContent = item.type === 'video' ? 'VIDEO' : 'STATIC';

      btn.append(idSpan, copyDiv, badge);
      btn.addEventListener('click', () => state.onArchiveRecordSelect?.(item, btn));
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const dir = e.key === 'ArrowDown' ? 1 : -1;
          const next = (idx + dir + items.length) % items.length;
          links.children[next]?.focus();
        }
      });
      links.appendChild(btn);
    });
  }

  state.renderArchiveTerminal = (categoryId, highlightId) => {
    if (categoryId) state.archive.activeCategory = categoryId;
    if (highlightId) {
      state.archive.selectedRecord = records.find((r) => r.id === highlightId) || state.archive.selectedRecord;
    }
    renderCategoryTabs();
    renderRecordList();
  };

  renderCategoryTabs();
  renderRecordList();
}

function setupSignalPlayer() {
  const signal = state.content?.signal;
  const audio = document.getElementById('signalAudio');
  const canvas = document.getElementById('signalWaveform');
  if (!signal || !signal.tracks?.length || !audio || !canvas) return;

  const tracks = signal.tracks;
  const ctx = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const heroPillEl = document.getElementById('signalHeroPill');
  const onAirBadgeEl = document.getElementById('signalOnAirBadge');
  const playerWrapEl = document.getElementById('signalPlayer');
  const scrubEl = document.getElementById('signalScrub');
  const curTimeEl = document.getElementById('signalCurrentTime');
  const durTimeEl = document.getElementById('signalDuration');
  const queueEl = document.getElementById('signalQueueCounter');
  const statusReadoutEl = document.getElementById('signalStatusReadout');
  const progressFillEl = document.getElementById('signalProgressFill');
  const playBtn = document.getElementById('signalPlay');
  const prevBtn = document.getElementById('signalPrev');
  const nextBtn = document.getElementById('signalNext');
  const repeatBtn = document.getElementById('signalRepeat');
  const speedBtn = document.getElementById('signalSpeed');
  const muteBtn = document.getElementById('signalMute');
  const volumeRange = document.getElementById('signalVolume');
  const notchEls = [...document.querySelectorAll('#signalVolumeNotches .vol-notch')];
  const trackTitleEl = document.getElementById('signalTrackTitle');
  const trackSubEl = document.getElementById('signalTrackSub');
  const directoryTuneBtn = document.getElementById('signalDirectoryTune');

  let currentIndex = 0;
  let repeatCurrent = false;
  let isSeeking = false;
  let rafId = null;
  const speeds = [1.0, 1.25, 1.5, 0.85];
  let speedIndex = 0;

  audio.volume = 0.8;

  function drawWaveform(progress = 0) {
    const track = tracks[currentIndex];
    const peaks = track?.peaks || [];
    if (!ctx || !peaks.length) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(240, rect.width || 960);
    const cssH = Math.max(60, rect.height || 84);
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);

    const count = peaks.length;
    const step = cssW / count;
    const barW = Math.max(2, step * 0.54);
    const midY = cssH / 2;
    const maxHalfH = cssH * 0.44;
    const isPlaying = !audio.paused && !audio.ended;
    const nowSec = performance.now() * 0.006;

    const playedGrad = ctx.createLinearGradient(0, 0, cssW, 0);
    playedGrad.addColorStop(0, '#00F3FF');
    playedGrad.addColorStop(0.52, '#FF007F');
    playedGrad.addColorStop(1, '#8661dc');

    const unplayedGrad = ctx.createLinearGradient(0, 0, cssW, 0);
    unplayedGrad.addColorStop(0, 'rgba(0, 243, 255, 0.28)');
    unplayedGrad.addColorStop(0.52, 'rgba(255, 0, 127, 0.28)');
    unplayedGrad.addColorStop(1, 'rgba(134, 97, 220, 0.28)');

    for (let i = 0; i < count; i++) {
      const ratio = i / count;
      let amp = peaks[i];
      if (isPlaying && !reducedMotion.matches) {
        const dist = Math.abs(ratio - progress);
        if (dist < 0.09) {
          const boost = (1 - dist / 0.09) * 0.14 * Math.sin(nowSec + i * 0.65);
          amp = Math.max(0.12, Math.min(1, amp + boost));
        }
      }

      const halfH = Math.max(3, amp * maxHalfH);
      const x = i * step + (step - barW) / 2;
      const y = midY - halfH;
      const r = Math.min(barW / 2, 2);

      ctx.fillStyle = ratio <= progress ? playedGrad : unplayedGrad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, halfH * 2, r);
      ctx.fill();
    }

    ctx.restore();
  }

  function syncProgressUI() {
    const track = tracks[currentIndex];
    const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : track.durationSec || 0;
    const current = isSeeking ? (Number(scrubEl.value) / 1000) * total : audio.currentTime || 0;
    const progress = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;

    curTimeEl.textContent = formatTime(current);
    durTimeEl.textContent = formatTime(total);
    if (!isSeeking) {
      scrubEl.value = String(Math.round(progress * 1000));
    }
    progressFillEl.style.width = `${(progress * 100).toFixed(2)}%`;
    drawWaveform(progress);
  }

  function syncPlayStateUI() {
    const playing = !audio.paused && !audio.ended;
    playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    playBtn.setAttribute('aria-label', playing ? 'Pause transmission' : 'Play transmission');
    heroPillEl?.classList.toggle('is-playing', playing);
    playerWrapEl?.classList.toggle('is-playing', playing);
    if (onAirBadgeEl) {
      const dot = onAirBadgeEl.querySelector('.on-air-dot');
      onAirBadgeEl.replaceChildren();
      if (dot) onAirBadgeEl.appendChild(dot);
      onAirBadgeEl.appendChild(document.createTextNode(playing ? 'ON AIR' : 'PRERECORDED'));
    }
    if (statusReadoutEl) {
      statusReadoutEl.textContent = playing ? '[ ON AIR ]' : '[ PRERECORDED ]';
    }
    if (playing) {
      startTicker();
    } else {
      stopTicker();
    }
  }

  function startTicker() {
    if (rafId !== null) return;
    const tick = () => {
      syncProgressUI();
      if (!audio.paused && !audio.ended) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };
    rafId = requestAnimationFrame(tick);
  }

  function stopTicker() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    syncProgressUI();
  }

  function updateVolumeUI() {
    const effective = audio.muted ? 0 : audio.volume;
    const pct = Math.round(effective * 100);
    muteBtn.setAttribute('aria-pressed', audio.muted || effective === 0 ? 'true' : 'false');
    if (volumeRange) {
      volumeRange.value = String(pct);
      volumeRange.setAttribute('aria-valuetext', `${pct}%`);
    }
    notchEls.forEach((notch, idx) => {
      const threshold = (idx + 1) * 0.2;
      const prevThreshold = idx * 0.2;
      const active = !audio.muted && effective > prevThreshold + 0.01;
      notch.classList.toggle('is-active', active);
      if (active && effective < threshold) {
        notch.style.opacity = String(Math.max(0.45, (effective - prevThreshold) / 0.2));
      } else {
        notch.style.opacity = '';
      }
    });
  }

  function loadTrack(index, { autoplay = false } = {}) {
    currentIndex = (index + tracks.length) % tracks.length;
    const track = tracks[currentIndex];
    audio.src = track.src;
    audio.playbackRate = speeds[speedIndex];

    trackTitleEl.textContent = track.title;
    trackSubEl.textContent = `SOURCE / 2.02 RADIO · ASSOCIATED RECORD / ${track.project} · ${track.kind}`;
    queueEl.textContent = `${String(currentIndex + 1).padStart(2, '0')} OF ${String(tracks.length).padStart(2, '0')}`;
    durTimeEl.textContent = track.duration;
    curTimeEl.textContent = '00:00';
    scrubEl.value = '0';
    progressFillEl.style.width = '0%';
    drawWaveform(0);

    if (autoplay) {
      audio.play().catch((err) => console.warn('Audio playback blocked or failed', err));
    } else {
      syncPlayStateUI();
    }
  }

  function togglePlay() {
    if (audio.paused || audio.ended) {
      audio.play().catch((err) => console.warn('Audio playback blocked or failed', err));
    } else {
      audio.pause();
    }
  }

  playBtn.addEventListener('click', togglePlay);
  directoryTuneBtn?.addEventListener('click', () => {
    playerWrapEl?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
    if (audio.paused || audio.ended) {
      togglePlay();
    } else {
      playBtn.focus({ preventScroll: true });
    }
  });
  prevBtn.addEventListener('click', () => {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      syncProgressUI();
    } else {
      loadTrack(currentIndex - 1, { autoplay: !audio.paused });
    }
  });
  nextBtn.addEventListener('click', () => {
    loadTrack(currentIndex + 1, { autoplay: !audio.paused });
  });
  repeatBtn.addEventListener('click', () => {
    repeatCurrent = !repeatCurrent;
    repeatBtn.setAttribute('aria-pressed', repeatCurrent ? 'true' : 'false');
  });
  speedBtn.addEventListener('click', () => {
    speedIndex = (speedIndex + 1) % speeds.length;
    const rate = speeds[speedIndex];
    audio.playbackRate = rate;
    const label = `${rate.toFixed(rate % 1 === 0 ? 1 : 2)}x`;
    speedBtn.textContent = label;
    speedBtn.setAttribute('aria-label', `Playback speed ${label}`);
  });
  muteBtn.addEventListener('click', () => {
    audio.muted = !audio.muted;
    updateVolumeUI();
  });
  volumeRange?.addEventListener('input', () => {
    const nextVol = Math.max(0, Math.min(1, Number(volumeRange.value) / 100));
    audio.muted = nextVol === 0;
    audio.volume = nextVol;
    updateVolumeUI();
  });

  scrubEl.addEventListener('input', () => {
    isSeeking = true;
    syncProgressUI();
  });
  scrubEl.addEventListener('change', () => {
    const track = tracks[currentIndex];
    const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : track.durationSec || 0;
    if (total > 0) {
      audio.currentTime = (Number(scrubEl.value) / 1000) * total;
    }
    isSeeking = false;
    syncProgressUI();
  });

  audio.addEventListener('play', syncPlayStateUI);
  audio.addEventListener('pause', syncPlayStateUI);
  audio.addEventListener('loadedmetadata', syncProgressUI);
  audio.addEventListener('timeupdate', () => {
    if (!isSeeking) syncProgressUI();
  });
  audio.addEventListener('volumechange', updateVolumeUI);
  audio.addEventListener('ended', () => {
    if (repeatCurrent) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else {
      loadTrack(currentIndex + 1, { autoplay: true });
    }
  });

  window.addEventListener('resize', () => syncProgressUI());

  updateVolumeUI();
  loadTrack(0, { autoplay: false });
}

function sectionFromHash() {
  const id = location.hash.slice(1);
  return ['signal', 'archive', 'access'].includes(id) ? id : 'signal';
}

function showSection(id, { focus = false } = {}) {
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.hidden = panel.id !== id;
  });
  document.querySelectorAll('[data-section]').forEach((link) => {
    if (link.dataset.section === id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = `KingVision | ${id[0].toUpperCase() + id.slice(1)}`;
  if (focus) {
    const target = document.getElementById(id);
    target?.setAttribute('tabindex', '-1');
    target?.focus({ preventScroll: true });
    target?.removeAttribute('tabindex');
    window.scrollTo({
      top: 0,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }
}

function setupNavigation() {
  showSection(sectionFromHash());
  window.addEventListener('hashchange', () => showSection(sectionFromHash(), { focus: true }));
}

function setupStationId() {
  const dialog = document.getElementById('stationDialog');
  const titleEl = document.getElementById('stationTitle');
  const close = document.getElementById('closeStationId');
  const video = document.getElementById('archiveViewerVideo');
  if (!dialog || !close || !video) return;

  let returnFocusEl = null;

  state.openArchiveViewer = (record, triggerEl) => {
    if (!record?.video) return;
    returnFocusEl = triggerEl || document.activeElement;
    if (titleEl) {
      titleEl.textContent = `${record.id} // ${record.title}`;
    }
    const nextSrc = encodeMediaUrl(record.video);
    if (video.getAttribute('src') !== nextSrc) {
      video.src = nextSrc;
      video.load();
    }
    dialog.showModal();
    video.play().catch(() => {});
  };

  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    video.pause();
    video.currentTime = 0;
    if (returnFocusEl && typeof returnFocusEl.focus === 'function') {
      returnFocusEl.focus({ preventScroll: true });
      returnFocusEl = null;
    }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

function setupArchiveTerminal() {
  const dialog = document.getElementById('archiveTerminal');
  const open = document.getElementById('openArchiveTerminal');
  const close = document.getElementById('closeArchiveTerminal');
  const kvtvCard = document.getElementById('archiveCardKvtv');
  const gigasCard = document.getElementById('archiveCardGigas');
  const flowerCard = document.getElementById('archiveCardFlower');

  const crtWrap = document.getElementById('archiveCrtPreview');
  const crtImg = document.getElementById('crtPreviewImg');
  const crtVideo = document.getElementById('crtPreviewVideo');
  const crtCode = document.getElementById('crtPreviewCode');
  const crtTitle = document.getElementById('crtPreviewTitle');
  const crtPlayBtn = document.getElementById('crtPlayRecord');
  const crtClearBtn = document.getElementById('crtClearPreview');

  let terminalTriggerEl = open;

  function updateCrtPreview(record) {
    if (!crtWrap || !record) return;
    state.archive.selectedRecord = record;
    if (crtCode) crtCode.textContent = record.id;
    if (crtTitle) crtTitle.textContent = record.title;

    if (record.thumbnail && crtImg) {
      crtImg.src = record.thumbnail;
      crtImg.alt = record.title;
      crtImg.hidden = false;
      if (crtVideo) {
        crtVideo.hidden = true;
        crtVideo.removeAttribute('src');
      }
    } else if (record.video && crtVideo) {
      if (crtImg) crtImg.hidden = true;
      crtVideo.hidden = false;
      crtVideo.src = encodeMediaUrl(record.video);
      crtVideo.addEventListener('loadeddata', () => {
        try { crtVideo.currentTime = 0.1; } catch {}
      }, { once: true });
    }

    if (crtPlayBtn) {
      crtPlayBtn.hidden = record.type !== 'video' || !record.video;
    }
    crtWrap.hidden = false;
  }

  crtPlayBtn?.addEventListener('click', () => {
    const rec = state.archive?.selectedRecord;
    if (rec?.video) state.openArchiveViewer?.(rec, crtPlayBtn);
  });

  crtClearBtn?.addEventListener('click', () => {
    if (crtWrap) crtWrap.hidden = true;
    if (crtVideo) {
      crtVideo.pause();
      crtVideo.removeAttribute('src');
    }
  });

  state.onArchiveRecordSelect = (record, triggerEl) => {
    const isMobile = window.matchMedia('(max-width: 680px)').matches;
    if (isMobile) {
      if (record.type === 'video' && record.video) {
        dialog?.close();
        state.openArchiveViewer?.(record, open);
      } else {
        const promptEl = document.getElementById('terminalPrompt');
        if (promptEl) promptEl.textContent = `> ${record.id} // ${record.title} — ${record.description} (STATIC RECORD)`;
      }
      return;
    }

    updateCrtPreview(record);
    dialog?.close();
    if (record.type === 'video' && crtPlayBtn && !crtPlayBtn.hidden) {
      crtPlayBtn.focus({ preventScroll: true });
    }
  };

  kvtvCard?.addEventListener('click', () => {
    const rec = state.archive?.records?.find((r) => r.id === 'REC-1847') || {
      id: 'REC-1847',
      title: 'KVTV Station ID',
      video: 'https://res.cloudinary.com/dq6ylkimk/video/upload/KVTV_station_ID_animation_design_202608082219_ll7akz.mp4',
      type: 'video',
    };
    state.openArchiveViewer?.(rec, kvtvCard);
  });

  gigasCard?.addEventListener('click', () => {
    terminalTriggerEl = gigasCard;
    state.renderArchiveTerminal?.('station-logs', 'COM-0014');
    dialog?.showModal();
  });

  flowerCard?.addEventListener('click', () => {
    terminalTriggerEl = flowerCard;
    state.renderArchiveTerminal?.('experiments', 'EXP-0031');
    dialog?.showModal();
  });

  if (!dialog || !open || !close) return;
  open.addEventListener('click', () => {
    terminalTriggerEl = open;
    state.renderArchiveTerminal?.();
    dialog.showModal();
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (!document.getElementById('stationDialog')?.open) {
      terminalTriggerEl?.focus({ preventScroll: true });
    }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        dialog.close();
      }
    }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('a[href="#access"]')) dialog.close();
  });
}

function setupAccessForm() {
  const form = document.getElementById('accessInquiryForm');
  const statusEl = document.getElementById('accessFormStatus');
  if (!form) return;
  const inquirySfx = new Audio('/assets/access/access-inquiry-sfx.mp3');
  inquirySfx.preload = 'auto';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('inquiryName')?.value.trim() || '';
    const email = document.getElementById('inquiryEmail')?.value.trim() || '';
    const type = document.getElementById('inquiryType')?.value || 'GENERAL INQUIRY';
    const message = document.getElementById('inquiryMessage')?.value.trim() || '';
    const subject = encodeURIComponent(`[KINGVISION // ${type}] ${name}`);
    const body = encodeURIComponent(`Name / Alias: ${name}\nEmail: ${email}\nInquiry Type: ${type}\n\n${message}`);
    if (statusEl) {
      statusEl.textContent = 'TRANSMITTING SIGNAL...';
    }
    inquirySfx.currentTime = 0;
    inquirySfx.play().catch(() => {});
    setTimeout(() => {
      window.location.href = `mailto:KingVisionHq@gmail.com?subject=${subject}&body=${body}`;
    }, 350);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  loadContent();
  setupNavigation();
  setupStationId();
  setupArchiveTerminal();
  setupAccessForm();
});
