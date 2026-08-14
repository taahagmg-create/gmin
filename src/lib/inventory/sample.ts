import type { InventorySource, Vehicle } from "@/lib/inventory/types";

/**
 * A tiny fixed dataset, for working offline or when the upstream site is down.
 *
 * Shapes and value ranges mirror what the Autostock reader actually returns, so
 * UI built against this behaves the same against real stock. Not a fixture of
 * real Esteem vehicles — invented cars, so nobody mistakes it for live listings.
 */
const SAMPLE: Vehicle[] = [
  {
    id: "sample-1",
    slug: "sample-1-2019-mazda-cx-5",
    title: "2019 Mazda CX-5",
    year: 2019,
    make: "Mazda",
    model: "CX-5",
    priceNzd: 28990,
    priceOnApplication: false,
    odometerKm: 62400,
    transmission: "Automatic",
    bodyType: "SUV",
    exteriorColour: "Machine Grey",
    interiorColour: "Black",
    engine: "2.5L Petrol",
    fuelEconomy: "7.4 L/100km",
    images: [],
    specs: { Body: "SUV", Odometer: "62,400 km", Transmission: "Automatic" },
    sourceUrl: "",
  },
  {
    id: "sample-2",
    slug: "sample-2-2016-toyota-aqua",
    title: "2016 Toyota Aqua",
    year: 2016,
    make: "Toyota",
    model: "Aqua",
    priceNzd: 14990,
    priceOnApplication: false,
    odometerKm: 88100,
    transmission: "Automatic",
    bodyType: "Hatchback",
    exteriorColour: "White",
    interiorColour: "Grey",
    engine: "1.5L Hybrid",
    fuelEconomy: "3.9 L/100km",
    images: [],
    specs: { Body: "Hatchback", Odometer: "88,100 km", Transmission: "Automatic" },
    sourceUrl: "",
  },
  {
    id: "sample-3",
    slug: "sample-3-2014-bmw-320i",
    title: "2014 BMW 320i",
    year: 2014,
    make: "BMW",
    model: "320i",
    priceNzd: 17990,
    priceOnApplication: false,
    odometerKm: 104300,
    transmission: "Automatic",
    bodyType: "Sedan",
    exteriorColour: "Black",
    interiorColour: "Beige",
    engine: "2.0L Turbo Petrol",
    fuelEconomy: "6.4 L/100km",
    images: [],
    specs: { Body: "Sedan", Odometer: "104,300 km", Transmission: "Automatic" },
    sourceUrl: "",
  },
];

export function createSampleSource(): InventorySource {
  return {
    name: "sample",
    async listVehicles() {
      return SAMPLE;
    },
    async getVehicle(slug: string) {
      return SAMPLE.find((v) => v.slug === slug) ?? null;
    },
  };
}
