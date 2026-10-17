/**
 * Seed script for Ghana House Agent.
 * Run with: npx tsx scripts/seed.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

// Load .env before anything else (tsx doesn't auto-load env files)
config({ path: resolve(process.cwd(), ".env") });

import { readFileSync } from "fs"; // keep for any other use

import { agents, properties, tourScenes, viewingRequests } from "../src/db/schema";
import type { SceneLink } from "../src/db/schema";

// DB module is imported inside main() AFTER env vars are loaded.

const px = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200`;

const PANOS = {
  compound: "/panos/compound.jpg",
  hall: "/panos/hall.jpg",
  kitchen: "/panos/kitchen.jpg",
  bedroom: "/panos/bedroom.jpg",
};

type SceneSeed = {
  name: string;
  panoUrl: string;
  defaultYaw?: number;
  links: SceneLink[];
};

/** Standard walkthrough: Compound (0) → Hall (1) → Kitchen (2) → Bedroom (3) */
function standardTour(withCompound: boolean): SceneSeed[] {
  if (!withCompound) {
    return [
      {
        name: "Hall",
        panoUrl: PANOS.hall,
        defaultYaw: 0,
        links: [
          { yaw: -62, pitch: -4, toOrder: 2, label: "Bedroom" },
          { yaw: 64,  pitch: -4, toOrder: 1, label: "Kitchen" },
        ],
      },
      {
        name: "Kitchen",
        panoUrl: PANOS.kitchen,
        links: [{ yaw: 150, pitch: -3, toOrder: 0, label: "Back to Hall" }],
      },
      {
        name: "Bedroom",
        panoUrl: PANOS.bedroom,
        links: [{ yaw: -140, pitch: -3, toOrder: 0, label: "Back to Hall" }],
      },
    ];
  }

  return [
    {
      name: "Compound",
      panoUrl: PANOS.compound,
      links: [{ yaw: 0, pitch: -2, toOrder: 1, label: "Enter the house" }],
    },
    {
      name: "Hall",
      panoUrl: PANOS.hall,
      defaultYaw: 0,
      links: [
        { yaw: 178, pitch: -2, toOrder: 0, label: "Back to Compound" },
        { yaw: -62, pitch: -4, toOrder: 3, label: "Bedroom" },
        { yaw: 64,  pitch: -4, toOrder: 2, label: "Kitchen" },
      ],
    },
    {
      name: "Kitchen",
      panoUrl: PANOS.kitchen,
      links: [{ yaw: 150, pitch: -3, toOrder: 1, label: "Back to Hall" }],
    },
    {
      name: "Bedroom",
      panoUrl: PANOS.bedroom,
      links: [{ yaw: -140, pitch: -3, toOrder: 1, label: "Back to Hall" }],
    },
  ];
}

async function main() {
  // Import db only AFTER env vars are loaded
  const { db } = await import("../src/db");

  console.log("🗑️  Clearing existing data…");
  await db.delete(viewingRequests);
  await db.delete(tourScenes);
  await db.delete(properties);
  await db.delete(agents);

  console.log("👤 Seeding agents…");
  const agentRows = await db
    .insert(agents)
    .values([
      {
        name: "Kwame Mensah",
        phone: "+233241234567",
        whatsapp: "233241234567",
        avatar: "https://randomuser.me/api/portraits/men/32.jpg",
        verified: true,
        bio: "Licensed agent, 8 years in East Legon property.",
      },
      {
        name: "Abena Owusu",
        phone: "+233551234568",
        whatsapp: "233551234568",
        avatar: "https://randomuser.me/api/portraits/women/44.jpg",
        verified: true,
        bio: "Helping families find homes across Greater Accra.",
      },
      {
        name: "Kofi Boateng",
        phone: "+233201234569",
        whatsapp: "233201234569",
        avatar: "https://randomuser.me/api/portraits/men/85.jpg",
        verified: false,
        bio: "Caretaker & landlord rep, Spintex and Tema.",
      },
      {
        name: "Efua Asare",
        phone: "+233271234570",
        whatsapp: "233271234570",
        avatar: "https://randomuser.me/api/portraits/women/68.jpg",
        verified: true,
        bio: "Kumasi-based, Ashanti Region specialist.",
      },
      {
        name: "Nana Yaw Darko",
        phone: "+233261234571",
        whatsapp: "233261234571",
        avatar: "https://randomuser.me/api/portraits/men/22.jpg",
        verified: false,
        bio: "Western Region homes, Takoradi and beyond.",
      },
      {
        name: "Akosua Frimpong",
        phone: "+233501234572",
        whatsapp: "233501234572",
        avatar: "https://randomuser.me/api/portraits/women/17.jpg",
        verified: true,
        bio: "Northern Ghana property consultant, Tamale.",
      },
    ])
    .returning();

  const [kwame, abena, kofi, efua, yaw, akosua] = agentRows;

  console.log("🏠 Seeding properties…");
  const props = await db
    .insert(properties)
    .values([
      {
        agentId: kwame.id,
        title: "Executive 2-Bedroom Apartment, East Legon",
        listingType: "rent",
        propertyType: "2 Bedroom Apartment",
        price: 2800,
        pricePeriod: "month",
        region: "Greater Accra",
        city: "Accra",
        area: "East Legon, near A&C Mall",
        address: "Plot 14, Nii Sai Road",
        lat: 5.6377, lng: -0.1597,
        description:
          "A beautifully finished 2-bedroom apartment in the heart of East Legon. Both bedrooms are ensuite with fitted wardrobes. The hall opens onto a balcony with a great street view. Titled compound, paved parking for two cars, constant water supply with polytank backup and prepaid meter. Walking distance to A&C Mall, restaurants and the motorway.",
        bedrooms: 2, halls: 1, kitchens: 1, bathrooms: 2, toilets: 2, balconies: 1, floorSize: 96,
        amenities: ["Prepaid Meter","Polytank","Fitted Wardrobes","Parking Space","Walled & Gated","Water Heater","Tiled Floors"],
        images: [px(7031604), px(6492391), px(7546716), px(7511695)],
        viewingDays: ["Monday","Wednesday","Saturday"],
        viewingTime: "10:00 AM - 3:00 PM",
        featured: true,
      },
      {
        agentId: abena.id,
        title: "Neat Single Room Self-Contain, Osu",
        listingType: "rent",
        propertyType: "Single Room Self-Contain",
        price: 950,
        pricePeriod: "month",
        region: "Greater Accra",
        city: "Accra",
        area: "Osu, off Oxford Street",
        address: "House No. C824/3",
        lat: 5.5567, lng: -0.1816,
        description:
          "Compact and clean single room self-contain just off Oxford Street. Own toilet and bath, small kitchen area, ceiling fan and louvre windows. Ideal for a young professional — everything in Osu is at your doorstep. Water and refuse collection included in the rent.",
        bedrooms: 1, halls: 0, kitchens: 1, bathrooms: 1, toilets: 1, balconies: 0, floorSize: 28,
        amenities: ["Ceiling Fan","Tiled Floors","Prepaid Meter"],
        images: [px(18470969), px(7045996), px(30990851)],
        viewingDays: ["Tuesday","Thursday"],
        viewingTime: "12:00 PM - 5:00 PM",
      },
      {
        agentId: kofi.id,
        title: "Spacious Chamber & Hall Self-Contain, Spintex",
        listingType: "rent",
        propertyType: "Chamber & Hall Self-Contain",
        price: 1500,
        pricePeriod: "month",
        region: "Greater Accra",
        city: "Accra",
        area: "Spintex, behind Palace Mall",
        address: "Block B, Flower Pot Junction",
        lat: 5.5898, lng: -0.0948,
        description:
          "Very spacious chamber and hall self-contain on the Spintex road. Big hall with dining space, one large bedroom, visitor's toilet and a proper kitchen with store room. Good roads and easy trotro access. Compound is paved with parking space.",
        bedrooms: 1, halls: 1, kitchens: 1, bathrooms: 1, toilets: 2, balconies: 0, floorSize: 58,
        amenities: ["Prepaid Meter","Polytank","Parking Space","Tiled Floors","Walled & Gated"],
        images: [px(8089172), px(6980724), px(9877337)],
        viewingDays: ["Monday","Friday","Sunday"],
        viewingTime: "9:00 AM - 4:00 PM",
      },
      {
        agentId: kwame.id,
        title: "Modern 4-Bedroom Storey House, East Legon Hills",
        listingType: "sale",
        propertyType: "4+ Bedroom House",
        price: 3400000,
        pricePeriod: "total",
        region: "Greater Accra",
        city: "Accra",
        area: "East Legon Hills, School Junction",
        address: "Plot 87, Lakeside Drive",
        lat: 5.6824, lng: -0.1241,
        description:
          "A stunning modern 4-bedroom storey house in the fast-rising East Legon Hills. All rooms ensuite, fitted kitchen with granite tops, POP ceilings, family lounge upstairs, two balconies and spacious boys quarters. Sold with land title certificate.",
        bedrooms: 4, halls: 2, kitchens: 1, bathrooms: 4, toilets: 5, balconies: 2, floorSize: 240,
        amenities: ["Fitted Kitchen","POP Ceiling","Boys Quarters","Walled & Gated","Water Heater","Parking Space"],
        images: [px(39491211), px(7031581), px(6580396), px(7195557)],
        viewingDays: ["Saturday","Sunday"],
        viewingTime: "10:00 AM - 2:00 PM",
        featured: true,
      },
      {
        agentId: abena.id,
        title: "3-Bedroom House with Boys Quarters, Dansoman",
        listingType: "sale",
        propertyType: "3 Bedroom House",
        price: 1250000,
        pricePeriod: "total",
        region: "Greater Accra",
        city: "Accra",
        area: "Dansoman, Sahara",
        address: "Hse 12, Sahara Street",
        lat: 5.5382, lng: -0.2592,
        description:
          "Well-maintained 3-bedroom house on a large plot in Dansoman Sahara. Master bedroom ensuite, spacious hall and dining, kitchen with store, plus a 1-bedroom boys quarters at the back. Mature compound with trees, double gate, garage for one car.",
        bedrooms: 3, halls: 1, kitchens: 1, bathrooms: 2, toilets: 3, balconies: 0, floorSize: 160,
        amenities: ["Boys Quarters","Garage","Polytank","Walled & Gated"],
        images: [px(7031581), px(16825059), px(6970049)],
        viewingDays: ["Wednesday","Saturday"],
        viewingTime: "9:00 AM - 12:00 PM",
      },
      {
        agentId: kofi.id,
        title: "Affordable Room & Chamber, Madina",
        listingType: "rent",
        propertyType: "Room & Chamber",
        price: 800,
        pricePeriod: "month",
        region: "Greater Accra",
        city: "Accra",
        area: "Madina, Zongo Junction",
        address: "Near Zongo Junction",
        lat: 5.6831, lng: -0.1666,
        description:
          "Pocket-friendly room and chamber at Madina Zongo Junction, close to the market and trotro station. Two rooms with private toilet and bath. Perfect for a student or small family. One year advance accepted.",
        bedrooms: 1, halls: 1, kitchens: 0, bathrooms: 1, toilets: 1, balconies: 0, floorSize: 36,
        amenities: ["Walled & Gated"],
        images: [px(28122985), px(36363110), px(30973390)],
        viewingDays: ["Monday","Tuesday","Thursday","Friday"],
        viewingTime: "8:00 AM - 6:00 PM",
      },
      {
        agentId: kofi.id,
        title: "Serviced 2-Bedroom Apartment, Tema Community 25",
        listingType: "rent",
        propertyType: "2 Bedroom Apartment",
        price: 2100,
        pricePeriod: "month",
        region: "Greater Accra",
        city: "Tema",
        area: "Community 25, near Devtraco",
        address: "Estate Rd 8",
        lat: 5.6692, lng: -0.0152,
        description:
          "Serviced 2-bedroom apartment in a quiet gated court in Tema Community 25. Both bedrooms fitted, open-plan kitchen and hall, one balcony. Estate security and standby generator for common areas.",
        bedrooms: 2, halls: 1, kitchens: 1, bathrooms: 2, toilets: 2, balconies: 1, floorSize: 84,
        amenities: ["Security Post","Generator Backup","Fitted Wardrobes","Tiled Floors"],
        images: [px(24419877), px(15867755), px(7195557), px(7046007)],
        viewingDays: ["Saturday"],
        viewingTime: "11:00 AM - 4:00 PM",
      },
      {
        agentId: efua.id,
        title: "3-Bedroom House — Ahodwo, Kumasi",
        listingType: "sale",
        propertyType: "3 Bedroom House",
        price: 980000,
        pricePeriod: "total",
        region: "Ashanti",
        city: "Kumasi",
        area: "Ahodwo, Daban",
        address: "Plot 5, Daban Road",
        lat: 6.6613, lng: -1.6076,
        description:
          "A solid 3-bedroom house in the prime Ahodwo Daban area of Kumasi. Master ensuite, large hall, dining, kitchen with backyard access and a small garden. Fully walled with steel gate. Registered documents available.",
        bedrooms: 3, halls: 1, kitchens: 1, bathrooms: 2, toilets: 3, balconies: 1, floorSize: 150,
        amenities: ["Garden","Walled & Gated","Polytank","Water Heater"],
        images: [px(39618716), px(9877337), px(7546716)],
        viewingDays: ["Monday","Saturday"],
        viewingTime: "9:00 AM - 1:00 PM",
      },
      {
        agentId: efua.id,
        title: "Single Room Self-Contain — Asokwa, Kumasi",
        listingType: "rent",
        propertyType: "Single Room Self-Contain",
        price: 600,
        pricePeriod: "month",
        region: "Ashanti",
        city: "Kumasi",
        area: "Asokwa, near Ahinsan Junction",
        address: "Hse 21, Ahinsan Estate Rd",
        lat: 6.6732, lng: -1.5898,
        description:
          "Decent single room self-contain at Asokwa, close to KNUST shuttle stops and Ahinsan market. Tiled with own meter, private bathroom and small kitchen space.",
        bedrooms: 1, halls: 0, kitchens: 1, bathrooms: 1, toilets: 1, balconies: 0, floorSize: 26,
        amenities: ["Prepaid Meter","Tiled Floors","Ceiling Fan"],
        images: [px(6010270), px(7045991), px(30973390)],
        viewingDays: ["Tuesday","Friday"],
        viewingTime: "10:00 AM - 5:00 PM",
      },
      {
        agentId: yaw.id,
        title: "2-Bedroom Apartment — Anaji, Takoradi",
        listingType: "rent",
        propertyType: "2 Bedroom Apartment",
        price: 1200,
        pricePeriod: "month",
        region: "Western",
        city: "Sekondi-Takoradi",
        area: "Anaji, near Market Circle Rd",
        address: "Flat 3, Anaji Heights",
        lat: 4.9049, lng: -1.7636,
        description:
          "Neat 2-bedroom apartment at Anaji, Takoradi. Master ensuite, guest washroom, airy hall with balcony, kitchen fitted with cabinets. Tarred compound with ample parking. Ideal for oil & gas workers and families.",
        bedrooms: 2, halls: 1, kitchens: 1, bathrooms: 2, toilets: 2, balconies: 1, floorSize: 78,
        amenities: ["Parking Space","Polytank","Fitted Kitchen","Tiled Floors"],
        images: [px(18894990), px(26546549), px(6970049), px(7511695)],
        viewingDays: ["Wednesday","Sunday"],
        viewingTime: "10:00 AM - 4:00 PM",
      },
      {
        agentId: yaw.id,
        title: "3-Bedroom Family House — Cape Coast",
        listingType: "sale",
        propertyType: "3 Bedroom House",
        price: 720000,
        pricePeriod: "total",
        region: "Central",
        city: "Cape Coast",
        area: "Pedu, off Abura Road",
        address: "Plot 9, Pedu Estate",
        lat: 5.1132, lng: -1.2889,
        description:
          "Charming 3-bedroom family house at Pedu, Cape Coast. Master ensuite, two further bedrooms sharing a bath, spacious hall, dining, kitchen and a wide veranda. Great rental potential near the university.",
        bedrooms: 3, halls: 1, kitchens: 1, bathrooms: 2, toilets: 2, balconies: 0, floorSize: 132,
        amenities: ["Veranda","Walled & Gated","Garden","Polytank"],
        images: [px(18896097), px(7195557), px(7046007)],
        viewingDays: ["Friday","Saturday"],
        viewingTime: "9:00 AM - 2:00 PM",
      },
      {
        agentId: akosua.id,
        title: "4-Bedroom Compound House — Tamale",
        listingType: "sale",
        propertyType: "4+ Bedroom House",
        price: 860000,
        pricePeriod: "total",
        region: "Northern",
        city: "Tamale",
        area: "Kalariga, off Bolgatanga Road",
        address: "Hse 42, Kalariga",
        lat: 9.4076, lng: -0.8527,
        description:
          "Spacious 4-bedroom compound house at Kalariga, Tamale. Two masters ensuite, large family hall, dining, big kitchen and a wide courtyard. Borehole with overhead tank, garage and shade trees.",
        bedrooms: 4, halls: 1, kitchens: 1, bathrooms: 3, toilets: 4, balconies: 0, floorSize: 210,
        amenities: ["Borehole","Garage","Walled & Gated"],
        images: [px(7746940), px(7746919), px(16825059), px(8089172)],
        viewingDays: ["Saturday","Sunday"],
        viewingTime: "8:00 AM - 12:00 PM",
        featured: true,
      },
    ])
    .returning();

  console.log("🎬 Seeding 3D tour scenes…");
  for (const p of props) {
    const isApartment = p.propertyType.includes("Apartment");
    const isSingle =
      p.propertyType.includes("Single Room") ||
      p.propertyType.includes("Room & Chamber");

    let scenes: SceneSeed[];
    if (isSingle) {
      scenes = [
        {
          name: "Compound",
          panoUrl: PANOS.compound,
          links: [{ yaw: 0, pitch: -2, toOrder: 1, label: "Enter the room" }],
        },
        {
          name: "Room",
          panoUrl: PANOS.bedroom,
          links: [
            { yaw: -140, pitch: -3, toOrder: 0, label: "Back outside" },
            { yaw: 65,   pitch: -4, toOrder: 2, label: "Kitchen corner" },
          ],
        },
        {
          name: "Kitchen",
          panoUrl: PANOS.kitchen,
          links: [{ yaw: 150, pitch: -3, toOrder: 1, label: "Back to room" }],
        },
      ];
    } else {
      scenes = standardTour(!isApartment);
    }

    await db.insert(tourScenes).values(
      scenes.map((s, i) => ({
        propertyId: p.id,
        name: s.name,
        panoUrl: s.panoUrl,
        orderIndex: i,
        defaultYaw: s.defaultYaw ?? 0,
        defaultPitch: 0,
        links: s.links,
      }))
    );
  }

  console.log(
    `\n✅ Done! Seeded:\n` +
    `   • ${agentRows.length} agents\n` +
    `   • ${props.length} properties\n` +
    `   • ${props.length * 3} tour scenes (avg 3 per property)\n`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});