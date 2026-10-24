import { redirect } from 'next/navigation';

export default function CheckoutSettingsIndex() {
  redirect('/dashboard/checkout/shipping');
}
