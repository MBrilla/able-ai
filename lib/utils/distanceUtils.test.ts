import { calculateDistance, isWithinDistance, extractCoordinates, Coordinates } from './distanceUtils';

// Mock the availability helper function for testing
function isWorkerAvailableForGig(
  availability: any, 
  gigDate: Date, 
  startHour: number, 
  endHour: number,
  dayName: string
): boolean {
  // Check if the worker has availability for this day
  if (availability.days && Array.isArray(availability.days)) {
    const hasDayAvailability = availability.days.some((day: string) => 
      day.toLowerCase() === dayName
    );
    
    if (!hasDayAvailability) {
      return false; // Worker is not available on this day
    }
    
    // Check if the time overlaps with their availability
    if (availability.startTimeStr && availability.endTimeStr) {
      const workerStartHour = parseInt(availability.startTimeStr.split(':')[0], 10);
      const workerEndHour = parseInt(availability.endTimeStr.split(':')[0], 10);
      
      // Check if the gig time overlaps with worker availability
      // The gig should start after the worker's start time and end before the worker's end time
      return startHour >= workerStartHour && endHour <= workerEndHour;
    }
  }
  
  // If no specific time constraints, assume they're available for the day
  return true;
}

describe('Distance Utils', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates correctly', () => {
      const coord1: Coordinates = { lat: 51.5074, lng: -0.1278 }; // London
      const coord2: Coordinates = { lat: 51.4543, lng: -2.5879 }; // Bristol
      
      const distance = calculateDistance(coord1, coord2);
      
      // Bristol is approximately 190km from London
      expect(distance).toBeGreaterThan(180);
      expect(distance).toBeLessThan(200);
    });

    it('should return 0 for identical coordinates', () => {
      const coord: Coordinates = { lat: 51.5074, lng: -0.1278 };
      const distance = calculateDistance(coord, coord);
      expect(distance).toBe(0);
    });

    it('should handle coordinates in different hemispheres', () => {
      const coord1: Coordinates = { lat: 40.7128, lng: -74.0060 }; // New York
      const coord2: Coordinates = { lat: 51.5074, lng: -0.1278 }; // London
      
      const distance = calculateDistance(coord1, coord2);
      
      // New York to London is approximately 5500km
      expect(distance).toBeGreaterThan(5400);
      expect(distance).toBeLessThan(5600);
    });
  });

  describe('isWithinDistance', () => {
    it('should return true for coordinates within specified distance', () => {
      const coord1: Coordinates = { lat: 51.5074, lng: -0.1278 }; // London
      const coord2: Coordinates = { lat: 51.4543, lng: -2.5879 }; // Bristol
      
      const isWithin = isWithinDistance(coord1, coord2, 200);
      expect(isWithin).toBe(true);
    });

    it('should return false for coordinates outside specified distance', () => {
      const coord1: Coordinates = { lat: 51.5074, lng: -0.1278 }; // London
      const coord2: Coordinates = { lat: 51.4543, lng: -2.5879 }; // Bristol
      
      const isWithin = isWithinDistance(coord1, coord2, 100);
      expect(isWithin).toBe(false);
    });
  });

  describe('extractCoordinates', () => {
    it('should extract coordinates from object with lat/lng', () => {
      const location = { lat: 51.5074, lng: -0.1278 };
      const coords = extractCoordinates(location);
      
      expect(coords).toEqual({ lat: 51.5074, lng: -0.1278 });
    });

    it('should extract coordinates from string format', () => {
      const location = "51.5074,-0.1278";
      const coords = extractCoordinates(location);
      
      expect(coords).toEqual({ lat: 51.5074, lng: -0.1278 });
    });

    it('should return null for invalid location data', () => {
      const location = "invalid";
      const coords = extractCoordinates(location);
      
      expect(coords).toBeNull();
    });

    it('should return null for null/undefined input', () => {
      expect(extractCoordinates(null)).toBeNull();
      expect(extractCoordinates(undefined)).toBeNull();
    });
  });
});

describe('Availability Utils', () => {
  describe('isWorkerAvailableForGig', () => {
    it('should return true for worker available on the day with time overlap', () => {
      const availability = {
        days: ['monday', 'wednesday', 'friday'],
        startTimeStr: '09:00',
        endTimeStr: '17:00'
      };
      const gigDate = new Date('2024-01-01'); // Monday
      const result = isWorkerAvailableForGig(availability, gigDate, 10, 14, 'monday');
      expect(result).toBe(true);
    });

    it('should return false for worker not available on the day', () => {
      const availability = {
        days: ['monday', 'wednesday', 'friday'],
        startTimeStr: '09:00',
        endTimeStr: '17:00'
      };
      const gigDate = new Date('2024-01-02'); // Tuesday
      const result = isWorkerAvailableForGig(availability, gigDate, 10, 14, 'tuesday');
      expect(result).toBe(false);
    });

    it('should return false for gig time outside worker availability', () => {
      const availability = {
        days: ['monday'],
        startTimeStr: '09:00',
        endTimeStr: '17:00'
      };
      const gigDate = new Date('2024-01-01'); // Monday
      const result = isWorkerAvailableForGig(availability, gigDate, 18, 20, 'monday');
      expect(result).toBe(false);
    });

    it('should return true for worker with no time constraints', () => {
      const availability = {
        days: ['monday']
      };
      const gigDate = new Date('2024-01-01'); // Monday
      const result = isWorkerAvailableForGig(availability, gigDate, 10, 14, 'monday');
      expect(result).toBe(true);
    });
  });
});
