/**
 * Rendu Markdown unique du site.
 *
 * Le domaine transporte le Markdown brut tel que le backend le renvoie ; c'est
 * ici — et nulle part ailleurs — qu'il devient du HTML, et qu'il est assaini.
 * Avec des sources tierces en marque blanche, un `set:html` sur du contenu
 * backend non filtré est un vecteur d'injection.
 */
import { Marked, type Tokens } from "marked";
import sanitize from "sanitize-html";

export type MarkdownOptions = {
  /** Décale tous les titres de N niveaux (`# ` -> `<h1+N>`), plafonné à `h6`. */
  headingOffset?: number;
  /** Rend les titres en `<p>` : pour les encarts qui ne doivent pas titrer. */
  flattenHeadings?: boolean;
};

/**
 * Liste blanche calquée sur ce que `marked` peut produire. Tout le reste
 * (script, style, iframe, event handlers, `javascript:`) tombe.
 */
const SANITIZE_OPTIONS: sanitize.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "em", "del", "sup", "sub", "abbr", "span",
    "a", "img",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    abbr: ["title"],
    code: ["class"],
    th: ["align"],
    td: ["align"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  disallowedTagsMode: "discard",
};

/** Assainit du HTML déjà rendu. Idempotente : la réappliquer ne change rien. */
export const sanitizeHtml = (html: string): string =>
  sanitize(html, SANITIZE_OPTIONS);

/**
 * Le backend renvoie couramment des puces collées sur une seule ligne
 * (« Mes sujets : - Kotlin - Gradle »). Sans saut de ligne, `marked` les rend
 * en texte. On réintroduit donc les sauts avant chaque puce.
 *
 * Le marqueur doit être précédé d'un blanc qui n'est pas un saut de ligne :
 * une puce déjà en début de ligne forme une liste correcte, qu'on laisserait
 * inutilement « loose », et `**gras** suivi` comme `*italique* suivi` seraient
 * coupés en plein milieu de leur emphase.
 */
const INLINE_BULLET = /([^\S\r\n])([*-]) /g;

const normalizeLooseLists = (raw: string): string =>
  raw.replace(INLINE_BULLET, "$1\r\n\r\n$2 ");

const headingRenderer = (level: (depth: number) => string) => ({
  renderer: {
    heading(this: { parser: { parseInline: (t: Tokens.Token[]) => string } }, token: Tokens.Heading) {
      const tag = level(token.depth);
      return `<${tag}>${this.parser.parseInline(token.tokens)}</${tag}>\n`;
    },
  },
});

const markedFor = (options: MarkdownOptions): Marked => {
  const marked = new Marked();
  if (options.flattenHeadings) {
    marked.use(headingRenderer(() => "p"));
  } else if (options.headingOffset) {
    const offset = options.headingOffset;
    marked.use(headingRenderer((depth) => `h${Math.min(depth + offset, 6)}`));
  }
  return marked;
};

/** Markdown backend -> HTML sûr, prêt pour `set:html`. */
export const renderMarkdown = (
  raw: string,
  options: MarkdownOptions = {},
): string => {
  if (!raw) return "";
  const html = markedFor(options).parse(normalizeLooseLists(raw), {
    async: false,
  });
  return sanitizeHtml(html);
};
