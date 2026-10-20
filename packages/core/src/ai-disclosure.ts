/**
 * EU AI Act Article 50(1) AI notice, client side (PRD-264 EUAI-02b).
 *
 * The server builds the notice (EUAI-02a) and sends it in the public widget
 * config and as the first event of every chat stream. This module turns
 * whatever arrived into a notice the UI can always render: a missing or
 * malformed notice (an older server, a custom proxy) falls back to the
 * English default, so no widget is ever shown unlabelled.
 *
 * The badge term is fixed per locale (D17); the server owns that table. The
 * only client-side copy is the "AI assistant" label the popups show, which
 * the server contract does not carry.
 */

import type { AIDisclosure } from './types';

/** The English default, used whenever the server sent no usable notice. */
export const DEFAULT_AI_DISCLOSURE: Readonly<AIDisclosure> = Object.freeze({
  badge: 'AI',
  line: 'You are chatting with an AI assistant.',
  locale: 'en',
});

/** Language used when a locale has no entry in a table below. */
const FALLBACK_LANGUAGE = 'en';

/**
 * "AI assistant" in each language the server's badge table covers
 * (`en` AI; `pt`, `es`, `fr`, `it` IA; `de` KI). Each form contains the
 * language's badge term.
 */
export const AI_ASSISTANT_LABEL_BY_LANGUAGE: Readonly<Record<string, string>> = Object.freeze({
  en: 'AI assistant',
  pt: 'Assistente de IA',
  es: 'Asistente de IA',
  fr: 'Assistant IA',
  it: 'Assistente IA',
  de: 'KI-Assistent',
});

/** Accessible names that say the widget is an AI (English, per PRD-264). */
export const AI_ARIA_LABELS = Object.freeze({
  openChat: 'Open AI assistant chat',
  closeChat: 'Close AI assistant chat',
  typing: 'AI assistant is typing',
  panel: 'AI assistant chat',
});

/** Upper bound on a server-sent field, so a broken payload can't flood the UI. */
const MAX_FIELD_CHARS = 400;

function cleanField(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_FIELD_CHARS) return null;
  return trimmed;
}

/** The language subtag of a locale: `pt-BR` and `pt_BR` give `pt`. */
export function languageOf(locale: string | undefined): string {
  const language = (locale ?? '').split(/[-_]/)[0]?.toLowerCase();
  return language || FALLBACK_LANGUAGE;
}

/**
 * A notice the UI can render, built from whatever the server sent.
 *
 * Each field that is missing, empty, not text or oversized takes the
 * English default, so the result always says it is an AI.
 */
export function resolveAIDisclosure(raw: unknown): AIDisclosure {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const badge = cleanField(source.badge);
  const line = cleanField(source.line);
  const locale = cleanField(source.locale);
  return {
    badge: badge ?? DEFAULT_AI_DISCLOSURE.badge,
    line: line ?? DEFAULT_AI_DISCLOSURE.line,
    locale: badge && locale ? locale : DEFAULT_AI_DISCLOSURE.locale,
  };
}

/** "AI assistant" in the notice's language; English when the language has no entry. */
export function aiAssistantLabel(disclosure: AIDisclosure): string {
  return (
    AI_ASSISTANT_LABEL_BY_LANGUAGE[languageOf(disclosure.locale)] ??
    AI_ASSISTANT_LABEL_BY_LANGUAGE[FALLBACK_LANGUAGE]
  );
}
