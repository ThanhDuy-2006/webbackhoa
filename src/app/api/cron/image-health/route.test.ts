import { GET } from './route';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Cron Image Health', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
  });

  it('rejects unauthorized requests without header', async () => {
    const req = new Request('http://localhost/api/cron/image-health');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('rejects unauthorized requests with wrong secret', async () => {
    const req = new Request('http://localhost/api/cron/image-health', {
      headers: { authorization: 'Bearer wrong-secret' }
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
  
  // Remaining tests require mocking supabase which is complex for this basic suite, 
  // but this verifies the security aspect.
});
