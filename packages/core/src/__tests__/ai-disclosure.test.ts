import { describe, expect, it } from 'vitest';
import {
  AI_ARIA_LABELS,
  AI_ASSISTANT_LABEL_BY_LANGUAGE,
  DEFAULT_AI_DISCLOSURE,
  aiAssistantLabel,
  languageOf,
  resolveAIDisclosure,
} from '../ai-disclosure';

/**
 * PRD-264 EUAI-02b: whatever the server sends (or doesn't), the widget gets
 * a notice that says it is an AI. An old server omits `ai_disclosure`; the
 * English default stands in, never an unlabelled widget.
 */
describe('resolveAIDisclosure', () => {
  it('uses the English default when the server sent no notice (old server)', () => {
    expect(resolveAIDisclosure(undefined)).toEqual({
      badge: 'AI',
      line: 'You are chatting with an AI assistant.',
      locale: 'en',
    });
    expect(resolveAIDisclosure(null)).toEqual(DEFAULT_AI_DISCLOSURE);
    expect(resolveAIDisclosure('AI')).toEqual(DEFAULT_AI_DISCLOSURE);
  });

  it("keeps the server's notice when it is well formed", () => {
    const pt = { badge: 'IA', line: 'Está a conversar com um assistente de IA.', locale: 'pt' };
    expect(resolveAIDisclosure(pt)).toEqual(pt);
  });

  it('accepts the stream event shape and drops its extra fields', () => {
    const event = {
      type: 'ai_disclosure',
      badge: 'KI',
      line: 'Sie chatten mit einem KI-Assistenten.',
      locale: 'de',
      conversation_id: 'conv_1',
    };
    expect(resolveAIDisclosure(event)).toEqual({
      badge: 'KI',
      line: 'Sie chatten mit einem KI-Assistenten.',
      locale: 'de',
    });
  });

  it('fills each missing, empty or non-text field with the default', () => {
    expect(resolveAIDisclosure({ badge: '', line: '  ', locale: 'fr' })).toEqual(
      DEFAULT_AI_DISCLOSURE,
    );
    expect(resolveAIDisclosure({ badge: 42, line: ['x'] })).toEqual(DEFAULT_AI_DISCLOSURE);
    expect(resolveAIDisclosure({ badge: 'IA', locale: 'es' })).toEqual({
      badge: 'IA',
      line: DEFAULT_AI_DISCLOSURE.line,
      locale: 'es',
    });
  });

  it('keeps the badge and locale together: no locale without its badge', () => {
    // A locale with no badge would label "AI" in a Portuguese frame; the
    // default badge goes with the default locale.
    expect(resolveAIDisclosure({ line: 'Olá', locale: 'pt' })).toEqual({
      badge: 'AI',
      line: 'Olá',
      locale: 'en',
    });
  });

  it('refuses an oversized field rather than flooding the UI', () => {
    const resolved = resolveAIDisclosure({ badge: 'AI', line: 'x'.repeat(5000), locale: 'en' });
    expect(resolved.line).toBe(DEFAULT_AI_DISCLOSURE.line);
  });

  it('returns a fresh object each time (the default is never shared mutable state)', () => {
    const a = resolveAIDisclosure(undefined);
    const b = resolveAIDisclosure(undefined);
    expect(a).not.toBe(b);
    expect(Object.isFrozen(DEFAULT_AI_DISCLOSURE)).toBe(true);
  });
});

describe('aiAssistantLabel', () => {
  it('says "AI assistant" in the notice language, containing its badge term', () => {
    expect(aiAssistantLabel({ badge: 'AI', line: 'x', locale: 'en' })).toBe('AI assistant');
    expect(aiAssistantLabel({ badge: 'IA', line: 'x', locale: 'pt-BR' })).toBe('Assistente de IA');
    expect(aiAssistantLabel({ badge: 'IA', line: 'x', locale: 'fr_FR' })).toBe('Assistant IA');
    expect(aiAssistantLabel({ badge: 'KI', line: 'x', locale: 'de' })).toBe('KI-Assistent');
  });

  it('falls back to English for a language with no entry', () => {
    expect(aiAssistantLabel({ badge: 'AI', line: 'x', locale: 'nl' })).toBe('AI assistant');
  });

  it('every label names the AI with its language badge term', () => {
    const badgeByLanguage: Record<string, string> = {
      en: 'AI', pt: 'IA', es: 'IA', fr: 'IA', it: 'IA', de: 'KI',
    };
    for (const [language, label] of Object.entries(AI_ASSISTANT_LABEL_BY_LANGUAGE)) {
      expect(label).toContain(badgeByLanguage[language]);
    }
  });
});

describe('languageOf', () => {
  it('reads the language subtag and defaults to English', () => {
    expect(languageOf('pt-BR')).toBe('pt');
    expect(languageOf('ES')).toBe('es');
    expect(languageOf('')).toBe('en');
    expect(languageOf(undefined)).toBe('en');
  });
});

describe('AI_ARIA_LABELS', () => {
  it('names the AI in the accessible names (PRD-264 EUAI-02b)', () => {
    expect(AI_ARIA_LABELS.openChat).toBe('Open AI assistant chat');
    expect(AI_ARIA_LABELS.typing).toBe('AI assistant is typing');
  });
});
