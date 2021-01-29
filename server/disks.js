const { exec } = require('child_process');

const config = require('./config.local.json');

function getDiskUsage(disks) {
  const diskFiles = disks.map(disk => disk.file);

  const diskLines = exec(['df --output=file,used,avail', ...diskFiles].join(' '));

  diskLines.stdout.on('data', (stdout) => {
    const diskStats = stdout.split('\n').slice(1, -1).map(line => {
      let [file, used, avail] = line.split(/\s+/);

      // implicit conversion to number seems to be the fastest
      used = +used;
      avail = +avail;

      return ({
        file: file,
        size: used + avail,
        free: avail,
      });
    });

    console.log(diskStats);
  });
}

getDiskUsage(config.disks);