import { POST } from './route';
import { describe, it, expect } from 'vitest';

describe('Report Broken Image', () => {
  it('rejects request without productId', async () => {
    const req = new Request('http://localhost/api/images/report-broken', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
