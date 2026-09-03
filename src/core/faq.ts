/**
 * Mise en forme des réponses de la FAQ.
 *
 * Le backend fournit la réponse en Markdown, plus deux listes de décorations :
 * des acronymes à expliciter (`<abbr>`) et des libellés à transformer en liens.
 * Ces trois entrées sont du contenu tiers : le HTML final repasse au sanitizer.
 */
import type { FaqEntry } from "../data/domain";
import { renderMarkdown, sanitizeHtml } from "./markdown";

const escapeRegExp = (literal: string): string =>
  literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeAttribute = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

/** Chaque libellé d'action devient un lien, quelle que soit sa casse. */
const linkActions = (html: string, actions: FaqEntry["actions"]): string =>
  actions.reduce(
    (acc, { label, url }) =>
      acc.replace(
        new RegExp(escapeRegExp(label), "ig"),
        (match) => `<a href="${escapeAttribute(url)}">${match}</a>`,
      ),
    html,
  );

/** Première occurrence de chaque acronyme explicitée par un `<abbr>`. */
const explainAcronyms = (html: string, acronyms: FaqEntry["acronyms"]): string =>
  acronyms.reduce(
    (acc, { key, value }) =>
      acc.replace(
        key,
        () => `<abbr title="${escapeAttribute(value)}">${key}</abbr>`,
      ),
    html,
  );

/** Réponse d'une entrée de FAQ, en HTML sûr et décoré. */
export const renderFaqResponse = (entry: FaqEntry): string =>
  sanitizeHtml(
    explainAcronyms(
      linkActions(renderMarkdown(entry.response), entry.actions),
      entry.acronyms,
    ),
  );
