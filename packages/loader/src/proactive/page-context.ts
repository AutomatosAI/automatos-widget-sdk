/**
 * Page-context reader — moved to `@automatos/core` in PRD-141 so the chat
 * client can resolve the same snapshot it forwards on every regular message
 * (not just proactive openers). Re-exported here to preserve the existing
 * import paths used by the proactive + cart-idle bootstraps.
 */

export {
  readPageContextFromElement,
  resolvePageContext,
  inferPageTypeFromPath,
  type ResolvePageContextInput,
} from '@automatos/core';
