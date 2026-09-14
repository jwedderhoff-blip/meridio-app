/**
 * Escreve um valor em reais por extenso, no formato usado em recibos
 * brasileiros: "cento e cinquenta reais e vinte centavos". Cobre até
 * 999.999.999,99 — mais que suficiente para os valores do Caixa.
 */
const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
const DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

function tresDigitos(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'cem'
  const c = Math.floor(n / 100)
  const resto = n % 100
  const partes: string[] = []
  if (c > 0) partes.push(CENTENAS[c])
  if (resto > 0) {
    if (partes.length) partes.push('e')
    if (resto < 10) partes.push(UNIDADES[resto])
    else if (resto < 20) partes.push(DEZ_A_DEZENOVE[resto - 10])
    else {
      const d = Math.floor(resto / 10)
      const u = resto % 10
      partes.push(u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d])
    }
  }
  return partes.join(' ')
}

function grupo(n: number, singular: string, plural: string): string {
  if (n === 0) return ''
  return `${tresDigitos(n)} ${n === 1 ? singular : plural}`
}

/** "mil" nunca leva "um" na frente ("mil reais", não "um mil reais"). */
function grupoMil(n: number): string {
  if (n === 0) return ''
  return n === 1 ? 'mil' : `${tresDigitos(n)} mil`
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return 'zero'
  const milhoes = Math.floor(n / 1_000_000)
  const milhares = Math.floor((n % 1_000_000) / 1000)
  const centenas = n % 1000

  const partes = [
    grupo(milhoes, 'milhão', 'milhões'),
    grupoMil(milhares),
    tresDigitos(centenas),
  ].filter(Boolean)

  if (partes.length === 0) return 'zero'
  if (partes.length === 1) return partes[0]

  // "e" antes do último grupo quando ele é < 100 ou uma centena redonda
  // (ex.: "mil e quinhentos", "mil e vinte") — mas não quando o grupo já
  // tem centena+dezena/unidade própria (ex.: "mil trezentos e vinte").
  const last = partes[partes.length - 1]
  const rest = partes.slice(0, -1)
  const needsE = centenas > 0 && (centenas < 100 || centenas % 100 === 0) && (milhoes > 0 || milhares > 0)
  return rest.join(' ') + (needsE ? ' e ' : ' ') + last
}

export function valorPorExtenso(value: number): string {
  const cents = Math.round(value * 100)
  const reais = Math.floor(cents / 100)
  const centavos = cents % 100

  const reaisTxt = `${inteiroPorExtenso(reais)} ${reais === 1 ? 'real' : 'reais'}`
  if (centavos === 0) return reaisTxt

  const centavosTxt = `${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`
  return `${reaisTxt} e ${centavosTxt}`
}
