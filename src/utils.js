import moment from 'moment';

export function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let p = 0;
  while (Math.pow(1024, p) <= bytes) ++p;
  return (p > 0) ? `${parseFloat((bytes / Math.pow(1024, p - 1)).toFixed(2))} ${units[p - 1]}` : `${bytes} B`;
}

export function getTorrentStatsByDay(row, maxDays) {
  const addedDate = moment.unix(row.added_on);
  let iterDate = moment();

  let daysObj = {};
  let days = [];
  let dayCount = 0;

  while (iterDate.isSameOrAfter(addedDate, 'day') && dayCount < maxDays) {
    const day = iterDate.format('YYYY-MM-DD');
    daysObj[day] = [];
    days.push(day);
    ++dayCount;
    iterDate.subtract(1, 'day');
  }

  for (let i = row.activity.length - 1; i >= 0; --i) {
    const item = row.activity[i];
    let itemDate = moment.unix(item.timestamp);
    if (itemDate.hour() === 0 && itemDate.minute() === 0) itemDate.subtract(1, 'day');
    const key = itemDate.format('YYYY-MM-DD');
    if (daysObj.hasOwnProperty(key)) daysObj[key].push(item);
    else break;
  }

  let statsArray = [];
  let lastDayAmount = null;
  let total = 0;
  days.reverse();
  const addedDateKey = addedDate.format('YYYY-MM-DD');
  for (let day of days) {
    const items = daysObj[day];
    let dayTotal = 0;
    if (items.length > 0) {
      if (addedDateKey === day) dayTotal = items[0].uploaded;
      else {
        dayTotal = items[0].uploaded - items[items.length - 1].uploaded;
        if (lastDayAmount !== null) dayTotal += items[items.length - 1].uploaded - lastDayAmount;
      }
      lastDayAmount = items[0].uploaded;
    }
    statsArray.push({
      date: day,
      uploaded: dayTotal,
    });
    total += dayTotal;
  }

  return {
    stats: statsArray,
    total: total,
  };
}