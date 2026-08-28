'use client'

import { useState } from 'react'

interface CopyDossierButtonProps {
  /** Markdown pronto do Server Component (`buildDossierMarkdown`, 7.8). O
   * cliente não recalcula nada — só copia. */
  markdown: string
}

const FEEDBACK_MS = 2000

/**
 * "Copiar dossiê" (7.9). Copia o Markdown do dossiê para a área de
 * transferência, para colar direto numa IA. `navigator.clipboard` quando
 * disponível; fallback de `<textarea>` + `document.execCommand('copy')` para
 * contexto sem permissão de Clipboard API.
 */
export function CopyDossierButton({ markdown }: CopyDossierButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')

  async function copy(): Promise<void> {
    const ok = (await writeToClipboard(markdown)) || copyViaTextarea(markdown)
    setState(ok ? 'copied' : 'error')
    window.setTimeout(() => setState('idle'), FEEDBACK_MS)
  }

  return (
    <div className="inline-flex flex-col">
      <button
        type="button"
        onClick={() => void copy()}
        className="text-xs font-semibold text-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        {state === 'copied' ? 'Copiado' : state === 'error' ? 'Não deu para copiar' : 'Copiar dossiê'}
      </button>
    </div>
  )
}

async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return false
    }
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function copyViaTextarea(text: string): boolean {
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
