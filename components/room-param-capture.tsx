'use client';

import { useEffect } from 'react';

// Captura ?quarto=N (QR code fixado no quarto) em qualquer página de entrada
// e guarda na sessão para o checkout pré-selecionar a entrega no quarto.
// Depois remove o parâmetro da URL — assim o número do quarto não vaza se o
// visitante compartilhar o link.
export function RoomParamCapture() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const room = (
      url.searchParams.get('quarto') ??
      url.searchParams.get('room') ??
      ''
    ).trim();

    const clearSavedRoom = () => {
      try {
        sessionStorage.removeItem('sb-room');
      } catch {
        // armazenamento bloqueado — segue sem pré-seleção
      }
    };

    if (!room) {
      clearSavedRoom();
      return;
    }

    if (!/^[0-9A-Za-z-]{1,10}$/.test(room)) {
      clearSavedRoom();
      url.searchParams.delete('quarto');
      url.searchParams.delete('room');
      window.history.replaceState(
        null,
        '',
        url.pathname + url.search + url.hash,
      );
      return;
    }

    try {
      sessionStorage.setItem('sb-room', room);
    } catch {
      // armazenamento bloqueado — segue sem pré-seleção
    }

    url.searchParams.delete('quarto');
    url.searchParams.delete('room');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, []);

  return null;
}
