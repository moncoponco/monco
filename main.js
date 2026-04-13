// main.js
// alphabetic ordering of index
document.addEventListener("DOMContentLoaded", function () {
    const sectionsList = document.querySelectorAll(".words dt");

    if (!sectionsList.length) return;

    const sectionsArray = [];

    sectionsList.forEach(function (section) {
      const name = section.innerText;
      const description = section.nextElementSibling.innerText;
      sectionsArray.push({ name, description });
    });
  
    sectionsArray.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
  
    const parentElement = sectionsList[0].parentElement;
    parentElement.innerHTML = "";
  
    sectionsArray.forEach(function (section) {
      const dtElement = document.createElement("dt");
      const ddElement = document.createElement("dd");
  
      const link = document.createElement("a");
      link.href = section.name.toLowerCase().replace(/\s+/g, "") + ".html";
      link.textContent = section.name;
      dtElement.appendChild(link);
  
      ddElement.textContent = section.description;
  
      parentElement.appendChild(dtElement);
      parentElement.appendChild(ddElement);
    });
  });
  
      // Add the name of the current page on the breadcrumb menu


  function getCurrentPageName() {
    const urlPath = window.location.pathname;
    const file = urlPath.split('/').pop();
    return file ? file.split('.html')[0] : 'index';
  }

  function updateBreadcrumbMenu() {
    const currentPageName = getCurrentPageName();
    document.querySelectorAll('.breadcrumb-menu a[data-page]').forEach(a => {
      a.classList.toggle('active', a.dataset.page === currentPageName);
    });
  }

  document.addEventListener('DOMContentLoaded', updateBreadcrumbMenu);
  window.onpopstate = updateBreadcrumbMenu;

  // ── About page: scroll-driven text parallax + letter-spacing stretch ────────
  const aboutText = document.querySelector('.about-text');
  if (aboutText) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      const parallax = y * 0.12;
      const stretch  = Math.min(y * 0.004, 3); // max 3px extra letter-spacing
      aboutText.style.transform    = `translateY(${-parallax}px)`;
      aboutText.style.letterSpacing = `${stretch}px`;
    }, { passive: true });
  }

  // ── Mobile nav: scroll-driven collapse (smooth, progress-based) ──────────────
  document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.navigation');
    if (!nav) return;

    const subItems = Array.from(nav.querySelectorAll('ul.breadcrumb-menu li:not(:first-child)'));
    if (!subItems.length) return;

    // Measure natural heights after layout
    const naturalHeights       = subItems.map(item => item.scrollHeight);
    const naturalPaddingTops    = subItems.map(item => parseFloat(getComputedStyle(item).paddingTop));
    const naturalPaddingBottoms = subItems.map(item => parseFloat(getComputedStyle(item).paddingBottom));

    const COLLAPSE_RANGE = 70;

    function applyCollapse() {
      const progress = Math.min(Math.max(window.scrollY / COLLAPSE_RANGE, 0), 1);
      const open = 1 - progress;

      subItems.forEach((item, i) => {
        item.style.opacity       = open;
        item.style.maxHeight     = (open * naturalHeights[i]) + 'px';
        item.style.paddingTop    = (open * naturalPaddingTops[i]) + 'px';
        item.style.paddingBottom = (open * naturalPaddingBottoms[i]) + 'px';
        item.style.pointerEvents = progress > 0.5 ? 'none' : 'auto';
      });

      nav.classList.toggle('nav-collapsed', progress > 0.5);
    }

    applyCollapse(); // set initial state
    window.addEventListener('scroll', applyCollapse, { passive: true });
  });

  // ── Nav entrance animation — first visit only ──────────────────────────────
  if (!sessionStorage.getItem('visited')) {
    sessionStorage.setItem('visited', '1');
    document.addEventListener('DOMContentLoaded', () => {
      const nav = document.querySelector('.breadcrumb-menu');
      if (nav) nav.classList.add('nav-animate');
    });
  }

  // ── Gallery image staggered fade-in ───────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.single-gallery-img').forEach((img, i) => {
      img.style.opacity = '0';
      img.style.animation = `img-slide-in 0.7s cubic-bezier(0.2,0,0.4,1) ${0.5 + i * 0.13}s forwards`;
    });
  });

  // ── About page: word-by-word entrance then continuous subtle float ──────────
  document.addEventListener('DOMContentLoaded', () => {
    const para = document.querySelector('.about-text');
    if (!para) return;

    let wordIndex = 0;
    const rotations = [-3, 2, -1.5, 3, -2.5, 1, -2, 2.5, -1, 3];
    const spans = [];

    Array.from(para.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(part => {
          if (/^\s+$/.test(part)) {
            fragment.appendChild(document.createTextNode(part));
          } else if (part) {
            const span = document.createElement('span');
            span.className = 'about-word';
            span.textContent = part;
            const rot = rotations[wordIndex % rotations.length];
            span.style.setProperty('--wr', rot + 'deg');
            span.style.animationDelay = `${0.5 + wordIndex * 0.03}s`;
            spans.push({ span, index: wordIndex });
            wordIndex++;
            fragment.appendChild(span);
          }
        });
        node.parentNode.replaceChild(fragment, node);
      }
    });

    // After entrance settles, each word floats independently at different rates
    const entranceDuration = 0.5 + wordIndex * 0.03 + 0.8;
    setTimeout(() => {
      spans.forEach(({ span, index }) => {
        const duration  = 2.8 + (index % 6) * 0.45;
        const delay     = (index % 9) * 0.35;
        const floatY    = -1.5 - (index % 4) * 0.5;
        const tilt      = ((index % 5) - 2) * 0.3;
        span.style.setProperty('--wy', floatY + 'px');
        span.style.setProperty('--wt', tilt + 'deg');
        // Must set opacity:1 first — base .about-word has opacity:0,
        // which re-applies when the entrance animation is replaced
        span.style.opacity = '1';
        span.style.animation = `word-float ${duration}s ease-in-out ${delay}s infinite`;
      });
    }, entranceDuration * 1000);
  });

  // ── Click / tap ripple ─────────────────────────────────────────────────────
  function spawnRipple(x, y) {
    const r = document.createElement('div');
    r.className = 'click-ripple';
    r.style.left = x + 'px';
    r.style.top  = y + 'px';
    document.body.appendChild(r);
    r.addEventListener('animationend', () => r.remove());
  }

  document.addEventListener('click', e => spawnRipple(e.clientX, e.clientY));
  document.addEventListener('touchstart', e => {
    const t = e.touches[0];
    spawnRipple(t.clientX, t.clientY);
  }, { passive: true });

  // ── Page transition: blink (lid down, lid up) ──────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'page-overlay';
  // Inline styles guarantee covering on the very first paint, before CSS is computed
  overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99999;pointer-events:none;';
  document.body.insertBefore(overlay, document.body.firstChild);

  // Page load: start covering, lid retracts upward (curved edge sweeps up)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    overlay.style.transition = 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)';
    overlay.style.transform = 'translateY(calc(-100% - 90px))';
  }));

  // Click: lid drops down (curved edge sweeps down), then navigate
  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || a.target === '_blank' || !a.href || a.href.startsWith('javascript')) return;
    e.preventDefault();
    const href = a.href;
    overlay.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 1, 1)';
    overlay.style.transform = 'translateY(0)';
    const nav = () => { window.location.href = href; };
    overlay.addEventListener('transitionend', nav, { once: true });
    // Fallback in case transitionend doesn't fire
    setTimeout(nav, 400);
  });
  