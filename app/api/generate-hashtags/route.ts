import { NextRequest, NextResponse } from 'next/server';
import { geminiAIAgent } from '@/lib/firebase/ai';
import { Schema } from '@firebase/ai';

const TypedSchema = Schema as any;

export async function POST(request: NextRequest) {
  try {
    console.log('API route called - starting hashtag generation');
    
    const { profileData } = await request.json();
    console.log('Received profile data:', { 
      about: profileData.about ? 'present' : 'missing',
      experience: profileData.experience ? 'present' : 'missing',
      skills: profileData.skills ? 'present' : 'missing',
      equipment: profileData.equipment ? `${profileData.equipment.length} items` : 'none',
      location: profileData.location ? 'present' : 'missing'
    });

    if (!profileData) {
      console.log('Missing profile data');
      return NextResponse.json(
        { ok: false, error: 'Missing profile data' },
        { status: 400 }
      );
    }

    const prompt = `You are an AI assistant that generates professional hashtags for gig workers based on their profile information.

Based on the following worker profile data, generate exactly 3 relevant, professional hashtags that would help with job matching and discoverability.

Profile Data:
- About: ${profileData.about || 'Not provided'}
- Experience: ${profileData.experience || 'Not provided'}
- Skills: ${profileData.skills || 'Not provided'}
- Equipment: ${profileData.equipment?.map((e: any) => e.name).join(', ') || 'Not provided'}
- Location: ${typeof profileData.location === 'string' ? profileData.location : 'Not provided'}

Rules:
1. Generate exactly 3 hashtags (no more, no less)
2. Use professional, industry-standard terms
3. Focus on skills, experience level, and specializations
4. Use hashtag format (e.g., "#bartender", "#mixology", "#events")
5. Make them relevant to hospitality, events, and gig work
6. Avoid generic terms like "#work" or "#job"
7. Consider the worker's experience level and equipment

Examples of good hashtags:
- For bartenders: "#bartender", "#mixology", "#cocktails"
- For chefs: "#chef", "#cooking", "#catering"
- For event staff: "#events", "#hospitality", "#customer-service"

Generate 3 relevant hashtags for this worker:`;

    console.log('Calling Gemini AI agent for hashtag generation...');
    const result = await geminiAIAgent(
      "gemini-2.0-flash",
      {
        prompt,
        responseSchema: TypedSchema.object({
          properties: {
            hashtags: TypedSchema.array(TypedSchema.string(), {
              maxItems: 3,
              minItems: 1
            })
          },
          required: ["hashtags"],
          additionalProperties: false
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
      
      const data = aiResponse as { hashtags: string[] };
      console.log('✅ Generated hashtags:', data.hashtags);
      
      return NextResponse.json({ ok: true, hashtags: data.hashtags });
    } else {
      console.error('AI hashtag generation failed:', result);
      // Return fallback hashtags instead of failing
      console.log('Using fallback hashtags due to AI failure');
      const fallbackHashtags = [
        `#${profileData.skills?.split(',')[0]?.trim().toLowerCase().replace(/\s+/g, '-') || 'worker'}`,
        `#${profileData.about?.split(' ')[0]?.toLowerCase() || 'professional'}`,
        '#gig-worker'
      ];
      return NextResponse.json({ ok: true, hashtags: fallbackHashtags });
    }

  } catch (error) {
    console.error('Error in hashtag generation API:', error);
    // Use fallback hashtags instead of failing
    console.log('Using fallback hashtags due to API error');
    try {
      const { profileData } = await request.json();
      const fallbackHashtags = [
        `#${profileData.skills?.split(',')[0]?.trim().toLowerCase().replace(/\s+/g, '-') || 'worker'}`,
        `#${profileData.about?.split(' ')[0]?.toLowerCase() || 'professional'}`,
        '#gig-worker'
      ];
      return NextResponse.json({ ok: true, hashtags: fallbackHashtags });
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return NextResponse.json(
        { ok: false, error: 'Hashtag generation service unavailable' },
        { status: 500 }
      );
    }
  }
}
