// @ts-check
import { test, expect } from '@playwright/test'

/**
 * E2E: Authenticated flows — Dashboard, Book modal, Edit vehicle, Calendar.
 * Run with real Supabase + test user; skip in CI unless E2E_AUTH_EMAIL is set.
 * See TESTING.md for "Test after develop" and optional E2E credentials.
 * When hasAuth, tests sign in with email/password (VITE_E2E_EMAIL_AUTH enables the form).
 */
const hasAuth = !!process.env.E2E_AUTH_EMAIL && !!process.env.E2E_AUTH_PASSWORD

async function ensureLoggedIn(page) {
  await page.goto('/')
  const scheduleBtn = page.getByRole('button', { name: /schedule/i })
  const loginEmail = page.getByTestId('login-email')
  await Promise.race([
    scheduleBtn.waitFor({ state: 'visible', timeout: 15000 }),
    loginEmail.waitFor({ state: 'visible', timeout: 15000 }),
  ]).catch(() => {})
  if (await loginEmail.isVisible()) {
    await loginEmail.fill(process.env.E2E_AUTH_EMAIL || '')
    await page.getByTestId('login-password').fill(process.env.E2E_AUTH_PASSWORD || '')
    await page.getByTestId('login-submit').click()
    // Wait for dashboard to be ready (Schedule button visible); works regardless of base path
    await expect(scheduleBtn).toBeVisible({ timeout: 20000 })
  }
}

test.describe('Dashboard (authenticated)', () => {
  test.skip(!hasAuth, 'Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run authenticated E2E')

  test('shows dashboard after login', async ({ page }) => {
    await ensureLoggedIn(page)
    await expect(page.getByRole('button', { name: /schedule/i })).toBeVisible({ timeout: 10000 })
  })

  test('vehicles list or empty state is visible', async ({ page }) => {
    await ensureLoggedIn(page)
    await expect(
      page.getByText('Loading fleet data...').or(page.getByText('No vehicles found'))
    ).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Book Vehicle modal (authenticated)', () => {
  test.skip(!hasAuth, 'Requires E2E auth')

  test('Book button opens booking modal', async ({ page }) => {
    await ensureLoggedIn(page)
    await page.getByRole('button', { name: /book/i }).first().click({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: /book vehicle/i })).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Schedule (Fleet Schedule modal, authenticated)', () => {
  test.skip(!hasAuth, 'Requires E2E auth')

  test('Schedule button shows Fleet Schedule modal', async ({ page }) => {
    await ensureLoggedIn(page)
    await page.getByRole('button', { name: /schedule/i }).click({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: /fleet schedule/i })).toBeVisible({ timeout: 5000 })
  })
})

test.describe('R6: Booking form validation (authenticated)', () => {
  test.skip(!hasAuth, 'Requires E2E auth')

  test('Project and Who ordered are required, Pilot is optional', async ({ page }) => {
    await ensureLoggedIn(page)
    
    // Open booking modal
    const reserveBtn = page.getByRole('button', { name: /reserve/i }).first()
    await reserveBtn.click({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: /reserve vehicle/i })).toBeVisible({ timeout: 5000 })
    
    // Try to submit without filling required fields (should show validation errors)
    const confirmBtn = page.getByRole('button', { name: /confirm reservation/i })
    await confirmBtn.click()
    
    // Check that validation errors appear
    await expect(page.getByText(/please select at least one date/i).or(page.getByText(/project name is required/i))).toBeVisible({ timeout: 3000 })
    
    // Verify Who ordered has required asterisk
    await expect(page.getByText(/who ordered \*/i)).toBeVisible()
    
    // Verify Pilot does NOT have required asterisk (just "Pilot" without *)
    const pilotLabel = page.getByText(/^pilot$/i)
    await expect(pilotLabel).toBeVisible()
  })
})

test.describe('R7: Edit vehicle form (authenticated)', () => {
  test.skip(!hasAuth, 'Requires E2E auth')

  test('Edit vehicle has Department dropdown and no Decommissioned option', async ({ page }) => {
    await ensureLoggedIn(page)
    
    // Click edit button on first vehicle
    const editBtn = page.getByRole('button', { name: /edit/i }).first()
    await editBtn.click({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: /edit vehicle/i })).toBeVisible({ timeout: 5000 })
    
    // Check that Department dropdown exists and has required asterisk
    await expect(page.getByText(/department \*/i)).toBeVisible()
    const departmentSelect = page.locator('select[name="department"]')
    await expect(departmentSelect).toBeVisible()
    
    // Verify Department options (R&D, Training, Marketing)
    const departmentOptions = await departmentSelect.locator('option').allTextContents()
    expect(departmentOptions).toContain('R&D')
    expect(departmentOptions).toContain('Training')
    expect(departmentOptions).toContain('Marketing')
    
    // Verify Status dropdown does NOT have Decommissioned option
    const statusSelect = page.locator('select[name="status"]')
    const statusOptions = await statusSelect.locator('option').allTextContents()
    expect(statusOptions.some(opt => opt.includes('Decommissioned'))).toBe(false)
    
    // Verify Parameter Change field exists
    await expect(page.getByText(/parameter change/i)).toBeVisible()
    const parameterChangeField = page.locator('textarea[name="parameter_change_notes"]')
    await expect(parameterChangeField).toBeVisible()
  })
})

test.describe('R8: Filter vehicles by department (authenticated)', () => {
  test.skip(!hasAuth, 'Requires E2E auth')

  test('Filter button opens modal with department/vehicle selection', async ({ page }) => {
    await ensureLoggedIn(page)
    
    // Click Filter button in header
    const filterBtn = page.getByTestId('filter-trigger')
    await expect(filterBtn).toBeVisible({ timeout: 10000 })
    await filterBtn.click()
    
    // Verify Filter modal opens
    await expect(page.getByRole('heading', { name: /filter vehicles/i })).toBeVisible({ timeout: 5000 })
    
    // Verify department sections exist (R&D, Training, Marketing)
    await expect(page.getByText('R&D')).toBeVisible()
    await expect(page.getByText('Training')).toBeVisible()
    await expect(page.getByText('Marketing')).toBeVisible()
    
    // Verify Apply Filter button exists
    await expect(page.getByRole('button', { name: /apply filter/i })).toBeVisible()
    
    // Close modal
    const closeBtn = page.locator('.filter-modal-close')
    await closeBtn.click()
  })
})

test.describe('R9: Vehicle changelog icon and modal (authenticated)', () => {
  test.skip(!hasAuth, 'Requires E2E auth')

  test('Changelog icon opens history modal', async ({ page }) => {
    await ensureLoggedIn(page)
    
    // Wait for vehicle cards to load
    await page.waitForSelector('.vehicle-card', { timeout: 15000 })
    
    // Click changelog button (📜 icon) on first vehicle card
    const changelogBtn = page.locator('.icon-btn-changelog').first()
    await expect(changelogBtn).toBeVisible({ timeout: 10000 })
    await changelogBtn.click()
    
    // Verify History modal opens
    await expect(page.getByRole('heading', { name: /^History$/i })).toBeVisible({ timeout: 5000 })
    
    // Verify modal has close button
    const closeBtn = page.locator('.change-history-close')
    await expect(closeBtn).toBeVisible()
    
    // Close modal
    await closeBtn.click()
  })

  test('Profile menu does not have Change Log item', async ({ page }) => {
    await ensureLoggedIn(page)
    
    // Click profile trigger to open menu
    const profileTrigger = page.locator('.profile-trigger')
    await expect(profileTrigger).toBeVisible({ timeout: 10000 })
    await profileTrigger.click()
    
    // Verify profile menu is visible
    await expect(page.locator('.profile-menu')).toBeVisible({ timeout: 3000 })
    
    // Verify "Change Log" menu item does NOT exist
    const changeLogMenuItem = page.getByRole('button', { name: /📜 change log/i })
    await expect(changeLogMenuItem).not.toBeVisible()
    
    // Verify other menu items still exist
    await expect(page.getByRole('button', { name: /profile page/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /my bookings/i })).toBeVisible()
  })
})
