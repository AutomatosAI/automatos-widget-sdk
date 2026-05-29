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
export type {
  AutomatosConfig,
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
} from './types';
