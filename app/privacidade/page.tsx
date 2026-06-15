import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Lock } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidade | The Secret Boutique',
  description:
    'Como a Secret Boutique trata seus dados: coletamos só o essencial, não usamos cookies de rastreamento e nunca vendemos suas informações.',
};

// Canal de contato para solicitações de privacidade (LGPD art. 18).
const CONTACT_EMAIL = 'contato@secret-boutique.com.br';

const sections = [
  {
    title: '1. Quem somos',
    body: [
      'A The Secret Boutique é uma loja online de produtos de bem-estar sexual e autocuidado, com retirada presencial no JR Dallas Motel, em Pitangueiras/SP. Para fins da Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018), somos a controladora dos dados descritos nesta política.',
    ],
  },
  {
    title: '2. Quais dados coletamos e para quê',
    body: [
      'Dados do pedido — nome, email, número do quarto (apenas se você escolher entrega no quarto), itens comprados e código de retirada. Usamos essas informações exclusivamente para processar o seu pedido, enviar o comprovante com o código de retirada por email e viabilizar a retirada. Base legal: execução de contrato.',
      'Dados de pagamento — nome completo, CPF e email são exigidos pelo Banco Central para pagamentos via PIX e são transmitidos diretamente ao Mercado Pago, que processa o pagamento. O CPF não é armazenado em nossos sistemas. O tratamento desses dados pelo Mercado Pago segue a política de privacidade deles.',
      'Avaliações anônimas — as avaliações de produtos não pedem nem exibem nenhuma identificação. Para impedir spam e abuso, guardamos apenas um identificador técnico irreversível (hash criptográfico do endereço IP), que não permite identificar você. Base legal: legítimo interesse.',
      'Métricas de uso — usamos o Vercel Analytics, uma ferramenta de métricas sem cookies que coleta dados agregados e anônimos (como páginas visitadas), sem identificar visitantes individualmente.',
    ],
  },
  {
    title: '3. Cookies e armazenamento local',
    body: [
      'Não usamos cookies de rastreamento, publicidade ou perfilamento. Por isso você não vê banners de consentimento invasivos por aqui.',
      'Seu carrinho fica salvo apenas no seu navegador (armazenamento de sessão, apagado ao fechar o navegador). O histórico de pedidos e códigos de retirada fica no armazenamento local do seu dispositivo — nós não temos acesso a ele, e você pode limpá-lo quando quiser nas configurações do navegador.',
      'Cookies de sessão são usados somente na área administrativa interna da loja, por funcionários autenticados.',
    ],
  },
  {
    title: '4. Com quem compartilhamos',
    body: [
      'Compartilhamos dados apenas com os operadores estritamente necessários para a loja funcionar: Mercado Pago (processamento do pagamento PIX), Resend (envio do email de comprovante), Supabase (banco de dados) e Vercel (hospedagem do site).',
      'Nunca vendemos seus dados e não os usamos para marketing, remarketing ou publicidade.',
    ],
  },
  {
    title: '5. Por quanto tempo guardamos',
    body: [
      'Os dados do pedido são mantidos pelo tempo necessário para concluir a retirada e cumprir obrigações fiscais e legais. Depois disso, podem ser excluídos ou anonimizados.',
    ],
  },
  {
    title: '6. Seus direitos',
    body: [
      'A LGPD garante a você, entre outros, os direitos de confirmação de tratamento, acesso, correção, anonimização e eliminação dos seus dados. Para exercê-los, fale com a gente pelo email abaixo ou presencialmente na recepção do JR Dallas Motel.',
    ],
  },
  {
    title: '7. Idade mínima',
    body: [
      'Este site vende produtos destinados exclusivamente a maiores de 18 anos. Não coletamos dados de menores de idade de forma intencional.',
    ],
  },
  {
    title: '8. Segurança',
    body: [
      'Todo o tráfego do site é criptografado (HTTPS), o acesso ao banco de dados é restrito e os dados de pagamento sensíveis (como o CPF) não ficam em nossos servidores.',
    ],
  },
  {
    title: '9. Alterações desta política',
    body: [
      'Podemos atualizar esta política para refletir mudanças na loja. A data da última atualização está sempre indicada abaixo.',
    ],
  },
];

export default function PrivacidadePage() {
  return (
    <div className='min-h-screen bg-background'>
      <Header />

      <main>
        <section className='relative overflow-hidden bg-gradient-to-b from-pastel-lavender/15 to-background'>
          <div className='relative mx-auto max-w-3xl px-4 py-14 text-center md:px-6 md:py-20'>
            <div className='mb-6 inline-flex items-center gap-2 rounded-full bg-pastel-lavender/30 px-4 py-2 text-sm font-medium text-accent-foreground'>
              <Lock className='size-4' />
              <span>Transparência</span>
            </div>
            <h1 className='font-sans text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl'>
              Política de Privacidade
            </h1>
            <p
              className='mx-auto mt-4 max-w-xl text-base text-muted-foreground md:text-lg'
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Privacidade é a base desta loja. Aqui está, em linguagem simples,
              exatamente o que coletamos, por quê, e o que nunca fazemos com os
              seus dados.
            </p>
          </div>
        </section>

        <section className='mx-auto max-w-3xl px-4 pb-16 md:px-6 md:pb-24'>
          <div className='space-y-10'>
            {sections.map(section => (
              <div key={section.title} className='space-y-3'>
                <h2 className='font-sans text-xl font-semibold text-foreground md:text-2xl'>
                  {section.title}
                </h2>
                {section.body.map((paragraph, index) => (
                  <p
                    key={index}
                    className='text-base leading-relaxed text-muted-foreground'
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}

            <div className='rounded-2xl bg-pastel-rose/15 p-6'>
              <p
                className='text-sm leading-relaxed text-foreground'
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <strong>Contato para assuntos de privacidade:</strong>{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className='text-primary underline-offset-4 hover:underline'
                >
                  {CONTACT_EMAIL}
                </a>
                <br />
                Última atualização: 12 de junho de 2026.
              </p>
            </div>

            <p
              className='text-sm text-muted-foreground'
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Veja também{' '}
              <Link
                href='/como-funciona'
                className='text-primary underline-offset-4 hover:underline'
              >
                como funciona a retirada anônima
              </Link>
              .
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
