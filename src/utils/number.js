export const toNum = (val) => {
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

export const ceil = (num) => Math.ceil(num)

export const fixed2 = (num) => Number(num.toFixed(2))