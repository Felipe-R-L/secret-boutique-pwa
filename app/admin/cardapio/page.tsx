import QRCode from 'qrcode';
import { Inter, Playfair_Display } from 'next/font/google';
import { requireAdminPage } from '@/lib/auth/admin';
import { createClient } from '@/lib/supabase/server';
import { formatCents } from '@/lib/money';
import { STORE_HOURS_LABEL, SITE_URL } from '@/lib/site';
import { WHATSAPP_NUMBER } from '@/lib/site-contact';
import { toPrintedMenuItem, type PrintedMenuItem } from '@/lib/printed-menu';
import { ROOM_KIT_ALL, roomKitProductIds } from '@/lib/room-kits';
import { PrintedMenuToolbar } from '@/components/admin/printed-menu-toolbar';
import './printed-menu.css';

export const dynamic = 'force-dynamic';

// Fontes da marca com variável própria: o cardápio é impresso e não pode
// cair na fonte de fallback do sistema.
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--pm-font-display',
});
const inter = Inter({ subsets: ['latin'], variable: '--pm-font-text' });

const FORMATS = {
  a5: { width: 148, height: 210 },
  a4: { width: 210, height: 297 },
} as const;

/** Sangria pedida pelas gráficas e a margem extra onde vão as marcas de corte (mm). */
const BLEED_MM = 3;
const SLUG_MM = 5;

type FormatKey = keyof typeof FORMATS;

/** Categoria do verso: todos os brinquedos em estoque. */
const TOYS_CATEGORY = 'Brinquedos';

/** "5516997118118" → "(16) 99711-8118". */
function formatWhatsapp(number: string): string {
  const local = number.replace(/^55/, '');
  const match = local.match(/^(\d{2})(\d{4,5})(\d{4})$/);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : number;
}

/** Marcas de corte nos cantos, fora da sangria, para a gráfica. */
function CropMarks({ width, height }: { width: number; height: number }) {
  const edge = BLEED_MM + SLUG_MM;
  const totalW = width + edge * 2;
  const totalH = height + edge * 2;
  const xs = [edge, edge + width];
  const ys = [edge, edge + height];
  const len = SLUG_MM - 1;
  const lines: [number, number, number, number][] = [];
  for (const x of xs) {
    lines.push([x, 0, x, len], [x, totalH - len, x, totalH]);
  }
  for (const y of ys) {
    lines.push([0, y, len, y], [totalW - len, y, totalW, y]);
  }
  return (
    <svg
      className='pm-crop'
      viewBox={`0 0 ${totalW} ${totalH}`}
      aria-hidden
    >
      {lines.map(([x1, y1, x2, y2]) => (
        <line
          key={`${x1}-${y1}-${x2}-${y2}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke='#000'
          strokeWidth={0.25}
        />
      ))}
    </svg>
  );
}

function MenuRow({
  item,
  showPrice,
}: {
  item: PrintedMenuItem;
  showPrice: boolean;
}) {
  if (!showPrice) {
    return (
      <li className='pm-row pm-row-plain'>
        <span className='pm-name'>{item.name}</span>
      </li>
    );
  }
  return (
    <li className='pm-row'>
      <span className='pm-name'>{item.name}</span>
      <span className='pm-leader' aria-hidden />
      <span className='pm-price'>
        {item.priceFrom && <small>a partir de </small>}
        {formatCents(item.priceCents)}
      </span>
    </li>
  );
}

export default async function PrintedMenuPage({
  searchParams,
}: {
  searchParams: Promise<{
    formato?: string;
    apto?: string;
    precos?: string;
    sangria?: string;
  }>;
}) {
  await requireAdminPage();
  const params = await searchParams;

  const formatKey: FormatKey = params.formato === 'a4' ? 'a4' : 'a5';
  const format = FORMATS[formatKey];
  // Placa (PS, acrílico) não leva preço: preço muda, a placa fica. Os preços
  // vão na folha A5 do display, que se troca.
  const showPrices = params.precos !== 'nao';
  const bleed = params.sangria === 'sim';
  const edge = bleed ? BLEED_MM + SLUG_MM : 0;
  const pageW = format.width + edge * 2;
  const pageH = format.height + edge * 2;
  // "apto", e não "quarto": o RoomParamCapture do layout raiz apaga o
  // ?quarto= da URL em qualquer página, e recarregar perderia o quarto.
  // O formato aceito é o mesmo dele.
  const roomInput = params.apto?.trim() ?? '';
  const room = /^[0-9A-Za-z-]{1,10}$/.test(roomInput) ? roomInput : '';

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('id,name,category,price_cents,variants,in_stock');

  // Itens do quarto entram mesmo sem estoque na loja: já estão lá dentro.
  // Os brinquedos do verso são entregues, então só os em estoque.
  const rows = data ?? [];
  const byId = new Map(rows.map(row => [row.id, toPrintedMenuItem(row)]));
  const pick = (ids: string[]) =>
    ids.flatMap(id => {
      const item = byId.get(id);
      return item ? [item] : [];
    });

  // Frente: o que já está no quarto. Sem quarto informado, só o que todos
  // os quartos têm — cada quarto recebe a folha com o número dele.
  const roomItems = pick(room ? roomKitProductIds(room) : ROOM_KIT_ALL);

  const toys = rows
    .filter(row => row.in_stock !== false)
    .map(toPrintedMenuItem)
    .filter(item => item.category === TOYS_CATEGORY)
    .sort(
      (a, b) =>
        a.priceCents - b.priceCents || a.name.localeCompare(b.name, 'pt-BR'),
    );

  const qrUrl = room
    ? `${SITE_URL}/?quarto=${encodeURIComponent(room)}`
    : SITE_URL;
  const qrSvg = await QRCode.toString(qrUrl, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#0000' },
  });

  const updatedAt = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
  const siteHost = new URL(SITE_URL).host;

  return (
    <section className='space-y-6'>
      <style>{`@page { size: ${pageW}mm ${pageH}mm; margin: 0; }`}</style>

      <div className='space-y-2 print:hidden'>
        <h2 className='text-xl font-semibold'>Cardápio impresso</h2>
        <p className='text-sm text-muted-foreground'>
          Folha frente e verso para o display dos quartos. Na frente vão os
          itens que ficam no quarto; no verso, todos os brinquedos em estoque.
          Os preços vêm do cadastro de produtos: alterou um preço, é só imprimir
          de novo.
        </p>
      </div>

      {error && (
        <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive print:hidden'>
          Não foi possível carregar os produtos: {error.message}
        </p>
      )}

      <PrintedMenuToolbar
        format={formatKey}
        room={room}
        showPrices={showPrices}
        bleed={bleed}
      />

      <div
        className={`pm-root ${playfair.variable} ${inter.variable}`}
        data-format={formatKey}
        style={
          {
            '--pm-w': `${pageW}mm`,
            '--pm-h': `${pageH}mm`,
            '--pm-edge': `${edge}mm`,
          } as React.CSSProperties
        }
      >
        {/* Frente: marca, o que está no quarto e como pedir */}
        <article className='pm-sheet pm-front' aria-label='Frente do cardápio'>
          {bleed && <CropMarks width={format.width} height={format.height} />}
          <div className='pm-sheet-body'>
            <header className='pm-brand'>
              <img
                src='/logo.png'
                alt='The Secret Boutique'
                className='pm-logo'
              />
              <p className='pm-kicker'>
                Boutique íntima · entrega no seu quarto
              </p>
            </header>

            <div className='pm-featured'>
              <h3 className='pm-title'>No seu quarto</h3>
              <p className='pm-subtitle'>Já estão aqui, prontos para usar</p>
              <ul
                className='pm-list pm-list-lg'
                data-dense={roomItems.length > 10 || undefined}
              >
                {roomItems.map(item => (
                  <MenuRow key={item.id} item={item} showPrice={showPrices} />
                ))}
              </ul>
            </div>

            <div className='pm-order'>
              <div
                className='pm-qr'
                role='img'
                aria-label={`QR code para ${qrUrl}`}
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <div className='pm-order-text'>
                <p className='pm-order-title'>Quer mais?</p>
                <p>
                  Aponte a câmera para o código
                  {showPrices ? '' : ', veja preços e fotos'}, escolha com calma
                  e receba aqui no quarto, em embalagem discreta.
                </p>
                <p>
                  <strong>Pague na entrega:</strong> Pix, cartão ou dinheiro.
                </p>
                <p className='pm-contact'>
                  {siteHost} · WhatsApp {formatWhatsapp(WHATSAPP_NUMBER)}
                </p>
              </div>
            </div>

            <footer className='pm-footer'>
              <span>Atendimento {STORE_HOURS_LABEL}</span>
              <span>Proibido para menores de 18 anos</span>
            </footer>
          </div>
        </article>

        {/* Verso: todos os brinquedos em estoque */}
        <article className='pm-sheet pm-back' aria-label='Verso do cardápio'>
          {bleed && <CropMarks width={format.width} height={format.height} />}
          <div className='pm-sheet-body'>
            <h3 className='pm-title'>Brinquedos</h3>
            <p className='pm-subtitle'>
              Entregamos no seu quarto, em embalagem discreta
            </p>
            {toys.length > 0 ? (
              <ul className='pm-list pm-list-lg pm-toys'>
                {toys.map(item => (
                  <MenuRow key={item.id} item={item} showPrice={showPrices} />
                ))}
              </ul>
            ) : (
              <p className='pm-empty'>Nenhum brinquedo em estoque.</p>
            )}
            <p className='pm-more'>
              {showPrices ? 'Fotos e detalhes' : 'Preços, fotos e detalhes'} de
              cada um em {siteHost}
            </p>
            <footer className='pm-footer'>
              <span>Peça pelo QR code da frente</span>
              <span>
                {showPrices
                  ? `Preços de ${updatedAt}${room ? ` · Quarto ${room}` : ''}`
                  : room
                    ? `Quarto ${room}`
                    : ''}
              </span>
            </footer>
          </div>
        </article>
      </div>
    </section>
  );
}
