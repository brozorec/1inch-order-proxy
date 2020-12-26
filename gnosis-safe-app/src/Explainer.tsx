import React from 'react';
import styled, { css } from 'styled-components';
import { Text } from '@gnosis.pm/safe-react-components';

const OuterWrapper = styled.div`
  display: flex;
  flex-flow: column nowrap;
  padding: 32px 32px;
  margin-top: 95px;
`;

const textStyles = css`
  color: rgba(0, 0, 0, 0.87);
  font-family: ${props => props.theme.fonts.fontFamily};
`;

const ListWrapper = styled.div`
  display: flex;
  flex-flow: column nowrap;
  margin: 16px 0px 0px 4px;
`;

const ListItem = styled.span`
  ${textStyles};
  font-size: 12px;
  line-height: 14px;
  margin-top: 4px;
`;

const BottomWrapper = styled.div`
  margin-top: 16px;
`;

const Explainer: React.FC = () => {
  return (
    <OuterWrapper>
      <Text size="xl">
        How it works
      </Text>
      <ListWrapper>
        <Text size="lg">1. Order registration</Text>
        <ListItem>- Set minimum required return amount</ListItem>
        <ListItem>- Approve spending allowance if input token isn’t ETH</ListItem>
        <ListItem>- Send token to swap and provide extra ETH that will cover gas costs</ListItem>
      </ListWrapper>
      <ListWrapper>
        <Text size="lg">2. Order execution</Text>
        <ListItem>- Everyone can execute it on 1Inch if the specified conditions are met.</ListItem>
        <ListItem>- The executor gets compensated for gas costs by the provided additional ETH.</ListItem>
      </ListWrapper>
      <BottomWrapper>
        <Text size="lg">If the swap is successful, the executor gets the reward and the creator the swapped amount in the same transaction.</Text>
      </BottomWrapper>
    </OuterWrapper>
  );
}

export default Explainer;
