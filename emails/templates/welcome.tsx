import { Heading, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/layout';
import { Button } from '../components/button';
import type { WelcomeEmailProps } from '../types';

export const WelcomeEmail = ({
  firstName,
  businessName,
  loginUrl,
  customMessage,
}: WelcomeEmailProps) => {
  return (
    <EmailLayout preview={`Welcome to ${businessName}`} businessName={businessName}>
      <Heading style={heading}>Welcome!</Heading>

      <Text style={text}>Hi {firstName},</Text>

      <Text style={text}>
        Welcome to {businessName}! Your account has been successfully created.
      </Text>

      {customMessage && (
        <Text style={text}>{customMessage}</Text>
      )}

      <Button href={loginUrl}>Log In</Button>

      <Text style={text}>
        We're excited to work with you on your 3D printing projects!
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

export default WelcomeEmail;
