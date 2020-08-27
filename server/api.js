'use strict';

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
  let str = '';
  const reqOpts = {
    host: 'localhost',
    port: 8888,
    path: '/api/v2/app/version',
  };
  http.request(reqOpts, response => {
    response.on('data', chunk => {
      str += chunk;
    });
    response.on('end', () => {
      console.log(str);
      res.send(str);
    });
  }).end();
  // res.send('qBittorrent WebUI statistics API server');
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
  const qbRequestOptions = {
    host: 'localhost',
    port: 8888,
    path: `/api/v2/torrents/delete?hashes=${hash}&deleteFiles=true`,
  };
  let qbResponse = '';
  http.request(qbRequestOptions, response => {
    response.on('data', chunk => {
      qbResponse += chunk;
    });
    response.on('end', () => {
      const torrentListChanges = db.prepare('DELETE FROM torrents WHERE hash = ?').run(hash);
      const activityChanges = db.prepare('DELETE FROM activity WHERE hash = ?').run(hash);
      console.log(`DELETED torrent with hash ${hash}`);
      console.log(`Rows affected in torrents table: ${torrentListChanges.changes}`);
      console.log(`Rows affected in activity table: ${activityChanges.changes}`);
      res.end();
    });
  }).end();
})

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`)
})