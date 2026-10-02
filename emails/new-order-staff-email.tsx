import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { formatCents } from '@/lib/money';

export type NewOrderStaffEmailProps = {
  headline: string;
  orderId: string;
  destination: string;
  payment: string;
  totalCents: number;
  /** Ex.: "Pague na entrega — levar R$ 50,10 de troco". */
  actionHint?: string | null;
  items: Array<{ name: string; variant: string | null; quantity: number }>;
  adminUrl: string;
};

// Aviso interno para ADMIN/STAFF: reforço do push, para quem estiver sem o
// painel aberto ou sem notificação no celular.
export function NewOrderStaffEmail({
  headline,
  orderId,
  destination,
  payment,
  totalCents,
  actionHint,
  items,
  adminUrl,
}: NewOrderStaffEmailProps) {
  return (
    <Html lang='pt-BR'>
      <Head>
        <meta name='color-scheme' content='light' />
      </Head>
      <Preview>{`${destination} • ${formatCents(totalCents)} • ${payment}`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>{headline}</Heading>
          <Text style={metaStyle}>Pedido #{orderId.slice(0, 8)}</Text>

          <Section style={boxStyle}>
            <Text style={rowStyle}>
              <strong>Destino:</strong> {destination}
            </Text>
            <Text style={rowStyle}>
              <strong>Pagamento:</strong> {payment}
            </Text>
            <Text style={rowStyle}>
              <strong>Total:</strong> {formatCents(totalCents)}
            </Text>
            {actionHint ? <Text style={hintStyle}>{actionHint}</Text> : null}
          </Section>

          {items.length > 0 ? (
            <Section>
              {items.map((item, index) => (
                <Text key={index} style={itemStyle}>
                  {item.quantity}× {item.name}
                  {item.variant ? ` — ${item.variant}` : ''}
                </Text>
              ))}
            </Section>
          ) : null}

          <Section style={buttonSectionStyle}>
            <Button href={adminUrl} style={buttonStyle}>
              Abrir pedidos no painel
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: '#f6f6f6',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: '24px 0',
};

const containerStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '480px',
  padding: '24px',
};

const headingStyle = {
  color: '#111111',
  fontSize: '20px',
  margin: '0 0 4px',
};

const metaStyle = {
  color: '#666666',
  fontSize: '13px',
  margin: '0 0 16px',
};

const boxStyle = {
  backgroundColor: '#f3f0ff',
  borderRadius: '8px',
  padding: '12px 16px',
};

const rowStyle = {
  color: '#111111',
  fontSize: '15px',
  margin: '4px 0',
};

const hintStyle = {
  color: '#7a4b00',
  fontSize: '14px',
  fontWeight: 600,
  margin: '8px 0 0',
};

const itemStyle = {
  color: '#333333',
  fontSize: '14px',
  margin: '6px 0',
};

const buttonSectionStyle = {
  marginTop: '20px',
  textAlign: 'center' as const,
};

const buttonStyle = {
  backgroundColor: '#111111',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '14px',
  padding: '12px 20px',
  textDecoration: 'none',
};
