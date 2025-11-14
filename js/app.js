// -------------------------------------------------
// CONFIG – change only this line for your site
// -------------------------------------------------
const WP_BASE = 'http://leadership-card.zya.me/wp-json/wp/v2'; // <-- edit

// Helper: fetch JSON with error handling
async function wpFetch(endpoint) {
  const res = await fetch(`${WP_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`WP error ${res.status}`);
  return await res.json();
}

// -------------------------------------------------
// NAVIGATION – build from WP Pages
// -------------------------------------------------
async function buildNav() {
  const navList = document.getElementById('nav-list');
  if (!navList) return;

  try {
    console.log('Fetching pages from:', `${WP_BASE}/pages`);
    const pages = await wpFetch('/pages?per_page=20&_fields=id,slug,title,link');
    
    console.log('Pages found:', pages); // ← Check browser console

    const home = { id: 0, slug: '', title: { rendered: 'Home' }, link: 'index.html' };
    const all = [home, ...pages];

    navList.innerHTML = all.map(p => `
      <li><a href="${p.slug ? p.slug + '.html' : p.link}">${p.title.rendered}</a></li>
    `).join('');

  } catch (e) {
    console.error('Nav error:', e);
    navList.innerHTML = '<li><a href="index.html">Home</a></li><li>Error loading pages</li>';
  }
}

// -------------------------------------------------
// POST LIST (blog.html, products.html, etc.)
// -------------------------------------------------
async function loadPosts(containerId, endpoint = '/posts', embed = true) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<p>Loading…</p>';

  try {
    const url = embed ? `${endpoint}?_embed` : endpoint;
    const posts = await wpFetch(url);

    container.innerHTML = posts.map(p => `
      <article class="card">
        ${p._embedded?.['wp:featuredmedia']?.[0]?.source_url
          ? `<img src="${p._embedded['wp:featuredmedia'][0].source_url}" alt="${p.title.rendered}">`
          : '<div class="no-image" style="height:200px;background:#eee;display:flex;align-items:center;justify-content:center;color:#999;">No image</div>'
        }
        <div class="body">
          <h3>${p.title.rendered}</h3>
          <div class="excerpt">${p.excerpt.rendered}</div>
          <a href="post.html?id=${p.id}" class="btn">Read more</a>
        </div>
      </article>
    `).join('');
  } catch (e) {
    container.innerHTML = `<p>Error: ${e.message}</p>`;
    console.error(e);
  }
}

// -------------------------------------------------
// SINGLE POST (post.html)
// -------------------------------------------------
async function loadSinglePost() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  if (!id) return;

  const contentDiv = document.getElementById('post-content');
  const titleDiv   = document.getElementById('post-title');
  if (!contentDiv || !titleDiv) return;

  try {
    const post = await wpFetch(`/posts/${id}?_embed`);
    document.title = post.title.rendered + ' – Kool Box';
    titleDiv.textContent = post.title.rendered;
    contentDiv.innerHTML = post.content.rendered;
  } catch (e) {
    contentDiv.innerHTML = `<p>Post not found.</p>`;
    console.error(e);
  }
}

// -------------------------------------------------
// PAGE CONTENT (about.html, contact.html, …)
// -------------------------------------------------
async function loadPage() {
  const slug = location.pathname.split('/').pop().replace('.html', '');
  if (!slug || slug === 'index') return;

  const contentDiv = document.getElementById('page-content');
  const titleDiv   = document.getElementById('page-title');
  if (!titleDiv) return;

  try {
    const pages = await wpFetch(`/pages?slug=${slug}&_fields=title,content`);
    if (!pages.length) {
      titleDiv.textContent = slug.charAt(0).toUpperCase() + slug.slice(1).replace('-', ' ') + ' – Kool Box';
      return;
    }
    const page = pages[0];
    document.title = page.title.rendered + ' – Kool Box';
    titleDiv.textContent = page.title.rendered;
    if (contentDiv) contentDiv.innerHTML = page.content.rendered;
  } catch (e) {
    titleDiv.textContent = slug.charAt(0).toUpperCase() + slug.slice(1).replace('-', ' ') + ' – Kool Box';
  }
}

// -------------------------------------------------
// Run on DOM ready
// -------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  buildNav();

  // Home – nothing to load
  if (location.pathname.endsWith('blog.html'))      loadPosts('blog-list');
  if (location.pathname.endsWith('products.html'))  loadPosts('product-list', '/posts?categories=PRODUCT_CAT_ID'); // optional filter
  if (location.pathname.endsWith('post.html'))      loadSinglePost();
  if (location.pathname.match(/about|contact|.*\.html$/)) loadPage();
});


// -------------------------------------------------
// SLIDER – FETCH + RENDER (fixed button, highlight, UI)
// -------------------------------------------------
async function loadSlider() {
  const sliderEl = document.getElementById('koolbox-slider');
  if (!sliderEl) return;

  try {
    const res = await fetch(`${WP_BASE}/slider_item?per_page=20&_embed`);
    const items = await res.json();

    if (!items.length) {
      sliderEl.innerHTML = '<p class="text-center text-white">No slides yet.</p>';
      return;
    }

    // Build each slide
    const slidesHTML = items.map(item => {
      const titleRaw = item.title.rendered || '';
      const content   = item.content.rendered || '';
      const img       = item._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';
      const btnText   = item.acf?.button_text   || 'Learn More';
      const btnUrl    = item.acf?.button_url    || '#';
      const highlight = item.acf?.highlight_word || '';

      // ----- Highlight word with SVG underline -----
      let titleHTML = titleRaw;
      if (highlight) {
        const regex = new RegExp(`(${escapeRegExp(highlight)})`, 'gi');
        titleHTML = titleRaw.replace(
          regex,
          `<span class="highlight-word">$1${waveSVG}</span>`
        );
      }

      return `
        <div class="slide">
          <div class="container grid md:grid-cols-2 gap-12 items-center py-16 md:py-24">
            <div class="">
              <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                ${titleHTML}
              </h1>
              <div class="prose prose-lg mb-8 max-w-none">
                ${content}
              </div>
              <a href="${btnUrl}" class="btn-primary inline-flex items-center gap-3 text-lg">
                ${btnText}
                ${arrowSVG}
              </a>
            </div>
            <div class="flex justify-center">
              <img src="${img}" alt="${titleRaw.replace(/<[^>]*>/g, '')}"
                   class="rounded-xl shadow-2xl max-w-full h-auto"
                   style="max-height:520px;">
            </div>
          </div>
        </div>`;
    }).join('');

    sliderEl.innerHTML = slidesHTML;

    // ----- Slick init with custom arrows / dots -----
    $('#koolbox-slider').slick({
      autoplay: true,
      autoplaySpeed: 6000,
      fade: true,
      cssEase: 'cubic-bezier(0.77,0,0.175,1)',
      speed: 800,
      dots: false,
      arrows: true,
      appendArrows: $('.hero-slider'),   // put arrows inside the section
      prevArrow: `<button type="button" class="slick-prev">${leftArrow}</button>`,
      nextArrow: `<button type="button" class="slick-next">${rightArrow}</button>`,
      customPaging: () => `<button class="slick-dot"></button>`
    });

  } catch (e) {
    console.error('Slider error:', e);
    sliderEl.innerHTML = '<p class="text-center text-white">Failed to load slides.</p>';
  }
}

// Helper: escape special regex chars
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// SVG strings (inline – no extra files)
const waveSVG = `<svg class="wave" viewBox="0 0 1365 60" preserveAspectRatio="none"><path fill="#d00024" d="M11.6 22.82c-1.2-.98-1.55-1.38-2.12-1.72C6.67 19.45-.5 19.04.03 16.54c.41-1.93 5.02-3.07 8.04-4.49 2.7-1.27 5.58-2.52 7.68-3.94 3.79-2.57 7.26-5.06 16.36-4.65 1.6.07 3.74-.64 5.14-1.19 2.63-1.04 5.56-1.17 8.53-.57 10.24 2.06 20.88 2.21 31.91 1.43 3-.21 6.2 0 9.3.09 21.75.61 43.5 1.16 65.3.54 13.43-.38 26.86-.84 39.58-2.88 2.39-.38 4.96-.63 7.5-.8 3.23-.22 6.37-.04 7.87 1.34 2.05 1.89 5.41 3.43 6.89 5.55 3.49 5.02 8.37 9.88 12.57 14.83 1.55 1.83 4.5 2.62 9.28 2.67 15.04.17 30.07.48 45.11.65 33.73.37 67.35 1.68 101.02 2.26 32.08.54 64.34 1.51 96.41-.5 2.55-.16 5.18-.16 7.77-.2 30.6-.5 61.24-.79 91.81-1.53 42.47-1.02 85.06-1.27 127.39-3.24 4.12-.19 8.29-.2 12.44-.29 23.84-.51 47.69-.96 71.52-1.54 8.8-.21 17.54-.73 26.32-1.06 39.29-1.48 78.74-1.91 118.1-2.88 25.94-.64 51.89-.61 77.81-1.05 45.66-.77 91.31-1.31 137.02-1.04 41.54.24 83.01 1.03 124.47 2.01 17.16.41 34.21-.48 51.14-1.52 6.71-.41 13.34-.78 20.12-.52 3.39.13 5.43.73 6.69 2.14 7.59 8.49 9.66 17.46 14.51 26.18.52.94-.8 1.59-2.84 1.97-1.4.26-2.87.53-4.37.64-16.84 1.23-33.55 2.68-50.75 3.09-32.74.79-65.33-.19-97.95-.97-4.14-.1-8.29-.2-12.44-.23-49.85-.41-99.72-.75-149.54.1-32.17.55-64.36.61-96.51 1.16-37.33.64-74.73 1.18-111.92 2.58-43.43 1.63-86.96 2.47-130.43 3.72-35.21 1.01-70.38 2.04-105.67 2.56-37.86.55-75.7 1.41-113.53 2.22-11.9.25-23.76 1.07-35.65 1.15-42.59.28-85.1-.46-127.52-2.06-2.58-.1-5.18-.17-7.77-.2-18.68-.25-37.34-.4-56-1.03-12.34-.42-24.89 0-37.33.22-7.28.13-14.49.12-21.76-.09-19.14-.55-38.21-1.1-57.4.37-8.52.65-17.63.37-26.41.13-22.73-.63-45.48-1.26-68.1-2.3-14.42-.66-28.49-2.16-39.83-6.3-2.44-.89-4.44-1.71-4.11-3.13.09-.4.09-1.07-.45-1.19-8.26-1.83-6.07-4.95-5.94-7.77.12-2.61-2.99-5.01-.11-7.89 2.53-2.54 4.27-5.05 10.29-6.28Z"/></svg>`;

const arrowSVG = `<svg width="20" height="20" viewBox="0 0 60 60" fill="currentColor"><path d="M46.5 28.9L20.6 3c-.6-.6-1.6-.6-2.2 0l-4.8 4.8c-.6.6-.6 1.6 0 2.2l19.8 20-19.9 19.9c-.6.6-.6 1.6 0 2.2l4.8 4.8c.6.6 1.6.6 2.2 0l21-21 4.8-4.8c.8-.6.8-1.6.2-2.2z"/></svg>`;

const leftArrow  = `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 18l-6-6 6-6" stroke-width="2"/></svg>`;
const rightArrow = `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 18l6-6-6-6" stroke-width="2"/></svg>`;

document.addEventListener('DOMContentLoaded', loadSlider);