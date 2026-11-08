(function () {
  'use strict';
  const dialog = document.getElementById('productDetails');
  if (!dialog) return;
  const gallery = document.getElementById('productGallery');
  const image = document.getElementById('galleryImage');
  const thumbnails = document.getElementById('galleryThumbnails');
  const galleries = {
    'Infinity cube': [
    { src: 'images/infinity-cube-open.jpeg', alt: 'Yellow and blue Infinity cube unfolded, showing its hinges' },
    { src: 'images/infinity-cube-folded.jpeg', alt: 'Infinity cube folded into a compact cube' },
    { src: 'images/infinity-cube-back.jpeg', alt: 'Reverse side of the unfolded Infinity cube, showing its yellow faces' }
    ],
    'Spiral cone · big': [
      { src: 'images/spiral-cone-assembled.jpeg', alt: 'Brown and black spiral cone fully assembled' },
      { src: 'images/spiral-cone-separated.jpeg', alt: 'Brown spiral insert lying beside the black outer cone' },
      { src: 'images/spiral-cone-parts.jpeg', alt: 'Brown spiral insert and black outer cone standing separately' }
    ]
,
    'Castle': [
      { src: 'images/castle-front.jpeg', alt: 'White castle with its gate fitted in the entrance' },
      { src: 'images/castle-back.jpeg', alt: 'Rear view of the white castle and its raised gate' },
      { src: 'images/castle-gate.jpeg', alt: 'White castle with its removable gate beside it' }
    ],
    'Spiral cone · small': [
      { src: 'images/spiral-small-assembled.jpeg', alt: 'Yellow small spiral cone assembled' },
      { src: 'images/spiral-small-open.jpeg', alt: 'Yellow small spiral cone in its open configuration' },
      { src: 'images/spiral-small-parts.jpeg', alt: 'Two yellow spiral cone parts standing side by side' }
    ],
    'Two-sided word': [
      { src: 'images/two-sided-word-hawks.jpeg', alt: 'White two-sided word design viewed from the HAWKS side' },
      { src: 'images/two-sided-word-marine.jpeg', alt: 'White two-sided word design viewed from the MARINE side' },
      { src: 'images/two-sided-word-angle.jpeg', alt: 'Angled view of the white two-sided word design' }
    ]
  };
  let photos = [], opener, active = 0;
  function showPhoto(index) {
    active = (index + photos.length) % photos.length;
    image.src = photos[active].src; image.alt = photos[active].alt;
    document.getElementById('galleryCounter').textContent = (active + 1) + ' / ' + photos.length;
    [...thumbnails.children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === active)));
  }
  function buildThumbnails() {
    thumbnails.replaceChildren();
    photos.forEach((photo, i) => {
    const button = document.createElement('button'); button.type = 'button';
    button.setAttribute('aria-label', 'View photo ' + (i + 1) + ': ' + photo.alt);
    const thumb = document.createElement('img'); thumb.src = photo.src; thumb.alt = ''; thumb.width = 80; thumb.height = 60;
    button.append(thumb); button.addEventListener('click', () => showPhoto(i)); thumbnails.append(button);
  });
  }
  dialog.querySelector('.gallery-prev').addEventListener('click', () => showPhoto(active - 1));
  dialog.querySelector('.gallery-next').addEventListener('click', () => showPhoto(active + 1));
  dialog.addEventListener('keydown', event => {
    if (gallery.hidden || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); showPhoto(active + (event.key === 'ArrowRight' ? 1 : -1)); }
  });
  document.querySelectorAll('.catalog .card').forEach(card => {
    const art = card.querySelector('.product-art'), heading = card.querySelector('h3');
    if (!art || !heading) return;
    const name = heading.textContent;
    art.setAttribute('role', 'button'); art.setAttribute('tabindex', '0');
    art.setAttribute('aria-label', 'View ' + name + ' details'); art.setAttribute('aria-haspopup', 'dialog');
    function openDetails() {
      opener = art;
      document.getElementById('productTitle').textContent = name;
      document.getElementById('productDescription').textContent = card.querySelector(':scope > p').textContent;
      document.getElementById('productPrice').textContent = card.querySelector('.product-info > span').textContent;
      photos = galleries[name] || [];
      gallery.hidden = photos.length === 0; dialog.classList.toggle('has-gallery', !gallery.hidden);
      if (!gallery.hidden) { buildThumbnails(); showPhoto(0); }
      dialog.showModal(); dialog.scrollTop = 0;
    }
    art.addEventListener('click', openDetails);
    art.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetails(); } });
  });
  dialog.querySelectorAll('.dialog-close, .dialog-done').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => opener?.focus());
})();
