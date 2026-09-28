import { test, expect } from '@playwright/test';

test.describe('Document Lifecycle E2E', () => {
  // We assume a demo user or mocked auth state is injected before tests

  test('should complete the full upload -> mint -> verify flow', async ({ page }) => {
    // 1. Login (using bypass or mocked session)
    await page.goto('/login');
    await page.fill('input[placeholder="Enter credentials..."]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.keyboard.press('Enter');

    // Wait for dashboard redirect
    await page.waitForURL('/dashboard');
    expect(page.url()).toContain('/dashboard');

    // 2. Navigate to Document Upload
    await page.click('text="Upload Document"');
    await page.waitForURL('/dashboard/documents/upload');

    // 3. Upload a document
    // We create a mock file in memory to upload
    const buffer = Buffer.from('TEST DOCUMENT CONTENT ' + Date.now());
    await page.setInputFiles('input[type="file"]', {
      name: 'test-doc.txt',
      mimeType: 'text/plain',
      buffer: buffer
    });

    // Check classification and upload
    await page.selectOption('select', 'CONFIDENTIAL');
    await page.click('button:has-text("Upload")');

    // Wait for upload to complete
    await expect(page.locator('text="Upload Complete"')).toBeVisible({ timeout: 15000 });

    // 4. Mint NFT
    // The UI should transition to allow minting
    await page.click('button:has-text("Mint NFT")');
    await expect(page.locator('text="Minted successfully"')).toBeVisible({ timeout: 30000 });

    // 5. Verify the Document
    await page.goto('/dashboard/verification');
    await page.click('text="Verify by File"');
    
    await page.setInputFiles('input[type="file"]', {
      name: 'test-doc.txt',
      mimeType: 'text/plain',
      buffer: buffer
    });

    await page.click('button:has-text("Verify Hash")');
    await expect(page.locator('text="VERIFIED — AUTHENTIC"')).toBeVisible({ timeout: 15000 });
  });
});
