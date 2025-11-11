const bigDiv = document.getElementById("bigDiv");
const searchBar = document.getElementById("searchbar");
const iframeContainer = document.getElementById("iframeContainer");
const fullscreenIframe = document.getElementById("fullscreenIframe");
const iframeTitle = document.getElementById("iframeTitle");

// TV modal
const tvModal = document.getElementById("tvModal");
const seasonList = document.getElementById("seasonList");
const episodeList = document.getElementById("episodeList");

let currentTV = null;
let currentTitle = null;

// --- Load Home: Popular Movies & TV (interleaved) ---
async function loadHomeContent() {
  bigDiv.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading popular content...</p></div>';

  try {
    const [moviesRes, tvRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/popular?api_key=9a2954cb0084e80efa20b3729db69067`),
      fetch(`https://api.themoviedb.org/3/tv/popular?api_key=9a2954cb0084e80efa20b3729db69067`)
    ]);
    const [moviesData, tvData] = await Promise.all([moviesRes.json(), tvRes.json()]);

    const movies = (moviesData.results || []).map(r => ({ ...r, media_type: "movie" }));
    const tv = (tvData.results || []).map(r => ({ ...r, media_type: "tv" }));

    // Alternate results: one movie, one tv, etc.
    const combined = [];
    const maxLength = Math.max(movies.length, tv.length);
    for (let i = 0; i < maxLength; i++) {
      if (i < movies.length) combined.push(movies[i]);
      if (i < tv.length) combined.push(tv[i]);
      if (combined.length >= 30) break;
    }

    displayResults(combined);
  } catch (err) {
    console.error(err);
    bigDiv.innerHTML = '<div class="loading"><p>Failed to load content. Please try again.</p></div>';
  }
}

// --- Search Media ---
async function searchMedia(query) {
  bigDiv.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Searching...</p></div>';
  
  try {
    const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=9a2954cb0084e80efa20b3729db69067&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    displayResults(data.results || []);
  } catch(err) {
    console.error(err);
    bigDiv.innerHTML = '<div class="loading"><p>Search failed. Please try again.</p></div>';
  }
}

// --- Display results ---
function displayResults(results) {
  bigDiv.innerHTML = "";
  
  if (!results.length) {
    bigDiv.innerHTML = '<div class="loading"><p>No results found. Try a different search.</p></div>';
    return;
  }

  // Filter out items without posters
  const validResults = results.filter(item => item.poster_path);
  
  validResults.forEach((item, index) => {
    const poster = `https://image.tmdb.org/t/p/w500/${item.poster_path}`;
    const rating = item.vote_average ? Math.round(item.vote_average * 10) / 10 : "N/A";
    const year = item.release_date ? item.release_date.slice(0, 4) :
                 item.first_air_date ? item.first_air_date.slice(0, 4) : "N/A";

    const card = document.createElement("div");
    card.className = "result-card";
    card.style.animationDelay = `${index * 0.05}s`;
    
    card.innerHTML = `
      <div class="poster-container">
        <img src="${poster}" alt="${item.title || item.name}" loading="lazy">
      </div>
      <div class="card-info">
        <div class="card-title">${item.title || item.name}</div>
        <div class="card-meta">
          <span class="rating">⭐ ${rating}</span>
          <span>${year}</span>
        </div>
      </div>
    `;
    
    card.addEventListener("click", () => {
      if (item.media_type === "tv") {
        showTVModal(item.id, item.name || item.title);
      } else {
        openIframe(
          `https://wmath.netlify.app/misc/customsource/index3.html?id=${item.id}&type=movie`,
          item.title || item.name
        );
      }
    });
    
    bigDiv.appendChild(card);
  });
}

// --- TV Modal ---
async function showTVModal(tvId, title) {
  currentTV = tvId;
  currentTitle = title;
  seasonList.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
  episodeList.innerHTML = '';
  tvModal.style.display = "flex";

  try {
    const res = await fetch(`https://api.themoviedb.org/3/tv/${tvId}?api_key=9a2954cb0084e80efa20b3729db69067`);
    const show = await res.json();
    const seasons = show.seasons.filter(s => s.season_number > 0);

    seasonList.innerHTML = '';
    
    seasons.forEach((s, index) => {
      const btn = document.createElement("button");
      btn.textContent = `Season ${s.season_number}`;
      btn.addEventListener("click", () => loadEpisodes(tvId, s.season_number, btn));
      seasonList.appendChild(btn);
      
      // Auto-load first season
      if (index === 0) {
        btn.classList.add('active');
        loadEpisodes(tvId, s.season_number, btn);
      }
    });
  } catch(err) {
    console.error(err);
    seasonList.innerHTML = '<p style="color: rgba(255,255,255,0.6); padding: 1rem;">Failed to load seasons</p>';
  }
}

async function loadEpisodes(tvId, seasonNumber, activeBtn) {
  // Highlight selected season
  Array.from(seasonList.children).forEach(b => b.classList.remove("active"));
  activeBtn.classList.add("active");

  episodeList.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
  
  try {
    const res = await fetch(`https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}?api_key=9a2954cb0084e80efa20b3729db69067`);
    const seasonData = await res.json();

    episodeList.innerHTML = '';
    
    seasonData.episodes.forEach(ep => {
      const btn = document.createElement("button");
      btn.innerHTML = `
        <div><strong>Episode ${ep.episode_number}</strong></div>
        <div style="font-size: 0.85rem; opacity: 0.7; margin-top: 0.25rem;">${ep.name}</div>
      `;
      btn.addEventListener("click", () => {
        const url = `${window.location.origin}/misc/customsource/index3.html?id=${tvId}&type=tv&season=${seasonNumber}&episode=${ep.episode_number}`;
        openIframe(url, `${currentTitle} - S${seasonNumber}E${ep.episode_number}`);
        closeTVModal();
      });
      episodeList.appendChild(btn);
    });
  } catch(err) {
    console.error(err);
    episodeList.innerHTML = '<p style="color: rgba(255,255,255,0.6); padding: 1rem;">Failed to load episodes</p>';
  }
}

function closeTVModal() {
  tvModal.style.display = "none";
  seasonList.innerHTML = "";
  episodeList.innerHTML = "";
}

// --- Iframe functions ---
function openIframe(url, title = "Now Playing") {
  fullscreenIframe.src = url;
  iframeTitle.textContent = title;
  iframeContainer.style.display = "flex";
}

function closeIframe() {
  fullscreenIframe.src = "";
  iframeContainer.style.display = "none";
}

// --- Init ---
document.addEventListener("DOMContentLoaded", () => {
  loadHomeContent();
  
  // Search functionality
  let searchTimeout;
  searchBar.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    const query = searchBar.value.trim();
    
    if (query.length === 0) {
      loadHomeContent();
      return;
    }
    
    // Debounce search
    searchTimeout = setTimeout(() => {
      if (query.length >= 2) {
        searchMedia(query);
      }
    }, 500);
  });
  
  searchBar.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      clearTimeout(searchTimeout);
      const query = searchBar.value.trim();
      if (query) {
        searchMedia(query);
      }
    }
  });
});
