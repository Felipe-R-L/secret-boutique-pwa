'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = {
  format: 'a5' | 'a4';
  room: string;
  showPrices: boolean;
  bleed: boolean;
};

/** Barra de controles do /admin/cardapio — some na impressão. */
export function PrintedMenuToolbar({
  format,
  room,
  showPrices,
  bleed,
}: Props) {
  const [overflowing, setOverflowing] = useState<string[]>([]);

  // Avisa quando o conteúdo passa do tamanho da folha (a folha corta o que
  // sobra). Mede depois das fontes carregarem, que mudam a altura do texto.
  useEffect(() => {
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const sheets = document.querySelectorAll<HTMLElement>('.pm-sheet');
      const labels: string[] = [];
      sheets.forEach(sheet => {
        const body = sheet.querySelector<HTMLElement>('.pm-sheet-body');
        if (body && body.scrollHeight > body.clientHeight + 1) {
          labels.push(
            sheet.classList.contains('pm-front') ? 'na frente' : 'no verso',
          );
        }
      });
      setOverflowing(labels);
    };

    document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', measure);
    };
  }, [format, showPrices, bleed]);

  const hrefFor = (nextFormat: 'a5' | 'a4') => {
    const params = new URLSearchParams({ formato: nextFormat });
    if (room) params.set('apto', room);
    if (!showPrices) params.set('precos', 'nao');
    if (bleed) params.set('sangria', 'sim');
    return `/admin/cardapio?${params.toString()}`;
  };

  return (
    <div className='space-y-3 print:hidden'>
      <div className='flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4'>
        <div className='space-y-1.5'>
          <p className='text-xs font-medium text-muted-foreground'>Tamanho</p>
          <div className='flex gap-1 rounded-full bg-muted p-1'>
            {(['a5', 'a4'] as const).map(option => (
              <Link
                key={option}
                href={hrefFor(option)}
                replace
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm transition-colors',
                  option === format
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {option.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>

        <form action='/admin/cardapio' className='flex items-end gap-2'>
          <input type='hidden' name='formato' value={format} />
          <label className='space-y-1.5'>
            <span className='block text-xs font-medium text-muted-foreground'>
              Quarto no QR code (opcional)
            </span>
            <Input
              name='apto'
              defaultValue={room}
              placeholder='Ex.: 12'
              maxLength={10}
              pattern='[0-9A-Za-z\-]{1,10}'
              className='w-28'
            />
          </label>
          <label className='flex h-9 items-center gap-2 text-sm'>
            <input
              type='checkbox'
              name='precos'
              value='nao'
              defaultChecked={!showPrices}
              className='size-4'
            />
            Sem preços (placa)
          </label>
          <label className='flex h-9 items-center gap-2 text-sm'>
            <input
              type='checkbox'
              name='sangria'
              value='sim'
              defaultChecked={bleed}
              className='size-4'
            />
            Sangria 3 mm e marcas de corte
          </label>
          <Button type='submit' variant='outline'>
            Aplicar
          </Button>
        </form>

        <Button
          type='button'
          onClick={() => window.print()}
          className='ml-auto gap-2'
        >
          <Printer className='size-4' />
          Imprimir
        </Button>
      </div>

      <p className='text-xs text-muted-foreground'>
        Preencha o quarto para a frente trazer os itens daquele quarto (a lista
        fica em lib/room-kits.ts) e o QR já abrir o site com a entrega nele. Sem
        quarto, a frente mostra só o que todos os quartos têm. Para a placa da
        gráfica, marque “Sem preços” e “Sangria” e salve como PDF; os preços
        ficam na folha A5 do display. Na impressão:
        frente e verso virando pela borda maior, margens “Nenhuma” e escala
        100%.
      </p>

      {overflowing.length > 0 && (
        <p className='flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
          <AlertTriangle className='size-4 shrink-0' />O conteúdo não coube{' '}
          {overflowing.join(' e ')} em {format.toUpperCase()}: o que passar da
          folha fica cortado.{' '}
          {format === 'a5'
            ? 'Mude para A4 ou encurte nomes de produtos.'
            : 'Encurte nomes de produtos ou tire itens da lista do quarto.'}
        </p>
      )}
    </div>
  );
}
