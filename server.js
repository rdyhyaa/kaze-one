import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());

// Vercel bertindak sebagai proxy langsung ke MangaDex
async function fetchMangaDex(path) {
    const url = "https://api.mangadex.org" + path;
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'KazeKomik/1.0 (https://kaze-one.vercel.app)',
            'Accept': 'application/json'
        }
    });
    return await res.json();
}

// ==========================================
// 1. TAMPILAN WEB (HTML)
// ==========================================
const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kaze Komik</title>
  <style>
    body { background: #121212; color: white; font-family: sans-serif; padding: 15px; }
    h1 { color: #ff3d00; text-align: center; }
    #search-box { width: 100%; padding: 12px; border-radius: 25px; border: none; margin-bottom: 15px; outline: none; }
    #grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }
    .card { background: #1e1e1e; padding: 8px; border-radius: 8px; cursor: pointer; }
    .card img { width: 100%; height: 140px; object-fit: cover; border-radius: 5px; }
    .card p { font-size: 12px; text-align: center; margin: 8px 0 0 0; font-weight: bold; line-height: 1.2; }
    #detail, #reader { display: none; margin-top: 20px; }
    .back { background: #ff3d00; color: white; border: none; padding: 10px 15px; border-radius: 5px; margin-bottom: 15px; cursor: pointer; font-weight: bold; }
    .ch-item { background: #1e1e1e; padding: 15px; margin-bottom: 8px; border-radius: 8px; cursor: pointer; font-weight: bold; }
    #reader img { width: 100%; display: block; margin-bottom: 2px; }
    .loading { text-align: center; color: #888; padding: 20px; width: 100%;}
  </style>
</head>
<body>
  <div id="home">
    <h1>🥷 Kaze Komik</h1>
    <input type="text" id="search-box" placeholder="Cari judul manga..." onkeypress="if(event.key==='Enter') searchManga()">
    <div id="grid"><p class="loading">Memuat komik...</p></div>
  </div>
  <div id="detail">
    <button class="back" onclick="document.getElementById('detail').style.display='none'; document.getElementById('home').style.display='block';">← Kembali</button>
    <h2 id="detail-title" style="margin-bottom: 15px;"></h2>
    <div id="chapter-list"></div>
  </div>
  <div id="reader">
    <button class="back" onclick="document.getElementById('reader').style.display='none'; document.getElementById('detail').style.display='block';">← Tutup</button>
    <div id="reader-img"></div>
  </div>
  <script>
    // Gambar langsung dari MangaDex (MangaDex ngebolehin hotlink cover)
    const IMG_PROXY = "https://uploads.mangadex.org/covers/";

    function renderCards(results) {
      const grid = document.getElementById('grid');
      grid.innerHTML = '';
      if(!results || results.length === 0) { grid.innerHTML = '<p style="color:#ff3d00; text-align:center; grid-column:1/-1;">Data kosong.</p>'; return; }
      
      results.forEach(m => {
        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => openDetail(m.id);
        
        let title = m.attributes.title.en || m.attributes.title['ja-ro'] || Object.values(m.attributes.title)[0] || 'Tanpa Judul';
        let coverRel = m.relationships.find(r => r.type === 'cover_art');
        let imgUrl = coverRel ? IMG_PROXY + m.id + '/' + coverRel.attributes.fileName + '.256.jpg' : 'https://via.placeholder.com/150x200/333/fff?text=No+Cover';
        
        card.innerHTML = '<img src="' + imgUrl + '" loading="lazy"><p>' + title + '</p>';
        grid.appendChild(card);
      });
    }

    window.onload = async () => {
      try {
        const res = await fetch('/api/manga');
        const data = await res.json();
        renderCards(data.data);
      } catch(e) { document.getElementById('grid').innerHTML = '<p style="color:red; text-align:center; grid-column:1/-1;">Sistem sibuk. Refresh bentar lagi.</p>'; }
    };

    async function searchManga() {
      const q = document.getElementById('search-box').value;
      document.getElementById('grid').innerHTML = '<p class="loading">Mencari...</p>';
      try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(q));
        const data = await res.json();
        renderCards(data.data);
      } catch(e) { document.getElementById('grid').innerHTML = '<p style="color:red; text-align:center; grid-column:1/-1;">Gagal mencari.</p>'; }
    }

    async function openDetail(id) {
      document.getElementById('home').style.display = 'none';
      document.getElementById('detail').style.display = 'block';
      document.getElementById('detail-title').innerText = 'Memuat chapter...';
      const list = document.getElementById('chapter-list');
      list.innerHTML = '';
      window.scrollTo(0,0);
      
      try {
        const res = await fetch('/api/details?id=' + id);
        const data = await res.json();
        
        let title = data.data.attributes.title.en || Object.values(data.data.attributes.title)[0];
        document.getElementById('detail-title').innerText = title;
        
        let chRes = await fetch('/api/chapters?id=' + id);
        let chData = await chRes.json();
        
        if(!chData.data || chData.data.length === 0) { list.innerHTML = '<p>Belum ada chapter.</p>'; return; }
        
        // Filter biar nggak duplikat
        let seen = new Set();
        let validCh = chData.data.filter(ch => {
            if(!ch.attributes.chapter || seen.has(ch.attributes.chapter)) return false;
            seen.add(ch.attributes.chapter);
            return true;
        });

        validCh.forEach(ch => {
          const div = document.createElement('div');
          div.className = 'ch-item';
          div.innerText = 'Chapter ' + ch.attributes.chapter;
          div.onclick = () => openChapter(ch.id);
          list.appendChild(div);
        });
      } catch(e) { list.innerHTML = '<p style="color:red;">Gagal memuat detail.</p>'; }
    }

    async function openChapter(chapterId) {
      document.getElementById('detail').style.display = 'none';
      document.getElementById('reader').style.display = 'block';
      const container = document.getElementById('reader-img');
      container.innerHTML = '<p class="loading">Memuat gambar...</p>';
      window.scrollTo(0,0);
      
      try {
        const res = await fetch('/api/pages?chapterId=' + chapterId);
        const data = await res.json();
        
        let server = data.baseUrl;
        let hash = data.chapter.hash;
        let pages = data.chapter.dataSaver || data.chapter.data;
        let folder = data.chapter.dataSaver ? 'data-saver' : 'data';
        
        container.innerHTML = '';
        if(!pages || pages.length === 0) { container.innerHTML = '<p style="color:red;">Gambar nggak ada.</p>'; return; }
        
        pages.forEach(file => {
          const img = document.createElement('img');
          // Gambar chapter langsung ke server MangaDex
          img.src = server + '/' + folder + '/' + hash + '/' + file;
          img.loading = 'lazy';
          container.appendChild(img);
        });
      } catch(e) { container.innerHTML = '<p style="color:red;">Gagal memuat gambar.</p>'; }
    }
  </script>
</body>
</html>
`;

// ==========================================
// 2. API MANGADEX (LANGSUNG)
// ==========================================
app.get('/api/manga', async (req, res) => {
  try {
    const data = await fetchMangaDex('/manga?limit=24&includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive');
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    const data = await fetchMangaDex(`/manga?limit=24&title=${encodeURIComponent(q)}&includes[]=cover_art`);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/details', async (req, res) => {
  try {
    const { id } = req.query;
    const data = await fetchMangaDex(`/manga/${id}?includes[]=cover_art`);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/chapters', async (req, res) => {
  try {
    const { id } = req.query;
    const data = await fetchMangaDex(`/manga/${id}/feed?limit=500&translatedLanguage[]=en&translatedLanguage[]=id&order[chapter]=asc`);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/pages', async (req, res) => {
  try {
    const { chapterId } = req.query;
    const data = await fetchMangaDex(`/at-home/server/${chapterId}`);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// 3. TAMPILIN HTML
// ==========================================
app.get('/', (req, res) => {
  res.send(htmlContent);
});

app.get('*', (req, res) => {
  res.send(htmlContent);
});

app.listen(process.env.PORT || 3000, () => console.log('Server running'));
