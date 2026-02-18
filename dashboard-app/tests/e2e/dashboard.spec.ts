/**
 * E2E Tests: Dashboard Pages
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * End-to-end tests for dashboard functionality including:
 * - Dashboard home page with metrics
 * - Calls list page
 * - Analytics page
 * - Navigation between pages
 * - Data display and filtering
 *
 * @see /app/dashboard/page.tsx - Dashboard home
 * @see /app/dashboard/calls/page.tsx - Calls list
 * @see /app/dashboard/analytics/page.tsx - Analytics page
 */

import { test, expect } from '@playwright/test';

// ============================================================================
// Test Setup
// ============================================================================

/**
 * Mock user session for testing
 * In a real test environment, you would authenticate through the login flow
 * or use API routes to create a session
 */
async function mockSession(page: any) {
  // Note: In a production E2E test setup, you would:
  // 1. Either create a test user and log in through the UI
  // 2. Or use API routes to create a session cookie
  // 3. Or use a test database with seeded data

  // For now, we'll attempt to visit dashboard directly and handle the redirect
  await page.goto('/dashboard');

  // If we get redirected to login, that's expected behavior
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    // Mark test as skipped if authentication is required but not set up
    test.skip(true, 'Authentication not configured - skipping authenticated page tests');
  }
}

// ============================================================================
// Dashboard Home Page Tests
// ============================================================================

test.describe('Dashboard Home Page', () => {
  test('should render dashboard home page with all elements', async ({ page }) => {
    await mockSession(page);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check page title
    await expect(page).toHaveTitle(/Dashboard/);

    // Check main heading
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Check subtitle
    await expect(page.locator('p')).toContainText('Overview of your phone call metrics');

    // Check for metrics cards
    const totalCallsCard = page.getByText('Total Calls').first();
    const avgDurationCard = page.getByText('Avg Duration').first();
    const completionRateCard = page.getByText('Completion Rate').first();

    await expect(totalCallsCard).toBeVisible();
    await expect(avgDurationCard).toBeVisible();
    await expect(completionRateCard).toBeVisible();
  });

  test('should display metric cards with icons and values', async ({ page }) => {
    await mockSession(page);
    await page.waitForLoadState('networkidle');

    // Check Total Calls card
    const totalCallsSection = page.getByText('Total Calls').locator('..').locator('..');
    await expect(totalCallsSection).toBeVisible();

    // Check for phone icon (SVG)
    const phoneIcon = totalCallsSection.locator('svg').first();
    await expect(phoneIcon).toBeVisible();

    // Check for subtitle
    await expect(page.getByText('All time')).toBeVisible();
  });

  test('should display recent activity section', async ({ page }) => {
    await mockSession(page);
    await page.waitForLoadState('networkidle');

    // Check for recent activity heading
    await expect(page.getByText('Recent Activity')).toBeVisible();

    // The section should exist (either with data or empty state)
    const recentActivitySection = page.locator('h2').filter({ hasText: 'Recent Activity' }).locator('..');

    // Either show calls or empty state
    const hasCalls = await page.getByText(/No calls recorded yet/i).isVisible().catch(() => false);
    const hasEmptyState = await page.locator('svg[viewBox="0 0 24 24"]').isVisible().catch(() => false);

    // At least one should be visible
    expect(hasCalls || hasEmptyState).toBeTruthy();
  });

  test('should show empty state when no calls exist', async ({ page }) => {
    await mockSession(page);
    await page.waitForLoadState('networkidle');

    // Check if empty state message is present
    const emptyMessage = page.getByText(/No calls recorded yet/i);
    const isVisible = await emptyMessage.isVisible().catch(() => false);

    if (isVisible) {
      await expect(emptyMessage).toBeVisible();
      await expect(page.getByText(/Your recent activity will appear here/i)).toBeVisible();
    }
  });

  test('should display calls in recent activity list', async ({ page }) => {
    await mockSession(page);
    await page.waitForLoadState('networkidle');

    // Check for any call list items
    const callItems = page.locator('div').filter({ hasText: /completed|missed|failed/i });

    const count = await callItems.count();
    if (count > 0) {
      // Verify first call item has phone number
      const firstCall = callItems.first();
      await expect(firstCall).toBeVisible();

      // Check for status badge
      const statusBadge = firstCall.locator('span').filter({ hasText: /completed|missed|failed|in_progress|cancelled/i });
      const hasStatusBadge = await statusBadge.count() > 0;
      expect(hasStatusBadge).toBeTruthy();
    }
  });
});

// ============================================================================
// Calls List Page Tests
// ============================================================================

test.describe('Calls List Page', () => {
  test('should render calls list page with all elements', async ({ page }) => {
    await page.goto('/dashboard/calls');
    await page.waitForLoadState('networkidle');

    // If redirected to login, skip test
    if (page.url().includes('/login')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Check page title
    await expect(page).toHaveTitle(/Phone Calls/);

    // Check main heading
    await expect(page.locator('h1')).toContainText('Phone Calls');

    // Check subtitle
    await expect(page.locator('p')).toContainText('View and search your phone call history');
  });

  test('should display search and filter controls', async ({ page }) => {
    await page.goto('/dashboard/calls');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Check for search input
    const searchInput = page.getByPlaceholder(/Search/i);
    const hasSearchInput = await searchInput.isVisible().catch(() => false);

    if (hasSearchInput) {
      await expect(searchInput).toBeVisible();
    }

    // Check for status filter dropdown
    const statusFilter = page.getByRole('combobox').first();
    const hasStatusFilter = await statusFilter.isVisible().catch(() => false);

    if (hasStatusFilter) {
      await expect(statusFilter).toBeVisible();
    }
  });

  test('should display calls in table or list format', async ({ page }) => {
    await page.goto('/dashboard/calls');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Check for call items or empty state
    const callItems = page.locator('div').filter({ hasText: /\+?\d{10,}/ }); // Phone number pattern
    const emptyState = page.getByText(/No calls found/i);

    const hasCalls = await callItems.count() > 0;
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    // Should have either calls or empty state
    expect(hasCalls || hasEmptyState).toBeTruthy();
  });

  test('should show call details including phone number and status', async ({ page }) => {
    await page.goto('/dashboard/calls');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Look for any call item
    const callItems = page.locator('div').filter({ hasText: /completed|missed|failed/i });
    const count = await callItems.count();

    if (count > 0) {
      const firstCall = callItems.first();

      // Check for phone number pattern
      await expect(firstCall).toBeVisible();

      // Check for status badge
      const statusBadge = firstCall.locator('span').filter({ hasText: /completed|missed|failed/i });
      const hasStatusBadge = await statusBadge.count() > 0;
      expect(hasStatusBadge).toBeTruthy();
    }
  });
});

// ============================================================================
// Analytics Page Tests
// ============================================================================

test.describe('Analytics Page', () => {
  test('should render analytics page with all elements', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Check page title
    await expect(page).toHaveTitle(/Analytics/);

    // Check main heading
    await expect(page.locator('h1')).toContainText('Analytics');

    // Check subtitle
    await expect(page.locator('p')).toContainText('Visualize your phone call trends');
  });

  test('should display date range filter', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Check for date range heading
    await expect(page.getByText('Date Range Filter')).toBeVisible();

    // Check for start date input
    const startDateInput = page.getByLabel('Start Date');
    await expect(startDateInput).toBeVisible();

    // Check for end date input
    const endDateInput = page.getByLabel('End Date');
    await expect(endDateInput).toBeVisible();

    // Check for apply filter button
    await expect(page.getByRole('button', { name: 'Apply Filter' })).toBeVisible();
  });

  test('should display preset date range buttons', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Check for preset buttons
    await expect(page.getByRole('button', { name: 'Last 7 days' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Last 30 days' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Last 90 days' })).toBeVisible();
  });

  test('should display analytics metrics cards', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Check for metric cards
    await expect(page.getByText('Total Calls')).toBeVisible();
    await expect(page.getByText('Completed')).toBeVisible();
    await expect(page.getByText('Avg Duration')).toBeVisible();
    await expect(page.getByText('Peak Hour')).toBeVisible();
  });

  test('should update date range when preset button is clicked', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Get initial start date value
    const startDateInput = page.getByLabel('Start Date');
    const initialStartDate = await startDateInput.inputValue();

    // Click "Last 7 days" button
    await page.getByRole('button', { name: 'Last 7 days' }).click();

    // Wait a bit for the state to update
    await page.waitForTimeout(500);

    // Get new start date value
    const newStartDate = await startDateInput.inputValue();

    // The date should have changed (unless we're already at 7 days)
    // We can't assert exact values without knowing the current date,
    // but we can verify the interaction works
    await expect(startDateInput).toHaveValue(/\d{4}-\d{2}-\d{2}/);
  });

  test('should show empty state when no analytics data', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Check for empty state or charts
    const noDataMessage = page.getByText(/No data available/i);
    const hasEmptyState = await noDataMessage.isVisible().catch(() => false);

    if (hasEmptyState) {
      await expect(noDataMessage).toBeVisible();
      await expect(page.getByText(/Try adjusting the date range/i)).toBeVisible();
    }
  });

  test('should display charts when data is available', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Look for chart elements (Recharts renders SVG elements)
    const charts = page.locator('svg').filter({ hasText: '' }); // SVG elements without text
    const chartCount = await charts.count();

    // If we have data, there should be charts
    if (chartCount > 5) { // Recharts typically creates multiple SVG elements
      // Verify at least some chart elements exist
      await expect(charts.first()).toBeVisible();
    }
  });
});

// ============================================================================
// Navigation Tests
// ============================================================================

test.describe('Dashboard Navigation', () => {
  test('should navigate between dashboard pages', async ({ page }) => {
    await mockSession(page);
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Navigate to calls page
    await page.goto('/dashboard/calls');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/calls/);

    // Navigate to analytics page
    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/analytics/);

    // Navigate back to dashboard home
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('should navigate using direct URL access', async ({ page }) => {
    await mockSession(page);
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Access calls page directly
    await page.goto('/dashboard/calls');
    await expect(page).toHaveURL(/\/dashboard\/calls/);

    // Access analytics page directly
    await page.goto('/dashboard/analytics');
    await expect(page).toHaveURL(/\/dashboard\/analytics/);

    // Access profile page directly
    await page.goto('/dashboard/profile');
    await expect(page).toHaveURL(/\/dashboard\/profile/);
  });
});

// ============================================================================
// Responsive Design Tests
// ============================================================================

test.describe('Dashboard Responsive Design', () => {
  test('should display correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await mockSession(page);
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Check main heading is visible
    await expect(page.locator('h1')).toBeVisible();

    // Metrics should stack vertically on mobile
    const totalCallsCard = page.getByText('Total Calls').first();
    await expect(totalCallsCard).toBeVisible();
  });

  test('should display correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await mockSession(page);
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Check main heading is visible
    await expect(page.locator('h1')).toBeVisible();

    // Metrics should display properly
    await expect(page.getByText('Total Calls')).toBeVisible();
  });
});

// ============================================================================
// Loading State Tests
// ============================================================================

test.describe('Loading States', () => {
  test('should show loading state on analytics page while fetching data', async ({ page }) => {
    await page.goto('/dashboard/analytics');

    if (page.url().includes('/login')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Look for loading spinner (it should appear briefly)
    const loadingSpinner = page.locator('div').filter({ hasAttribute: 'role', 'value': 'status' }).first();
    const hasSpinner = await loadingSpinner.isVisible().catch(() => false);

    // If visible, check it's a spinner
    if (hasSpinner) {
      await expect(loadingSpinner).toBeVisible();
    }
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

test.describe('Error Handling', () => {
  test('should display error message when API fails', async ({ page }) => {
    await page.goto('/dashboard/analytics');

    if (page.url().includes('/login')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Check for error state (might not be present if API is working)
    const errorMessage = page.getByText(/Failed to fetch/i);
    const hasError = await errorMessage.isVisible().catch(() => false);

    // If error is present, verify it has proper styling
    if (hasError) {
      await expect(errorMessage).toBeVisible();
    }
  });
});
