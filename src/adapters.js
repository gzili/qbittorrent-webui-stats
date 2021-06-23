import moment from 'moment';

import { getTorrentStatsByDay } from './utils';

export function fetchDiskStats() {
  return new Promise((resolve, reject) => {
    fetch('/disks', {
      cache: 'no-store',
    }).then(response => (
      response.json().then(data => {
        resolve(data);
      })
    )).catch(() => {
      reject('Error loading disk usage');
    });
  });
}

export function fetchTorrents() {
  return new Promise((resolve, reject) => {
    fetch('/stats', {
      cache: 'no-store',
    }).then(response => {
      response.json().then(data => {
        for (let row of data) {
          row.lastChange = row.activity[row.activity.length - 1];

          let last10DaysBytes = getTorrentStatsByDay(row, 10).total;
          row.last10Days = {
            bytes: last10DaysBytes,
            ratio: +(last10DaysBytes / row.size).toFixed(2),
          };
        }

        resolve({
          timestamp: moment().minute(0).second(0).unix(),
          rows: data,
        });
      })
    }).catch(() => {
      reject('Error loading torrents')
    });
  });
}

export function deleteTorrent(hash) {
  return new Promise((resolve, reject) => {
    fetch('/delete', {
      method: 'POST',
      body: hash,
    }).then(() => resolve());
  });
}