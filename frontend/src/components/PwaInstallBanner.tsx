import { useState } from 'react'
import { usePwaInstall } from '../hooks/usePwaInstall'

function isIos(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function isInStandaloneMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    // iOS-specific standalone check
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function PwaInstallBanner() {
  const { canInstall, isInstalled, promptInstall } = usePwaInstall()
  const [dismissed, setDismissed] = useState(false)

  // Never show if already installed/standalone or user dismissed this session
  if (isInstalled || isInStandaloneMode() || dismissed) {
    return null
  }

  // Android: native install prompt available
  if (canInstall) {
    return (
      <div
        role="banner"
        aria-label="Instalar aplicación"
        className="fixed bottom-16 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-xl bg-blue-600 px-4 py-3 text-white shadow-lg md:left-auto md:right-6 md:w-80"
      >
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Instalar Recibos</span>
          <span className="text-xs opacity-80">Accede más rápido desde tu pantalla de inicio</span>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setDismissed(true)}
            aria-label="Cerrar"
            className="rounded-lg px-2 py-1 text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
          <button
            onClick={promptInstall}
            className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
          >
            Instalar
          </button>
        </div>
      </div>
    )
  }

  // iOS: no programmatic install prompt — show manual guidance
  if (isIos()) {
    return (
      <div
        role="banner"
        aria-label="Agregar a pantalla de inicio"
        className="fixed bottom-16 left-4 right-4 z-50 flex items-start justify-between gap-3 rounded-xl bg-blue-600 px-4 py-3 text-white shadow-lg"
      >
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Agrega a tu pantalla de inicio</span>
          <span className="text-xs opacity-80">
            Toca <strong>Compartir</strong> {'\u{1F4E4}'} y luego <strong>&quot;Agregar a la pantalla de inicio&quot;</strong>
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Cerrar"
          className="mt-0.5 shrink-0 rounded-lg px-2 py-1 text-xs opacity-70 hover:opacity-100"
        >
          ✕
        </button>
      </div>
    )
  }

  // No install surface available (desktop Chrome without prompt, Firefox, etc.)
  return null
}
