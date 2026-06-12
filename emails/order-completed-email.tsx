import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';

type OrderCompletedEmailProps = {
  customerName: string;
  orderId: string;
  completedAt: string; // ISO date string
};

export function OrderCompletedEmail({
  customerName,
  orderId,
  completedAt,
}: OrderCompletedEmailProps) {
  const formattedDate = new Date(completedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Html lang='pt-BR' style={htmlStyle}>
      <Head>
        <meta name='color-scheme' content='light' />
        <meta name='supported-color-schemes' content='light' />
        <meta name='x-apple-disable-message-reformatting' />
        <style>{emailThemeStyles}</style>
      </Head>
      <Preview>Pedido retirado com sucesso — obrigado!</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Logo */}
          <Section style={logoSectionStyle}>
            <Img
              src='https://secret-boutique-pwa.vercel.app/logo.png'
              alt='The Secret Boutique'
              width='160'
              height='auto'
              style={logoStyle}
            />
          </Section>

          <Heading style={headingStyle}>Pedido finalizado ✅</Heading>

          <Text style={textStyle}>
            Olá {customerName}, seu pedido #{orderId.slice(0, 8)} foi retirado
            com sucesso!
          </Text>

          {/* Completion details */}
          <Section style={completionBoxStyle}>
            <Text style={completionLabelStyle}>Retirado em</Text>
            <Text style={completionValueStyle}>{formattedDate}</Text>
          </Section>

          {/* Thank you message */}
          <Section style={thankYouBoxStyle}>
            <Text style={thankYouTextStyle}>
              💜 Obrigado por escolher a Secret Boutique! Esperamos que
              aproveite seus produtos. Lembre-se: seu bem-estar é nossa
              prioridade.
            </Text>
          </Section>

          <Text style={footerTextStyle}>
            Este email é discreto e não detalha itens comprados.
          </Text>
          <Text style={footerTextStyle}>
            The Secret Boutique — Bem-estar sexual com privacidade
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const emailThemeStyles = `
  :root {
    color-scheme: light;
    supported-color-schemes: light;
  }

  body {
    margin: 0 !important;
    padding: 0 !important;
    background-color: #faf9f6 !important;
    color: #1a1a1a !important;
  }

  .email-shell,
  .email-card {
    background-color: #ffffff !important;
    color: #1a1a1a !important;
  }
`;

const htmlStyle = {
  backgroundColor: '#faf9f6',
};

const bodyStyle = {
  backgroundColor: '#faf9f6',
  color: '#1a1a1a',
  fontFamily: "'Inter', Arial, sans-serif",
  margin: '0',
  padding: '0',
};

const containerStyle = {
  maxWidth: '520px',
  margin: '30px auto',
  backgroundColor: '#ffffff',
  color: '#1a1a1a',
  borderRadius: '16px',
  padding: '32px',
  border: '1px solid #f0efed',
};

const logoSectionStyle = {
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const logoStyle = {
  margin: '0 auto',
  display: 'inline-block',
  backgroundColor: '#ffffff',
  borderRadius: '999px',
  padding: '12px 18px',
  border: '1px solid #f0efed',
};

const headingStyle = {
  fontSize: '24px',
  fontWeight: '700' as const,
  color: '#1a1a1a',
  margin: '0 0 8px',
  textAlign: 'center' as const,
};

const textStyle = {
  fontSize: '15px',
  color: '#333',
  margin: '0 0 24px',
  textAlign: 'center' as const,
  lineHeight: '1.5',
};

const completionBoxStyle = {
  backgroundColor: '#f3e5f5',
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center' as const,
  marginBottom: '20px',
  border: '2px solid #e1bee7',
};

const completionLabelStyle = {
  fontSize: '12px',
  color: '#6a1b9a',
  margin: '0 0 4px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  fontWeight: '600' as const,
};

const completionValueStyle = {
  fontSize: '18px',
  fontWeight: '600' as const,
  color: '#4a148c',
  margin: '0',
};

const thankYouBoxStyle = {
  backgroundColor: '#faf9f6',
  borderRadius: '12px',
  padding: '16px 20px',
  marginBottom: '20px',
  border: '1px solid #f0efed',
};

const thankYouTextStyle = {
  fontSize: '14px',
  color: '#555',
  margin: '0',
  lineHeight: '1.6',
  textAlign: 'center' as const,
};

const footerTextStyle = {
  fontSize: '12px',
  color: '#8a8580',
  margin: '4px 0',
  textAlign: 'center' as const,
};
