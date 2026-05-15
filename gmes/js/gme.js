// === GLOBAL STATE ===
let gmesData = [];
let filteredGmes = [];
let favorites = JSON.parse(localStorage.getItem('favoriteGmes') || '[]');
let currentGmeUrl = null;

// === DOM ELEMENTS ===
const gmeSearch = document.getElementById('gmeSearch');
const gmesGrid = document.getElementById('gmesGrid');
const gmeLibraryHeader = document.getElementById('gmeLibraryHeader');
const gmeSearchSection = document.getElementById('gmeSearchSection');
const gmeIframeContainer = document.getElementById('gmeIframeContainer');
const gmeIframe = document.getElementById('gmeIframe');
const gmeTitle = document.getElementById('gmeTitle');
const favoriteToggleBtn = document.getElementById('favoriteToggleBtn');

// === LOAD GAMES ===
async function loadGmes() {
  try {
    const res = await fetch(`/js/list.json?t=${Date.now()}`);
    const json = res.ok ? await res.json() : [];

    gmesData = json.map(g => ({
      url: g.url,
      name: g.name,
      cover: g.cover,
      featured: g.featured || false,
      port: g.port || false
    }));
  } catch (error) {
    console.error('Failed to load games:', error);
    gmesData = [];
  }

  filteredGmes = [...gmesData];
  renderGmes();
}

// === RENDER GAMES GRID ===
function renderGmes() {
  if (!gmesGrid) return;

  // Sort favorites first
  const favoritesUrls = favorites.map(f => f.url);
  const sortedGmes = [...filteredGmes].sort((a, b) => {
    const aFav = favoritesUrls.includes(a.url);
    const bFav = favoritesUrls.includes(b.url);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return 0;
  });

  if (!sortedGmes.length) {
    gmesGrid.innerHTML = `<div class="loading"><i class="fas fa-search"></i><p>No gmes found</p></div>`;
    return;
  }

  gmesGrid.innerHTML = sortedGmes.map(g => {
    return `
      <div class="gme-card" onclick="playGme('${g.url}', '${g.name}')">
        <div class="gme-image">
          <img src="${g.cover}" alt="${g.name}" class="gme-cover">
        </div>
        <div class="gme-info">
          <h3 class="gme-title">${g.name}</h3>
        </div>
      </div>`;
  }).join('');

  if (window.lucide) lucide.createIcons();

  // Update favorite button in viewer if a gme is open
  if (currentGmeUrl) updateFavoriteButton(currentGmeUrl);
}

// === FAVORITES ===
function toggleFavorite(url, title) {
  const index = favorites.findIndex(f => f.url === url);
  if (index === -1) {
    favorites.push({ url, title });
  } else {
    favorites.splice(index, 1);
  }
  localStorage.setItem('favoriteGmes', JSON.stringify(favorites));
  updateFavoriteButton(url);
  renderGmes();
}

function updateFavoriteButton(url) {
  currentGmeUrl = url;
  if (!favoriteToggleBtn) return;
  const isFav = favorites.some(f => f.url === url);
  favoriteToggleBtn.innerHTML = isFav
    ? '<i class="fas fa-star"></i> Favorited'
    : '<i class="far fa-star"></i> Favorite';
}

// === SEARCH FILTER ===
function filterGmes(term) {
  term = term.toLowerCase();
  filteredGmes = gmesData.filter(g =>
    g.name?.toLowerCase().includes(term)
  );
  renderGmes();
}

// === PLAY GAME ===
async function playGme(url, name) {
  if (!url) return showNotification(`${name || "Gme"} - files missing!`, 'warning');

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load game HTML');
    const htmlContent = await res.text();

    // Hide grid and header
    gmeLibraryHeader.style.display = 'none';
    gmeSearchSection.style.display = 'none';
    gmesGrid.style.display = 'none';

    // Show iframe and set srcdoc
    gmeIframeContainer.style.display = 'flex';
    gmeIframe.srcdoc = htmlContent;
    gmeTitle.textContent = name || "Unnamed Gme";

    // Update favorite button
    updateFavoriteButton(url);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    showNotification(`${name || "Gme"} - failed to load game content.`, 'warning');
  }
}

// === CLOSE / REFRESH / FULLSCREEN ===
function closeGme() {
  gmeLibraryHeader.style.display = '';
  gmeSearchSection.style.display = '';
  gmesGrid.style.display = 'grid';

  gmeIframeContainer.style.display = 'none';
  gmeIframe.src = '';
  gmeIframe.srcdoc = '';
}

function refreshGme() {
  if (gmeIframe && (gmeIframe.src || gmeIframe.srcdoc)) {
    if (gmeIframe.srcdoc) {
      // reload srcdoc by re-setting it
      gmeIframe.srcdoc = gmeIframe.srcdoc;
    } else {
      gmeIframe.src = gmeIframe.src;
    }
  }
}

function fullscreenGme() {
  if (gmeIframe.requestFullscreen) gmeIframe.requestFullscreen();
  else if (gmeIframe.webkitRequestFullscreen) gmeIframe.webkitRequestFullscreen();
  else if (gmeIframe.mozRequestFullScreen) gmeIframe.mozRequestFullScreen();
}

// === NOTIFICATIONS ===
function showNotification(msg, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${msg}`);
}

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
  loadGmes();
  if (gmeSearch) gmeSearch.addEventListener('input', e => filterGmes(e.target.value));

  // Favorite button in gme viewer
  if (favoriteToggleBtn) {
    favoriteToggleBtn.addEventListener('click', () => {
      if (currentGmeUrl) toggleFavorite(currentGmeUrl, gmeTitle.textContent);
    });
  }
});
