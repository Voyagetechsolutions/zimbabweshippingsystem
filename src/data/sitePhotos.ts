/**
 * Curated imagery used across the public marketing pages.
 *
 * Keep the file names descriptive so each page can select an image that
 * matches the service being described. The five featured operations images
 * live in /public/images/operations and are optimised JPEGs for fast loading.
 */

export interface SitePhoto {
  src: string;
  alt: string;
  caption: string;
}

const operation = (fileName: string) => `/images/operations/${fileName}`;
const legacy = (id: string) => `/lovable-uploads/${id}.png`;

export const photos = {
  /** Warehouse team loading drums into a shipping container. */
  containerLoading: {
    src: operation('warehouse-container-loading.jpg'),
    alt: 'Zimbabwe Shipping team loading sealed drums into a container',
    caption: 'Careful container loading by our warehouse team.',
  },
  /** Team moving a sealed shipping drum through the warehouse. */
  drumWarehouse: {
    src: operation('drum-loading-team.jpg'),
    alt: 'Zimbabwe Shipping warehouse team moving a sealed blue drum',
    caption: 'Drums handled carefully from our warehouse to the container.',
  },
  /** Customer collection details being checked before loading. */
  applianceCollection: {
    src: operation('customer-collection-check-in.jpg'),
    alt: 'Zimbabwe Shipping team confirming a customer collection',
    caption: 'Every collection is checked and recorded before shipping.',
  },
  /** Team loading drums safely over a container ramp. */
  vanPacked: {
    src: operation('container-ramp-loading.jpg'),
    alt: 'Zimbabwe Shipping team loading drums safely into a container',
    caption: 'Safe loading procedures protect your shipment throughout its journey.',
  },
  /** Commercial customer handover at the warehouse. */
  vanLoaded: {
    src: operation('customer-commercial-handover.jpg'),
    alt: 'Zimbabwe Shipping team completing a commercial customer handover',
    caption: 'A clear, professional handover for every customer.',
  },
  /** Customer shipment check-in beside sealed drums. */
  warehouseMarked: {
    src: operation('customer-collection-check-in.jpg'),
    alt: 'Customer shipment being checked in beside sealed shipping drums',
    caption: 'Collection details confirmed before goods enter our network.',
  },
  /** Container loading for commercial and specialist goods. */
  machineryLoading: {
    src: operation('warehouse-container-loading.jpg'),
    alt: 'Warehouse team loading commercial goods for Zimbabwe',
    caption: 'From single drums to commercial consignments, we load with care.',
  },
  /** Bicycles prepared for shipping. */
  bikes: {
    src: legacy('14353843-5722-4925-ae94-9139b2b90e3b'),
    alt: 'Bicycles prepared for shipping to Zimbabwe',
    caption: 'Bikes, prepared and ready to travel.',
  },
} satisfies Record<string, SitePhoto>;

/** The five new operations images, in the order used by the homepage gallery. */
export const featuredOperations: SitePhoto[] = [
  photos.containerLoading,
  photos.drumWarehouse,
  photos.vanPacked,
  photos.vanLoaded,
  photos.applianceCollection,
];

/** A broader hand-picked reel for other galleries and collages. */
export const photoReel: SitePhoto[] = [
  ...featuredOperations,
  photos.bikes,
];
