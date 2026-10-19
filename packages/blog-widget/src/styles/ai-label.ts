/**
 * Styles for the "AI-generated" label (PRD-264 EUAI-08c).
 *
 * Literal colours on purpose: deployers restyle the widget through CSS
 * variables (`themeOverrides`), and none of these rules reads one, so no
 * override can make the label invisible (Art. 50(5), "not hideable"). The
 * label carries a ring in the opposite colour, so it stands out on any card,
 * including the featured layout's image overlay. Light and dark each get a
 * high-contrast pair.
 */
export const aiLabelCSS = /* css */ `
.aw-ai-label {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: 10px;
  background: #111827;
  color: #ffffff;
  box-shadow: 0 0 0 1px #ffffff;
  font-size: 0.85em;
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
  visibility: visible;
  opacity: 1;
}

:host([data-theme="dark"]) .aw-ai-label {
  background: #f9fafb;
  color: #111827;
  box-shadow: 0 0 0 1px #111827;
}

/* The label lengthens the card byline; let it wrap rather than overflow. */
.aw-post-card[data-ai-generated="true"] .aw-post-card-meta {
  flex-wrap: wrap;
  row-gap: 6px;
}
`;
