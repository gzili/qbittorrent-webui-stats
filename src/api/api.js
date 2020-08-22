'use strict';

const express = require('express')
const app = express()
const port = 3000

const db = require('better-sqlite3')('../scripts/stats.db')

app.get('/', (req, res) => {
  res.send('qBittorrent WebUI statistics API server')
})

app.get('/stats.json', (req, res) => {
  const torrents = db.prepare('SELECT * FROM torrents LIMIT 2').all();
  for (let i = 0; i < torrents.length; ++i) {
    torrents[i]['activity'] = db.prepare('SELECT * FROM activity WHERE hash = ?').all(torrents[i]['hash']);
  }
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(torrents));
})

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`)
})