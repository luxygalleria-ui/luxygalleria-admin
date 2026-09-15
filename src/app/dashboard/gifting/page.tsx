'use client';

import CollectionManager from '../../../components/CollectionManager';

export default function GiftingPage() {
  return (
    <CollectionManager
      label="Gifting"
      storefrontPath="/gifting"
      flag="isGifting"
      orderField="giftingOrder"
      saveEndpoint="/products/gifting"
      titleKey="giftingTitle"
      subtitleKey="giftingSubtitle"
      titlePlaceholder="Gifting"
      subtitlePlaceholder="Curated picks, ready to be wrapped."
      addHint="Gifting is exclusive: adding a New Arrivals product here removes it from New Arrivals."
    />
  );
}
