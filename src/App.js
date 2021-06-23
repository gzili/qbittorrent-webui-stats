import { useCallback } from 'react';
import moment from 'moment';
import { Box, Flex, Text, Heading, Button } from '@chakra-ui/react';

import { useAsync } from './hooks';
import { formatBytes, getTorrentStatsByDay } from './utils';
import TorrentsTable from './TorrentsTable';

import './App.css';

function DiskItem(props) {
  let { path, size, used, free } = props.stats;

  return (
    <Box w='20%' _notLast={{ mr: '2.5' }} p='2.5' bgColor='#fff' borderRadius='md'>
      <Text fontWeight='bold'>{path}</Text>
      <Box py='1'>
        <Box pos='relative' w='100%' h='20px' bgColor='rgba(49, 151, 149, 0.4)' borderRadius='md' overflow='hidden'>
          <Box pos='absolute' w={`${(used / size) * 100}%`} h='100%' bgColor='teal.500'/>
        </Box>
      </Box>
      <Text fontSize='sm'>
        {`${formatBytes(used)} of ${formatBytes(size)} used (${formatBytes(free)} available)`}
      </Text>
    </Box>
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
  });
}

const fetchTorrents = () => {
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