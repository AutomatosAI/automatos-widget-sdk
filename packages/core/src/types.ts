// ── Widget Configuration ──

export type WidgetType = 'chat' | 'blog';
export type WidgetPosition = 'bottom-right' | 'bottom-left';
export type WidgetTheme = 'light' | 'dark';

export type BlogLayout = 'grid' | 'list' | 'featured' | 'minimal';

export interface AutomatosConfig {
  apiKey: string;
  widget: WidgetType;
  baseUrl?: string;
  position?: WidgetPosition;
  theme?: WidgetTheme;
  /** Custom title shown in the chat header */
  title?: string;
  greeting?: string;
  /** Agent UUID (public_id). Also accepts legacy integer id for backward compat. */
  agentId?: string;
  modelId?: string;
  /** Custom CSS properties to override theme defaults */
  themeOverrides?: Partial<ThemeConfig>;
  // Blog-specific config
  /** Blog layout variant */
  layout?: BlogLayout;
  /** Number of posts per page (default 6) */
  postsPerPage?: number;
  /** Filter by category */
  category?: string;
  /** Filter by tag */
  tag?: string;
  /** CSS selector for blog widget mount target */
  containerSelector?: string;
}

export interface ThemeConfig {
  '--aw-primary': string;
  '--aw-primary-hover': string;
  '--aw-bg': string;
  '--aw-bg-secondary': string;
  '--aw-text': string;
  '--aw-text-secondary': string;
  '--aw-border': string;
  '--aw-shadow': string;
  '--aw-radius': string;
  '--aw-font': string;
}

// ── Chat API Types ──

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  agent_id?: string;
  model_id?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

// ── SSE Event Types ──

export type SSEEventType = 'message' | 'tool-start' | 'tool-end' | 'tool-data' | 'done' | 'error';

export interface SSEEvent {
  event: SSEEventType;
  data: Record<string, unknown>;
}

export interface SSEMessageEvent {
  event: 'message';
  data: {
    content: string;
    conversation_id?: string;
  };
}

export interface SSEToolStartEvent {
  event: 'tool-start';
  data: {
    tool: string;
    arguments?: Record<string, unknown>;
  };
}

export interface SSEToolEndEvent {
  event: 'tool-end';
  data: {
    tool: string;
    result?: unknown;
  };
}

export interface SSEDoneEvent {
  event: 'done';
  data: {
    conversation_id: string;
    message_id?: string;
  };
}

export interface SSEErrorEvent {
  event: 'error';
  data: {
    message: string;
    code?: string;
  };
}

// ── Blog API Types ──

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string | null;
  tags: string[];
  category: string | null;
  author_name: string;
  published_at: string;
  reading_time_minutes: number;
  /** Full post content (HTML). Only present in detail view. */
  content?: string;
}

export interface BlogPostListResponse {
  posts: BlogPost[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ── Session Types ──

export interface SessionTokenResponse {
  session_token: string;
  expires_at: string;
  permissions: string[];
  workspace_id: string;
}

// ── Widget Messages (internal state) ──

export interface WidgetMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  status: 'sending' | 'streaming' | 'complete' | 'error';
}

// ── Widget Events ──

export interface WidgetEvents {
  'chat:message': WidgetMessage;
  'chat:chunk': { messageId: string; content: string; fullContent: string };
  'chat:done': { messageId: string; conversationId: string };
  'chat:error': { messageId: string; error: Error };
  'chat:tool-start': { tool: string; arguments?: Record<string, unknown> };
  'chat:tool-end': { tool: string; result?: unknown };
  'widget:open': void;
  'widget:close': void;
  'widget:ready': void;
  'widget:destroy': void;
  'auth:success': { workspaceId: string };
  'auth:error': Error;
}
