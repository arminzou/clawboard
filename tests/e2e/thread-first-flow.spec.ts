import { test, expect, request } from '@playwright/test';

test('thread-first: create -> packet -> approve -> promote spawns task', async ({ page }) => {
  const api = await request.newContext({ baseURL: 'http://127.0.0.1:3001' });

  const title = `E2E Thread ${Date.now()}`;
  const problem = 'Need to verify thread-first flow works end-to-end.';
  const taskTitle = `E2E Spawned Task ${Date.now()}`;

  // Keep Kanban view in a predictable state for post-promotion verification.
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('cb.v2.kanban.view', 'all');
    localStorage.setItem('cb.v2.kanban.hideDone', '0');
    localStorage.setItem('cb.v2.kanban.blocked', '0');
    localStorage.setItem('cb.v2.kanban.showArchived', '0');
    localStorage.setItem('cb.v2.kanban.due', 'any');
    localStorage.setItem('cb.v2.kanban.tag', 'all');
    localStorage.setItem('cb.v2.kanban.context', 'all');
    localStorage.setItem('cb.v2.kanban.assignee', 'all');
    localStorage.setItem('cb.v2.kanban.q', '');
    localStorage.setItem('cb.v2.kanban.mode', 'board');
    localStorage.setItem('cb.v2.currentProjectId', 'null');
  });

  await expect.poll(async () => {
    const resp = await api.get('/api/health').catch(() => null);
    return Boolean(resp && resp.ok());
  }).toBe(true);

  await page.goto('/attention');
  await expect(page.getByText('Loading attention…')).toHaveCount(0);

  await page.getByRole('button', { name: 'New Thread' }).click();

  await page.getByPlaceholder('e.g. Database migration strategy').fill(title);
  await page.getByPlaceholder('Describe the context and what needs to be solved...').fill(problem);
  await page.getByRole('button', { name: 'Create Thread' }).click();

  // Should land on /threads/:id and show the title.
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  // Move thread to Pending Approval.
  await page.getByRole('button', { name: '→ Ready to Plan' }).click();
  await expect(page.getByText('Ready to Plan')).toBeVisible();

  await page.getByRole('button', { name: '→ Pending Approval' }).click();
  await expect(page.getByText('Pending Approval')).toBeVisible();

  // Fill promotion packet.
  await page.getByRole('button', { name: 'Edit' }).click();

  await page.locator('label:has-text("Problem")').locator('..').locator('textarea').fill('Problem');
  await page.locator('label:has-text("Desired Outcome")').locator('..').locator('textarea').fill('Outcome');
  await page.locator('label:has-text("Scope In")').locator('..').locator('textarea').fill('In');
  await page.locator('label:has-text("Scope Out")').locator('..').locator('textarea').fill('Out');
  await page.locator('label:has-text("Constraints")').locator('..').locator('textarea').fill('Constraints');
  await page.locator('label:has-text("Decision Owner")').locator('..').locator('input').fill('armin');
  await page
    .locator('label:has-text("Acceptance Criteria (one per line)")')
    .locator('..')
    .locator('textarea')
    .fill('Works');
  await page.locator('label:has-text("First Executable Slice")').locator('..').locator('input').fill('Build schema');

  await page.getByRole('button', { name: 'Save Packet' }).click();

  // Validate should succeed.
  await page.getByRole('button', { name: 'Validate packet' }).click();
  await expect(page.getByText('Promotion packet incomplete')).toHaveCount(0);

  // Promote: handle prompt.
  page.once('dialog', async (dialog) => {
    await dialog.accept(taskTitle);
  });

  await page.getByRole('button', { name: 'Promote to Task' }).click();
  await expect(page.getByText('Promoted')).toBeVisible();
  await expect(page.getByText('promoted_to_task')).toBeVisible();

  // Confirm spawned task is visible on Kanban.
  await page.goto('/');
  await page.waitForResponse((resp) => resp.url().includes('/api/tasks') && resp.status() === 200);
  await expect(page.getByText(taskTitle)).toBeVisible();

  // Cleanup: best-effort delete spawned task(s) via title query.
  const listed = await api.get('/api/tasks');
  if (listed.ok()) {
    const tasks = (await listed.json()) as Array<{ id: number; title?: string }>;
    const toDelete = tasks.filter((t) => t.title === taskTitle);
    for (const t of toDelete) {
      await api.delete(`/api/tasks/${t.id}`);
    }
  }
});
