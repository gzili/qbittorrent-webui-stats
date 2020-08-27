const express = require('express')
const app = express()
const port = (process.env.NODE_ENV === 'production') ? 80 : 3001;

const http = require('http');

const config = require('./config.local.json');

const db = require('better-sqlite3')(config.dbFile, {fileMustExist: true});

app.use('/delete', express.text());

app.get('/', (req, res) => {
  res.send('qBittorrent WebUI statistics API server root.');
})

app.get('/stats', (req, res) => {
  const items = db.prepare('SELECT * FROM torrents').all();
  for (let item of items) {
    item.activity = db.prepare('SELECT * FROM activity WHERE hash = ?').all(item.hash);
  }
  res.json(items);
})

app.post('/delete', (req, res) => {
  const hash = req.body;
  const url = `http://localhost:8888/api/v2/torrents/delete?hashes=${hash}&deleteFiles=true`;

  http.get(url, qbRes => {
    qbRes.on('data', () => {});
    qbRes.on('end', () => {
      const torrentListChanges = db.prepare('DELETE FROM torrents WHERE hash = ?').run(hash);
      const activityChanges = db.prepare('DELETE FROM activity WHERE hash = ?').run(hash);
      console.log(`DELETED torrent with hash ${hash}`);
      console.log(`Rows affected in torrents table: ${torrentListChanges.changes}`);
      console.log(`Rows affected in activity table: ${activityChanges.changes}`);
      res.end();
    });
  });
})

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`)
})