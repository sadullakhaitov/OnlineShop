import { NextResponse, type NextRequest } from "next/server";
import { shopContacts } from "@/data/contacts";
import { deliveryZones, FREE_DELIVERY_FROM } from "@/data/delivery";
import { infoPages } from "@/data/pages";
import { getPaymentMethods } from "@/server/config";
import { localeParam } from "@/server/mobile/views";

/** Delivery zones, payment methods, contacts and information pages for the app. */
export async function GET(request: NextRequest) {
  const locale = localeParam(request.nextUrl.searchParams.get("locale"));
  return NextResponse.json({
    zones: deliveryZones.map((zone) => ({ slug: zone.slug, name: zone.name[locale], fee: zone.fee, days: zone.days })),
    freeDeliveryFrom: FREE_DELIVERY_FROM,
    paymentMethods: getPaymentMethods(),
    contacts: {
      phone: shopContacts.phone,
      phoneHref: shopContacts.phoneHref,
      email: shopContacts.email,
      telegram: shopContacts.telegram,
      address: shopContacts.address[locale],
      hours: shopContacts.hours[locale],
    },
    pages: Object.entries(infoPages).map(([slug, page]) => ({
      slug,
      title: page.title[locale],
      lead: page.lead[locale],
      sections: page.sections.map((section) => ({
        heading: section.heading[locale],
        paragraphs: section.paragraphs?.map((text) => text[locale]) ?? [],
        list: section.list?.map((text) => text[locale]) ?? [],
      })),
    })),
  });
}
