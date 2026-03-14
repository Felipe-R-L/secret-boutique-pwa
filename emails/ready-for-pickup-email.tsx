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
} from "@react-email/components";

type ReadyForPickupEmailProps = {
  customerName: string;
  orderId: string;
  pickupCode: string;
};

export function ReadyForPickupEmail({
  customerName,
  orderId,
  pickupCode,
}: ReadyForPickupEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Seu pedido está pronto para retirada!</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Logo */}
          <Section style={{ textAlign: "center" as const, marginBottom: "24px" }}>
            <Img
              src="https://secret-boutique-pwa.vercel.app/logo.png"
              alt="The Secret Boutique"
              width="160"
              height="auto"
              style={{ margin: "0 auto" }}
            />
          </Section>

          <Heading style={headingStyle}>Pronto para retirada 🎉</Heading>

          <Text style={textStyle}>
            Olá {customerName}, seu pedido #{orderId.slice(0, 8)} está
            pronto e aguardando sua retirada!
          </Text>

          {/* Pickup Code */}
          <Section style={codeBoxStyle}>
            <Text style={codeLabelStyle}>Seu código de retirada</Text>
            <Text style={codeValueStyle}>{pickupCode}</Text>
          </Section>

          {/* Instructions */}
          <Section style={instructionsBoxStyle}>
            <Text style={instructionTitleStyle}>📍 Como retirar</Text>
            <Text style={instructionTextStyle}>
              1. Dirija-se ao Dallas Motel (Pitangueiras, SP)
            </Text>
            <Text style={instructionTextStyle}>
              2. Informe o código acima na portaria
            </Text>
            <Text style={instructionTextStyle}>
              3. Retire seu pedido — sem identificação necessária
            </Text>
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
const bodyStyle = {
  backgroundColor: "#faf9f6",
  fontFamily: "'Inter', Arial, sans-serif",
  margin: "0",
  padding: "0",
};

const containerStyle = {
  maxWidth: "520px",
  margin: "30px auto",
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  padding: "32px",
  border: "1px solid #f0efed",
};

const headingStyle = {
  fontSize: "24px",
  fontWeight: "700" as const,
  color: "#1a1a1a",
  margin: "0 0 8px",
  textAlign: "center" as const,
};

const textStyle = {
  fontSize: "15px",
  color: "#333",
  margin: "0 0 24px",
  textAlign: "center" as const,
  lineHeight: "1.5",
};

const codeBoxStyle = {
  backgroundColor: "#e8f5e9",
  borderRadius: "12px",
  padding: "24px",
  textAlign: "center" as const,
  marginBottom: "20px",
  border: "2px solid #c8e6c9",
};

const codeLabelStyle = {
  fontSize: "12px",
  color: "#2e7d32",
  margin: "0 0 8px",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  fontWeight: "600" as const,
};

const codeValueStyle = {
  fontSize: "36px",
  fontWeight: "800" as const,
  color: "#1b5e20",
  margin: "0",
  letterSpacing: "4px",
  fontFamily: "'Monaco', 'Courier New', monospace",
};

const instructionsBoxStyle = {
  border: "1px solid #f0efed",
  borderRadius: "12px",
  padding: "16px 20px",
  marginBottom: "16px",
};

const instructionTitleStyle = {
  fontSize: "14px",
  fontWeight: "600" as const,
  color: "#1a1a1a",
  margin: "0 0 8px",
};

const instructionTextStyle = {
  fontSize: "13px",
  color: "#555",
  margin: "2px 0",
  lineHeight: "1.6",
};

const scheduleBoxStyle = {
  backgroundColor: "#fff8e1",
  borderRadius: "12px",
  padding: "12px 18px",
  textAlign: "center" as const,
  marginBottom: "20px",
};

const scheduleTextStyle = {
  fontSize: "14px",
  color: "#5d4037",
  margin: "0",
};

const footerTextStyle = {
  fontSize: "12px",
  color: "#8a8580",
  margin: "4px 0",
  textAlign: "center" as const,
};
