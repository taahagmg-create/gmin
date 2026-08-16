/**
 * Yard details — sourced from esteemcars.co.nz and Google Business Profile,
 * 2026-08-15. Shared by the contact page, about page, and footer.
 */

export type Location = {
  name: string;
  address: string;
  suburb: string;
  postcode: string;
  phone: { e164: string; display: string };
  email: string;
  hours: { days: string; time: string }[];
  team: { name: string; phone: { e164: string; display: string } }[];
  social: { platform: string; url: string }[];
  googleMapsQuery: string;
};

export const LOCATIONS: Record<"takanini" | "newLynn", Location> = {
  takanini: {
    name: "Esteem Cars Takanini",
    address: "31 Tironui Road",
    suburb: "Takanini, Auckland",
    postcode: "2112",
    phone: { e164: "+6422543333", display: "02254 33333" },
    email: "sales@esteemcars.co.nz",
    hours: [
      { days: "Mon – Fri", time: "9:30 AM – 6:00 PM" },
      { days: "Sat – Sun", time: "10:30 AM – 3:30 PM" },
    ],
    team: [
      { name: "Bunny", phone: { e164: "+6422543333", display: "02254 33333" } },
      { name: "Faraz", phone: { e164: "+64221223133", display: "022 1223 133" } },
      { name: "Rasleen", phone: { e164: "+64273221434", display: "027 3221 434" } },
    ],
    social: [
      { platform: "Facebook", url: "https://www.facebook.com/esteemcars.takanini" },
      { platform: "Instagram", url: "https://www.instagram.com/esteemcars.southakl/" },
      { platform: "TikTok", url: "https://www.tiktok.com/@esteem.cars.takan" },
    ],
    googleMapsQuery: "Esteem+Cars+Takanini,+31+Tironui+Road,+Takanini,+Auckland+2112",
  },
  newLynn: {
    name: "Esteem Cars New Lynn",
    address: "13 Binsted Road",
    suburb: "New Lynn, Auckland",
    postcode: "0600",
    phone: { e164: "+64221223133", display: "022 122 3133" },
    email: "sales@esteemcars.co.nz",
    hours: [
      { days: "Mon – Fri", time: "9:30 AM – 6:00 PM" },
      { days: "Sat – Sun", time: "10:30 AM – 3:30 PM" },
    ],
    team: [
      { name: "Faraz", phone: { e164: "+64221223133", display: "022 122 3133" } },
      { name: "Gautam", phone: { e164: "+642108011636", display: "021 08011 636" } },
      { name: "Geet", phone: { e164: "+6421037122", display: "021 0371 229" } },
      { name: "Sunny", phone: { e164: "+64272879725", display: "027 2879 725" } },
    ],
    social: [
      { platform: "Facebook", url: "https://www.facebook.com/esteemcartradersnz" },
      { platform: "Instagram", url: "https://www.instagram.com/esteemcartraders/" },
      { platform: "TikTok", url: "https://www.tiktok.com/@esteemcars" },
    ],
    googleMapsQuery: "Esteem+Cars,+13+Binsted+Road,+New+Lynn,+Auckland+0600",
  },
};

export const FREEPHONE = { e164: "+640800227777", display: "0800 227 777" };
