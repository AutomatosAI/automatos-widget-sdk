import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../event-bus';

interface TestEvents {
  hello: { name: string };
  count: number;
  empty: void;
}

describe('EventBus', () => {
  it('emits events to listeners', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.on('hello', handler);
    bus.emit('hello', { name: 'world' });
    expect(handler).toHaveBeenCalledWith({ name: 'world' });
  });

  it('returns unsubscribe function', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    const unsub = bus.on('count', handler);
    bus.emit('count', 1);
    unsub();
    bus.emit('count', 2);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('once fires only once', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.once('count', handler);
    bus.emit('count', 1);
    bus.emit('count', 2);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(1);
  });

  it('off removes specific listener', () => {
    const bus = new EventBus<TestEvents>();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('count', h1);
    bus.on('count', h2);
    bus.off('count', h1);
    bus.emit('count', 42);
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledWith(42);
  });

  it('off removes all listeners for event', () => {
    const bus = new EventBus<TestEvents>();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('count', h1);
    bus.on('count', h2);
    bus.off('count');
    bus.emit('count', 42);
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });

  it('removeAll clears everything', () => {
    const bus = new EventBus<TestEvents>();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('hello', h1);
    bus.on('count', h2);
    bus.removeAll();
    bus.emit('hello', { name: 'test' });
    bus.emit('count', 1);
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });

  it('handles listener errors gracefully', () => {
    const bus = new EventBus<TestEvents>();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const badHandler = () => { throw new Error('boom'); };
    const goodHandler = vi.fn();
    bus.on('count', badHandler);
    bus.on('count', goodHandler);
    bus.emit('count', 1);
    expect(goodHandler).toHaveBeenCalledWith(1);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
