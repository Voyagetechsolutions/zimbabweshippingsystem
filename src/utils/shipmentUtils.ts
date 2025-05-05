
import { Shipment } from '@/types/shipment';

/**
 * Converts a database shipment record to a properly typed Shipment object
 * by extracting carrier, weight, dimensions, and estimated_delivery from metadata
 */
export function castToShipment(shipment: any): Shipment {
  if (!shipment) return null as unknown as Shipment;

  const metadata = shipment.metadata || {};
  
  return {
    ...shipment,
    carrier: metadata.carrier || null,
    weight: metadata.weight || null,
    dimensions: metadata.dimensions || null,
    estimated_delivery: metadata.estimatedDelivery || null,
    // Make sure profiles data is preserved if it exists
    profiles: shipment.profiles || null
  };
}

/**
 * Converts an array of database shipment records to properly typed Shipment objects
 */
export function castToShipments(shipments: any[]): Shipment[] {
  if (!shipments || !Array.isArray(shipments)) return [];
  return shipments.map(castToShipment);
}
