import { Heading, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/layout';
import type { JobStatusUpdateEmailProps } from '../types';

export const JobStatusUpdateEmail = ({
  clientName,
  jobNumber,
  businessName,
  status,
  statusMessage,
  customMessage,
}: JobStatusUpdateEmailProps) => {
  return (
    <EmailLayout preview={`Job ${jobNumber} - ${status}`} businessName={businessName}>
      <Heading style={heading}>Job Status Update</Heading>

      <Text style={text}>Hi {clientName},</Text>

      <Text style={text}>
        Your job <strong>{jobNumber}</strong> status has been updated:
      </Text>

      <Text style={statusText}>
        {status}
      </Text>

      <Text style={text}>
        {statusMessage}
      </Text>

      {customMessage && (
        <Text style={text}>{customMessage}</Text>
      )}

      <Text style={text}>
        We'll keep you updated on any further progress.
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

const statusText = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#0070f3',
  marginBottom: '16px',
};

export default JobStatusUpdateEmail;
