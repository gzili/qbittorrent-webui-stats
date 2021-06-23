import React from 'react';
import ReactDOM from 'react-dom';

import { ChakraProvider, extendTheme } from '@chakra-ui/react';

import App from './App';

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: 'gray.100',
      },
    },
  },
  fonts: {
    body: '"Inter", sans-serif',
    heading: '"Inter", sans-serif',
  },
  shadows: {
    outline: '0 0 0 3px rgba(56, 178, 172, 0.6)', // teal.400
  },
});

ReactDOM.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>,
  document.getElementById('root')
);