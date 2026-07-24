import type { RealtimeChannel } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  CirclePresenceMap,
  CirclePresencePayload,
  CirclePresenceState,
  RealtimeConnectionState,
} from './circle-presence.types';
import { normalizePresenceState } from './normalize-presence-state';
import { circleTopic, parseCircleTopic } from './topic';

type Listener = (map: CirclePresenceMap, connection: RealtimeConnectionState) => void;

/**
 * At most one open circle channel.
 * Production: private Realtime Presence.
 * Demo (no Supabase): in-memory local track only — never writes last_seen to DB.
 *
 * Phase 6: track `responded` only after DB response RPC succeeds.
 */
class CirclePresenceService {
  private channel: RealtimeChannel | null = null;
  private circleId: string | null = null;
  private userId: string | null = null;
  private sessionId: string | null = null;
  private activePostId: string | null = null;
  private state: CirclePresenceState = 'present';
  private connection: RealtimeConnectionState = 'idle';
  private localSessions: CirclePresencePayload[] = [];
  private listeners = new Set<Listener>();
  private map: CirclePresenceMap = {};

  getConnectionState(): RealtimeConnectionState {
    return this.connection;
  }

  getMap(): CirclePresenceMap {
    return this.map;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.map, this.connection);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    for (const l of this.listeners) l(this.map, this.connection);
  }

  private setConnection(next: RealtimeConnectionState) {
    this.connection = next;
    this.emit();
  }

  private setMap(map: CirclePresenceMap) {
    this.map = map;
    this.emit();
  }

  private buildPayload(): CirclePresencePayload {
    return {
      userId: this.userId!,
      circleId: this.circleId!,
      activePostId: this.activePostId,
      state: this.state,
      sessionId: this.sessionId!,
    };
  }

  async join(input: {
    circleId: string;
    userId: string;
    isMember: boolean;
    activePostId?: string | null;
    /** Only pass responded after DB save success */
    state?: CirclePresenceState;
  }): Promise<RealtimeConnectionState> {
    if (!input.isMember) {
      await this.leave();
      this.setConnection('forbidden');
      return 'forbidden';
    }

    const topic = circleTopic(input.circleId);
    if (!parseCircleTopic(topic)) {
      this.setConnection('error');
      return 'error';
    }

    const nextPostId = input.activePostId ?? null;
    const nextState = input.state ?? 'present';

    // Already on this circle with same user — refresh track if post/state changed
    if (
      this.channel &&
      this.circleId === input.circleId &&
      this.userId === input.userId &&
      this.connection === 'connected'
    ) {
      if (this.activePostId !== nextPostId || this.state !== nextState) {
        this.activePostId = nextPostId;
        this.state = nextState;
        await this.retrack();
      }
      return 'connected';
    }

    await this.leave();

    this.circleId = input.circleId;
    this.userId = input.userId;
    this.activePostId = nextPostId;
    this.state = nextState === 'responded' ? 'responded' : 'present';
    this.sessionId = `${input.userId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    this.setConnection('connecting');

    if (!isSupabaseConfigured) {
      return this.joinLocal();
    }

    const channel = supabase.channel(topic, {
      config: {
        private: true,
        presence: { key: this.sessionId },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<CirclePresencePayload>();
        this.setMap(normalizePresenceState(state as Record<string, CirclePresencePayload[]>));
      })
      .on('presence', { event: 'join' }, () => {
        const state = channel.presenceState<CirclePresencePayload>();
        this.setMap(normalizePresenceState(state as Record<string, CirclePresencePayload[]>));
      })
      .on('presence', { event: 'leave' }, () => {
        const state = channel.presenceState<CirclePresencePayload>();
        this.setMap(normalizePresenceState(state as Record<string, CirclePresencePayload[]>));
      });

    this.channel = channel;

    return new Promise((resolve) => {
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.track(this.buildPayload());
            this.setConnection('connected');
            resolve('connected');
          } catch {
            this.setConnection('error');
            resolve('error');
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.setConnection('forbidden');
          resolve('forbidden');
        } else if (status === 'CLOSED') {
          this.setConnection('idle');
        }
      });
    });
  }

  private joinLocal(): RealtimeConnectionState {
    const payload = this.buildPayload();
    this.localSessions = [payload];
    this.setMap(normalizePresenceState(this.localSessions));
    this.setConnection('connected');
    return 'connected';
  }

  private async retrack(): Promise<void> {
    if (!this.circleId || !this.userId || !this.sessionId) return;
    const payload = this.buildPayload();
    if (!isSupabaseConfigured) {
      this.localSessions = this.localSessions.map((s) =>
        s.sessionId === this.sessionId ? payload : s,
      );
      if (!this.localSessions.some((s) => s.sessionId === this.sessionId)) {
        this.localSessions.push(payload);
      }
      this.setMap(normalizePresenceState(this.localSessions));
      return;
    }
    if (this.channel) {
      await this.channel.track(payload);
    }
  }

  /**
   * Call only after acknowledge / poll RPC returns responded=true.
   * Never call before DB save success.
   */
  async trackResponded(activePostId: string): Promise<void> {
    if (!this.circleId || !this.userId || this.connection !== 'connected') return;
    this.activePostId = activePostId;
    this.state = 'responded';
    await this.retrack();
  }

  /** When a new active post appears, reset local claim to present for that post */
  async trackPresent(activePostId: string | null): Promise<void> {
    if (!this.circleId || !this.userId || this.connection !== 'connected') return;
    this.activePostId = activePostId;
    this.state = 'present';
    await this.retrack();
  }

  /** Demo helper: simulate another device/session for the same user */
  trackLocalExtraSession(
    userId: string,
    opts?: { state?: CirclePresenceState; activePostId?: string | null },
  ): void {
    if (!this.circleId || isSupabaseConfigured) return;
    this.localSessions.push({
      userId,
      circleId: this.circleId,
      activePostId: opts?.activePostId ?? null,
      state: opts?.state ?? 'present',
      sessionId: `${userId}:extra:${Date.now()}`,
    });
    this.setMap(normalizePresenceState(this.localSessions));
  }

  async leave(): Promise<void> {
    const ch = this.channel;
    this.channel = null;
    this.localSessions = [];
    this.setMap({});
    this.circleId = null;
    this.userId = null;
    this.sessionId = null;
    this.activePostId = null;
    this.state = 'present';

    if (ch) {
      try {
        await ch.untrack();
      } catch {
        /* ignore */
      }
      try {
        await supabase.removeChannel(ch);
      } catch {
        /* ignore */
      }
    }
    this.setConnection('idle');
  }

  async onAppBackground(): Promise<void> {
    await this.leave();
  }

  async onAppForeground(input: {
    circleId: string;
    userId: string;
    isMember: boolean;
    activePostId?: string | null;
    state?: CirclePresenceState;
  }): Promise<void> {
    await this.join(input);
  }
}

export const circlePresenceService = new CirclePresenceService();
