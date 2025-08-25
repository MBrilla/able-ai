import { NextRequest, NextResponse } from 'next/server';
import { findMatchingWorkers } from '@/actions/gigs/find-matching-workers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      gigLocation,
      gigDate,
      gigTime,
      maxDistance,
      minHourlyRate,
      maxHourlyRate,
      requiredSkills,
      limit
    } = body;

    // Validate required fields
    if (!gigLocation || !gigDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: gigLocation and gigDate' },
        { status: 400 }
      );
    }

    // Call the server action
    const result = await findMatchingWorkers({
      gigLocation,
      gigDate,
      gigTime,
      maxDistance,
      minHourlyRate,
      maxHourlyRate,
      requiredSkills,
      limit
    });

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to find matching workers' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API Error in find-matching-workers:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
