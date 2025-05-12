import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Preview,
    Text,
    Section,
    Row,
    Column
  } from '@react-email/components';
  
  interface ContactFormEmailProps {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    location?: string;
    otherLocation?: string;
    message: string;
    smsOptIn?: boolean;
    contactMethods?: string[];
  }
  
  export const ContactFormEmail: React.FC<Readonly<ContactFormEmailProps>> = ({ 
    firstName,
    lastName,
    email,
    phone,
    location,
    otherLocation,
    message,
    smsOptIn,
    contactMethods = []
  }) => (
    <Html>
      <Head />
      <Preview>New Contact Form Submission from {firstName} {lastName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>New Contact Form Submission</Heading>
          <Text style={paragraph}>You have received a new message from your website contact form.</Text>
          <Hr style={hr} />
          
          <Section style={section}>
            <Row>
              <Column style={labelColumn}>First Name:</Column>
              <Column style={valueColumn}>{firstName}</Column>
            </Row>
             <Row>
              <Column style={labelColumn}>Last Name:</Column>
              <Column style={valueColumn}>{lastName}</Column>
            </Row>
             <Row>
              <Column style={labelColumn}>Email:</Column>
              <Column style={valueColumn}>{email}</Column>
            </Row>
            {phone && (
                 <Row>
                  <Column style={labelColumn}>Phone:</Column>
                  <Column style={valueColumn}>{phone}</Column>
                </Row>
            )}
             <Row>
              <Column style={labelColumn}>Location:</Column>
              <Column style={valueColumn}>{location === 'Other' && otherLocation ? otherLocation : location}</Column>
            </Row>
             <Row>
              <Column style={labelColumn}>Message:</Column>
             </Row>
             <Row>
                <Column style={messageValueColumn}>{message}</Column>
             </Row>
             <Row>
                <Column style={labelColumn}>SMS Opt-In:</Column>
                <Column style={valueColumn}>{smsOptIn ? 'Yes' : 'No'}</Column>
             </Row>
             <Row>
                <Column style={labelColumn}>Preferred Contact Method(s):</Column>
                <Column style={valueColumn}>{contactMethods.join(', ') || 'Not specified'}</Column>
             </Row>
          </Section>
          
          <Hr style={hr} />
          <Text style={footer}>
            This email was sent from the contact form on tayloredinstruction.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
  
  export default ContactFormEmail;
  
  // Styles
  const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  };
  
  const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    border: '1px solid #f0f0f0',
    borderRadius: '4px',
  };
  
  const heading = {
    fontSize: '24px',
    lineHeight: '1.3',
    fontWeight: '700',
    color: '#484848',
    padding: '0 20px',
  };
  
  const paragraph = {
    fontSize: '16px',
    lineHeight: '1.4',
    color: '#484848',
    padding: '0 20px',
  };
  
  const section = {
      padding: '0 20px',
  };

  const labelColumn = {
      width: '150px',
      verticalAlign: 'top',
      paddingBottom: '8px',
      fontWeight: '600',
      color: '#555',
  };

  const valueColumn = {
      verticalAlign: 'top',
      paddingBottom: '8px',
      color: '#333',
  };
  
  const messageValueColumn = {
      paddingBottom: '8px',
      color: '#333',
      paddingLeft: '10px', 
      borderLeft: '2px solid #eee', 
      marginTop: '5px',
  };

  const hr = {
    borderColor: '#e6ebf1',
    margin: '20px 0',
  };
  
  const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    padding: '0 20px',
  };