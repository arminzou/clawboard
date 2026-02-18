import { test, expect, request } from '@playwright/test';

const API_KEY = '[REDACTED]';

test('drag task between columns updates status', async ({ page }) => {
  const api = await request.newContext({ baseURL: 'http://127.0.0.1:3001' });
  
  // Create task with auth header on each request
  const create = await api.post('/api/tasks', {
    headers: { Authorization: `Bearer ${API_KEY}` },
    data: {
      title: `E2E Drag ${Date.now()}`,
      status: 'backlog',
    },
  });
  expect(create.ok()).toBeTruthy();
  const task = await create.json();
  const taskId = task.id as number;

  try {
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

    await page.goto('/');
    await page.waitForResponse((resp) => resp.url().includes('/api/tasks') && resp.status() === 200);

    const taskCard = page.getByTestId(`task-card-${taskId}`);
    await expect(taskCard).toBeVisible();

    const dragHandle = page.getByTestId(`task-drag-handle-${taskId}`);
    await expect(dragHandle).toBeVisible();

    const inProgressColumn = page.getByTestId('kanban-column-in_progress');
    const targetCard = inProgressColumn.locator('[data-testid^="task-card-"]').first();

    await expect(targetCard).toBeVisible();
    await dragHandle.scrollIntoViewIfNeeded();
    await targetCard.scrollIntoViewIfNeeded();

    const sourceBox = await dragHandle.boundingBox();
    const targetBox = await targetCard.boundingBox();
    if (!sourceBox || !targetBox) throw new Error('Drag/drop bounding box not found');

    const sx = sourceBox.x + sourceBox.width / 2;
    const sy = sourceBox.y + sourceBox.height / 2;
    const tx = targetBox.x + targetBox.width / 2;
    const ty = targetBox.y + targetBox.height / 2;

    const patchRequestPromise = page.waitForRequest(
      (req) => req.url().endsWith(`/api/tasks/${taskId}`) && req.method() === 'PATCH',
      { timeout: 5000 },
    );
    const patchResponsePromise = page.waitForResponse(
      (resp) => resp.url().endsWith(`/api/tasks/${taskId}`) && resp.request().method() === 'PATCH',
      { timeout: 5000 },
    );

    await page.dispatchEvent(`[data-testid="task-drag-handle-${taskId}"]`, 'pointerdown', {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: sx,
      clientY: sy,
    });

    await page.dispatchEvent(`[data-testid="task-drag-handle-${taskId}"]`, 'pointermove', {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: sx + 20,
      clientY: sy + 20,
    });

    await page.dispatchEvent('[data-testid="kanban-drop-in_progress"]', 'pointermove', {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: tx,
      clientY: ty,
    });

    await page.dispatchEvent('[data-testid="kanban-drop-in_progress"]', 'pointerup', {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: 0,
      clientX: tx,
      clientY: ty,
    });

    const patchRequest = await patchRequestPromise;
    const patchData = patchRequest.postDataJSON();
    expect(patchData?.status).toBe('in_progress');

    const patchResponse = await patchResponsePromise;
    expect(patchResponse.ok()).toBeTruthy();

    // Verify backend status updated
    await expect.poll(async () => {
      const refreshed = await api.get(`/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      const updated = await refreshed.json();
      return updated.status;
    }).toBe('in_progress');

    await expect(inProgressColumn.getByTestId(`task-card-${taskId}`)).toBeVisible();
    await expect(inProgressColumn).toContainText('In Progress');
  } finally {
    await api.delete(`/api/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
  }
});
