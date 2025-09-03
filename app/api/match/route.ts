import { NextRequest, NextResponse } from 'next/server';
import { geminiAIAgent } from '@/lib/firebase/ai';
import { Schema } from '@firebase/ai';

const TypedSchema = Schema as any;

// Fallback matching function for when AI is unavailable
function createFallbackMatches(gigContext: any, workerData: any[]): any[] {
  const gigTitle = (gigContext.title || '').toLowerCase();
  const gigDescription = (gigContext.description || '').toLowerCase();
  const gigText = `${gigTitle} ${gigDescription}`;
  const gigRate = gigContext.hourlyRate || 0;

  return workerData.map(worker => {
    const primarySkill = worker.skills?.[0]?.name || '';
    const experience = parseFloat(worker.skills?.[0]?.experienceYears || '0');
    const rate = parseFloat(worker.skills?.[0]?.agreedRate || '0');
    const bio = (worker.bio || '').toLowerCase();
    
    let matchScore = 50; // Base score
    const reasons = [];

    // Skill relevance scoring
    if (primarySkill) {
      const skillLower = primarySkill.toLowerCase();
      // Direct matches (high score)
      if (gigText.includes('baker') && (skillLower.includes('baker') || skillLower.includes('cake') || skillLower.includes('pastry'))) {
        matchScore += 30;
        reasons.push(`Direct ${primarySkill} experience`);
      } else if (gigText.includes('chef') && (skillLower.includes('chef') || skillLower.includes('cook'))) {
        matchScore += 30;
        reasons.push(`Direct ${primarySkill} experience`);
      } else if (gigText.includes('server') && (skillLower.includes('server') || skillLower.includes('waiter') || skillLower.includes('bartender'))) {
        matchScore += 30;
        reasons.push(`Direct ${primarySkill} experience`);
      } else if (gigText.includes('bartender') && (skillLower.includes('bartender') || skillLower.includes('mixologist'))) {
        matchScore += 30;
        reasons.push(`Direct ${primarySkill} experience`);
      }
      // Related matches (medium score)
      else if (gigText.includes('baker') && (skillLower.includes('chef') || skillLower.includes('cook'))) {
        matchScore += 20;
        reasons.push(`Related ${primarySkill} experience`);
      } else if (gigText.includes('server') && (skillLower.includes('chef') || skillLower.includes('cook'))) {
        matchScore += 15;
        reasons.push(`Related ${primarySkill} experience`);
      } else if (gigText.includes('bartender') && (skillLower.includes('server') || skillLower.includes('waiter'))) {
        matchScore += 20;
        reasons.push(`Related ${primarySkill} experience`);
      }
      // Generic matches (low score)
      else {
        matchScore += 10;
        reasons.push(`Experienced in ${primarySkill}`);
      }
    }

    // Bio relevance scoring
    if (bio) {
      if (gigText.includes('baker') && (bio.includes('baker') || bio.includes('cake') || bio.includes('pastry'))) {
        matchScore += 15;
        reasons.push('Bio mentions relevant experience');
      } else if (gigText.includes('chef') && (bio.includes('chef') || bio.includes('cook'))) {
        matchScore += 15;
        reasons.push('Bio mentions relevant experience');
      } else if (gigText.includes('server') && (bio.includes('server') || bio.includes('waiter') || bio.includes('bartender'))) {
        matchScore += 15;
        reasons.push('Bio mentions relevant experience');
      } else if (gigText.includes('bartender') && (bio.includes('bartender') || bio.includes('mixologist'))) {
        matchScore += 15;
        reasons.push('Bio mentions relevant experience');
      }
    }

    // Experience scoring
    if (experience > 0) {
      if (experience >= 5) {
        matchScore += 15;
        reasons.push(`${experience} years of experience`);
      } else if (experience >= 2) {
        matchScore += 10;
        reasons.push(`${experience} years of experience`);
      } else {
        matchScore += 5;
        reasons.push(`${experience} years of experience`);
      }
    }

    // Rate compatibility scoring
    if (rate > 0 && gigRate > 0) {
      const rateDiff = Math.abs(rate - gigRate);
      const ratePercent = (rateDiff / gigRate) * 100;
      
      if (ratePercent <= 20) {
        matchScore += 10;
        reasons.push(`Rate matches budget (£${rate}/hour)`);
      } else if (ratePercent <= 50) {
        matchScore += 5;
        reasons.push(`Rate within range (£${rate}/hour)`);
      } else if (rate < gigRate) {
        matchScore += 3;
        reasons.push(`Competitive rate (£${rate}/hour)`);
      }
    }

    // Location scoring (if available)
    if (worker.location && worker.location !== 'Colombia' && worker.location !== 'Ethiopia') {
      matchScore += 5;
      reasons.push(`Located in ${worker.location}`);
    }

    // Cap the score at 100
    matchScore = Math.min(matchScore, 100);

    // If no specific reasons, add generic ones
    if (reasons.length === 0) {
      reasons.push('Available for work', 'Professional service provider');
    }

    return {
      workerId: worker.workerId,
      workerName: worker.workerName,
      matchScore: Math.round(matchScore),
      matchReasons: reasons.slice(0, 3), // Limit to 3 reasons
      availability: worker.availability,
      skills: worker.skills,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('API route called - starting matchmaking');
    
    const { gigContext, workerData } = await request.json();
    console.log('Received data:', { 
      gigContext: gigContext ? 'present' : 'missing', 
      workerData: workerData ? `${workerData.length} workers` : 'missing' 
    });

    // Clean and optimize the data for Gemini
    const cleanGigContext = {
      title: gigContext.title,
      description: gigContext.description || 'No description provided',
      location: gigContext.location || 'Location not specified',
      startTime: gigContext.startTime,
      endTime: gigContext.endTime,
      hourlyRate: gigContext.hourlyRate,
      additionalRequirements: gigContext.additionalRequirements || 'None'
    };

    // Limit to top 20 workers to prevent oversized payloads
    const limitedWorkerData = workerData.slice(0, 20);
    console.log(`Processing ${limitedWorkerData.length} workers (limited from ${workerData.length} total)`);
    
    const cleanWorkerData = limitedWorkerData.map((worker: any) => ({
      workerId: worker.workerId,
      workerName: worker.workerName,
      location: worker.location,
      bio: worker.bio ? worker.bio.substring(0, 200) : '', // Limit bio length
      skills: worker.skills?.map((skill: any) => ({
        name: skill.name,
        experienceYears: skill.experienceYears,
        agreedRate: skill.agreedRate
      })) || [],
      availability: worker.availability?.map((avail: any) => ({
        dayOfWeek: avail.dayOfWeek,
        startTime: avail.startTime,
        endTime: avail.endTime
      })) || []
    }));

    // Log payload size
    const payloadSize = JSON.stringify({ cleanGigContext, cleanWorkerData }).length;
    console.log(`Payload size: ${payloadSize} characters`);
    
    if (payloadSize > 30000) {
      console.warn('Payload is large, may cause Gemini issues');
    }

    if (!gigContext || !workerData) {
      console.log('Missing required data');
      return NextResponse.json(
        { ok: false, error: 'Missing gig context or worker data' },
        { status: 400 }
      );
    }

    const prompt = `You are an AI matchmaking assistant for a gig platform. Your job is to intelligently analyze workers and find the best matches for a specific gig.

IMPORTANT: All workers provided have already been pre-filtered to meet these basic requirements:
- Location: Within 30km of the gig location
- Skills: Have at least one skill listed
- Availability: Available during the gig time period

GIG CONTEXT:
- Title: ${cleanGigContext.title}
- Description: ${cleanGigContext.description}
- Location: ${cleanGigContext.location}
- Date/Time: ${cleanGigContext.startTime} to ${cleanGigContext.endTime}
- Hourly Rate: £${cleanGigContext.hourlyRate}
- Additional Requirements: ${cleanGigContext.additionalRequirements}

WORKERS TO ANALYZE (all within 30km, have skills, and are available during gig time):
${JSON.stringify(cleanWorkerData, null, 2)}

YOUR TASK: Use your intelligence to determine which workers are good matches for this gig. Consider:

1. **Skill Relevance & Transferability**: 
   - Related/transferable skills (e.g., "waiter" for server gigs, "chef" for cooking gigs)
   - Cross-industry skills that could apply (e.g., customer service skills for hospitality roles)

2. **Experience Level Appropriateness**:
   - Match experience level to gig complexity
   - Consider if someone with different but related experience could adapt
   - Entry-level vs senior role requirements

3. **Rate Compatibility**:
   - Compare worker rates to gig rate
   - Consider if rate differences are reasonable
   - Factor in experience level vs rate
   - IMPORTANT: London minimum wage is £12.21/hour - all rates must be at least this amount

4. **Professional Fit**:
   - Overall profile alignment
   - Work style compatibility
   - Specialized requirements

SCORING RULES:
- Score range: 0-100
- 90-100: Perfect match (exact skills, ideal experience, great rate fit)
- 80-89: Excellent match (very relevant skills, good experience, reasonable rate)
- 70-79: Good match (related skills, adequate experience, acceptable rate)
- 60-69: Fair match (some relevant skills, could work with training)
- 50-59: Poor match (minimal relevance, significant gaps)
- Below 50: Not recommended (not suitable for this gig)

For each worker, provide:
1. matchScore: A number between 0-100
2. matchReasons: An array of 2-4 specific reasons why this worker is a good match (or why they're not)

Return ONLY a JSON array of worker matches with this exact structure:
[
  {
    "workerId": "worker-uuid",
    "workerName": "Worker Name",
    "matchScore": 85,
    "matchReasons": ["Has relevant bartending experience", "Rate is within budget", "Available on weekends"]
  }
]

Be intelligent and thoughtful about matches. Consider transferable skills and related professions. A "server" gig could match waiters, bartenders, or even retail workers with customer service experience.`;

    console.log('Calling Gemini AI agent...');
    const result = await geminiAIAgent(
      "gemini-2.0-flash",
      {
        prompt,
        responseSchema: TypedSchema.object({
          properties: {
            matches: TypedSchema.array(TypedSchema.object({
              properties: {
                workerId: TypedSchema.string(),
                workerName: TypedSchema.string(),
                matchScore: TypedSchema.number(),
                matchReasons: TypedSchema.array(TypedSchema.string()),
              },
              required: ["workerId", "workerName", "matchScore", "matchReasons"],
            })),
          },
          required: ["matches"],
        }),
        isStream: false,
      },
      null // No injected AI for server-side calls
    );

    console.log('AI agent result:', { ok: result.ok, hasData: result.ok ? !!result.data : false, error: result.ok ? null : result.error });

    if (result.ok && result.data) {
      // Parse the JSON response from AI
      let aiResponse;
      try {
        aiResponse = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
      } catch (error) {
        console.error('Failed to parse AI response:', error);
        throw new Error('Invalid AI response format');
      }
      
      const data = aiResponse as { matches: any[] };
      
      // Merge AI results with original worker data
      const matches = data.matches.map(aiMatch => {
        const originalWorker = workerData.find((w: any) => w.workerId === aiMatch.workerId);
        return {
          ...aiMatch,
          availability: originalWorker?.availability || [],
          skills: originalWorker?.skills || [],
        };
      });

      return NextResponse.json({ ok: true, matches });
    } else {
      console.error('AI matchmaking failed:', result);
      // Return fallback matches instead of failing
      console.log('Using fallback matching due to AI failure');
      const fallbackMatches = createFallbackMatches(cleanGigContext, cleanWorkerData);
      return NextResponse.json({ ok: true, matches: fallbackMatches });
    }

  } catch (error) {
    console.error('Error in AI matchmaking API:', error);
    // Use fallback matching instead of failing
    console.log('Using fallback matching due to API error');
    try {
      const { gigContext, workerData } = await request.json();
      const cleanGigContext = {
        title: gigContext.title,
        description: gigContext.description || 'No description provided',
        location: gigContext.location || 'Location not specified',
        startTime: gigContext.startTime,
        endTime: gigContext.endTime,
        hourlyRate: gigContext.hourlyRate,
        additionalRequirements: gigContext.additionalRequirements || 'None'
      };
      const cleanWorkerData = workerData.map((worker: any) => ({
        workerId: worker.workerId,
        workerName: worker.workerName,
        location: worker.location,
        bio: worker.bio ? worker.bio.substring(0, 200) : '',
        skills: worker.skills || [],
        availability: worker.availability || []
      }));
      const fallbackMatches = createFallbackMatches(cleanGigContext, cleanWorkerData);
      return NextResponse.json({ ok: true, matches: fallbackMatches });
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return NextResponse.json(
        { ok: false, error: 'Matchmaking service unavailable' },
        { status: 500 }
      );
    }
  }
}
