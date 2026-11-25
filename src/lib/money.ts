/** Rupees for order views: Indian grouping, whole amounts without decimals, otherwise exactly 2 (₹30.50, never ₹30.5). */
export const inr = (n: number | null | undefined): string => {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "₹0";
  const whole = Math.abs(v - Math.round(v)) < 0.005;
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 })}`;
};

/** Items total for orders saved before subtotal existed: the stored line subtotals (price x qty), never derived from the total. */
export const itemsSubtotal = (items: { subtotal?: number; price?: number; quantity?: number }[] = []): number =>
  Math.round(items.reduce((a, i) => a + (typeof i.subtotal === "number" ? i.subtotal : (i.price ?? 0) * (i.quantity ?? 0)), 0) * 100) / 100;
