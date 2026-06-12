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
  Hr,
} from '@react-email/components';

type VoucherEmailProps = {
  customerName: string;
  orderId: string;
  deliveryMethod: 'MOTEL_PICKUP' | 'ROOM_DELIVERY';
  pickupCode?: string | null;
  roomNumber?: string | null;
  totalAmount: number;
};

export function VoucherEmail({
  customerName,
  deliveryMethod,
  orderId,
  pickupCode,
  roomNumber,
  totalAmount,
}: VoucherEmailProps) {
  const formattedTotal = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(totalAmount);
  const isRoomDelivery = deliveryMethod === 'ROOM_DELIVERY';
  const previewText = isRoomDelivery
    ? 'Pagamento confirmado — vamos entregar seu pedido no quarto'
    : 'Pagamento confirmado — seu código de retirada está pronto';

  return (
    <Html lang='pt-BR' style={htmlStyle}>
      <Head>
        <meta name='color-scheme' content='light' />
        <meta name='supported-color-schemes' content='light' />
        <meta name='x-apple-disable-message-reformatting' />
        <style>{emailThemeStyles}</style>
      </Head>
      <Preview>{previewText}</Preview>
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

          <Heading style={headingStyle}>Pagamento confirmado ✨</Heading>

          <Text style={textStyle}>
            Olá {customerName}, seu pagamento foi aprovado com sucesso!
          </Text>

          {isRoomDelivery ? (
            <Section style={roomDeliveryBoxStyle}>
              <Text style={codeLabelStyle}>Entrega no quarto</Text>
              <Text style={roomValueStyle}>Quarto {roomNumber ?? '--'}</Text>
              <Text style={codeHintStyle}>
                Nao e necessario apresentar codigo. Quando o pedido estiver
                pronto, nossa equipe leva ate o quarto informado.
              </Text>
            </Section>
          ) : (
            <Section style={codeBoxStyle}>
              <Text style={codeLabelStyle}>Seu código de retirada</Text>
              <Text style={codeValueStyle}>{pickupCode}</Text>
              <Text style={codeHintStyle}>
                Apresente este código na retirada
              </Text>
            </Section>
          )}

          {/* Order details */}
          <Section style={detailsBoxStyle}>
            <Text style={detailLabelStyle}>Pedido</Text>
            <Text style={detailValueStyle}>#{orderId.slice(0, 8)}</Text>
            <Hr style={hrStyle} />
            <Text style={detailLabelStyle}>Total</Text>
            <Text style={detailValueStyle}>{formattedTotal}</Text>
            <Hr style={hrStyle} />
            <Text style={detailLabelStyle}>
              {isRoomDelivery ? 'Horário de entrega' : 'Horário de retirada'}
            </Text>
            <Text style={detailValueStyle}>14h às 5h — Todos os dias</Text>
          </Section>

          <Section style={warningBoxStyle}>
            <Text style={warningTextStyle}>
              {isRoomDelivery ? (
                <>
                  🛎️ <strong>Entrega discreta no quarto</strong> — sua equipe
                  receberá o pedido no quarto informado, sem necessidade de
                  código.
                </>
              ) : (
                <>
                  🔒 <strong>Não compartilhe seu código</strong> — ele é a única
                  forma de retirar seu pedido anonimamente no Dallas Motel.
                </>
              )}
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

const codeBoxStyle = {
  backgroundColor: '#f5f0eb',
  borderRadius: '12px',
  padding: '24px',
  textAlign: 'center' as const,
  marginBottom: '20px',
  border: '2px solid #e8e0d8',
};

const roomDeliveryBoxStyle = {
  backgroundColor: '#eef6ff',
  borderRadius: '12px',
  padding: '24px',
  textAlign: 'center' as const,
  marginBottom: '20px',
  border: '2px solid #d7e7fb',
};

const codeLabelStyle = {
  fontSize: '12px',
  color: '#6b6560',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  fontWeight: '600' as const,
};

const codeValueStyle = {
  fontSize: '36px',
  fontWeight: '800' as const,
  color: '#5c2d3e',
  margin: '0 0 8px',
  letterSpacing: '4px',
  fontFamily: "'Monaco', 'Courier New', monospace",
};

const roomValueStyle = {
  fontSize: '28px',
  fontWeight: '800' as const,
  color: '#17436b',
  margin: '0 0 8px',
  letterSpacing: '1px',
};

const codeHintStyle = {
  fontSize: '12px',
  color: '#8a8580',
  margin: '0',
};

const detailsBoxStyle = {
  border: '1px solid #f0efed',
  borderRadius: '12px',
  padding: '16px 20px',
  marginBottom: '20px',
};

const detailLabelStyle = {
  fontSize: '12px',
  color: '#8a8580',
  margin: '0',
};

const detailValueStyle = {
  fontSize: '15px',
  fontWeight: '600' as const,
  color: '#1a1a1a',
  margin: '0 0 4px',
};

const hrStyle = {
  border: 'none',
  borderTop: '1px solid #f0efed',
  margin: '8px 0',
};

const warningBoxStyle = {
  backgroundColor: '#fdf2f4',
  borderRadius: '12px',
  padding: '14px 18px',
  marginBottom: '20px',
};

const warningTextStyle = {
  fontSize: '13px',
  color: '#5c2d3e',
  margin: '0',
  lineHeight: '1.5',
};

const footerTextStyle = {
  fontSize: '12px',
  color: '#8a8580',
  margin: '4px 0',
  textAlign: 'center' as const,
};
