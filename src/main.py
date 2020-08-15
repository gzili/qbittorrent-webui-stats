#!/home/pi/python/qb-stats/.venv/bin/python
# Standard library modules
import argparse
import os.path
import sqlite3

# External modules
import requests

# Parse given command line arguments
argParser = argparse.ArgumentParser()
argParser.add_argument('--working-dir', default='')
args = argParser.parse_args()

# Set some globals
baseDir = args.working_dir
dbPath = os.path.join(baseDir, 'stats.db')

# Call the qBittorrent API for torrents list
qbResponse = requests.get('http://localhost:8888/api/v2/torrents/info').json()

# Database routines
if os.path.exists(dbPath):
  qbTorrentItems = []
  for t in qbResponse:
    qbTorrentItems.append({
      'hash': t['hash'],
      'name': t['name'],
      'size': int(t['size']),
      'added_on': int(t['added_on']),
      'last_activity': int(t['last_activity']),
      'uploaded': int(t['uploaded']),
      'time_active': int(t['time_active'])
    })

  conn = sqlite3.connect(dbPath)
  cursor = conn.cursor()
  for item in qbTorrentItems:
    cursor.execute('SELECT last_activity FROM torrents WHERE hash = ?', [item['hash']])
    result = cursor.fetchone()
    if result:
      dbTimestamp = int(result[0])
      if item['last_activity'] > dbTimestamp:
        cursor.execute('INSERT INTO activity VALUES (?,?,?,?)', [item['hash'], item['last_activity'], item['uploaded'], item['time_active']])
        cursor.execute('UPDATE torrents SET last_activity = ? WHERE hash = ?', [item['last_activity'], item['hash']])
    else:
      cursor.execute('INSERT INTO torrents VALUES (?,?,?,?,?)', [item['hash'], item['name'], item['size'], item['added_on'], item['last_activity']])
      cursor.execute('INSERT INTO activity VALUES (?,?,?,?)', [item['hash'], item['last_activity'], item['uploaded'], item['time_active']])
  conn.commit()
  conn.close()
else:
  requiredProps = ['hash', 'name', 'size', 'added_on', 'last_activity', 'uploaded', 'time_active']

  torrentsList = [{p: t[p] for p in requiredProps} for t in qbResponse]

  conn = sqlite3.connect(dbPath)
  cursor = conn.cursor()
  cursor.execute('''CREATE TABLE torrents
                    (hash TEXT, name TEXT, size INT, added_on INT, last_activity INT)''')
  cursor.execute('''CREATE TABLE activity
                    (hash TEXT, timestamp INT, uploaded INT, time_active INT)''')
  for t in torrentsList:
    cursor.execute('INSERT INTO torrents VALUES (?,?,?,?,?)', [t['hash'], t['name'], t['size'], t['added_on'], t['last_activity']])
    cursor.execute('INSERT INTO activity VALUES (?,?,?,?)', [t['hash'], t['last_activity'], t['uploaded'], t['time_active']])
  conn.commit()
  conn.close()