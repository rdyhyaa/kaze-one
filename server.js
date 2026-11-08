import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());

// ==========================================
// 1. KODE TAMPILAN WEB (KATALOG)
// ==========================================
const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kaze Komik (Katalog)</title>
  <style>
    body { background: #121212; color: white; font-family: sans-serif; padding: 15px; }
    h1 { color: #ff3d00; text-align: center; }
    #search-box { width: 100%; padding: 12px; border-radius: 25px; border: none; margin-bottom: 15px; outline: none; }
    #grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }
    .card { background: #1e1e1e; padding: 10px; border-radius: 8px; cursor: pointer; }
    .card img { width: 100%; height: 140px; object-fit: cover; border-radius: 5px; }
    .card p { font-size: 12px; text-align: center; margin: 8px 0 0 0; font-weight: bold; line-height: 1.2; }
    #detail { display: none; margin-top: 20px; background: #1e1e1e; padding: 15px; border-radius: 10px; }
    .back { background: #ff3d00; color: white; border: none; padding: 10px 15px; border-radius: 5px; margin-bottom: 15px; cursor: pointer; font-weight: bold; }
    .loading { text-align: center; color: #888; padding: 20px; }
    .info { display: flex; gap: 15px; }
    .info img { width: 120px; height: 170px; border-radius: 8px; object-fit: cover; }
  </style>
</head>
<body>
  <div id="home">
    <h1>🥷 Kaze Komik</h1>
    <input type="text" id="search-box" placeholder="Cari judul manga..." onkeypress="if(event.key==='Enter') searchManga()">
    <div id="grid"><p class="loading">Memuat data...</p></div>
  </div>
  <div id="detail">
    <button class="back" onclick="document.getElementById('detail').style.display='none'; document.getElementById('home').style.display='block';">← Kembali</button>
    <div class="info">
      <img id="d-img" src="">
      <div>
        <h2 id="d-title" style="margin-bottom: 10px;"></h2>
        <p id="d-score" style="color: #ff3d00; font-weight: bold; margin-bottom: 10px;"></p>
        <p id="d-synopsis" style="font-size: 13px; color: #ccc; line-height: 1.5;"></p>
      </div>
    </div>
  </div>

  <script>
    // Fungsi nampilin kartu
    function renderCards(results) {
      const grid = document.getElementById('grid');
      grid.innerHTML = '';
      if(!results || results.length === 0) { grid.innerHTML = '<p style="color:#ff3d00;">Data nggak nemu.</p>'; return; }
      
      results.forEach(m => {
        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => openDetail(m);
        const imgUrl = m.images && m.images.jpg ? m.images.jpg.image_url : 'https://via.placeholder.com/150x200/333/fff?text=No+Cover';
        card.innerHTML = '<img src="' + imgUrl + '"><p>' + m.title + '</p>';
        grid.appendChild(card);
      });
    }

    // Ambil data awal
    window.onload = async () => {
      try {
        const res = await fetch('/api/manga');
        const data = await res.json();
        renderCards(data.data);
      } catch(e) { document.getElementById('grid').innerHTML = '<p style="color:red;">Gagal memuat data.</p>'; }
    };

    async function searchManga() {
      const q = document.getElementById('search-box').value;
      document.getElementById('grid').innerHTML = '<p class="loading">Mencari...</p>';
      try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(q));
        const data = await res.json();
        renderCards(data.data);
      } catch(e) { document.getElementById('grid').innerHTML = '<p style="color:red;">Gagal mencari.</p>'; }
    }

    function openDetail(manga) {
      document.getElementById('home').style.display = 'none';
      document.getElementById('detail').style.display = 'block';
      window.scrollTo(0,0);
      
      document.getElementById('d-img').src = manga.images && manga.images.jpg ? manga.images.jpg.image_url : '';
      document.getElementById('d-title').innerText = manga.title;
      document.getElementById('d-score').innerText = '⭐ ' + (manga.score || 'Belum ada rating') + ' | ' + (manga.status || '-');
      document.getElementById('d-synopsis').innerText = manga.synopsis || 'Tidak ada sinopsis.';
    }
  </script>
</body>
</html>
`;

// ==========================================
// 2. KODE API (JIKAN / MYANIMELIST)
// ==========================================
const JIKAN_API = "https://api.jikan.moe/v4";

app.get('/api/manga', async (req, res) => {
  try {
    const response = await fetch(`${JIKAN_API}/top/manga`);
    const data = await response.json();
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    const response = await fetch(`${JIKAN_API}/manga?q=${encodeURIComponent(q)}`);
    const data = await response.json();
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
