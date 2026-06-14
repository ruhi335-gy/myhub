// ---------- Hamburger Slide Menu ----------
const hamburgerBtn = document.getElementById('hamburgerBtn');
const slideMenu = document.getElementById('slideMenu');
const closeMenu = document.getElementById('closeMenu');
const menuOverlay = document.getElementById('menuOverlay');

function closeSlideMenu() {
  if (slideMenu) slideMenu.classList.remove('open');
  if (menuOverlay) menuOverlay.classList.remove('active');
}

if (hamburgerBtn) {
  hamburgerBtn.addEventListener('click', () => {
    slideMenu.classList.add('open');
    menuOverlay.classList.add('active');
  });
}
if (closeMenu) closeMenu.addEventListener('click', closeSlideMenu);
if (menuOverlay) menuOverlay.addEventListener('click', closeSlideMenu);

// ---------- Subscribe Form (footer) ----------
const subscribeForm = document.getElementById('subscribeForm');
if (subscribeForm) {
  subscribeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(subscribeForm);
    const data = Object.fromEntries(formData.entries());
    try {
      const res = await fetch('/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        subscribeForm.style.display = 'none';
        document.getElementById('thanksMsg').style.display = 'block';
      } else {
        alert(result.message || 'Something went wrong.');
      }
    } catch (err) {
      alert('Something went wrong. Please try again.');
    }
  });
}

// ---------- Generic Modal Helpers ----------
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

// Close modal when clicking outside the box (not while processing)
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && overlay.id !== 'processingModal') {
      overlay.classList.remove('active');
    }
  });
});

// ---------- Copy Command ----------
function copyCommand(btn) {
  const code = btn.previousElementSibling.innerText;
  navigator.clipboard.writeText(code).then(() => {
    const original = btn.innerText;
    btn.innerText = 'Copied!';
    setTimeout(() => (btn.innerText = original), 1500);
  });
}

// ---------- Direct Download Helper ----------
// Routes through server proxy so GitHub raw files download directly
// instead of opening in the browser.
function directDownloadUrl(rawUrl) {
  return '/download?url=' + encodeURIComponent(rawUrl);
}

// ---------- Countdown Helper ----------
function startCountdown(seconds, onTick, onComplete) {
  let remaining = seconds;
  onTick(remaining);
  const interval = setInterval(() => {
    remaining--;
    onTick(remaining);
    if (remaining <= 0) {
      clearInterval(interval);
      onComplete();
    }
  }, 1000);
}

// ---------- Apps Page: Install Buttons ----------
document.querySelectorAll('.install-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const name = btn.dataset.name;
    const img = btn.dataset.img;
    const link = btn.dataset.link;

    openModal('processingModal');
    document.getElementById('countdownText').innerText = '30';

    startCountdown(30, (remaining) => {
      document.getElementById('countdownText').innerText = remaining;
    }, () => {
      closeModal('processingModal');
      document.getElementById('installAppImg').src = img;
      document.getElementById('installAppName').innerText = name;
      document.getElementById('installNowBtn').href = directDownloadUrl(link);
      openModal('installModal');
    });
  });
});

// ---------- Projects Page ----------
document.querySelectorAll('.project-card').forEach(card => {
  card.addEventListener('click', () => {
    const { name, img, live, source, download } = card.dataset;
    document.getElementById('projectImg').src = img;
    document.getElementById('projectName').innerText = name;

    const liveLink = document.getElementById('projectLiveLink');
    const sourceLink = document.getElementById('projectSourceLink');

    if (live) { liveLink.href = live; liveLink.style.display = 'inline-block'; }
    else { liveLink.style.display = 'none'; }

    if (source) { sourceLink.href = source; sourceLink.style.display = 'inline-block'; }
    else { sourceLink.style.display = 'none'; }

    const downloadBtn = document.getElementById('projectDownloadBtn');
    downloadBtn.onclick = () => {
      closeModal('projectModal');
      openModal('processingModal');
      document.getElementById('countdownText').innerText = '30';
      startCountdown(30, (remaining) => {
        document.getElementById('countdownText').innerText = remaining;
      }, () => {
        closeModal('processingModal');
        document.getElementById('downloadNowBtn').href = directDownloadUrl(download);
        openModal('downloadModal');
      });
    };

    openModal('projectModal');
  });
});
