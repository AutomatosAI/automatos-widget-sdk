import { useEffect, useRef, useCallback } from 'react';
import type { AutomatosConfig, BlogLayout } from '@automatos/core';
import { ChatWidget } from '@automatos/chat-widget';
import { BlogWidget } from '@automatos/blog-widget';

export interface AutomatosChatProps {
  apiKey: string;
  baseUrl?: string;
  position?: 'bottom-right' | 'bottom-left';
  theme?: 'light' | 'dark';
  greeting?: string;
  agentId?: string;
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

// ── Blog Widget ──

export interface AutomatosBlogProps {
  apiKey: string;
  baseUrl?: string;
  layout?: BlogLayout;
  postsPerPage?: number;
  category?: string;
  tag?: string;
  theme?: 'light' | 'dark';
  themeOverrides?: Partial<Record<string, string>>;
  className?: string;
}

export function AutomatosBlog(props: AutomatosBlogProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<BlogWidget | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const id = `automatos-blog-${Date.now()}`;
    containerRef.current.id = id;

    const config: AutomatosConfig = {
      apiKey: props.apiKey,
      widget: 'blog',
      baseUrl: props.baseUrl,
      theme: props.theme ?? 'light',
      layout: props.layout ?? 'grid',
      postsPerPage: props.postsPerPage ?? 6,
      category: props.category,
      tag: props.tag,
      containerSelector: `#${id}`,
      themeOverrides: props.themeOverrides as AutomatosConfig['themeOverrides'],
    };

    widgetRef.current = new BlogWidget(config);

    return () => {
      widgetRef.current?.destroy();
      widgetRef.current = null;
    };
  }, [props.apiKey, props.baseUrl, props.layout, props.postsPerPage, props.category, props.tag, props.theme]);

  return <div ref={containerRef} className={props.className} />;
}
