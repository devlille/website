import { describe, expect, it } from "vitest";
import { renderFaqResponse } from "../../src/core/faq";
import type { FaqEntry } from "../../src/data/domain";

const entry = (overrides: Partial<FaqEntry> = {}): FaqEntry => ({
  id: "q1",
  order: 1,
  question: "Où se déroule DevLille ?",
  response: "Au Grand Palais.",
  acronyms: [],
  actions: [],
  ...overrides,
});

describe("renderFaqResponse", () => {
  it("rend la réponse Markdown", () => {
    expect(renderFaqResponse(entry({ response: "Au **Grand Palais**." }))).toBe(
      "<p>Au <strong>Grand Palais</strong>.</p>\n",
    );
  });

  it("transforme le libellé d'une action en lien", () => {
    const html = renderFaqResponse(
      entry({
        response: "Voir la billetterie.",
        actions: [{ label: "billetterie", url: "https://billet.devlille.fr" }],
      }),
    );

    expect(html).toContain(
      '<a href="https://billet.devlille.fr">billetterie</a>',
    );
  });

  it("reconnaît le libellé d'une action quelle que soit sa casse", () => {
    const html = renderFaqResponse(
      entry({
        response: "Voir la Billetterie.",
        actions: [{ label: "billetterie", url: "https://billet.devlille.fr" }],
      }),
    );

    expect(html).toContain('<a href="https://billet.devlille.fr">Billetterie</a>');
  });

  it("entoure un acronyme de son abbr", () => {
    const html = renderFaqResponse(
      entry({
        response: "Le CFP est ouvert.",
        acronyms: [{ key: "CFP", value: "Call For Papers" }],
      }),
    );

    expect(html).toContain('<abbr title="Call For Papers">CFP</abbr>');
  });

  it("laisse la réponse intacte quand le libellé d'action est absent", () => {
    const html = renderFaqResponse(
      entry({
        response: "Rien à signaler.",
        actions: [{ label: "billetterie", url: "https://billet.devlille.fr" }],
      }),
    );

    expect(html).toBe("<p>Rien à signaler.</p>\n");
  });

  it("traite un libellé d'action contenant des caractères d'expression régulière", () => {
    const html = renderFaqResponse(
      entry({
        response: "Voir la FAQ (2026).",
        actions: [{ label: "FAQ (2026)", url: "https://devlille.fr/faq" }],
      }),
    );

    expect(html).toContain('<a href="https://devlille.fr/faq">FAQ (2026)</a>');
  });

  it("n'injecte pas de HTML depuis la définition d'un acronyme", () => {
    const html = renderFaqResponse(
      entry({
        response: "Le CFP est ouvert.",
        acronyms: [{ key: "CFP", value: '"><script>alert(1)</script>' }],
      }),
    );

    expect(html).not.toContain("<script>");
  });

  it("écarte une action dont l'URL est un javascript:", () => {
    const html = renderFaqResponse(
      entry({
        response: "Voir la billetterie.",
        actions: [{ label: "billetterie", url: "javascript:alert(1)" }],
      }),
    );

    expect(html).not.toContain("javascript:");
  });

  it("assainit le HTML brut présent dans la réponse", () => {
    const html = renderFaqResponse(
      entry({ response: "Bonjour <script>alert(1)</script>" }),
    );

    expect(html).not.toContain("script");
  });
});
