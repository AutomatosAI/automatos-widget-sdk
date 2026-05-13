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
  /**
   * Page context populated by the host page (e.g. Shopify Liquid block).
   * Powers PRD-007 proactive engagement and contextual openers.
   */
  pageContext?: PageContext;
  /**
   * Element selector or HTMLElement to read page-context `data-*` attributes
   * from. Falls back to the widget mount node. Used as a secondary source
   * if `pageContext` is not provided directly.
   */
  pageContextElement?: string | HTMLElement;
}

// ── PRD-007: Page context + Proactive engagement ──

/**
 * Snapshot of the page the shopper is on. Populated by the host (e.g.
 * Shopify Liquid theme block) and forwarded to the orchestrator on chat init
 * + proactive opener requests so the agent can respond contextually.
 */
export interface PageContext {
  pageType?: string;
  template?: string;
  productId?: string | number;
  productHandle?: string;
  productType?: string;
  productVendor?: string;
  productTitle?: string;
  productPrice?: string | number;
  productAvailable?: boolean;
  collectionId?: string | number;
  collectionHandle?: string;
  collectionTitle?: string;
  shopDomain?: string;
  shopCurrency?: string;
  shopLocale?: string;
  customerId?: string | number;
  customerTags?: string;
  cartItemCount?: number;
  cartTotalPrice?: string | number;
}

export type ProactiveTriggerType =
  | 'time_on_page'
  | 'scroll_depth'
  | 'exit_intent'
  | 'idle';

export interface ProactiveTrigger {
  type: ProactiveTriggerType;
  /** seconds (for time_on_page, idle); percent for scroll_depth */
  seconds?: number;
  percent?: number;
}

export type ProactiveFrequencyScope = 'session' | 'day' | 'product_session';
export type ProactiveGreetingSource =
  | 'agent'
  | 'canned'
  | 'agent_with_canned_fallback';
export type ProactivePopupStyle = 'corner_bubble' | 'slide_in_card';
export type ProactiveDismissalScope =
  | 'session'
  | 'day'
  | 'until_navigation';

export interface WidgetProactiveConfig {
  enabled: boolean;
  page_types: string[];
  triggers: ProactiveTrigger[];
  frequency_cap: {
    scope: ProactiveFrequencyScope;
    max_pops: number;
  };
  greeting_source: ProactiveGreetingSource;
  canned_fallback: string;
  agent_timeout_ms: number;
  popup_style: ProactivePopupStyle;
  respect_consent: boolean;
  dismissal_persistence: ProactiveDismissalScope;
}

/** Public widget config returned by GET /api/widgets/config */
export interface WidgetConfigPayload {
  widget_proactive?: WidgetProactiveConfig;
}

export interface ThemeConfig {
  /** Primary accent colour — FAB, send button, user bubble, blog post titles on hover */
  '--aw-primary': string;
  /** Hover state for primary buttons */
  '--aw-primary-hover': string;
  /** Panel background — chat panel, blog widget root */
  '--aw-bg': string;
  /** Secondary surface — assistant bubble, input field, blog post card bg */
  '--aw-bg-secondary': string;
  /** Primary text colour */
  '--aw-text': string;
  /** Muted text — timestamps, "Powered by", post metadata, excerpts */
  '--aw-text-secondary': string;
  /** Dividers, input borders, post card borders */
  '--aw-border': string;
  /** Box shadow on the chat panel and blog post cards */
  '--aw-shadow': string;
  /** Corner radius applied to bubbles, panel, FAB, post cards */
  '--aw-radius': string;
  /** Font family — must be loaded by the host page */
  '--aw-font': string;
  /** Blog only — background of inline code and code blocks in post content */
  '--aw-code-bg': string;
  /** Blog only — foreground colour of code text */
  '--aw-code-text': string;
}

// ── Chat API Types ──

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  agent_id?: string;
  model_id?: string;
  /** PRD-007: page snapshot forwarded to the agent as context */
  page_context?: PageContext;
  /** PRD-007: e.g. "proactive_opener" — flips agent into opener-generation mode */
  trigger_reason?: string;
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
  /** PRD-007: public widget config the SDK consumes on init */
  widget_config?: WidgetConfigPayload;
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
