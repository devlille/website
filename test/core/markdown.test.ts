import { describe, expect, it } from "vitest";
import { renderMarkdown, sanitizeHtml } from "../../src/core/markdown";

describe("renderMarkdown", () => {
  it("rend le Markdown en HTML", () => {
    expect(renderMarkdown("Un **talk** sur `Kotlin`")).toBe(
      "<p>Un <strong>talk</strong> sur <code>Kotlin</code></p>\n",
    );
  });

  it("ouvre une liste dont les puces sont collées sur une seule ligne", () => {
    // Les bios et résumés de l'API arrivent souvent sans saut de ligne.
    const html = renderMarkdown("Mes sujets : - Kotlin - Gradle");

    expect(html).toContain("<ul>");
    expect(html).toMatch(/<li><p>Kotlin\s*<\/p>/);
    expect(html).toMatch(/<li><p>Gradle\s*<\/p>/);
  });

  it("traite la puce `*` comme la puce `-`", () => {
    const html = renderMarkdown("Au programme : * Un * Deux");

    expect(html).toMatch(/<li><p>Un\s*<\/p>/);
    expect(html).toMatch(/<li><p>Deux\s*<\/p>/);
  });

  it("décale les titres du nombre de niveaux demandé", () => {
    expect(renderMarkdown("# Titre", { headingOffset: 1 })).toBe(
      "<h2>Titre</h2>\n",
    );
  });

  it("plafonne le décalage des titres à h6", () => {
    expect(renderMarkdown("###### Titre", { headingOffset: 1 })).toBe(
      "<h6>Titre</h6>\n",
    );
  });

  it("aplatit les titres en paragraphes quand on le demande", () => {
    expect(renderMarkdown("## Titre", { flattenHeadings: true })).toBe(
      "<p>Titre</p>\n",
    );
  });

  it("n'aplatit pas le mot « h2 » présent dans le texte", () => {
    // L'ancien `.replaceAll("h2", "p")` corrompait le contenu lui-même.
    expect(renderMarkdown("Balise h2", { flattenHeadings: true })).toBe(
      "<p>Balise h2</p>\n",
    );
  });

  it("supprime les balises script issues du backend", () => {
    const html = renderMarkdown("Bonjour <script>alert(1)</script>");

    expect(html).not.toContain("script");
    expect(html).toContain("Bonjour");
  });

  it("supprime les gestionnaires d'événements inline", () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">');

    expect(html).not.toContain("onerror");
  });

  it("supprime un lien javascript:", () => {
    const html = renderMarkdown("[clic](javascript:alert(1))");

    expect(html).not.toContain("javascript:");
  });

  it("conserve les liens http et https", () => {
    expect(renderMarkdown("[DevLille](https://devlille.fr)")).toContain(
      'href="https://devlille.fr"',
    );
  });

  it("renvoie une chaîne vide pour un contenu vide", () => {
    expect(renderMarkdown("")).toBe("");
  });
});

describe("sanitizeHtml", () => {
  it("est idempotente", () => {
    const once = sanitizeHtml('<p>a<script>b</script></p>');

    expect(sanitizeHtml(once)).toBe(once);
  });

  it("conserve les abbr et leur title", () => {
    expect(sanitizeHtml('<abbr title="Call For Papers">CFP</abbr>')).toBe(
      '<abbr title="Call For Papers">CFP</abbr>',
    );
  });
});

describe("renderMarkdown — emphases voisines d'une puce", () => {
  it("ne coupe pas un passage en gras suivi d'un espace", () => {
    expect(renderMarkdown("Un **talk** sur Kotlin")).toBe(
      "<p>Un <strong>talk</strong> sur Kotlin</p>\n",
    );
  });

  it("ne coupe pas un passage en italique suivi d'un espace", () => {
    expect(renderMarkdown("Un *talk* sur Kotlin")).toBe(
      "<p>Un <em>talk</em> sur Kotlin</p>\n",
    );
  });
});

describe("renderMarkdown — listes déjà bien formées", () => {
  it("laisse serrée une liste dont les puces sont déjà en début de ligne", () => {
    const html = renderMarkdown("Applications :\n\n- Android\n- iOS\n");

    expect(html).toContain("<li>Android</li>");
    expect(html).toContain("<li>iOS</li>");
  });
});
