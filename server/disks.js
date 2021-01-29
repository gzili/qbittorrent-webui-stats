const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

const config = require('./config.local.json');

async function getDiskUsage(disks) {

  const diskFiles = disks.map(disk => disk.file);

  const { stdout } = await exec(['df --output=file,used,avail', ...diskFiles].join(' '));

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

  return diskStats;
}

getDiskUsage(config.disks).then(diskStats => console.log(diskStats));