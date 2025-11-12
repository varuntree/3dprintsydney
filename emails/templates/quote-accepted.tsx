import { Heading, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/layout';
import { Button } from '../components/button';
import type { QuoteAcceptedEmailProps } from '../types';

export const QuoteAcceptedEmail = ({
  quoteNumber,
  clientName,
  businessName,
  viewUrl,
  customMessage,
}: QuoteAcceptedEmailProps) => {
  return (
    <EmailLayout preview={`Quote ${quoteNumber} Accepted`} businessName={businessName}>
      <Heading style={heading}>Quote Accepted</Heading>

      <Text style={text}>
        Good news! Quote <strong>{quoteNumber}</strong> has been accepted by {clientName}.
      </Text>

      {customMessage && (
        <Text style={text}>{customMessage}</Text>
      )}

      <Button href={viewUrl}>View Quote</Button>

      <Text style={text}>
        You can now proceed with creating an invoice or job.
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

export default QuoteAcceptedEmail;
