import { test, expect } from '@playwright/test';

test.describe('Munafa AI — End-to-End Critical Merchant Journey', () => {
  test.beforeEach(async ({ request }) => {
    // Reset DB to standard demonstration fixture before each test run
    const resetRes = await request.post('/api/seed/reset');
    expect(resetRes.ok()).toBeTruthy();
  });

  test('Step 1-8: Full demo walkthrough — Today → Stock → Demand → Plan (₹1000→₹600→₹500) → Approve → Receive → Fulfill', async ({
    page,
  }) => {
    // 1. Visit Home Screen (TODAY)
    await page.goto('/');
    await expect(page.locator('text=Munafa AI').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Universal Retail Copilot').first()).toBeVisible();
    await expect(page.locator('text=Priority 1: Urgent Demand')).toBeVisible();
    await expect(page.getByRole('main').getByText('Money available')).toBeVisible();
    await expect(page.locator('text=₹1,000').first()).toBeVisible();

    // 2. Inspect Stock Screen
    await page.click('button:has-text("Stock")');
    await expect(page.locator('text=Inventory & Continuous Stock Ledger')).toBeVisible();
    await expect(page.locator('text=A3 Plain').first()).toBeVisible();
    await expect(page.locator('text=Out of Stock').first()).toBeVisible();

    // 3. Inspect Demand Screen
    await page.click('button:has-text("Demand")');
    await expect(page.locator('text=Missed Customer Demand Requests')).toBeVisible();
    await expect(page.locator('text=12 units — Sketchbook (A3 Plain)')).toBeVisible();
    await expect(page.locator('text=Aarav Sharma (Fine Arts)')).toBeVisible();

    // 4. Navigate to Purchase Plan Workspace
    await page.click('button:has-text("Purchase Plan")');
    await expect(page.locator('text=Purchase Decision Engine & Proposal Workspace')).toBeVisible();

    // At default Budget ₹1,000:
    // Required Spec: 12 from Supplier A; outflow ₹990; contribution ₹450
    await expect(page.locator('text=Buy 12 units from Supplier A').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=₹990').first()).toBeVisible();
    await expect(page.locator('strong.text-teal-800:has-text("₹450")').first()).toBeVisible();

    // Test Spec Case 2: Change Budget to ₹600
    await page.click('button:has-text("₹600 (Case 2)")');
    // Required Spec: 6 from Supplier B; outflow ₹540; contribution ₹180; 6 units unresolved
    await expect(page.locator('text=Buy 6 units from Supplier B').first()).toBeVisible();
    await expect(page.locator('text=₹540').first()).toBeVisible();
    await expect(page.locator('strong.text-teal-800:has-text("₹180")').first()).toBeVisible();
    await expect(page.locator('text=6 customer-demanded units remain unresolved')).toBeVisible();

    // Test Spec Case 3: Change Budget to ₹500
    await page.click('button:has-text("₹500 (Case 3)")');
    // Required Spec: No feasible purchase
    await expect(page.locator('text=Insufficient Available Budget')).toBeVisible();
    await expect(page.locator('text=Exceeds available budget ₹500').first()).toBeVisible();

    // Return to Budget ₹1,000 to complete approval journey
    await page.click('button:has-text("₹1,000 (Case 1)")');
    await expect(page.locator('text=Buy 12 units from Supplier A').first()).toBeVisible();

    // 5. Approve Purchase Plan
    await page.click('button:has-text("Approve Purchase & Issue PO")');
    await expect(page.locator('text=Proposal Approved!')).toBeVisible();

    // 6. Navigate to Orders & Results
    await page.click('button:has-text("Orders & Results")');
    await expect(page.locator('text=Purchase Orders & Realized Results')).toBeVisible();
    await expect(page.locator('text=ISSUED').first()).toBeVisible();
    await expect(page.locator('text=Awaiting delivery').first()).toBeVisible();

    // 7. Receive Stock into Shelf Inventory
    await page.click('button:has-text("Receive Stock into Shelf Inventory")');
    await expect(page.locator('text=STOCK_RECEIVED').first()).toBeVisible();
    await expect(page.locator('text=12 units on shelf').first()).toBeVisible();

    // 8. Fulfill Customer Order
    await page.click('button:has-text("Fulfill Customer Order")');
    await expect(page.locator('text=Units Actually Picked Up & Paid:')).toBeVisible();
    await page.click('button:has-text("Confirm Fulfillment")');

    await expect(page.locator('text=Customer order fulfilled!')).toBeVisible();
    await expect(page.locator('text=COMPLETED').first()).toBeVisible();

    // 9. Inspect Reports
    await page.click('button:has-text("Reports")');
    await expect(page.locator('text=Merchant Reports & Audited Performance')).toBeVisible();
    await expect(page.locator('text=Calculated Contribution')).toBeVisible();

    // 10. Open Paytm Soundbox & Payments Hub
    await page.click('button:has-text("Paytm Soundbox")');
    await expect(page.locator('text=Paytm for Business').first()).toBeVisible();
    await expect(page.locator('text=Paytm Soundbox 3.0 LCD').first()).toBeVisible();
    await expect(page.locator('text=Paytm Instant Settlement (T+0)')).toBeVisible();

    // Check Dynamic QR tab
    await page.click('button:has-text("Dynamic Paytm QR")');
    await expect(page.locator('text=paytmqr.collegecorner@paytm')).toBeVisible();

    // Close Modal
    await page.click('button:has-text("Close")');
    await expect(page.locator('text=Paytm for Business')).not.toBeVisible();
  });
});
