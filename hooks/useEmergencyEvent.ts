'use client';

import { useEffect, useRef } from 'react';
import { getEventsForStage, type EmergencyEvent } from '@/lib/events/emergencyEvents';

interface Options {
  stageId: string;
  enabled: boolean;
  onTrigger: (event: EmergencyEvent) => void;
  minDelayMs?: number;
  maxDelayMs?: number;
}

export function useEmergencyEvent({
  stageId,
  enabled,
  onTrigger,
  minDelayMs = 25000,
  maxDelayMs = 90000,
}: Options) {
  const triggered = useRef(false);
  const enabledRef = useRef(enabled);
  const onTriggerRef = useRef(onTrigger);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { onTriggerRef.current = onTrigger; }, [onTrigger]);

  useEffect(() => {
    triggered.current = false;

    const delay = minDelayMs + Math.random() * (maxDelayMs - minDelayMs);

    const timer = setTimeout(() => {
      if (triggered.current || !enabledRef.current) return;

      const events = getEventsForStage(stageId);
      if (events.length === 0) return;

      const event = events[Math.floor(Math.random() * events.length)];
      triggered.current = true;
      onTriggerRef.current(event);
    }, delay);

    return () => clearTimeout(timer);
  // Reset timer only when the stage changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageId]);
}
