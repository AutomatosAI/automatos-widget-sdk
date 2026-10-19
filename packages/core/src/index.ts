export { AutomatosClient } from './client';
export { EventBus } from './event-bus';
export { AuthManager } from './auth';
export { ConversationManager } from './conversation';
export { parseSSEStream } from './sse-parser';
export {
  readPageContextFromElement,
  resolvePageContext,
  inferPageTypeFromPath,
  type ResolvePageContextInput,
} from './page-context';
export {
  submitCallback,
  type CallbackSubmitInput,
  type CallbackSubmitResult,
} from './callback-submit';
export { AutomatosError, AuthError, NetworkError, StreamError } from './errors';
// PRD-264 EUAI-02b: the AI notice every widget surface renders.
export {
  DEFAULT_AI_DISCLOSURE,
  AI_ASSISTANT_LABEL_BY_LANGUAGE,
  AI_ARIA_LABELS,
  aiAssistantLabel,
  languageOf,
  resolveAIDisclosure,
} from './ai-disclosure';
export type {
  AutomatosConfig,
  BlogConfig,
  ThemeConfig,
  WidgetType,
  WidgetPosition,
  WidgetTheme,
  BlogLayout,
  BlogPost,
  BlogPostListResponse,
  ChatRequest,
  ChatMessage,
  SSEEvent,
  SSEEventType,
  SSEMessageEvent,
  SSEToolStartEvent,
  SSEToolEndEvent,
  SSEDoneEvent,
  SSEErrorEvent,
  SessionTokenResponse,
  WidgetMessage,
  WidgetEvents,
  // PRD-007: page context + proactive engagement
  PageContext,
  ProactiveTriggerType,
  ProactiveTrigger,
  ProactiveFrequencyScope,
  ProactiveGreetingSource,
  ProactivePopupStyle,
  ProactiveDismissalScope,
  WidgetProactiveConfig,
  WidgetCartIdleConfig,
  WidgetCallbackConfig,
  WidgetConfigPayload,
  ProactiveOverride,
  // PRD-264 EUAI-02a/02b: the AI notice contract
  AIDisclosure,
  SSEAIDisclosureEvent,
} from './types';
