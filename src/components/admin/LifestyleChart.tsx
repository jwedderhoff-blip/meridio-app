import type { LifestyleScore } from '../../lib/anamnese'

/**
 * Barras horizontais, escala única 0-100 — comparação de magnitude entre as
 * 5 dimensões de estilo de vida. Uma cor só (a marca): não é identidade por
 * categoria, é a mesma métrica em 5 eixos. Rótulo numérico em cada barra
 * (nunca só cor) para não depender de percepção de cor.
 */
export function LifestyleChart({ scores }: { scores: LifestyleScore[] }) {
  return (
    <div className="space-y-3" role="img" aria-label="Gráfico de estilo de vida">
      {scores.map((s) => (
        <div key={s.key} className="flex items-center gap-3">
          <span className="text-xs text-gray-600 w-32 shrink-0">{s.label}</span>
          <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${Math.max(4, s.value)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-9 text-right shrink-0">{s.value}</span>
        </div>
      ))}
    </div>
  )
}
