import { test, expect, request } from '@playwright/test';

test('drag task between columns updates status', async ({ page }) => {
  const api = await request.newContext({ baseURL: 'http://127.0.0.1:3001' });
  const create = await api.post('/api/tasks', {
    data: {
      title: `E2E Drag ${Date.now()}`,
      status: 'backlog',
    },
  });
  expect(create.ok()).toBeTruthy();
  const task = await create.json();
  const taskId = task.id as number;

  await page.goto('/');

  const dragHandle = page.getByTestId(`task-drag-handle-${taskId}`);
  await expect(dragHandle).toBeVisible();

  const dropTarget = page.getByTestId('kanban-drop-in_progress');
  await page.dragAndDrop(dragHandle, dropTarget);

  const inProgressColumn = page.getByTestId('kanban-column-in_progress');
  await expect(inProgressColumn.getByTestId(`task-card-${taskId}`)).toBeVisible();
  await expect(inProgressColumn).toContainText('In Progress');

  // Verify backend status updated
  const refreshed = await api.get(`/api/tasks/${taskId}`);
  const updated = await refreshed.json();
  expect(updated.status).toBe('in_progress');
});
