# Matchmaking System for Gig Creation

## Overview

The matchmaking system automatically finds and displays workers that match a buyer's gig requirements before the gig is created. This allows buyers to see available workers and optionally pre-select one, while ensuring only workers within a reasonable distance (30km) can see and apply for the gig.

## Key Features

### 1. Location-Based Filtering
- **30km Radius**: Only workers within 30km of the gig location can see the gig
- **Coordinate Calculation**: Uses Haversine formula for accurate distance calculation
- **Automatic Filtering**: Workers outside the radius are automatically excluded from gig offers

### 2. Smart Matching Criteria
- **Availability**: Matches workers based on their availability for the specific date and time
- **Skills**: Can filter by required skills (optional)
- **Hourly Rate**: Can filter by minimum/maximum hourly rate (optional)
- **Response Rate**: Workers are sorted by response rate (higher is better)

### 3. Worker Selection
- **Pre-Selection**: Buyers can select a worker before creating the gig
- **Direct Assignment**: Selected worker is automatically assigned to the gig
- **Status Management**: Gig status is set appropriately based on worker selection

### 4. Availability Filtering
- **Recurring Patterns**: Checks worker availability patterns (e.g., "available Mondays 9-5")
- **Individual Slots**: Considers individual availability time slots
- **Time Overlap**: Ensures gig time overlaps with worker availability
- **Exclusion**: Workers without availability data are automatically excluded
- **JSON Storage**: Handles availability stored in both database tables and JSON fields

## Implementation Details

### Distance Calculation

The system uses the Haversine formula to calculate distances between coordinates:

```typescript
function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) * Math.cos(toRadians(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100;
}
```

### Database Queries

The system performs optimized database queries to find matching workers:

1. **Base Query**: Finds workers with coordinates and basic requirements
2. **Skills Join**: Optionally filters by required skills
3. **Availability Join**: Filters by day of week and time availability
4. **Distance Filtering**: Post-processes results to filter by 30km radius
5. **Sorting**: Orders by distance and response rate

### Availability Processing

The system handles multiple types of availability data:

#### 1. WorkerAvailabilityTable Records
- **Recurring Patterns**: Days array (e.g., ["monday", "wednesday", "friday"])
- **Time Ranges**: startTimeStr and endTimeStr (e.g., "09:00" to "17:00")
- **Individual Slots**: Specific startTime and endTime timestamps

#### 2. Profile availabilityJson
- **Structured Data**: JSON object with availability rules
- **Day Arrays**: List of available days
- **Time Constraints**: Start and end times for availability
- **Fallback**: Used when no explicit availability records exist

#### 3. Availability Logic
```typescript
// Check if worker is available for specific gig
function isWorkerAvailableForGig(availability, gigDate, startHour, endHour, dayName) {
  // 1. Check if worker is available on the gig day
  const hasDayAvailability = availability.days.includes(dayName);
  
  // 2. Check if gig time overlaps with worker availability
  const timeOverlap = startHour >= workerStartHour && endHour <= workerEndHour;
  
  return hasDayAvailability && timeOverlap;
}
```

#### 4. Filtering Process
1. **First Pass**: Query workers with coordinates and any availability data
2. **Second Pass**: Filter by explicit availability records (WorkerAvailabilityTable)
3. **Third Pass**: Check availabilityJson for workers without explicit records
4. **Final Filter**: Apply distance and rate constraints

### API Endpoints

- **POST** `/api/gigs/find-matching-workers`
  - Finds workers matching gig requirements
  - Returns sorted list of workers within 30km
  - Includes distance, skills, and availability information

## User Experience Flow

### 1. Gig Creation Process
1. Buyer fills out gig details (description, location, date, time, rate)
2. System automatically searches for matching workers
3. Matching workers are displayed in cards with selection options
4. Buyer can optionally select a worker
5. Gig is created with or without pre-selected worker

### 2. Worker Display
- **Worker Cards**: Show key information (name, bio, skills, rate, distance)
- **Selection**: Buyers can click to select a worker
- **Profile Links**: Direct links to worker profiles for more details
- **Responsive Design**: Works on both desktop and mobile devices

### 3. Distance Information
- **Clear Display**: Shows exact distance from gig location
- **Visual Indicators**: Color-coded distance information
- **Educational Notes**: Explains the 30km restriction

## Technical Architecture

### Components

1. **MatchingWorkersDisplay**: React component for displaying worker cards
2. **findMatchingWorkers**: Server action for database queries
3. **distanceUtils**: Utility functions for coordinate calculations
4. **API Route**: REST endpoint for worker matching

### Database Schema

The system uses these tables:
- `gig_worker_profiles`: Worker profile information and coordinates
- `skills`: Worker skills and rates
- `worker_availability`: Availability schedules
- `users`: Basic user information

### State Management

- **Selected Worker**: Tracks which worker (if any) is selected
- **Form Data**: Gig creation form data
- **Worker List**: Cached list of matching workers

## Configuration Options

### Distance Settings
- **Default Radius**: 30km (configurable)
- **Unit**: Kilometers (can be changed to miles if needed)

### Worker Limits
- **Default Limit**: 20 workers (configurable)
- **Pagination**: Show more/less workers option

### Filtering Options
- **Skills**: Array of required skill names
- **Rate Range**: Minimum and maximum hourly rates
- **Availability**: Specific date and time requirements

## Security Considerations

### Data Access
- **Worker Privacy**: Only shows public profile information
- **Location Privacy**: Coordinates are used only for distance calculation
- **Rate Information**: Shows agreed rates from worker profiles

### Authentication
- **API Protection**: All endpoints require authentication
- **User Validation**: Ensures buyers can only create gigs for themselves

## Future Enhancements

### 1. Advanced Matching
- **AI-Powered Matching**: Use machine learning for better worker-gig matching
- **Skill Weighting**: Prioritize workers with better skill matches
- **Historical Performance**: Consider worker ratings and completion rates

### 2. Communication Features
- **Direct Messaging**: Allow buyers to message workers before selection
- **Video Calls**: Schedule brief video interviews
- **Portfolio Review**: Browse worker portfolios and past work

### 3. Analytics
- **Matching Success Rates**: Track how often workers accept gigs
- **Distance Optimization**: Analyze optimal gig locations
- **Worker Performance**: Monitor worker reliability and quality

## Testing

The system includes comprehensive tests for:
- Distance calculations
- Coordinate extraction
- Boundary conditions
- Error handling

Run tests with:
```bash
npm test lib/utils/distanceUtils.test.ts
```

## Troubleshooting

### Common Issues

1. **No Workers Found**
   - Check if workers have coordinates in their profiles
   - Verify the 30km radius isn't too restrictive
   - Ensure workers have availability set for the gig date/time

2. **Distance Calculation Errors**
   - Verify coordinate format (lat/lng as numbers)
   - Check for invalid coordinate values
   - Ensure coordinates are in decimal degrees format

3. **Performance Issues**
   - Consider reducing the worker limit
   - Add database indexes on coordinates and availability
   - Implement caching for repeated searches

4. **Availability Issues**
   - **No Workers Available**: Workers haven't set their availability for the gig date/time
   - **Time Mismatch**: Gig time doesn't overlap with worker availability windows
   - **Day Mismatch**: Gig is on a day when workers aren't available
   - **Missing Data**: Workers haven't completed their availability setup
   - **Data Format**: Availability data is stored in unexpected format

### Debug Mode

Enable debug logging by setting environment variables:
```bash
DEBUG_MATCHMAKING=true
DEBUG_DISTANCE_CALC=true
DEBUG_AVAILABILITY=true
```

The system will log:
- Number of workers found at each filtering stage
- Availability checking results
- Distance calculation details
- Final worker count and reasons for exclusion

## Support

For technical support or questions about the matchmaking system, please refer to:
- API documentation
- Database schema documentation
- Component library documentation
