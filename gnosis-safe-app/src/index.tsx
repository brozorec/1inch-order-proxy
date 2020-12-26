import React from 'react';
import ReactDOM from 'react-dom';
import { ThemeProvider } from 'styled-components';
import { theme, Loader, Title, Text } from '@gnosis.pm/safe-react-components';
import SafeProvider from '@gnosis.pm/safe-apps-react-sdk';

import GlobalStyle from './GlobalStyle';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <SafeProvider
        loader={
          <>
            <Title size="md">Waiting for Safe...</Title>
            <Loader size="md" />
            <Text size="lg">
              Important: This app can be used only in a the context of Gnosis Safe.
              For more info go <a href="https://github.com/brozorec/1inch-order-proxy">here</a>.
            </Text>
          </>
        }
      >
        <App />
      </SafeProvider>
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById('root'),
);
