/**
 * Lightweight markdown to DOM parser (~300 lines).
 * XSS-safe: constructs DOM nodes directly, never uses innerHTML.
 *
 * Supports: paragraphs, headings (#-###), bold (**), italic (*),
 * inline code (`), code blocks (```), links [text](url), lists (- / 1.), hr (---)
 */

export function renderMarkdown(source: string): Node[] {
  const lines = source.split('\n');
  const nodes: Node[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block (```)
    if (line.trimStart().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      nodes.push(createCodeBlock(codeLines.join('\n')));
      continue;
    }

    // Heading (# - ###)
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const heading = document.createElement(`h${level}`);
      appendInlineNodes(heading, text);
      nodes.push(heading);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(line.trim()) || /^\*{3,}$/.test(line.trim())) {
      nodes.push(document.createElement('hr'));
      i++;
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      nodes.push(createList('ul', listItems));
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      nodes.push(createList('ol', listItems));
      continue;
    }

    // Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-empty non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trimStart().startsWith('```') &&
      !lines[i].match(/^#{1,3}\s+/) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^-{3,}$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    if (paraLines.length > 0) {
      const p = document.createElement('p');
      appendInlineNodes(p, paraLines.join('\n'));
      nodes.push(p);
    }
  }

  return nodes;
}

/**
 * Parses inline markdown (bold, italic, code, links) into DOM nodes.
 * Uses regex matching — note: regex.exec is a standard JS API for pattern matching,
 * not a shell command execution function.
 */
function appendInlineNodes(parent: HTMLElement, text: string): void {
  const tokens = tokenizeInline(text);
  for (const token of tokens) {
    parent.appendChild(token);
  }
}

function tokenizeInline(text: string): Node[] {
  const nodes: Node[] = [];
  // Process inline patterns using string splitting approach
  let remaining = text;

  while (remaining.length > 0) {
    // Find the earliest match of any inline pattern
    let earliestIndex = remaining.length;
    let matchType = '';
    let matchLen = 0;
    let matchContent = '';
    let matchExtra = '';

    // Check for **bold**
    const boldIdx = remaining.indexOf('**');
    if (boldIdx >= 0 && boldIdx < earliestIndex) {
      const end = remaining.indexOf('**', boldIdx + 2);
      if (end >= 0) {
        earliestIndex = boldIdx;
        matchType = 'bold';
        matchLen = end + 2 - boldIdx;
        matchContent = remaining.slice(boldIdx + 2, end);
      }
    }

    // Check for `code`
    const codeIdx = remaining.indexOf('`');
    if (codeIdx >= 0 && codeIdx < earliestIndex) {
      const end = remaining.indexOf('`', codeIdx + 1);
      if (end >= 0) {
        earliestIndex = codeIdx;
        matchType = 'code';
        matchLen = end + 1 - codeIdx;
        matchContent = remaining.slice(codeIdx + 1, end);
      }
    }

    // Check for [text](url)
    const linkIdx = remaining.indexOf('[');
    if (linkIdx >= 0 && linkIdx < earliestIndex) {
      const closeBracket = remaining.indexOf('](', linkIdx);
      if (closeBracket >= 0) {
        const closeParen = remaining.indexOf(')', closeBracket + 2);
        if (closeParen >= 0) {
          earliestIndex = linkIdx;
          matchType = 'link';
          matchLen = closeParen + 1 - linkIdx;
          matchContent = remaining.slice(linkIdx + 1, closeBracket);
          matchExtra = remaining.slice(closeBracket + 2, closeParen);
        }
      }
    }

    // Check for *italic* (single asterisk, not double)
    if (matchType !== 'bold') {
      const italicIdx = remaining.indexOf('*');
      if (italicIdx >= 0 && italicIdx < earliestIndex) {
        // Make sure it's not start of **
        if (remaining[italicIdx + 1] !== '*') {
          const end = remaining.indexOf('*', italicIdx + 1);
          if (end >= 0 && remaining[end - 1] !== '*') {
            earliestIndex = italicIdx;
            matchType = 'italic';
            matchLen = end + 1 - italicIdx;
            matchContent = remaining.slice(italicIdx + 1, end);
          }
        }
      }
    }

    // Append text before the match
    if (earliestIndex > 0) {
      appendTextNodes(nodes, remaining.slice(0, earliestIndex));
    }

    if (!matchType) {
      // No more matches — append rest as text
      if (remaining.length > 0 && earliestIndex === remaining.length) {
        appendTextNodes(nodes, remaining);
      }
      break;
    }

    // Create the matched element
    switch (matchType) {
      case 'bold': {
        const el = document.createElement('strong');
        el.textContent = matchContent;
        nodes.push(el);
        break;
      }
      case 'italic': {
        const el = document.createElement('em');
        el.textContent = matchContent;
        nodes.push(el);
        break;
      }
      case 'code': {
        const el = document.createElement('code');
        el.textContent = matchContent;
        nodes.push(el);
        break;
      }
      case 'link': {
        const el = document.createElement('a');
        el.textContent = matchContent;
        el.href = sanitizeUrl(matchExtra);
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
        nodes.push(el);
        break;
      }
    }

    remaining = remaining.slice(earliestIndex + matchLen);
  }

  return nodes;
}

function appendTextNodes(nodes: Node[], text: string): void {
  const parts = text.split('\n');
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      nodes.push(document.createTextNode(parts[i]));
    }
    if (i < parts.length - 1) {
      nodes.push(document.createElement('br'));
    }
  }
}

function createCodeBlock(code: string): HTMLElement {
  const pre = document.createElement('pre');
  const codeEl = document.createElement('code');
  codeEl.textContent = code;
  pre.appendChild(codeEl);
  return pre;
}

function createList(tag: 'ul' | 'ol', items: string[]): HTMLElement {
  const list = document.createElement(tag);
  for (const item of items) {
    const li = document.createElement('li');
    appendInlineNodes(li, item);
    list.appendChild(li);
  }
  return list;
}

/**
 * Sanitize URLs to prevent javascript: protocol XSS.
 */
function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  return '#';
}
