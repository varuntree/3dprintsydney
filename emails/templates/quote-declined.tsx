import { Heading, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/layout';
import { Button } from '../components/button';
import type { QuoteDeclinedEmailProps } from '../types';

export const QuoteDeclinedEmail = ({
  quoteNumber,
  clientName,
  businessName,
  viewUrl,
  customMessage,
}: QuoteDeclinedEmailProps) => {
  return (
    <EmailLayout preview={`Quote ${quoteNumber} Declined`} businessName={businessName}>
      <Heading style={heading}>Quote Declined</Heading>

      <Text style={text}>
        Quote <strong>{quoteNumber}</strong> has been declined by {clientName}.
      </Text>

      {customMessage && (
        <Text style={text}>{customMessage}</Text>
      )}

      <Button href={viewUrl}>View Quote</Button>

      <Text style={text}>
        You may want to follow up with the client.
      </Text>
    </EmailLayout>
  );
};

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '16px',
};

const text = {
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
};

export default QuoteDeclinedEmail;
