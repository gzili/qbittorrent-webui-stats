const express = require('express')
const app = express()
const port = 3001

const config = require('./config.local.json');
const db = require('better-sqlite3')(config.dbFile, {fileMustExist: true});

const http = require('http');

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use('/delete', express.text());

app.get('/', (req, res) => {
  res.send('qBittorrent WebUI statistics API server root.');
})

app.get('/stats', (req, res) => {
  const torrents = db.prepare('SELECT * FROM torrents').all();
  for (let i = 0; i < torrents.length; ++i) {
    torrents[i]['activity'] = db.prepare('SELECT * FROM activity WHERE hash = ?').all(torrents[i]['hash']);
  }
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(torrents));
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