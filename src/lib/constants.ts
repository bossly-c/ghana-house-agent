import type { ListingType } from "./types";

/** Geographic center of Ghana */
export const GHANA_CENTER = { lat: 7.9528, lng: -1.0307 };
export const GHANA_ZOOM = 7;

export const LISTING_COLORS: Record<ListingType, { main: string; soft: string; ring: string }> = {
  rent: { main: "#e5484d", soft: "#fee2e2", ring: "rgba(229,72,77,0.25)" },
  sale: { main: "#16a34a", soft: "#dcfce7", ring: "rgba(22,163,74,0.25)" },
};

export const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Volta",
  "Oti",
  "Northern",
  "Savannah",
  "North East",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
  "Western North",
];

export const PROPERTY_TYPES = [
  "Single Room Self-Contain",
  "Room & Chamber",
  "Chamber & Hall Self-Contain",
  "1 Bedroom Apartment",
  "2 Bedroom Apartment",
  "3 Bedroom Apartment",
  "2 Bedroom House",
  "3 Bedroom House",
  "4+ Bedroom House",
  "Compound House",
  "Storey Building",
  "Hostel Room",
];

export const AMENITY_OPTIONS = [
  "Prepaid Meter",
  "Polytank",
  "Borehole",
  "Tiled Floors",
  "POP Ceiling",
  "Fitted Kitchen",
  "Fitted Wardrobes",
  "Air Conditioning",
  "Ceiling Fan",
  "Water Heater",
  "Parking Space",
  "Garage",
  "Walled & Gated",
  "Security Post",
  "Balcony",
  "Garden",
  "Generator Backup",
  "Furnished",
  "Boys Quarters",
  "Pets Allowed",
];

export const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
