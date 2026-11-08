import express from 'express';
import cors from 'cors';
import { MangaBuddy } from 'mangascrape'; // GANTI KE MANGA BUDDY

const app = express();
app.use(cors());

// Sumber komik baru
const source = new MangaBuddy();

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
    <div id="grid"><p class="loading">Memuat komik populer...</p></div>
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
    // Fungsi nampilin kartu komik
    function renderCards(results) {
      const grid = document.getElementById('grid');
      grid.innerHTML = '';
      if(!results || results.length === 0) { grid.innerHTML = '<p style="color:#ff3d00;">Komik nggak nemu.</p>'; return; }
      
      results.forEach(m => {
        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => openDetail(m);
        // Ambil gambar dari properti yang tersedia
        const imgUrl = m.image || m.cover || 'https://via.placeholder.com/150x200/333/fff?text=No+Cover';
        card.innerHTML = '<img src="' + imgUrl + '"><p>' + m.title + '</p>';
        grid.appendChild(card);
      });
    }

    // Pas web pertama dibuka, ambil komik populer
    window.onload = async () => {
      try {
        const res = await fetch('/api/popular');
        const data = await res.json();
        renderCards(data.results || data);
      } catch(e) { document.getElementById('grid').innerHTML = '<p style="color:red;">Gagal memuat data awal.</p>'; }
    };

    async function searchManga() {
      const q = document.getElementById('search-box').value;
      document.getElementById('grid').innerHTML = '<p class="loading">Mencari...</p>';
      try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(q));
        const data = await res.json();
        renderCards(data.results || data);
      } catch(e) { document.getElementById('grid').innerHTML = '<p style="color:red;">Server error.</p>'; }
    }

    async function openDetail(manga) {
      document.getElementById('home').style.display = 'none';
      document.getElementById('detail').style.display = 'block';
      document.getElementById('detail-title').innerText = manga.title;
      const list = document.getElementById('chapter-list');
      list.innerHTML = '<p class="loading">Memuat chapter...</p>';
      window.scrollTo(0,0);
      
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
        
        if(!pages || pages.length === 0) { container.innerHTML = '<p style="color:red;">Gambar nggak ada.</p>'; return; }
        
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
// 2. KODE API (MANGABUDDY)
// ==========================================

// Endpoint Komik Populer (buat isi halaman awal)
app.get('/api/popular', async (req, res) => {
  try {
    // MangaBuddy biasanya punya fungsi popular
    const result = await source.popular(); 
    res.json(result);
  } catch (error) { 
    // Kalau gagal, coba ambil dari halaman depan
    try {
        const result = await source.home();
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: error.message }); 
    }
  }
});

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

app.get('*', (req, res) => {
  res.send(htmlContent);
});

app.listen(process.env.PORT || 3000, () => console.log('Server running'));
