import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProactivePopup } from '../proactive/proactive-popup';

afterEach(() => {
  // Remove only popup hosts; keep document otherwise untouched.
  document.body
    .querySelectorAll('aw-proactive-popup')
    .forEach((el) => el.remove());
});

describe('ProactivePopup', () => {
  it('mounts a custom element under document.body', () => {
    const p = new ProactivePopup({ text: 'Hi there' });
    p.mount();
    const host = document.body.querySelector('aw-proactive-popup');
    expect(host).not.toBeNull();
    expect(p.isMounted()).toBe(true);
  });

  it('renders the supplied text inside the shadow DOM', () => {
    const p = new ProactivePopup({ text: 'Looking at fans?' });
    p.mount();
    const host = document.body.querySelector('aw-proactive-popup') as HTMLElement;
    const shadow = host.shadowRoot;
    expect(shadow).not.toBeNull();
    expect(shadow!.querySelector('.text')!.textContent).toBe('Looking at fans?');
  });

  it('updateText replaces text in place', () => {
    const p = new ProactivePopup({ text: 'canned' });
    p.mount();
    p.updateText('agent-generated opener');
    const host = document.body.querySelector('aw-proactive-popup') as HTMLElement;
    expect(host.shadowRoot!.querySelector('.text')!.textContent).toBe(
      'agent-generated opener',
    );
  });

  it('unmount removes the element', () => {
    const p = new ProactivePopup({ text: 'x' });
    p.mount();
    p.unmount();
    expect(document.body.querySelector('aw-proactive-popup')).toBeNull();
    expect(p.isMounted()).toBe(false);
  });

  it('mount is idempotent', () => {
    const p = new ProactivePopup({ text: 'x' });
    p.mount();
    p.mount();
    expect(document.body.querySelectorAll('aw-proactive-popup').length).toBe(1);
  });

  it('clicking the close button fires onDismiss without onClick', () => {
    const onClick = vi.fn();
    const onDismiss = vi.fn();
    const p = new ProactivePopup({ text: 'x', onClick, onDismiss });
    p.mount();
    const host = document.body.querySelector('aw-proactive-popup') as HTMLElement;
    const close = host.shadowRoot!.querySelector('.close') as HTMLButtonElement;
    close.click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('clicking the container body fires onClick', () => {
    const onClick = vi.fn();
    const onDismiss = vi.fn();
    const p = new ProactivePopup({ text: 'x', onClick, onDismiss });
    p.mount();
    const host = document.body.querySelector('aw-proactive-popup') as HTMLElement;
    const container = host.shadowRoot!.querySelector('.container') as HTMLElement;
    container.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('respects the position attribute', () => {
    const p = new ProactivePopup({ text: 'x', position: 'bottom-left' });
    p.mount();
    const host = document.body.querySelector('aw-proactive-popup') as HTMLElement;
    expect(host.getAttribute('data-position')).toBe('bottom-left');
  });

  it('respects the style attribute', () => {
    const p = new ProactivePopup({ text: 'x', style: 'slide_in_card' });
    p.mount();
    const host = document.body.querySelector('aw-proactive-popup') as HTMLElement;
    expect(host.getAttribute('data-style')).toBe('slide_in_card');
  });
});
