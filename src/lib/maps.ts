/** Links that open a marked spot in the map apps couriers use. */
export function mapLinks(lat: number, lng: number) {
  const point = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  return {
    yandex: `https://yandex.uz/maps/?pt=${lng.toFixed(6)},${lat.toFixed(6)}&z=17&l=map`,
    google: `https://www.google.com/maps/search/?api=1&query=${point}`,
  };
}

/** The middle of Bukhara: where the map opens when the customer's own spot is unknown. */
export const BUKHARA_CENTER = { lat: 39.7747, lng: 64.4286 };
