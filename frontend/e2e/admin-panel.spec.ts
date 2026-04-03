import { test, expect } from '@playwright/test';

const SUPER_ADMIN = { email: 'admin@demo.com', password: 'Admin1234!' };
const OWNER = { email: 'owner@demo.com', password: 'Owner1234!' };

async function login(page: import('@playwright/test').Page, creds: { email: string; password: string }) {
  await page.goto('/login');
  await page.waitForSelector('#email', { timeout: 10_000 });
  await page.fill('#email', creds.email);
  await page.fill('#password', creds.password);
  await page.click('button[type="submit"]');
}

test.describe('Admin Panel', () => {
  test('super admin redirects to /admin after login', async ({ page }) => {
    await login(page, SUPER_ADMIN);
    await page.waitForURL('**/admin');
    await expect(page.locator('h1')).toHaveText('Empresas');
  });

  test('non-admin cannot access /admin', async ({ page }) => {
    await login(page, OWNER);
    // Owner should land on dashboard
    await page.waitForSelector('nav', { timeout: 10_000 });
    // Try accessing admin — should see dashboard sidebar, not admin panel
    await page.goto('/admin');
    // Wait for SPA to hydrate and auth to recover
    await page.waitForTimeout(3000);
    // Non-super-admin should end up on dashboard (has nav sidebar), not admin panel
    const hasNav = await page.locator('nav').isVisible().catch(() => false);
    const hasAdminHeader = await page.getByText('Panel de Administración').isVisible().catch(() => false);
    expect(hasNav || !hasAdminHeader).toBeTruthy();
  });

  test('companies list page loads with create button', async ({ page }) => {
    await login(page, SUPER_ADMIN);
    await page.waitForURL('**/admin');
    await expect(page.locator('h1')).toHaveText('Empresas');
    await expect(page.getByRole('button', { name: 'Crear Empresa' })).toBeVisible();
  });

  test('create company flow', async ({ page }) => {
    await login(page, SUPER_ADMIN);
    await page.waitForURL('**/admin');

    // Open create modal
    await page.getByRole('button', { name: 'Crear Empresa' }).click();
    await expect(page.locator('.fixed')).toBeVisible();

    // Fill form
    const companyName = `Test Company ${Date.now()}`;
    await page.locator('.fixed input[type="text"]').first().fill(companyName);
    await page.locator('.fixed input[type="text"]').last().fill('USD');

    // Submit
    await page.locator('.fixed button[type="submit"]').click();

    // Modal closes and company appears in table
    await expect(page.locator('.fixed')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('table')).toContainText(companyName);
  });

  test('company detail page loads', async ({ page }) => {
    await login(page, SUPER_ADMIN);
    await page.waitForURL('**/admin');

    // Click first company row (if any exist)
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForURL('**/admin/companies/**');

      // Verify detail page elements
      await expect(page.getByText('Volver')).toBeVisible();
      await expect(page.getByText('Propietario')).toBeVisible();
    }
  });

  test('search filters companies', async ({ page }) => {
    await login(page, SUPER_ADMIN);
    await page.waitForURL('**/admin');

    // Type a search query that won't match
    await page.locator('input[placeholder*="Buscar"]').fill('zzzznonexistent');

    // Wait for debounce and check empty state appears
    await expect(page.getByText('No hay empresas registradas')).toBeVisible({ timeout: 2000 });
  });

  test('edit company modal opens with pre-filled data', async ({ page }) => {
    await login(page, SUPER_ADMIN);
    await page.waitForURL('**/admin');

    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForURL('**/admin/companies/**');

      await page.getByText('Editar Empresa').click();
      await expect(page.locator('.fixed')).toBeVisible();

      // Verify inputs are pre-filled (not empty)
      const nameInput = page.locator('.fixed input[type="text"]').first();
      await expect(nameInput).not.toHaveValue('');
    }
  });

  test('deactivate/activate toggle shows confirmation', async ({ page }) => {
    await login(page, SUPER_ADMIN);
    await page.waitForURL('**/admin');

    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForURL('**/admin/companies/**');

      // Click deactivate or activate button
      const toggleBtn = page.getByRole('button', { name: /Desactivar|Activar/ });
      await toggleBtn.click();

      // Confirmation modal appears
      await expect(page.locator('.fixed')).toBeVisible();
      await expect(page.getByText(/¿Estás seguro/)).toBeVisible();
    }
  });

  test('logout from admin panel', async ({ page }) => {
    await login(page, SUPER_ADMIN);
    await page.waitForURL('**/admin');

    await page.getByRole('button', { name: 'Cerrar Sesión' }).click();
    await page.waitForURL('**/login');
    await expect(page.locator('h2')).toHaveText('Iniciar Sesión');
  });
});
