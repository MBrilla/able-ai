import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/drizzle/db';
import { RecommendationsTable } from '@/lib/drizzle/schema';

export async function GET() {
  try {
    // Test database connection by trying to query the recommendations table
    const count = await db.select().from(RecommendationsTable).limit(1);
    
    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      tableExists: true,
      count: count.length
    });
  } catch (error) {
    console.error("Database test error:", error);
    return NextResponse.json({
      success: false,
      message: "Database connection failed",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
