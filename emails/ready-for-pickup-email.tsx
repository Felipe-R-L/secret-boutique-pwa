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

type ReadyForPickupEmailProps = {
  customerName: string;
  orderId: string;
  deliveryMethod: 'MOTEL_PICKUP' | 'ROOM_DELIVERY';
  pickupCode?: string | null;
  roomNumber?: string | null;
};

export function ReadyForPickupEmail({
  customerName,
  deliveryMethod,
  orderId,
  pickupCode,
  roomNumber,
}: ReadyForPickupEmailProps) {
  const isRoomDelivery = deliveryMethod === 'ROOM_DELIVERY';
  const previewText = isRoomDelivery
    ? 'Seu pedido esta saindo para entrega no quarto!'
    : 'Seu pedido está pronto para retirada!';

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

          <Heading style={headingStyle}>
            {isRoomDelivery
              ? 'Pedido a caminho do quarto 🚪'
              : 'Pronto para retirada 🎉'}
          </Heading>

          <Text style={textStyle}>
            {isRoomDelivery
              ? `Olá ${customerName}, seu pedido #${orderId.slice(0, 8)} está pronto e será entregue no quarto ${roomNumber ?? '--'} em instantes!`
              : `Olá ${customerName}, seu pedido #${orderId.slice(0, 8)} está pronto e aguardando sua retirada!`}
          </Text>

          {isRoomDelivery ? (
            <Section style={roomDeliveryBoxStyle}>
              <Text style={codeLabelStyle}>Entrega no quarto</Text>
              <Text style={roomValueStyle}>Quarto {roomNumber ?? '--'}</Text>
              <Text style={roomHintStyle}>
                Nao e necessario apresentar codigo. Nossa equipe levara seu
                pedido diretamente ao quarto informado.
              </Text>
            </Section>
          ) : (
            <Section style={codeBoxStyle}>
              <Text style={codeLabelStyle}>Seu código de retirada</Text>
              <Text style={codeValueStyle}>{pickupCode}</Text>
            </Section>
          )}

          <Section style={instructionsBoxStyle}>
            <Text style={instructionTitleStyle}>
              {isRoomDelivery
                ? '🛎️ Como funciona a entrega'
                : '📍 Como retirar'}
            </Text>
            {isRoomDelivery ? (
              <>
                <Text style={instructionTextStyle}>
                  1. Nossa equipe esta finalizando a entrega com discricao.
                </Text>
                <Text style={instructionTextStyle}>
                  2. O pedido sera levado ao quarto {roomNumber ?? '--'}.
                </Text>
                <Text style={instructionTextStyle}>
                  3. Nao e necessario informar codigo na portaria.
                </Text>
              </>
            ) : (
              <>
                <Text style={instructionTextStyle}>
                  1. Dirija-se ao Dallas Motel (Pitangueiras, SP)
                </Text>
                <Text style={instructionTextStyle}>
                  2. Informe o código acima na portaria
                </Text>
                <Text style={instructionTextStyle}>
                  3. Retire seu pedido — sem identificação necessária
                </Text>
              </>
            )}
          </Section>

          <Section style={scheduleBoxStyle}>
            <Text style={scheduleTextStyle}>
              ⏰ Horário: <strong>14h às 5h</strong> — Todos os dias
            </Text>
          </Section>

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
  backgroundColor: '#e8f5e9',
  borderRadius: '12px',
  padding: '24px',
  textAlign: 'center' as const,
  marginBottom: '20px',
  border: '2px solid #c8e6c9',
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
  color: '#2e7d32',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  fontWeight: '600' as const,
};

const codeValueStyle = {
  fontSize: '36px',
  fontWeight: '800' as const,
  color: '#1b5e20',
  margin: '0',
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

const roomHintStyle = {
  fontSize: '13px',
  color: '#5b6b7c',
  margin: '8px 0 0',
  lineHeight: '1.5',
};

const instructionsBoxStyle = {
  border: '1px solid #f0efed',
  borderRadius: '12px',
  padding: '16px 20px',
  marginBottom: '16px',
};

const instructionTitleStyle = {
  fontSize: '14px',
  fontWeight: '600' as const,
  color: '#1a1a1a',
  margin: '0 0 8px',
};

const instructionTextStyle = {
  fontSize: '13px',
  color: '#555',
  margin: '2px 0',
  lineHeight: '1.6',
};

const scheduleBoxStyle = {
  backgroundColor: '#fff8e1',
  borderRadius: '12px',
  padding: '12px 18px',
  textAlign: 'center' as const,
  marginBottom: '20px',
};

const scheduleTextStyle = {
  fontSize: '14px',
  color: '#5d4037',
  margin: '0',
};

const footerTextStyle = {
  fontSize: '12px',
  color: '#8a8580',
  margin: '4px 0',
  textAlign: 'center' as const,
};
