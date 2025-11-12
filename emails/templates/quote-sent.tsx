import { Heading, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/layout';
import { Button } from '../components/button';
import type { QuoteSentEmailProps } from '../types';

export const QuoteSentEmail = ({
  clientName,
  quoteNumber,
  businessName,
  viewUrl,
  customMessage,
}: QuoteSentEmailProps) => {
  return (
    <EmailLayout preview={`Quote ${quoteNumber} from ${businessName}`} businessName={businessName}>
      <Heading style={heading}>Quote Ready for Review</Heading>

      <Text style={text}>Hi {clientName},</Text>

      <Text style={text}>
        Your quote <strong>{quoteNumber}</strong> is ready for your review.
      </Text>

      {customMessage && (
        <Text style={text}>{customMessage}</Text>
      )}

      <Button href={viewUrl}>View Quote</Button>

      <Text style={text}>
        If you have any questions, please don't hesitate to contact us.
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

export default QuoteSentEmail;
