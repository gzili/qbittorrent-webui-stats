import { useCallback } from 'react';
import { Box, Flex, Heading, Button } from '@chakra-ui/react';

import { useAsync } from './hooks';
import { fetchDiskStats, fetchTorrents } from './adapters';
import DiskItems from './DiskItems';
import TorrentsTable from './TorrentsTable';

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
        <DiskItems items={du.value} />
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