/**
 * Re-export from @automatos/core so existing loader imports keep working.
 * The real implementation lives in core/src/callback-submit.ts so the
 * chat-widget package can render an inline form using the same submit
 * logic (PRD-008-A.3).
 */
export { submitCallback } from '@automatos/core';
export type { CallbackSubmitInput, CallbackSubmitResult } from '@automatos/core';
