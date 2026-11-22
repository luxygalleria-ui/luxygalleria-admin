/**
 * Shipping weight of a product variant, resolved exactly as the backend prices delivery (shippingCalculator.ts):
 * the variant's own weight in kg, else a weight parsed from its size label, else its volume label ("41.5g", "1kg", "250ml"). Never from the
 * product name. Without either, delivery cannot be priced and the storefront offers store pickup only.
 */

/** Weight in kg from a size label such as "41.5g", "1kg" or "250ml" (1 ml counted as 1 g); null when it has no unit. */
export const parseWeightFromVolume = (volume: string): number | null => {
  if (!volume) return null;
  const match = volume.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|l|ltr|liter|liters|litre|litres|ml)/i);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === 'kg' || unit === 'l' || unit === 'ltr' || unit === 'liter' || unit === 'liters' || unit === 'litre' || unit === 'litres') {
      return value;
    } else if (unit === 'g' || unit === 'gm' || unit === 'gms' || unit === 'ml') {
      return value / 1000;
    }
  }
  return null;
};

type WeightedVariant = { weight?: number | null; size?: string; volume?: string };

/** The variant's shipping weight in kg; 0 when it has none. */
export const variantWeightKg = (v: WeightedVariant): number => {
  const own = Number(v.weight);
  if (Number.isFinite(own) && own > 0) return own;
  // size first, then volume: a size such as "Standard" must not hide a weighted volume such as "41.5g"
  return parseWeightFromVolume(v.size || '') ?? parseWeightFromVolume(v.volume || '') ?? 0;
};

/** A clear message for a variant that has no shipping weight, or '' when it has one. */
export const missingWeightMessage = (v: WeightedVariant, label: string): string =>
  variantWeightKg(v) > 0 ? '' : `${label}: enter its weight in kg (e.g. 0.0415 for 41.5 g), or a size with a unit such as "41.5g". `
    + 'Without a weight, delivery cannot be priced and customers can only choose store pickup.';
