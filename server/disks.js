const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

async function getDiskUsage(disks) {

  const paths = disks.map(disk => disk.path);

  const { stdout } = await exec(['df --output=target,used,avail', ...paths].join(' '));

  const diskStats = stdout.split('\n').slice(1, -1).map(line => {
    let [path, used, avail] = line.split(/\s+/);

    used *= 1024;
    avail *= 1024;

    return ({
      path: path,
      size: used + avail,
      used: used,
      free: avail,
    });
  });

  return diskStats;
}

exports.getDiskUsage = getDiskUsage;