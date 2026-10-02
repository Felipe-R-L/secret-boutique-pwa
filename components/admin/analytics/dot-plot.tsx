"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { stageColor } from "./viz-theme";

// Dot plot (David Lieb / YC): cada linha é um visitante anônimo, cada coluna
// um dia. O ponto aparece quando o visitante esteve na loja naquele dia e a
// cor mostra até onde ele chegou no funil.

type Row = {
  visitorId: string;
  sourceLabel: string;
  days: Record<string, { stage: number; events: number }>;
};

type Props = {
  rows: Row[];
  days: string[];
  stageLabels: string[];
};

const LABEL_W = 92;
// Largura da coluna se adapta ao espaço disponível, entre estes limites.
const MIN_CELL_W = 22;
const MAX_CELL_W = 64;
const ROW_H = 14;
const HEADER_H = 28;
const R = 4.5; // 9px de diâmetro (>= 8px)

function shortDate(day: string) {
  const [, m, d] = day.split("-");
  return `${d}/${m}`;
}

export function DotPlot({ rows, days, stageLabels }: Props) {
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    row: Row;
    day: string;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setContainerWidth(entry.contentRect.width),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const CELL_W = Math.min(
    MAX_CELL_W,
    Math.max(
      MIN_CELL_W,
      Math.floor((containerWidth - LABEL_W - 8) / Math.max(days.length, 1)),
    ),
  );
  const width = LABEL_W + days.length * CELL_W + 8;

  // Em tela estreita o gráfico rola na horizontal: começa mostrando hoje.
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [width]);
  const height = HEADER_H + rows.length * ROW_H + 8;
  // Rótulo de data a cada N dias, contado a partir de hoje (última coluna),
  // para o dia mais recente sempre ter rótulo e nenhum rótulo colidir.
  const labelEvery = Math.max(1, Math.ceil(40 / CELL_W));

  const perDay = useMemo(
    () =>
      days.map((day) => {
        const counts = stageLabels.map(() => 0);
        for (const row of rows) {
          const cell = row.days[day];
          if (cell) counts[cell.stage] += 1;
        }
        return counts;
      }),
    [rows, days, stageLabels],
  );

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative max-h-[520px] overflow-auto rounded-lg border border-border"
      >
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Dot plot: ${rows.length} visitantes ao longo de ${days.length} dias`}
          className="block"
          onMouseLeave={() => setHover(null)}
        >
          {/* grade vertical leve, uma linha por dia */}
          {days.map((day, i) => (
            <line
              key={day}
              x1={LABEL_W + i * CELL_W + CELL_W / 2}
              x2={LABEL_W + i * CELL_W + CELL_W / 2}
              y1={HEADER_H - 4}
              y2={height - 4}
              stroke="var(--viz-grid)"
              strokeWidth={1}
            />
          ))}
          {days.map((day, i) =>
            (days.length - 1 - i) % labelEvery === 0 ? (
              <text
                key={`l-${day}`}
                x={LABEL_W + i * CELL_W + CELL_W / 2}
                y={16}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={10}
              >
                {shortDate(day)}
              </text>
            ) : null,
          )}

          {rows.map((row, r) => {
            const y = HEADER_H + r * ROW_H + ROW_H / 2;
            return (
              <g key={row.visitorId}>
                <text
                  x={8}
                  y={y + 3.5}
                  fontSize={10}
                  className="fill-muted-foreground"
                >
                  {row.sourceLabel}
                </text>
                {days.map((day, i) => {
                  const cell = row.days[day];
                  if (!cell) return null;
                  const cx = LABEL_W + i * CELL_W + CELL_W / 2;
                  const visitedOnly = cell.stage === 0;
                  return (
                    <g key={day}>
                      <circle
                        cx={cx}
                        cy={y}
                        r={visitedOnly ? R - 0.75 : R}
                        fill={visitedOnly ? "none" : stageColor(cell.stage)}
                        stroke={visitedOnly ? stageColor(0) : "none"}
                        strokeWidth={1.5}
                      />
                      {/* área de toque maior que o ponto */}
                      <rect
                        x={cx - CELL_W / 2}
                        y={y - ROW_H / 2}
                        width={CELL_W}
                        height={ROW_H}
                        fill="transparent"
                        onMouseEnter={() => setHover({ x: cx, y, row, day })}
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute z-10 min-w-44 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
            style={{
              left: Math.min(hover.x + 12, width - 190),
              top: hover.y + 10,
            }}
          >
            <p className="font-medium">{shortDate(hover.day)}</p>
            <p className="text-muted-foreground">
              Origem: {hover.row.sourceLabel}
            </p>
            <p className="mt-1 flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block size-2.5 rounded-full"
                style={{
                  background: stageColor(hover.row.days[hover.day].stage),
                }}
              />
              {stageLabels[hover.row.days[hover.day].stage]}
            </p>
            <p className="text-muted-foreground">
              {hover.row.days[hover.day].events} interações no dia
            </p>
          </div>
        )}
      </div>

      {/* legenda */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {stageLabels.map((label, stage) => (
          <li key={label} className="flex items-center gap-1.5">
            <svg width={12} height={12} aria-hidden>
              <circle
                cx={6}
                cy={6}
                r={stage === 0 ? 4.25 : 5}
                fill={stage === 0 ? "none" : stageColor(stage)}
                stroke={stage === 0 ? stageColor(0) : "none"}
                strokeWidth={1.5}
              />
            </svg>
            {label}
          </li>
        ))}
      </ul>

      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">
          Ver como tabela
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-muted-foreground">
                <th className="py-1 pr-3 font-medium">Dia</th>
                {stageLabels.map((label) => (
                  <th key={label} className="py-1 pr-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day, i) => (
                <tr key={day} className="border-t border-border">
                  <td className="py-1 pr-3">{shortDate(day)}</td>
                  {perDay[i].map((count, s) => (
                    <td key={s} className="py-1 pr-3 tabular-nums">
                      {count}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
