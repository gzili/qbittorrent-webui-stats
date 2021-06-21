import { useEffect, useState } from 'react';
import { Box, Flex, Heading, Button } from '@chakra-ui/react';

import './App.css';

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let p = 0;
  while (Math.pow(1024, p) <= bytes) ++p;
  return (p > 0) ? `${parseFloat((bytes / Math.pow(1024, p - 1)).toFixed(2))} ${units[p - 1]}` : `${bytes} B`;
}

function DiskItem(props) {
  let { size, used, free } = props.stats;

  return (
    <div className='diskItemBox'>
      <div className='diskName'>{props.stats.file}</div>
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
      <Flex direction='column' grow={grow ? 1 : 0} shrink={grow ? 0 : 1} overflow='hidden'>
        <Flex justify='space-between'>
          <Heading as='h1' pb={1} fontSize='4xl'>{title}</Heading>
          <Box>
            <Button colorScheme='teal' size='sm' onClick={onRefresh} isLoading={isLoading}>Refresh</Button>
          </Box>
        </Flex>
        <Box overflow='auto' grow={grow ? 1 : 0}>{children}</Box>
      </Flex>
  );
}

const App = () => {
  const [isLoadingDisks, setLoadingDisks] = useState(true);
  const [diskStats, setDiskStats] = useState(null);

  useEffect(() => reloadDiskStats, []);

  const reloadDiskStats = () => {
    setLoadingDisks(true);
    fetch('/disks', {
      cache: 'no-store',
    }).then(response => (
      response.json().then(data => {
        setDiskStats(data);
        setLoadingDisks(false);
      })
    ));
  }

  return (
    <Flex direction='column' pos='fixed' w='100%' h='100vh' p={8}>
      <Section title='Disks' isLoading={isLoadingDisks} onRefresh={reloadDiskStats}>
        <Flex>
          {diskStats && diskStats.map(disk => <DiskItem key={disk.file} stats={disk} />)}
        </Flex>
      </Section>
    </Flex>
  );
}

export default App;