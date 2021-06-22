import { useEffect, useCallback, useState } from 'react';
import { Box, Flex, Heading, Button } from '@chakra-ui/react';

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

  console.log(value);

  return { execute, status, value, error };
};

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let p = 0;
  while (Math.pow(1024, p) <= bytes) ++p;
  return (p > 0) ? `${parseFloat((bytes / Math.pow(1024, p - 1)).toFixed(2))} ${units[p - 1]}` : `${bytes} B`;
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
      <Flex direction='column' grow={grow ? 1 : 0} shrink={grow ? 0 : 1} overflow='hidden' mb={4}>
        <Flex justify='space-between'>
          <Heading as='h1' pb={1} fontSize='4xl'>{title}</Heading>
          <Box>
            { (typeof onRefresh === 'function') && (
              <Button colorScheme='teal' size='sm' onClick={onRefresh} isLoading={isLoading}>Refresh</Button>
            ) }
          </Box>
        </Flex>
        <Box overflow='auto' grow={grow ? 1 : 0}>{children}</Box>
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

const App = () => {

  const du = useAsync(fetchDiskStats);

  return (
    <Flex direction='column' pos='fixed' w='100%' h='100vh' p={8}>
      <Section title='Disks' isLoading={du.status === 'pending'} onRefresh={du.execute}>
        <Flex>
          {du.value && du.value.map(disk => <DiskItem key={disk.path} stats={disk} />)}
        </Flex>
      </Section>
    </Flex>
  );
}

export default App;