import Link from 'next/link'
import { listCompanies } from '@/lib/queries/companies'

const ICP_LABEL: Record<string, string> = { poor: 'Fraco', partial: 'Parcial', strong: 'Forte' }

export default async function CompaniesPage() {
  const companies = await listCompanies()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-sans text-2xl font-semibold text-content-primary">Empresas</h1>
        <Link
          href="/companies/new"
          className="rounded-pill bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition-all ease-spring hover:bg-brand-500 hover:scale-[1.02]"
        >
          Nova empresa
        </Link>
      </div>

      {companies.length === 0 ? (
        <p className="text-sm text-content-secondary">Nenhuma empresa cadastrada ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-white/[0.08]">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-elevated text-xs uppercase tracking-wide text-content-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Segmento</th>
                <th className="px-4 py-3 font-medium">Cidade</th>
                <th className="px-4 py-3 font-medium">ICP</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-t border-white/[0.08] hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <Link href={`/companies/${company.id}`} className="text-content-primary hover:text-brand-400">
                      {company.company_name}
                    </Link>
                    {company.is_demo ? (
                      <span className="ml-2 rounded-pill bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-warning">
                        demo
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-content-secondary">{company.industry ?? '—'}</td>
                  <td className="px-4 py-3 text-content-secondary">{company.city ?? '—'}</td>
                  <td className="px-4 py-3 text-content-secondary">
                    {company.icp_fit ? ICP_LABEL[company.icp_fit] : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
