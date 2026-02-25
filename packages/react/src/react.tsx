import { useEffect, useRef, useCallback } from 'react';
import type { AutomatosConfig } from '@automatos/core';
import { ChatWidget } from '@automatos/chat-widget';

export interface AutomatosChatProps {
  apiKey: string;
  baseUrl?: string;
  position?: 'bottom-right' | 'bottom-left';
  theme?: 'light' | 'dark';
  greeting?: string;
  agentId?: number;
  modelId?: string;
}

/**
 * React component that mounts the Automatos chat widget.
 */
export function AutomatosChat(props: AutomatosChatProps) {
  const widgetRef = useRef<ChatWidget | null>(null);

  useEffect(() => {
    const config: AutomatosConfig = {
      apiKey: props.apiKey,
      widget: 'chat',
      baseUrl: props.baseUrl,
      position: props.position ?? 'bottom-right',
      theme: props.theme ?? 'light',
      greeting: props.greeting,
      agentId: props.agentId,
      modelId: props.modelId,
    };

    widgetRef.current = new ChatWidget(config);

    return () => {
      widgetRef.current?.destroy();
      widgetRef.current = null;
    };
  }, [props.apiKey, props.baseUrl, props.position, props.theme, props.greeting, props.agentId, props.modelId]);

  // This component doesn't render anything — the widget manages its own DOM
  return null;
}

/**
 * Hook for programmatic control of the chat widget.
 */
export function useAutomatosChat(props: AutomatosChatProps) {
  const widgetRef = useRef<ChatWidget | null>(null);

  useEffect(() => {
    const config: AutomatosConfig = {
      apiKey: props.apiKey,
      widget: 'chat',
      baseUrl: props.baseUrl,
      position: props.position ?? 'bottom-right',
      theme: props.theme ?? 'light',
      greeting: props.greeting,
      agentId: props.agentId,
      modelId: props.modelId,
    };

    widgetRef.current = new ChatWidget(config);

    return () => {
      widgetRef.current?.destroy();
      widgetRef.current = null;
    };
  }, [props.apiKey, props.baseUrl, props.position, props.theme, props.greeting, props.agentId, props.modelId]);

  const open = useCallback(() => widgetRef.current?.open(), []);
  const close = useCallback(() => widgetRef.current?.close(), []);
  const toggle = useCallback(() => widgetRef.current?.toggle(), []);
  const destroy = useCallback(() => {
    widgetRef.current?.destroy();
    widgetRef.current = null;
  }, []);

  return { open, close, toggle, destroy };
}
