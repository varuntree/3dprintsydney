import { Heading, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/layout';
import type { PaymentConfirmationEmailProps } from '../types';

export const PaymentConfirmationEmail = ({
  clientName,
  invoiceNumber,
  businessName,
  amount,
  paymentMethod,
  customMessage,
}: PaymentConfirmationEmailProps) => {
  return (
    <EmailLayout preview={`Payment Received - ${invoiceNumber}`} businessName={businessName}>
      <Heading style={heading}>Payment Received</Heading>

      <Text style={text}>Hi {clientName},</Text>

      <Text style={text}>
        Thank you! We've received your payment for invoice <strong>{invoiceNumber}</strong>.
      </Text>

      <Text style={text}>
        <strong>Amount:</strong> {amount}<br />
        <strong>Payment Method:</strong> {paymentMethod}
      </Text>

      {customMessage && (
        <Text style={text}>{customMessage}</Text>
      )}

      <Text style={text}>
        We appreciate your business!
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

export default PaymentConfirmationEmail;
