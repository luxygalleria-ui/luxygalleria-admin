'use client';

import CollectionManager from '../../../components/CollectionManager';

export default function NewArrivalsPage() {
  return (
    <CollectionManager
      label="New Arrivals"
      storefrontPath="/new-arrivals"
      flag="isNewArrival"
      orderField="newArrivalOrder"
      saveEndpoint="/products/new-arrivals"
      titleKey="newArrivalsTitle"
      subtitleKey="newArrivalsSubtitle"
      titlePlaceholder="New Arrivals"
      subtitlePlaceholder="The latest additions to the collection."
      excludeFlag="isGifting"
    />
  );
}
