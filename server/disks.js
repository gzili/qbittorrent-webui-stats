const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

async function getDiskUsage(disks) {

  const diskFiles = disks.map(disk => disk.file);

  const { stdout } = await exec(['df --output=file,used,avail', ...diskFiles].join(' '));

  const diskStats = stdout.split('\n').slice(1, -1).map(line => {
    let [file, used, avail] = line.split(/\s+/);

    used *= 1024;
    avail *= 1024;

    return ({
      file: file,
      size: used + avail,
      used: used,
      free: avail,
    });
  });

  return diskStats;
}

exports.getDiskUsage = getDiskUsage;