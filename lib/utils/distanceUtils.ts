/**
 * Utility functions for calculating distances between geographic coordinates
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @returns Distance in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) * Math.cos(toRadians(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if two coordinates are within a specified distance
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @param maxDistance Maximum distance in kilometers
 * @returns True if coordinates are within the specified distance
 */
export function isWithinDistance(
  coord1: Coordinates, 
  coord2: Coordinates, 
  maxDistance: number
): boolean {
  return calculateDistance(coord1, coord2) <= maxDistance;
}

/**
 * Extract coordinates from various location formats
 * @param location Location data (can be string, object with lat/lng, or coordinates string)
 * @returns Coordinates object or null if invalid
 */
export function extractCoordinates(location: any): Coordinates | null {
  if (!location) return null;
  
  // If it's already a coordinates object
  if (typeof location === 'object' && location.lat && location.lng) {
    const lat = parseFloat(location.lat);
    const lng = parseFloat(location.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  
  // If it's a coordinates string like "51.5074,-0.1278"
  if (typeof location === 'string') {
    const coordsMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordsMatch) {
      const lat = parseFloat(coordsMatch[1]);
      const lng = parseFloat(coordsMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }
  
  return null;
}
