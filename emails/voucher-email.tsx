import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type VoucherEmailProps = {
  customerName: string;
  orderId: string;
  totalAmount: number;
};

export function VoucherEmail({
  customerName,
  orderId,
  totalAmount,
}: VoucherEmailProps) {
  const formattedTotal = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(totalAmount);

  return (
    <Html>
      <Head />
      <Preview>Seu pedido foi aprovado e está em preparação</Preview>
      <Body
        style={{ backgroundColor: "#f6f5f2", fontFamily: "Arial, sans-serif" }}
      >
        <Container
          style={{
            maxWidth: "560px",
            margin: "30px auto",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "24px",
            border: "1px solid #ececec",
          }}
        >
          <Heading style={{ fontSize: "22px", margin: "0 0 12px" }}>
            Pagamento confirmado
          </Heading>

          <Text style={{ margin: "0 0 12px", color: "#222" }}>
            Oi {customerName}, seu pedido foi aprovado com sucesso.
          </Text>

          <Section
            style={{
              border: "1px solid #ececec",
              borderRadius: "8px",
              padding: "12px 14px",
              marginBottom: "12px",
            }}
          >
            <Text
              style={{ margin: "0 0 6px", fontSize: "14px", color: "#6b7280" }}
            >
              Codigo do pedido
            </Text>
            <Text style={{ margin: "0", fontSize: "16px", fontWeight: 700 }}>
              {orderId}
            </Text>
          </Section>

          <Text style={{ margin: "0", color: "#222" }}>
            Total: <strong>{formattedTotal}</strong>
          </Text>
          <Text
            style={{ margin: "12px 0 0", color: "#6b7280", fontSize: "13px" }}
          >
            Este email e discreto e nao detalha itens comprados.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
