// Cores dos gráficos de métricas, por papel. Estágios do funil usam uma rampa
// ordinal de um só tom (azul, claro → escuro = mais fundo no funil), validada
// com o validador da skill dataviz (--ordinal) nos temas claro e escuro.
// "Só visitou" fica fora da rampa: anel cinza vazado, para não competir com
// quem avançou no funil.

const LIGHT = `
  --viz-stage-0: #8a8883;
  --viz-stage-1: #86b6ef;
  --viz-stage-2: #5598e7;
  --viz-stage-3: #2a78d6;
  --viz-stage-4: #1c5cab;
  --viz-stage-5: #104281;
  --viz-grid: #e6e4df;
  --viz-bar: #2a78d6;
`;

const DARK = `
  --viz-stage-0: #8a8984;
  --viz-stage-1: #184f95;
  --viz-stage-2: #3987e5;
  --viz-stage-3: #6da7ec;
  --viz-stage-4: #9ec5f4;
  --viz-stage-5: #cde2fb;
  --viz-grid: #2f2f2c;
  --viz-bar: #3987e5;
`;

export function VizTheme() {
  return (
    <style>{`
      .viz-root { ${LIGHT} }
      .dark .viz-root { ${DARK} }
    `}</style>
  );
}

export const stageColor = (stage: number) => `var(--viz-stage-${stage})`;
