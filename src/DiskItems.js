import { Box, Flex, Text } from '@chakra-ui/react';

import { formatBytes } from './utils';

const DiskItem = props => {
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

export default function diskItems(props) {
  const { items } = props;

  return (
    <Flex>
      {items && items.map(disk => <DiskItem key={disk.path} stats={disk} />)}
    </Flex>
  );
}