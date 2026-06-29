import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';

import { supabase } from '../../../lib/supabase';

type UsePostgresChannelOptions = {
  enabled: boolean;
  /** Stable logical key; a unique suffix is appended per subscription. */
  channelKey: string;
  setup: (channel: RealtimeChannel) => void;
};

function createUniqueChannelName(channelKey: string): string {
  const suffix =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  return `${channelKey}-${suffix}`;
}

/** Removes prior Realtime channels for the same logical key (Supabase reuses topics). */
function removeStaleChannelsForKey(channelKey: string): void {
  const topicPrefix = `realtime:${channelKey}`;
  for (const existing of supabase.getChannels()) {
    const topic = existing.topic;
    if (
      topic === topicPrefix ||
      topic.startsWith(`${topicPrefix}:`) ||
      topic.startsWith(`${topicPrefix}-`)
    ) {
      void supabase.removeChannel(existing);
    }
  }
}

/**
 * Subscribes to Supabase Realtime without reusing a subscribed channel name
 * (avoids "cannot add postgres_changes callbacks after subscribe()").
 */
export function usePostgresChannel({
  enabled,
  channelKey,
  setup,
}: UsePostgresChannelOptions): void {
  const setupRef = useRef(setup);
  setupRef.current = setup;

  useEffect(() => {
    if (!enabled || !channelKey) return;

    removeStaleChannelsForKey(channelKey);

    const channel = supabase.channel(createUniqueChannelName(channelKey));
    setupRef.current(channel);
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, channelKey]);
}
