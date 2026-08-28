'use client'

interface ExportJsonButtonProps {
  /** JSON já serializado do Server Component (`buildDossierJson`, 7.8). */
  json: string
  /** Nome do arquivo, montado no servidor (`dossie-<slug>-<data>.json`). */
  filename: string
}

/**
 * "Exportar JSON" individual (7.9). Baixa o dossiê aninhado como arquivo
 * `.json` via `Blob` + `URL.createObjectURL`. O JSON chega pronto do Server
 * Component — o cliente só empacota e dispara o download.
 */
export function ExportJsonButton({ json, filename }: ExportJsonButtonProps) {
  function download(): void {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={download}
      className="text-xs font-semibold text-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      Exportar JSON
    </button>
  )
}
