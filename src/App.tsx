import React from 'react';
import styled from 'styled-components';

import CreateOrder from './CreateOrder';
import Explainer from './Explainer';

const Wrapper = styled.div`
  display: flex;
  flex-flow: row nowrap;
`;

const App: React.FC = () => {
  return (
    <Wrapper>
      <CreateOrder />
      <Explainer />
    </Wrapper>
  )
}

export default App;
