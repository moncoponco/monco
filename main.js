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

  // ── Mobile nav: show all items at top, collapse to just "moncoponco" on scroll
  window.addEventListener('scroll', () => {
    const nav = document.querySelector('.navigation');
    if (!nav) return;
    nav.classList.toggle('nav-collapsed', window.scrollY > 50);
  }, { passive: true });

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

  // ── About page: word-by-word entrance with weird drift ────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const para = document.querySelector('.about-text');
    if (!para) return;
    let wordIndex = 0;
    const rotations = [-3, 2, -1.5, 3, -2.5, 1, -2, 2.5, -1, 3];
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
            wordIndex++;
            fragment.appendChild(span);
          }
        });
        node.parentNode.replaceChild(fragment, node);
      }
    });
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
  