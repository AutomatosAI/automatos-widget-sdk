type Listener<T> = (data: T) => void;

export class EventBus<Events extends { [K in keyof Events]: Events[K] }> {
  private listeners = new Map<keyof Events, Set<Listener<never>>>();

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as Listener<never>);
    return () => set.delete(listener as Listener<never>);
  }

  once<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const unsub = this.on(event, (data) => {
      unsub();
      listener(data);
    });
    return unsub;
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        try {
          (listener as Listener<Events[K]>)(data);
        } catch (err) {
          console.error(`[automatos] Event listener error (${String(event)}):`, err);
        }
      }
    }
  }

  off<K extends keyof Events>(event: K, listener?: Listener<Events[K]>): void {
    if (!listener) {
      this.listeners.delete(event);
    } else {
      this.listeners.get(event)?.delete(listener as Listener<never>);
    }
  }

  removeAll(): void {
    this.listeners.clear();
  }
}
