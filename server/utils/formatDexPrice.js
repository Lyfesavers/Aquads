const SUBSCRIPT = '₀₁₂₃₄₅₆₇₈₉';

function toSubscript(num) {
  return String(num)
    .split('')
    .map((d) => SUBSCRIPT[Number(d)] ?? d)
    .join('');
}

/**
 * Format a USD token price like DexScreener (subscript zero-count for micro caps).
 * e.g. 5.01e-10 → $0.0₉5010, 0.000589 → $0.000589
 */
function formatDexPrice(price) {
  const p = Number(price);
  if (!Number.isFinite(p) || p === 0) return '$0';
  if (p >= 1000) {
    return `$${p.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  if (p >= 0.0001) {
    return `$${p.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')}`;
  }

  const fixed = p.toFixed(24);
  const match = fixed.match(/^0\.(0+)([1-9]\d*)/);
  if (!match) return `$${p.toExponential(2)}`;

  const zeroCount = match[1].length;
  const sig = match[2].slice(0, 4);
  return `$0.0${toSubscript(zeroCount)}${sig}`;
}

module.exports = { formatDexPrice, toSubscript };
