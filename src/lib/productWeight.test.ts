/**
 * Product weight rule used by the Products page (blocks saving) and the quick-add form (warns after saving): a variant
 * needs a weight in kg, or a size or volume label with a unit; the product NAME is never parsed and no weight is invented.
 * Run: npx ts-node --transpile-only -O '{"module":"commonjs","moduleResolution":"node"}' src/lib/productWeight.test.ts
 */
import assert from 'node:assert';
import { missingWeightMessage, parseWeightFromVolume, variantWeightKg } from './productWeight';

// Size labels the backend also understands
assert.strictEqual(parseWeightFromVolume('41.5g'), 0.0415);
assert.strictEqual(parseWeightFromVolume('1 kg'), 1);
assert.strictEqual(parseWeightFromVolume('250ml'), 0.25);
assert.strictEqual(parseWeightFromVolume('Standard'), null);
assert.strictEqual(parseWeightFromVolume(''), null);

// The KitKat case: created by the quick-add form as size "Standard", weight 0 -> no weight, clear message
const kitkat = { size: 'Standard', volume: 'Standard', weight: 0 };
assert.strictEqual(variantWeightKg(kitkat), 0, 'the "41.5g" in the product name is not used');
const msg = missingWeightMessage(kitkat, 'Nestlé KitKat 4 Finger Milk Chocolate Bar 41.5g');
assert.match(msg, /enter its weight in kg/);
assert.match(msg, /customers can only choose store pickup/);
assert.match(msg, /^Nestlé KitKat/, 'names the product');

// Either source of weight is enough; nothing else is
assert.strictEqual(missingWeightMessage({ size: 'Standard', weight: 0.0415 }, 'x'), '', 'explicit weight');
assert.strictEqual(missingWeightMessage({ size: '41.5g', weight: 0 }, 'x'), '', 'size with a unit');
assert.strictEqual(missingWeightMessage({ volume: '41.5 g' }, 'x'), '', 'volume label');
for (const bad of [{}, { weight: null }, { weight: -1 }, { weight: Number.NaN }, { size: '4 pack', weight: 0 }]) {
  assert.notStrictEqual(missingWeightMessage(bad, 'x'), '', JSON.stringify(bad));
}

// A non-weight size ("Standard") does not hide a weighted volume
assert.strictEqual(variantWeightKg({ size: 'Standard', volume: '41.5g' }), 0.0415, 'Standard + 41.5g');
assert.strictEqual(variantWeightKg({ size: 'Standard', volume: '250ml' }), 0.25, 'Standard + 250ml');
assert.strictEqual(missingWeightMessage({ size: 'Standard', volume: '41.5g', weight: 0 }, 'x'), '', 'accepted via volume');
// An explicit positive weight wins over both labels; a weighted size wins over the volume
assert.strictEqual(variantWeightKg({ weight: 2, size: '41.5g', volume: '250ml' }), 2, 'explicit weight first');
assert.strictEqual(variantWeightKg({ weight: 0, size: '1kg', volume: '250ml' }), 1, 'size before volume');
// Still rejected: no weight anywhere, invalid weight, labels without a unit
for (const bad of [{ size: 'Standard', volume: 'Standard' }, { weight: -2, size: 'Standard', volume: 'Large' }, { weight: Number.NaN, volume: '' }]) {
  assert.strictEqual(variantWeightKg(bad), 0, JSON.stringify(bad));
  assert.notStrictEqual(missingWeightMessage(bad, 'x'), '', JSON.stringify(bad));
}

console.log('✅ product weight: missing weight gets one clear message; weight, size or volume with a unit passes; nothing invented (28 checks)');
