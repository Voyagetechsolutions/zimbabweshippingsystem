
import { Shipment } from '@/types/shipment';

/**
 * Cast database shipment data to the Shipment type
 * This utility helps extract metadata fields into top-level properties
 */
export function castToShipment(shipmentData: any): Shipment {
  if (!shipmentData) return null as unknown as Shipment;
  
  const metadata = typeof shipmentData.metadata === 'object' ? shipmentData.metadata : {};
  
  return {
    ...shipmentData,
    carrier: metadata.carrier || null,
    weight: metadata.weight || null,
    dimensions: metadata.dimensions || null,
    estimated_delivery: metadata.estimatedDelivery || null,
  } as Shipment;
}

/**
 * Cast an array of database shipment data to Shipment[]
 */
export function castToShipments(shipmentDataArray: any[]): Shipment[] {
  if (!Array.isArray(shipmentDataArray)) return [];
  return shipmentDataArray.map(castToShipment);
}
