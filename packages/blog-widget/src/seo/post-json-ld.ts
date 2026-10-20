/**
 * JSON-LD for the post page (PRD-264 EUAI-08c, EU AI Act Art. 50(4)).
 *
 * While a post is open, the widget puts one schema.org `BlogPosting` block in
 * the host page's `<head>`. It goes in the light DOM, not the widget's shadow
 * root, so crawlers and other tools that read structured data find it. A post
 * the server flags `ai_generated` carries `digitalSourceType` with the IPTC
 * term for AI-made content, the same term media-render writes into files
 * (EUAI-06a). The block is removed when the reader leaves the post.
 */

import type { BlogPost } from '@automatos/core';
import { isAIGenerated } from '../components/ai-label';

/** IPTC Digital Source Type for content a trained model generated. */
export const AI_DIGITAL_SOURCE_TYPE =
  'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia';

/** Marks the widget's JSON-LD script, so it can be found and replaced. */
export const POST_JSON_LD_ATTR = 'data-automatos-blog-jsonld';

const SCHEMA_CONTEXT = 'https://schema.org';
const POSTING_TYPE = 'BlogPosting';
const JSON_LD_MIME = 'application/ld+json';

/**
 * The `BlogPosting` object for a post. Optional fields appear only when the
 * post has them. An AI-generated post gets `digitalSourceType` and no
 * `Person` author, since no person wrote it.
 */
export function buildPostJsonLd(post: BlogPost): Record<string, unknown> {
  const aiGenerated = isAIGenerated(post);
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': POSTING_TYPE,
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    ...(post.cover_image_url ? { image: post.cover_image_url } : {}),
    ...(post.category ? { articleSection: post.category } : {}),
    ...(post.tags.length > 0 ? { keywords: post.tags.join(', ') } : {}),
    ...(!aiGenerated && post.author_name
      ? { author: { '@type': 'Person', name: post.author_name } }
      : {}),
    ...(aiGenerated ? { digitalSourceType: AI_DIGITAL_SOURCE_TYPE } : {}),
  };
}

/**
 * JSON text safe to sit inside a `<script>`: `<` is escaped, so post text
 * containing `</script>` can't end the block if the page is serialised.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Adds the post's JSON-LD to `doc.head` and returns the script element. */
export function mountPostJsonLd(post: BlogPost, doc: Document = document): HTMLScriptElement {
  const script = doc.createElement('script');
  script.type = JSON_LD_MIME;
  script.setAttribute(POST_JSON_LD_ATTR, 'true');
  script.textContent = serializeJsonLd(buildPostJsonLd(post));
  doc.head.appendChild(script);
  return script;
}
