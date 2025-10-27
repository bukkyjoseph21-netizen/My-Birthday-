// Consolidated site script: posts, gallery, countdown, prompts, confetti
(function () {
  'use strict';

  // Helpers
  const qs = (sel) => document.querySelector(sel);
  const qid = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- Posts (save & display) ----------
  function savePostFromForm(form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = (qid('title') && qid('title').value) || '';
      const content = (qid('content') && qid('content').value) || '';
      const imageInput = qid('image');

      function saveWithImageURL(imageURL) {
        const post = {
          title,
          content,
          imageURL: imageURL || '',
          date: new Date().toLocaleString(),
        };

        const posts = JSON.parse(localStorage.getItem('posts') || '[]');
        posts.unshift(post);
        try {
          localStorage.setItem('posts', JSON.stringify(posts));
        } catch (err) {
          console.warn('Could not save to localStorage:', err);
          alert('Unable to save letter: local storage quota exceeded. Try smaller image or remove old posts.');
        }

        alert('Letter saved \uD83D\uDC8C');
        // navigate back to home if exists, otherwise reload
        if (location.pathname.endsWith('write.html')) {
          window.location.href = 'index.html';
        } else {
          location.reload();
        }
      }

      // If there's an image, convert to base64 data URL so it persists across pages
      if (imageInput && imageInput.files && imageInput.files.length > 0) {
        const file = imageInput.files[0];

        // Optional: warn if image is large
        const maxBytes = 500 * 1024; // 500 KB recommended limit for localStorage
        if (file.size > maxBytes) {
          if (!confirm('The selected image is fairly large and may not save correctly in localStorage. Continue?')) {
            return;
          }
        }

        const reader = new FileReader();
        reader.onload = function (ev) {
          const dataUrl = ev.target.result;
          saveWithImageURL(dataUrl);
        };
        reader.onerror = function () {
          alert('Failed to read image file. Letter saved without image.');
          saveWithImageURL('');
        };
        reader.readAsDataURL(file);
      } else {
        saveWithImageURL('');
      }
    });
  }

  function renderPostsToContainer(container, opts = {}) {
    const posts = JSON.parse(localStorage.getItem('posts') || '[]');
    container.innerHTML = '';
    const hideContent = !!opts.hideContent;

    posts.forEach((post) => {
      const div = document.createElement('div');
      div.classList.add('post');

      const imgHtml = post.imageURL ? `<img src="${post.imageURL}" alt="Post image">` : '';
      const contentHtml = hideContent ? '' : `<p>${post.content}</p>`;

      div.innerHTML = `\n        <h3>${post.title || ''}</h3>\n        <p><em>${post.date}</em></p>\n        ${imgHtml}\n        ${contentHtml}\n        <hr/>\n      `;

      container.appendChild(div);
    });
  }

  // Initialize post form
  const postForm = qid('postForm');
  if (postForm) savePostFromForm(postForm);

  // Display posts on pages that have #posts
  const postsContainer = qid('posts');
  if (postsContainer) renderPostsToContainer(postsContainer, { hideContent: true });

  // Display future posts
  const futureContainer = qid('futurePosts');
  if (futureContainer) renderPostsToContainer(futureContainer);

  // ---------- Gallery ----------
  function initGalleryAutoScroll(gallerySelector, intervalMs = 3000) {
    const gallery = qs(gallerySelector);
    if (!gallery) return;

    // populate images from posts
    const posts = JSON.parse(localStorage.getItem('posts') || '[]');
    const images = posts.filter((p) => p.imageURL).map((p) => p.imageURL);
    images.forEach((src) => {
      const img = document.createElement('img');
      img.src = src;
      img.loading = 'lazy';
      gallery.appendChild(img);
    });

    // if no images, nothing to do
    if (gallery.children.length === 0) return;

    // Wait for images to layout to compute width
    function computeAndStart() {
      const first = gallery.children[0];
      const style = getComputedStyle(first);
      const marginRight = parseFloat(style.marginRight || 0);
      const width = first.getBoundingClientRect().width + marginRight;

      let index = 0;
      const total = gallery.children.length;

      // ensure transform origin
      gallery.style.transition = 'transform 500ms ease';
      setInterval(() => {
        index = (index + 1) % total;
        gallery.style.transform = `translateX(-${index * width}px)`;
      }, intervalMs);
    }

    // If images aren't loaded yet, wait a tick
    requestAnimationFrame(computeAndStart);
    window.addEventListener('resize', () => requestAnimationFrame(computeAndStart));
  }

  // Initialize gallery on page
  if (qs('.gallery')) initGalleryAutoScroll('.gallery');

  // ---------- Countdown + Progress bar + Confetti ----------
  (function initCountdown() {
    const container = qid('countdown-container');
    const display = qid('countdown');
    const progressBar = qid('progress-bar');
    if (!container || !display) return;

    const birthday = new Date('Nov 13, 2025 00:00:00').getTime();
    const totalCountdown = 30 * 24 * 60 * 60 * 1000; // 30 days

    const timer = setInterval(() => {
      const now = Date.now();
      const distance = birthday - now; // ms until birthday

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (distance >= 0) {
        display.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s `;
      } else {
        display.textContent = '\uD83C\uDF89 Happy Birthday Bukola! \uD83C\uDF88';
      }

      if (progressBar) {
        const percentComplete = clamp(((totalCountdown - distance) / totalCountdown) * 100, 0, 100);
        progressBar.style.width = percentComplete + '%';
      }

      // change background color subtly as it approaches
      if (container && distance >= 0) {
        const percent = clamp(distance / totalCountdown, 0, 1); // 1 -> far, 0 -> close
        const red = Math.floor(255 - 100 * (1 - percent));
        const green = Math.floor(209 + 46 * (1 - percent));
        const blue = Math.floor(220 + 35 * (1 - percent));
        container.style.background = `rgb(${red}, ${green}, ${blue})`;
      }

      if (distance < 0) {
        clearInterval(timer);
        launchConfetti();
      }
    }, 1000);
  })();

  // Confetti (simple emoji fall)
  function launchConfetti() {
    const duration = 5000;
    const end = Date.now() + duration;

    (function frame() {
      const confetti = document.createElement('div');
      confetti.textContent = '\uD83C\uDF8A';
      confetti.style.position = 'fixed';
      confetti.style.pointerEvents = 'none';
      confetti.style.fontSize = Math.floor(Math.random() * 24 + 12) + 'px';
      confetti.style.left = Math.random() * window.innerWidth + 'px';
      confetti.style.top = '0px';
      confetti.style.opacity = String(Math.random());
      document.body.appendChild(confetti);

      let top = 0;
      const fall = setInterval(() => {
        top += Math.random() * 5 + 2;
        confetti.style.top = top + 'px';
        if (top > window.innerHeight) {
          confetti.remove();
          clearInterval(fall);
        }
      }, 16);

      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }

  // ---------- Daily prompt ----------
  const prompts = [
    'A memory I love...',
    "Something that made me smile today...",
    'A secret wish I have...',
    'A lesson I learned recently...',
    "One thing I'm grateful for today...",
    'A dream I hope comes true...',
    'A favorite childhood memory...',
    'Something I admire about someone close to me...',
    "A small victory I want to celebrate...",
    'A hope I have for the next year...'
  ];

  function showDailyPrompt() {
    const el = qid('dailyPrompt');
    if (!el) return;
    const today = new Date();
    const dayIndex = today.getDate() % prompts.length;
    el.textContent = '\uD83D\uDCDD ' + prompts[dayIndex];
  }

  if (qid('dailyPrompt')) showDailyPrompt();

})();
