import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed-data';

export async function POST() {
  try {
    const merchant = await seedDatabase();
    return NextResponse.json({
      success: true,
      message: 'Demonstration environment successfully reset to default College Stationery Shop fixture.',
      fixtureDetails: {
        shop: merchant.name,
        productsCount: 15,
        suppliers: ['Supplier A (Stationery Hub)', 'Supplier B (Metro Papers)'],
        a3SketchbookStock: 0,
        a3CustomerConfirmedDemand: 12,
        defaultBudget: '₹1,000.00',
      },
    });
  } catch (error: any) {
    console.error('Error resetting database:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset demonstration fixture' },
      { status: 500 }
    );
  }
}
