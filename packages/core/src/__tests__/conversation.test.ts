import { describe, it, expect } from 'vitest';
import { ConversationManager } from '../conversation';

describe('ConversationManager', () => {
  it('adds user messages', () => {
    const mgr = new ConversationManager();
    const msg = mgr.addUserMessage('hello');
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('hello');
    expect(msg.status).toBe('sending');
    expect(mgr.getMessages()).toHaveLength(1);
  });

  it('adds assistant placeholder', () => {
    const mgr = new ConversationManager();
    const msg = mgr.addAssistantPlaceholder();
    expect(msg.role).toBe('assistant');
    expect(msg.content).toBe('');
    expect(msg.status).toBe('streaming');
  });

  it('appends chunks', () => {
    const mgr = new ConversationManager();
    const msg = mgr.addAssistantPlaceholder();
    const c1 = mgr.appendChunk(msg.id, 'hello');
    expect(c1).toBe('hello');
    const c2 = mgr.appendChunk(msg.id, ' world');
    expect(c2).toBe('hello world');
  });

  it('finalizes messages', () => {
    const mgr = new ConversationManager();
    const msg = mgr.addAssistantPlaceholder();
    mgr.finalizeMessage(msg.id);
    expect(mgr.getMessages()[0].status).toBe('complete');
  });

  it('marks errors', () => {
    const mgr = new ConversationManager();
    const msg = mgr.addAssistantPlaceholder();
    mgr.markError(msg.id, 'something broke');
    const m = mgr.getMessages()[0];
    expect(m.status).toBe('error');
    expect(m.content).toBe('something broke');
  });

  it('loads history', () => {
    const mgr = new ConversationManager();
    mgr.loadHistory([
      { id: '1', role: 'user', content: 'hi', created_at: '2026-01-01T00:00:00Z' },
      { id: '2', role: 'assistant', content: 'hello!', created_at: '2026-01-01T00:00:01Z' },
    ]);
    expect(mgr.getMessages()).toHaveLength(2);
    expect(mgr.getMessages()[0].role).toBe('user');
    expect(mgr.getMessages()[1].status).toBe('complete');
  });

  it('clears all state', () => {
    const mgr = new ConversationManager();
    mgr.addUserMessage('test');
    mgr.conversationId = 'abc';
    mgr.clear();
    expect(mgr.getMessages()).toHaveLength(0);
    expect(mgr.conversationId).toBeNull();
  });

  it('adds greeting messages', () => {
    const mgr = new ConversationManager();
    const msg = mgr.addGreeting('Welcome!');
    expect(msg.role).toBe('assistant');
    expect(msg.content).toBe('Welcome!');
    expect(msg.status).toBe('complete');
  });
});
