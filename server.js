import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());

// ==========================================
// 1. KODE TAMPILAN WEB (HTML + CSS + JS)
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
    .card { background: #1e1e1e; padding: 10px; border-radius: 8px; cursor: pointer; }
    .card img { width: 100%; height: 140px; object-fit: cover; border-radius: 5px; }
    .card p { font-size: 12px; text-align: center; margin: 8px 0 0 0; font-weight: bold; }
    #detail, #reader { display: none; margin-top: 20px; }
    .back { background: #ff3d00; color: white; border: none; padding: 10px 15px; border-radius: 5px; margin-bottom: 15px; cursor: pointer; font-weight: bold; }
    .ch-item { background: #1e1e1e; padding: 15px; margin-bottom: 8px; border-radius: 8px; cursor: pointer; font-weight: bold; }
    #reader img { width: 100%; display: block; margin-bottom: 2px; }
    .loading { text-align: center; color: #888; padding: 20px; }
  </style>
</head>
<body>
  <div id="home">
    <h1>🥷 Kaze Komik</h1>
    <input type="text" id="search-box" placeholder="Cari judul komik..." onkeypress="if(event.key==='Enter') searchManga()">
    <div id="grid"><p class="loading">Ketik judul buat nyari...</p></div>
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
    async function searchManga() {
      const q = document.getElementById('search-box').value;
      const grid = document.getElementById('grid');
      grid.innerHTML = '<p class="loading">Mencari...</p>';
      try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(q));
        const data = await res.json();
        grid.innerHTML = '';
        if(!data.results || data.results.length === 0) { grid.innerHTML = '<p>Komik nggak nemu.</p>'; return; }
        data.results.forEach(m => {
          const card = document.createElement('div');
          card.className = 'card';
          card.onclick = () => openDetail(m);
          card.innerHTML = '<img src="' + m.image + '"><p>' + m.title + '</p>';
          grid.appendChild(card);
        });
      } catch(e) { grid.innerHTML = '<p style="color:red;">Server error.</p>'; }
    }

    async function openDetail(manga) {
      document.getElementById('home').style.display = 'none';
      document.getElementById('detail').style.display = 'block';
      document.getElementById('detail-title').innerText = manga.title;
      const list = document.getElementById('chapter-list');
      list.innerHTML = '<p class="loading">Memuat chapter...</p>';
      try {
        const res = await fetch('/api/details?id=' + manga.id);
        const data = await res.json();
        list.innerHTML = '';
        if(!data.chapters) { list.innerHTML = '<p>Belum ada chapter.</p>'; return; }
        data.chapters.forEach(ch => {
          const div = document.createElement('div');
          div.className = 'ch-item';
          div.innerText = ch.name || ch.title || 'Chapter';
          div.onclick = () => openChapter(manga.id, ch.id);
          list.appendChild(div);
        });
      } catch(e) { list.innerHTML = '<p style="color:red;">Gagal memuat chapter.</p>'; }
    }

    async function openChapter(mangaId, chapterId) {
      document.getElementById('detail').style.display = 'none';
      document.getElementById('reader').style.display = 'block';
      const container = document.getElementById('reader-img');
      container.innerHTML = '<p class="loading">Memuat gambar...</p>';
      window.scrollTo(0,0);
      try {
        const res = await fetch('/api/pages?mangaId=' + mangaId + '&chapterId=' + chapterId);
        const pages = await res.json();
        container.innerHTML = '';
        pages.forEach(p => {
          const img = document.createElement('img');
          img.src = p.url || p;
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
// 2. KODE API (MANGASCRAPE)
// ==========================================
import { Batoto } from 'mangascrape';
const source = new Batoto();

app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    const result = await source.search({ query: q });
    res.json(result);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/details', async (req, res) => {
  try {
    const { id } = req.query;
    const detail = await source.id(id);
    res.json(detail);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/pages', async (req, res) => {
  try {
    const { mangaId, chapterId } = req.query;
    const chapter = await source.chapter(mangaId, chapterId);
    res.json(chapter);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// 3. TAMPILIN HTML DI HALAMAN UTAMA
// ==========================================
app.get('/', (req, res) => {
  res.send(htmlContent);
});

// Fallback buat route lain (selain /api dan /)
app.get('*', (req, res) => {
  res.send(htmlContent);
});

app.listen(process.env.PORT || 3000, () => console.log('Server running'));
