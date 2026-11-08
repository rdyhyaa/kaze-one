import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());

// ==========================================
// 1. KODE TAMPILAN WEB
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
    #grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(105px, 1fr)); gap: 10px; }
    .card { background: #1e1e1e; padding: 8px; border-radius: 8px; cursor: pointer; }
    .card img { width: 100%; height: 150px; object-fit: cover; border-radius: 5px; }
    .card p { font-size: 12px; text-align: center; margin: 8px 0 0 0; font-weight: bold; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;}
    #detail { display: none; margin-top: 20px; background: #1e1e1e; padding: 15px; border-radius: 10px; }
    .back { background: #ff3d00; color: white; border: none; padding: 10px 15px; border-radius: 5px; margin-bottom: 15px; cursor: pointer; font-weight: bold; }
    .loading { text-align: center; color: #888; padding: 20px; }
    .info { display: flex; gap: 15px; margin-bottom: 15px;}
    .info img { width: 110px; height: 160px; border-radius: 8px; object-fit: cover; }
    .info-data h2 { margin-bottom: 5px; font-size: 18px; }
    .info-data p { color: #ff3d00; font-weight: bold; }
    .synopsis { font-size: 13px; color: #ccc; line-height: 1.5; }
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
    <div class="info">
      <img id="d-img" src="">
      <div class="info-data">
        <h2 id="d-title"></h2>
        <p id="d-score"></p>
      </div>
    </div>
    <div class="synopsis" id="d-synopsis"></div>
  </div>

  <script>
    // Fungsi nampilin kartu
    function renderCards(results) {
      const grid = document.getElementById('grid');
      grid.innerHTML = '';
      
      // Cek apakah data valid
      if(!results || results.length === 0) { 
        grid.innerHTML = '<p style="color:#ff3d00; text-align:center; width:100%;">Data komik kosong atau API limit.</p>'; 
        return; 
      }
      
      results.forEach(m => {
        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => openDetail(m);
        
        let imgUrl = 'https://via.placeholder.com/150x200/333/fff?text=No+Cover';
        if (m.images && m.images.jpg && m.images.jpg.image_url) {
            imgUrl = m.images.jpg.image_url;
        }
        
        card.innerHTML = '<img src="' + imgUrl + '" loading="lazy"><p>' + m.title + '</p>';
        grid.appendChild(card);
      });
    }

    // Ambil data awal pas dibuka
    window.onload = async () => {
      try {
        const res = await fetch('/api/manga');
        const data = await res.json();
        // Jikan API ngasih data di dalam properti 'data'
        renderCards(data.data);
      } catch(e) { 
        document.getElementById('grid').innerHTML = '<p style="color:red; text-align:center;">Gagal konek ke server.</p>'; 
      }
    };

    // Fitur Search
    async function searchManga() {
      const q = document.getElementById('search-box').value;
      if(!q) return;
      
      document.getElementById('grid').innerHTML = '<p class="loading">Mencari...</p>';
      try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(q));
        const data = await res.json();
        renderCards(data.data);
      } catch(e) { 
        document.getElementById('grid').innerHTML = '<p style="color:red; text-align:center;">Gagal mencari.</p>'; 
      }
    }

    // Buka Detail
    function openDetail(manga) {
      document.getElementById('home').style.display = 'none';
      document.getElementById('detail').style.display = 'block';
      window.scrollTo(0,0);
      
      let imgUrl = 'https://via.placeholder.com/150x200/333/fff?text=No+Cover';
      if (manga.images && manga.images.jpg && manga.images.jpg.image_url) {
          imgUrl = manga.images.jpg.image_url;
      }
      
      document.getElementById('d-img').src = imgUrl;
      document.getElementById('d-title').innerText = manga.title;
      document.getElementById('d-score').innerText = '⭐ ' + (manga.score || 'Belum ada rating') + ' | Status: ' + (manga.status || '-');
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
    // Ambil 20 komik terpopuler
    const response = await fetch(`${JIKAN_API}/top/manga?limit=20`);
    const data = await response.json();
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    const response = await fetch(`${JIKAN_API}/manga?q=${encodeURIComponent(q)}&limit=20`);
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
