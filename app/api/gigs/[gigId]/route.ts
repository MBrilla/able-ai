import { NextRequest, NextResponse } from 'next/server';
import { getGigDetails } from '@/actions/gigs/get-gig-details';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gigId: string }> }
) {
  try {
    const { gigId } = await params;
    
    if (!gigId) {
      return NextResponse.json(
        { error: 'Gig ID is required' },
        { status: 400 }
      );
    }

    // For now, we'll need to get the user ID from the request
    // This is a simplified version - in production you'd get this from auth
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const result = await getGigDetails({
      gigId,
      userId,
      role: 'worker',
      isViewQA: false
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    // Transform the gig data to match the expected format for the amend page
    const gigData = {
      id: result.gig.id,
      gigDescription: result.gig.specialInstructions || '',
      gigDate: result.gig.date,
      gigTime: `${result.gig.startTime} - ${result.gig.endTime}`,
      hourlyRate: result.gig.hourlyRate,
      location: result.gig.location,
      statusInternal: result.gig.statusInternal,
      buyerId: result.gig.buyerName, // This might need adjustment
      workerId: result.gig.workerName || '', // This might need adjustment
    };

    return NextResponse.json(gigData);

  } catch (error) {
    console.error('Error fetching gig:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
