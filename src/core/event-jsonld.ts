/**
 * Données structurées schema.org de l'événement.
 *
 * Elles étaient inline dans `Layout.astro`, avec l'adresse et les tarifs du
 * DevLille en dur ; elles se déduisent désormais entièrement de la
 * configuration d'instance.
 */
import type { EventConfig, SiteConfig } from "../config/schema";

/** Heures d'ouverture et de fermeture publiées pour chaque journée. */
const OPENS_AT = "08:00";
const CLOSES_AT = "19:00";

/**
 * Décalage horaire publié. Les bornes de l'événement portent `+02:00`, les
 * offres la forme non normalisée `+2:00`. C'est ce que le site publie depuis
 * l'origine, et c'est délibérément conservé : ne pas « corriger » l'un des
 * deux sans décider aussi de l'autre.
 */
const OFFSET = "+02:00";
const OFFER_OFFSET = "+2:00";

export const buildEventJsonLd = (
  site: SiteConfig,
  event: EventConfig,
  ticketsUrl: string,
) => {
  const { venue, ticketing } = event;

  const offers = ticketing.offers.map((offer) => ({
    "@type": "Offer",
    name: offer.name,
    url: ticketsUrl,
    price: String(offer.price),
    priceCurrency: ticketing.currency,
    availability: "https://schema.org/Reserved",
    availabilityStarts: `${ticketing.salesOpenDate}T${OPENS_AT}${OFFER_OFFSET}`,
    availabilityEnds: `${event.endDate}T${OPENS_AT}${OFFER_OFFSET}`,
    validFrom: `${event.startDate}T${OPENS_AT}${OFFER_OFFSET}`,
    validThrough: `${event.endDate}T${CLOSES_AT}${OFFER_OFFSET}`,
  }));

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${site.name} ${event.edition}`,
    startDate: `${event.startDate}T${OPENS_AT}${OFFSET}`,
    endDate: `${event.endDate}T${CLOSES_AT}${OFFSET}`,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: venue.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: venue.streetAddress,
        addressLocality: venue.locality,
        postalCode: venue.postalCode,
        addressCountry: venue.country,
      },
    },
    description: event.description,
    offers,
    organizer: {
      "@type": "Organization",
      name: site.organizer.name,
      url: site.organizer.url,
    },
  };
};
