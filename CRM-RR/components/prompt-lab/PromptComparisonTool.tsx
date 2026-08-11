'use client'

import { useMemo, useState, useTransition } from 'react'
import { runPromptComparison, recordComparisonWinner } from '@/lib/actions/prompt-lab'
import type { PromptGroup } from '@/lib/queries/prompt-lab'

const DEFAULT_TEST_INPUT = `{
  "deal_title": "Site institucional",
  "company_name": "Exemplo Ltda",
  "industry": "Serviços",
  "company_size": "10-50 funcionários",
  "contact_name": "Maria",
  "contact_role": "Sócia",
  "company_notes": "Cliente indicado, respondeu rápido no WhatsApp.",
  "existing_scores_summary": "Nenhuma pontuação registrada ainda."
}`

export function PromptComparisonTool({ groups }: { groups: PromptGroup[] }) {
  const multiVersionGroups = groups.filter((g) => g.versions.length >= 2)
  const [slug, setSlug] = useState(multiVersionGroups[0]?.slug ?? '')
  const versions = useMemo(() => groups.find((g) => g.slug === slug)?.versions ?? [], [groups, slug])

  const [promptAId, setPromptAId] = useState(versions[0]?.id ?? '')
  const [promptBId, setPromptBId] = useState(versions[1]?.id ?? '')
  const [testInput, setTestInput] = useState(DEFAULT_TEST_INPUT)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ comparisonId: string; outputA: unknown; outputB: unknown } | null>(null)
  const [winner, setWinner] = useState<'a' | 'b' | 'tie' | null>(null)

  if (multiVersionGroups.length === 0) {
    return (
      <p className="text-sm text-content-secondary">
        Crie pelo menos 2 versões da mesma slug para poder comparar.
      </p>
    )
  }

  function handleRun() {
    setError(null)
    setResult(null)
    setWinner(null)
    startTransition(async () => {
      const res = await runPromptComparison(promptAId, promptBId, testInput)
      if (!res.ok || !res.comparisonId) {
        setError(res.error ?? 'Erro desconhecido')
        return
      }
      setResult({ comparisonId: res.comparisonId, outputA: res.outputA, outputB: res.outputB })
    })
  }

  function handleWinner(choice: 'a' | 'b' | 'tie') {
    if (!result) return
    startTransition(async () => {
      await recordComparisonWinner(result.comparisonId, choice)
      setWinner(choice)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-content-secondary">Prompt</label>
          <select
            value={slug}
            onChange={(e) => {
              const newSlug = e.target.value
              setSlug(newSlug)
              const newVersions = groups.find((g) => g.slug === newSlug)?.versions ?? []
              setPromptAId(newVersions[0]?.id ?? '')
              setPromptBId(newVersions[1]?.id ?? '')
            }}
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
          >
            {multiVersionGroups.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.slug}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-content-secondary">Versão A</label>
          <select
            value={promptAId}
            onChange={(e) => setPromptAId(e.target.value)}
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.version} {v.is_active ? '(ativa)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-content-secondary">Versão B</label>
          <select
            value={promptBId}
            onChange={(e) => setPromptBId(e.target.value)}
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.version} {v.is_active ? '(ativa)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-content-secondary">Input de teste (JSON, mesmas variáveis do template)</label>
        <textarea
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          rows={8}
          className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 font-mono text-xs text-content-primary outline-none focus:border-brand-500"
        />
      </div>

      <div>
        <button
          type="button"
          onClick={handleRun}
          disabled={pending || promptAId === promptBId}
          className="rounded-pill bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition-all ease-spring hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Rodando os dois…' : 'Rodar comparação'}
        </button>
        {promptAId === promptBId ? <p className="mt-1 text-xs text-warning">Escolha duas versões diferentes.</p> : null}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {result ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2 rounded-inner border border-white/[0.08] bg-surface-elevated p-4">
            <span className="font-mono text-[10px] uppercase tracking-wide text-content-muted">Output A</span>
            <pre className="scrollbar-thin max-h-80 overflow-auto whitespace-pre-wrap font-mono text-xs text-content-secondary">
              {JSON.stringify(result.outputA, null, 2)}
            </pre>
          </div>
          <div className="flex flex-col gap-2 rounded-inner border border-white/[0.08] bg-surface-elevated p-4">
            <span className="font-mono text-[10px] uppercase tracking-wide text-content-muted">Output B</span>
            <pre className="scrollbar-thin max-h-80 overflow-auto whitespace-pre-wrap font-mono text-xs text-content-secondary">
              {JSON.stringify(result.outputB, null, 2)}
            </pre>
          </div>

          <div className="col-span-2 flex items-center gap-3">
            <span className="text-xs text-content-secondary">Qual foi melhor?</span>
            <button
              type="button"
              onClick={() => handleWinner('a')}
              className={`rounded-pill px-4 py-1.5 text-xs font-medium transition-colors ease-spring ${winner === 'a' ? 'bg-brand-600 text-white' : 'border border-white/[0.08] text-content-secondary hover:text-content-primary'}`}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => handleWinner('b')}
              className={`rounded-pill px-4 py-1.5 text-xs font-medium transition-colors ease-spring ${winner === 'b' ? 'bg-brand-600 text-white' : 'border border-white/[0.08] text-content-secondary hover:text-content-primary'}`}
            >
              B
            </button>
            <button
              type="button"
              onClick={() => handleWinner('tie')}
              className={`rounded-pill px-4 py-1.5 text-xs font-medium transition-colors ease-spring ${winner === 'tie' ? 'bg-brand-600 text-white' : 'border border-white/[0.08] text-content-secondary hover:text-content-primary'}`}
            >
              Empate
            </button>
            {winner ? <span className="text-xs text-content-muted">Registrado.</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
