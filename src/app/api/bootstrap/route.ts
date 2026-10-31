import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let merchant = await prisma.merchant.findFirst({
      include: {
        products: {
          orderBy: { name: 'asc' },
        },
        suppliers: true,
      },
    });

    if (!merchant) {
      const { seedDatabase } = await import('@/lib/seed-data');
      await seedDatabase();
      merchant = await prisma.merchant.findFirst({
        include: {
          products: {
            orderBy: { name: 'asc' },
          },
          suppliers: true,
        },
      });
    }

    if (!merchant) {
      return NextResponse.json({ error: 'Failed to initialize merchant state' }, { status: 500 });
    }

    // Today's boundaries in local time
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [todaySales, pendingDemand, recentQuotes, recentOrders, recentMovements] = await Promise.all([
      prisma.sale.findMany({
        where: {
          merchantId: merchant.id,
          createdAt: { gte: startOfToday },
        },
        include: { lines: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.demandRequest.findMany({
        where: { merchantId: merchant.id, status: 'PENDING' },
        include: { product: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplierQuote.findMany({
        where: { merchantId: merchant.id },
        include: { supplier: true, product: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchaseOrder.findMany({
        where: { merchantId: merchant.id },
        include: { supplier: true, product: true, outcomes: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockMovement.findMany({
        where: { merchantId: merchant.id },
        include: { product: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    const totalSalesTodayPaise = todaySales.reduce((acc, s) => acc + s.totalAmountPaise, 0);

    return NextResponse.json({
      merchant,
      stats: {
        todaySalesCount: todaySales.length,
        todaySalesTotalPaise: totalSalesTodayPaise,
        availableBudgetPaise: merchant.availableBudgetPaise,
        pendingDemandCount: pendingDemand.length,
        quotesCount: recentQuotes.length,
        ordersCount: recentOrders.length,
      },
      products: merchant.products,
      suppliers: merchant.suppliers,
      todaySales,
      pendingDemand,
      recentQuotes,
      recentOrders,
      recentMovements,
    });
  } catch (error) {
    console.error('Error in GET /api/bootstrap:', error);
    return NextResponse.json({ error: 'Failed to load merchant state' }, { status: 500 });
  }
}
