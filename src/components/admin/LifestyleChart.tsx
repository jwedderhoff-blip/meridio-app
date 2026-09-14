import { LIFESTYLE_BAND_META, type LifestyleScore, type LifestyleBand } from '../../lib/anamnese'

/**
 * Barras horizontais 0-100, uma por dimensão de estilo de vida. A cor de
 * cada barra segue a faixa (bom/regular/atenção) — mas nunca só cor: o
 * rótulo da faixa e o valor numérico sempre acompanham, e uma legenda fixa
 * no topo explica o que cada cor significa.
 */
export function LifestyleChart({ scores }: { scores: LifestyleScore[] }) {
  const bandsUsed = (Object.keys(LIFESTYLE_BAND_META) as LifestyleBand[])

  return (
    <div role="img" aria-label="Gráfico de estilo de vida">
      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
        {bandsUsed.map((b) => (
          <span key={b} className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: LIFESTYLE_BAND_META[b].color }} />
            {LIFESTYLE_BAND_META[b].label}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {scores.map((s) => {
          const meta = LIFESTYLE_BAND_META[s.band]
          return (
            <div key={s.key} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-32 shrink-0">{s.label}</span>
              <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.max(4, s.value)}%`, background: meta.color }}
                />
              </div>
              <span className="text-xs font-semibold w-28 text-right shrink-0" style={{ color: meta.color }}>
                {s.value} · {meta.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
