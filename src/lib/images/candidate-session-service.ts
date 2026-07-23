import { createAdminClient } from '@/lib/supabase/admin';
import { ImageCandidate } from './types';

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

// In-memory fallback candidate session cache if Supabase candidate session tables are not migrated yet
interface InMemorySession {
  id: string;
  adminId: string;
  productId?: string | null;
  formSessionId?: string | null;
  expiresAt: number;
  consumed: boolean;
  candidates: ImageCandidate[];
}

const memorySessionStore = new Map<string, InMemorySession>();

export const CandidateSessionService = {
  async createSession({
    adminId,
    productId,
    formSessionId,
    candidates,
  }: {
    adminId: string;
    productId?: string | null;
    formSessionId?: string | null;
    candidates: ImageCandidate[];
  }): Promise<string> {
    const sessionId = `sess-${crypto.randomUUID()}`;
    const expiresAtMs = Date.now() + SESSION_TTL_MS;

    try {
      const supabase = createAdminClient();

      // 1. Invalidate any existing active session for this product/form context
      if (productId) {
        await supabase
          .from('product_image_candidate_sessions')
          .update({ consumed_at: new Date().toISOString() })
          .eq('product_id', productId)
          .is('consumed_at', null);
      } else if (formSessionId) {
        await supabase
          .from('product_image_candidate_sessions')
          .update({ consumed_at: new Date().toISOString() })
          .eq('form_session_id', formSessionId)
          .is('consumed_at', null);
      }

      // 2. Insert session into DB
      const { data: session, error: sessionError } = await supabase
        .from('product_image_candidate_sessions')
        .insert({
          id: sessionId,
          admin_id: adminId,
          product_id: productId || null,
          form_session_id: formSessionId || null,
          expires_at: new Date(expiresAtMs).toISOString(),
        })
        .select('id')
        .single();

      if (sessionError) {
        throw sessionError;
      }

      // 3. Insert candidate rows bound to session
      if (candidates.length > 0) {
        const candidateRows = candidates.map((c) => ({
          id: c.id,
          session_id: session.id,
          url: c.url,
          thumbnail_url: c.thumbnailUrl,
          metadata_score: c.metadataScore,
          visual_score: c.visualScore || null,
          photographer: c.photographer || null,
          source_page_url: c.sourcePageUrl || null,
        }));

        await supabase.from('product_image_candidates').insert(candidateRows);
      }

      return session.id;
    } catch (err: any) {
      // Fallback to in-memory session store if DB tables are missing or not migrated yet
      console.warn('[CandidateSessionService] Falling back to memory session store:', err.message || err);

      const memorySession: InMemorySession = {
        id: sessionId,
        adminId,
        productId,
        formSessionId,
        expiresAt: expiresAtMs,
        consumed: false,
        candidates,
      };

      memorySessionStore.set(sessionId, memorySession);
      return sessionId;
    }
  },

  async verifyAndResolveCandidate({
    candidateSessionId,
    candidateId,
    adminId,
    productId,
    formSessionId,
  }: {
    candidateSessionId: string;
    candidateId: string;
    adminId: string;
    productId?: string | null;
    formSessionId?: string | null;
  }): Promise<{ url: string; sessionId: string }> {
    try {
      const supabase = createAdminClient();

      // 1. Fetch session from DB
      const { data: session, error: sessionErr } = await supabase
        .from('product_image_candidate_sessions')
        .select('*')
        .eq('id', candidateSessionId)
        .single();

      if (!sessionErr && session) {
        // Verify ownership & context
        if (session.admin_id !== adminId && adminId !== 'system') {
          throw new Error('Unauthorized candidate session access.');
        }
        if (productId && session.product_id !== productId) {
          throw new Error('Candidate session does not match target product.');
        }
        if (formSessionId && session.form_session_id !== formSessionId) {
          throw new Error('Candidate session does not match form session context.');
        }
        if (new Date(session.expires_at).getTime() < Date.now()) {
          throw new Error('Candidate session has expired.');
        }
        if (session.consumed_at) {
          throw new Error('Candidate session has already been consumed.');
        }

        const { data: candidate } = await supabase
          .from('product_image_candidates')
          .select('*')
          .eq('session_id', candidateSessionId)
          .eq('id', candidateId)
          .single();

        if (!candidate) {
          throw new Error('Candidate ID does not belong to specified session.');
        }

        return { url: candidate.url, sessionId: session.id };
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('table') && !err.message.includes('schema cache')) {
        throw err;
      }
    }

    // Fallback: Check memory session store
    const memSession = memorySessionStore.get(candidateSessionId);
    if (!memSession) {
      throw new Error('Candidate session not found or expired.');
    }

    if (memSession.adminId !== adminId && adminId !== 'system') {
      throw new Error('Unauthorized candidate session access.');
    }
    if (productId && memSession.productId !== productId) {
      throw new Error('Candidate session does not match target product.');
    }
    if (formSessionId && memSession.formSessionId !== formSessionId) {
      throw new Error('Candidate session does not match form session context.');
    }
    if (memSession.expiresAt < Date.now()) {
      memorySessionStore.delete(candidateSessionId);
      throw new Error('Candidate session has expired.');
    }
    if (memSession.consumed) {
      throw new Error('Candidate session has already been consumed.');
    }

    const candidate = memSession.candidates.find((c) => c.id === candidateId);
    if (!candidate) {
      throw new Error('Candidate ID does not belong to specified session.');
    }

    return { url: candidate.url, sessionId: memSession.id };
  },

  async markSessionConsumed(sessionId: string): Promise<void> {
    try {
      const supabase = createAdminClient();
      await supabase
        .from('product_image_candidate_sessions')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (_) {}

    const memSession = memorySessionStore.get(sessionId);
    if (memSession) {
      memSession.consumed = true;
    }
  },

  async invalidateSession(sessionId: string): Promise<void> {
    try {
      const supabase = createAdminClient();
      await supabase
        .from('product_image_candidate_sessions')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (_) {}

    memorySessionStore.delete(sessionId);
  }
};
