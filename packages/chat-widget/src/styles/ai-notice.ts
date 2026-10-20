/**
 * Styles for the AI badge and the opening notice (PRD-264 EUAI-02b).
 *
 * Literal colours on purpose: deployers restyle the widget through CSS
 * variables (`themeOverrides`), and none of these rules reads one, so no
 * override can make the notice invisible (Art. 50(5), "not hideable").
 * The badge carries a ring in the opposite colour, so it stands out on any
 * header background. Light and dark each get a high-contrast pair.
 */
export const aiNoticeCSS = `
/* ── AI badge ── */
.aw-ai-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 22px;
  height: 18px;
  padding: 0 6px;
  margin-right: 8px;
  border-radius: 9px;
  background: #111827;
  color: #ffffff;
  box-shadow: 0 0 0 1px #ffffff;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  letter-spacing: 0.04em;
  visibility: visible;
  opacity: 1;
}

:host([data-theme="dark"]) .aw-ai-badge {
  background: #f9fafb;
  color: #111827;
  box-shadow: 0 0 0 1px #111827;
}

/* ── Opening notice ── */
.aw-ai-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: stretch;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #c7d2fe;
  background: #eef2ff;
  color: #111827;
  font-size: 13px;
  line-height: 1.4;
  visibility: visible;
  opacity: 1;
}

:host([data-theme="dark"]) .aw-ai-notice {
  border-color: #4b5563;
  background: #111827;
  color: #f9fafb;
}

.aw-ai-notice .aw-ai-notice-badge {
  margin-right: 0;
}
`;
