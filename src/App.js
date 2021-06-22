import { useEffect, useCallback, useState } from 'react';
import { Box, Flex, Heading, Button } from '@chakra-ui/react';
import moment from 'moment';

import TorrentsTable from './TorrentsTable';

import './App.css';

const useAsync = (asyncFunction, immediate = true) => {
  const [status, setStatus] = useState('idle');
  const [value, setValue] = useState(null);
  const [error, setError] = useState(null);

  // The execute function wraps asyncFunction and
  // handles setting state for pending, value, and error.
  // useCallback ensures the below useEffect is not called
  // on every render, but only if asyncFunction changes.
  const execute = useCallback(() => {
    setStatus('pending');
    //setValue(null);
    setError(null);
    return asyncFunction()
      .then((response) => {
        setValue(response);
        setStatus('success');
      })
      .catch((error) => {
        setError(error);
        setStatus('error');
      });
  }, [asyncFunction]);

  // Call execute if we want to fire it right away.
  // Otherwise execute can be called later, such as
  // in an onClick handler.
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { execute, status, value, error };
};

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let p = 0;
  while (Math.pow(1024, p) <= bytes) ++p;
  return (p > 0) ? `${parseFloat((bytes / Math.pow(1024, p - 1)).toFixed(2))} ${units[p - 1]}` : `${bytes} B`;
}

function getUploadedBytesInLast10Days(data) {
  const addedDate = moment.unix(data.added_on);
  let iterDate = moment();

  let daysObj = {};
  let days = [];
  let dayCount = 0;

  while (iterDate.isSameOrAfter(addedDate, 'day') && dayCount < 10) {
    const day = iterDate.format('YYYY-MM-DD');
    daysObj[day] = [];
    days.push(day);
    ++dayCount;
    iterDate.subtract(1, 'day');
  }

  for (let i = data.activity.length - 1; i >= 0; --i) {
    const item = data.activity[i];
    let itemDate = moment.unix(item.timestamp);
    if (itemDate.hour() === 0 && itemDate.minute() === 0) itemDate.subtract(1, 'day');
    const key = itemDate.format('YYYY-MM-DD');
    if (daysObj.hasOwnProperty(key)) daysObj[key].push(item);
    else break;
  }

  let lastDayAmount = null;
  let last10Days = 0;
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
    last10Days += dayTotal;
  }

  return last10Days;
}

function DiskItem(props) {
  let { path, size, used, free } = props.stats;

  return (
    <div className='diskItemBox'>
      <div className='diskName'>{path}</div>
      <div className='diskUsageBar'>
        <div className='diskUsageBarOuter'>
          <div className='diskUsageBarInner' style={{width: `${(used / size) * 100}%`}}></div>
        </div>
      </div>
      <div className='diskUsageText'>
        {`${formatBytes(used)} of ${formatBytes(size)} used (${formatBytes(free)} available)`}
      </div>
    </div>
  );
}

const Section = props => {
  const {
    grow,
    title,
    isLoading,
    onRefresh,
    children
  } = props;

  return (
      <Flex direction='column' grow={grow ? 1 : null} mb={4}>
        <Flex justify='space-between' align='center'>
          <Heading as='h1' mb={1} fontSize='4xl'>{title}</Heading>
          <Box>
            { (typeof onRefresh === 'function') && (
              <Button colorScheme='teal' size='sm' onClick={onRefresh} isLoading={isLoading}>Refresh</Button>
            ) }
          </Box>
        </Flex>
        <Box position='relative' flexGrow={grow ? 1 : null}>{children}</Box>
      </Flex>
  );
}

const fetchDiskStats = () => {
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
  })
}

const fetchTorrents = () => {
  return new Promise((resolve, reject) => {
    fetch('/stats', {
      cache: 'no-store',
    }).then(response => {
      response.json().then(data => {
        for (let row of data) {
          row.lastChange = row.activity[row.activity.length - 1];

          let last10DaysBytes = getUploadedBytesInLast10Days(row);
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

const App = () => {

  const du = useAsync(fetchDiskStats);
  const torrents = useAsync(fetchTorrents);

  const refreshDisks = du.execute;
  const refreshTorrents = torrents.execute;

  const refreshAll = useCallback(() => {
    refreshDisks();
    refreshTorrents();
  }, [refreshDisks, refreshTorrents]);

  return (
    <Flex direction='column' pos='fixed' w='100%' h='100vh' p={6}>
      <Section title='Disks' isLoading={du.status === 'pending'} onRefresh={refreshDisks}>
        <Flex>
          {du.value && du.value.map(disk => <DiskItem key={disk.path} stats={disk} />)}
        </Flex>
      </Section>
      <Section title='Torrents' isLoading={torrents.status === 'pending'} onRefresh={refreshTorrents} grow>
        {torrents.value && (
          <TorrentsTable data={torrents.value} refresh={refreshAll} />
        )}
      </Section>
    </Flex>
  );
}

export default App;