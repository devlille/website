import { describe, expect, it } from "vitest";
import { event, site, ticketsUrl } from "../../src/config";
import { buildEventJsonLd } from "../../src/core/event-jsonld";

describe("buildEventJsonLd", () => {
  const jsonld = buildEventJsonLd(site, event, ticketsUrl);

  it("décrit l'événement de l'édition en cours", () => {
    expect(jsonld).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Event",
      name: "DevLille 2026",
      startDate: "2026-06-11T08:00+02:00",
      endDate: "2026-06-12T19:00+02:00",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      description: event.description,
    });
  });

  it("publie l'adresse du lieu déclarée en configuration", () => {
    expect(jsonld.location).toEqual({
      "@type": "Place",
      name: "Grand Palais",
      address: {
        "@type": "PostalAddress",
        streetAddress: "1 Bd des Cités Unies",
        addressLocality: "Lille",
        postalCode: "59777",
        addressCountry: "FR",
      },
    });
  });

  it("publie une offre par tarif, toutes vers la billetterie de l'édition", () => {
    expect(jsonld.offers).toHaveLength(3);
    expect(jsonld.offers[0]).toEqual({
      "@type": "Offer",
      name: "Billet 2 jours / Jeudi et Vendredi",
      url: "https://www.billetweb.fr/devlille-2026",
      price: "80",
      priceCurrency: "EUR",
      availability: "https://schema.org/Reserved",
      availabilityStarts: "2026-01-15T08:00+2:00",
      availabilityEnds: "2026-06-12T08:00+2:00",
      validFrom: "2026-06-11T08:00+2:00",
      validThrough: "2026-06-12T19:00+2:00",
    });
    expect(jsonld.offers.every((o) => o.url === ticketsUrl)).toBe(true);
  });

  it("nomme l'organisateur", () => {
    expect(jsonld.organizer).toEqual({
      "@type": "Organization",
      name: "DevLille",
      url: "https://devlille.fr/",
    });
  });

  it("n'annonce aucune offre pour une billetterie vide", () => {
    const free = { ...event, ticketing: { ...event.ticketing, offers: [] } };

    expect(buildEventJsonLd(site, free, ticketsUrl).offers).toEqual([]);
  });
});
