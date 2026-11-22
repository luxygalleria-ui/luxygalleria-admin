/**
 * The Store Pickup 400 on the live admin: a cleared number input gives NaN, JSON sends it as null, and the backend
 * (correctly) answers 400 "Expected number, received null". blankNumbers() finds every such field so save() stops and
 * highlights it instead of sending the request.
 * Run: npx ts-node --transpile-only -O '{"module":"commonjs","moduleResolution":"node","jsx":"react-jsx"}' src/components/checkout/useCheckoutSection.test.ts
 */
import assert from 'node:assert';
import { blankNumbers } from './useCheckoutSection';

const pickup = {
  enabled: true, storeName: 'Luxy Galleria', address: '1 MG Road', openingHours: 'Mon–Sat 10–8', phone: '+91 98765 43210',
  email: '', instructions: '', readyTime: '', charge: 0,
};

// Why the request failed: NaN does not survive JSON
assert.strictEqual(JSON.stringify({ charge: NaN }), '{"charge":null}');
// A complete form has no blank numbers: save() sends it
assert.deepStrictEqual(blankNumbers(pickup), []);
// The live case: the pickup charge was cleared -> caught before sending, keyed like the server's field errors
assert.deepStrictEqual(blankNumbers({ ...pickup, charge: NaN }), ['charge']);
// Nested sections report dotted paths (shipping zones), empty strings are not numbers and are left alone
assert.deepStrictEqual(blankNumbers({ zones: { kerala: { land: { chargeBelow: NaN, eta: '' } } } }), ['zones.kerala.land.chargeBelow']);
assert.deepStrictEqual(blankNumbers({ a: 0, b: '', c: null, d: [1, NaN] }), ['d.1']);

console.log('✅ blankNumbers: a cleared number field (NaN -> null in JSON) is caught before the request (5 checks)');
