import { Heading, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/layout';
import { Button } from '../components/button';
import type { InvoiceCreatedEmailProps } from '../types';

export const InvoiceCreatedEmail = ({
  clientName,
  invoiceNumber,
  businessName,
  total,
  dueDate,
  viewUrl,
  customMessage,
}: InvoiceCreatedEmailProps) => {
  return (
    <EmailLayout preview={`Invoice ${invoiceNumber} from ${businessName}`} businessName={businessName}>
      <Heading style={heading}>New Invoice</Heading>

      <Text style={text}>Hi {clientName},</Text>

      <Text style={text}>
        Your invoice <strong>{invoiceNumber}</strong> is ready.
      </Text>

      <Text style={text}>
        <strong>Total:</strong> {total}<br />
        <strong>Due Date:</strong> {dueDate}
      </Text>

      {customMessage && (
        <Text style={text}>{customMessage}</Text>
      )}

      <Button href={viewUrl}>View Invoice</Button>

      <Text style={text}>
        Thank you for your business!
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

export default InvoiceCreatedEmail;
