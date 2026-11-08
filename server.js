import express from 'express';
import cors from 'cors';
import { Batoto, MangaBuddy } from 'mangascrape'; // Library serbaguna

const app = express();
app.use(cors());

// Kita pake sumber Batoto dulu buat ngetes
const source = new Batoto();

// Endpoint buat nyari manga
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    const result = await source.search({ query: q });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint buat ambil detail & chapter
app.get('/api/details', async (req, res) => {
  try {
    const { id } = req.query;
    const detail = await source.id(id);
    res.json(detail);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint buat ambil gambar chapter
app.get('/api/pages', async (req, res) => {
  try {
    const { mangaId, chapterId } = req.query;
    const chapter = await source.chapter(mangaId, chapterId);
    res.json(chapter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve file statis (index.html)
app.use(express.static('.'));

app.listen(process.env.PORT || 3000);
