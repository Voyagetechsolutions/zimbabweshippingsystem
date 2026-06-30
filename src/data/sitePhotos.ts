/**
 * Curated, real photographs of Zimbabwe Shipping operations.
 * These are genuine photos of our team, vans, warehouse and containers —
 * not stock or AI imagery. Referenced by meaningful names so the marketing
 * pages stay readable and we always place the right shot in the right spot.
 *
 * Files live in /public/lovable-uploads and are served from the site root.
 */

export interface SitePhoto {
  src: string;
  alt: string;
  caption: string;
}

const u = (id: string) => `/lovable-uploads/${id}.png`;

export const photos = {
  /** Our team loading a 40ft container with a forklift in the UK — the hero shot. */
  containerLoading: {
    src: u('0ec045d2-2876-4b1c-8d50-24a1d290bc35'),
    alt: 'Zimbabwe Shipping team loading a 40ft container by forklift in the UK',
    caption: 'Loading a 40ft container for Zimbabwe — our own team, our own hands.',
  },
  /** Warehouse stacked with colour-coded shipping drums and wrapped pallets. */
  drumWarehouse: {
    src: u('4f20ce47-cd85-486a-9872-1b0448390358'),
    alt: 'Shipping drums and wrapped pallets ready to ship in our UK warehouse',
    caption: 'Drums sealed, labelled and ready in our warehouse.',
  },
  /** Beko appliances collected from a UK address, ready for the van. */
  applianceCollection: {
    src: u('003989bd-8fb2-4a3f-bee1-97723875dd54'),
    alt: 'New appliances collected from a UK address for shipping to Zimbabwe',
    caption: 'Appliances collected from a customer doorstep in the UK.',
  },
  /** Van fully packed with shrink-wrapped goods for collection. */
  vanPacked: {
    src: u('0027003d-7b3b-482d-82a2-9cc4877b58b6'),
    alt: 'Collection van packed with shrink-wrapped goods bound for Zimbabwe',
    caption: 'Free collection — packed and secured at your door.',
  },
  /** Van loaded with boxes and a red drum, including a branded bag. */
  vanLoaded: {
    src: u('288d0f20-90b3-401c-be86-ac3405522ca9'),
    alt: 'Boxes, a barrel and bags loaded into a collection van',
    caption: 'Boxes, barrels and bags — we ship it all.',
  },
  /** Warehouse drums wrapped and chalk-marked with Bulawayo destinations. */
  warehouseMarked: {
    src: u('19918789-af89-4bda-ada9-84f82ee92d06'),
    alt: 'Wrapped consignments chalk-marked with Zimbabwe destinations in our warehouse',
    caption: 'Every consignment marked for its final city.',
  },
  /** Heavy machinery being loaded into a container. */
  machineryLoading: {
    src: u('1603c7ce-5777-4673-9c75-28f97df83aeb'),
    alt: 'Industrial machinery being loaded into a shipping container',
    caption: 'From a single drum to heavy machinery.',
  },
  /** Bicycles prepared for shipping. */
  bikes: {
    src: u('14353843-5722-4925-ae94-9139b2b90e3b'),
    alt: 'Bicycles prepared for shipping to Zimbabwe',
    caption: 'Bikes, prepped and ready to travel.',
  },
} satisfies Record<string, SitePhoto>;

/** A hand-picked reel for galleries / collages. */
export const photoReel: SitePhoto[] = [
  photos.containerLoading,
  photos.drumWarehouse,
  photos.applianceCollection,
  photos.vanPacked,
  photos.warehouseMarked,
  photos.vanLoaded,
  photos.machineryLoading,
  photos.bikes,
];
