/**
 * CDS Platform — Prisma Seed Script
 *
 * Seeds the database with reference/lookup data:
 * 1. Estate types (4) + Part types (17) + mapping matrix — from Estate.xlsx Sheet 1-4
 * 2. Furniture group types + Furniture types (227) — from Estate.xlsx Sheet 3
 * 3. Countries (~243) — from Country.csv
 * 4. Post codes (DE: ~16,478) — from PostCodeData.csv
 *
 * Usage: npx prisma db seed
 * Pattern: Upsert (idempotent — safe to re-run)
 *
 * @see prisma/schema.prisma — multiSchema config
 * @see docs/domain-model/estate.ts — domain types
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// --- Paths ---
const SEED_DATA_DIR = path.join(__dirname, '..', 'Umzug', 'MainDocuments');
const ESTATE_XLSX_PATH = path.join(
  __dirname,
  '..',
  'Umzug',
  'backend',
  'OAK',
  'Documents',
  'Estate.xlsx',
);
const COUNTRY_CSV_PATH = path.join(SEED_DATA_DIR, 'Country.csv');
const POSTCODE_CSV_PATH = path.join(SEED_DATA_DIR, 'PostCodeData.csv');

// =============================================================================
// CSV Parser (handles quoted fields with commas)
// =============================================================================

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function readCSV(filePath: string): string[][] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map(parseCSVLine);
}

// =============================================================================
// 1. Seed Countries (shared.countries)
// =============================================================================

async function seedCountries() {
  console.log('Seeding countries...');

  const rows = readCSV(COUNTRY_CSV_PATH);
  // Format: id, created, updated, guid, name, iso2, iso3, locale, phoneCode, ...

  let count = 0;
  for (const row of rows) {
    const name = row[4] ?? '';
    const isoCode = (row[5] ?? '').toUpperCase();
    const phoneCode = row[8] ?? '';

    if (!isoCode || isoCode.length < 2) continue;

    await prisma.country.upsert({
      where: { isoCode },
      create: {
        isoCode,
        name,
        localizedName: { de: name, en: name }, // MVP: same name, extend later
        phoneCode: phoneCode || null,
        isActive: true,
      },
      update: {
        name,
        localizedName: { de: name, en: name },
        phoneCode: phoneCode || null,
      },
    });
    count++;
  }

  console.log(`  ✓ ${count} countries seeded`);
}

// =============================================================================
// 2. Seed Post Codes (shared.post_codes) — DE only
// =============================================================================

async function seedPostCodes() {
  console.log('Seeding post codes (DE only)...');

  const rows = readCSV(POSTCODE_CSV_PATH);
  // Format: id, created, updated, countryCode, postCode, placeName, adminName1, adminCode1, adminName2, adminCode2, adminName3, adminCode3, latitude, longitude, accuracy

  const deRows = rows.filter((row) => row[3] === 'de');
  console.log(`  Found ${deRows.length} DE post codes`);

  // Batch insert in chunks of 500 for performance
  const BATCH_SIZE = 500;
  let count = 0;

  for (let i = 0; i < deRows.length; i += BATCH_SIZE) {
    const batch = deRows.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(
      batch.map((row) => {
        const countryCode = 'DE';
        const postCode = row[4] ?? '';
        const placeName = row[5] ?? '';
        const adminName1 = row[6] || null; // Bundesland
        const adminName2 = row[8] || null; // Regierungsbezirk
        const adminName3 = row[10] || null; // Kreis
        const latitude = parseFloat(row[12] ?? '0');
        const longitude = parseFloat(row[13] ?? '0');

        return prisma.postCode.upsert({
          where: {
            countryCode_postCode: { countryCode, postCode },
          },
          create: {
            countryCode,
            postCode,
            placeName,
            adminName1,
            adminName2,
            adminName3,
            latitude,
            longitude,
          },
          update: {
            placeName,
            adminName1,
            adminName2,
            adminName3,
            latitude,
            longitude,
          },
        });
      }),
    );

    count += batch.length;
    if (count % 5000 === 0) {
      console.log(`  ... ${count}/${deRows.length} post codes`);
    }
  }

  console.log(`  ✓ ${count} post codes seeded`);
}

// =============================================================================
// 3. Seed Estate Types (transport.estate_types)
// =============================================================================

// Hardcoded from Estate.xlsx Sheet 1 — 4 estate types × 6 languages
const ESTATE_TYPES = [
  {
    name: { de: 'Wohnung', en: 'Apartment', fr: 'Appartement', tr: 'Daire', ar: 'شقة', ru: 'Квартира' },
    description: { de: 'Wohnung / Apartment', en: 'Apartment / Flat', fr: 'Appartement', tr: 'Daire', ar: 'شقة', ru: 'Квартира' },
  },
  {
    name: { de: 'Haus', en: 'House', fr: 'Maison', tr: 'Ev', ar: 'منزل', ru: 'Дом' },
    description: { de: 'Einfamilienhaus / Reihenhaus', en: 'Detached / Terraced house', fr: 'Maison', tr: 'Müstakil ev', ar: 'منزل', ru: 'Дом' },
  },
  {
    name: { de: 'Büro', en: 'Office', fr: 'Bureau', tr: 'Ofis', ar: 'مكتب', ru: 'Офис' },
    description: { de: 'Büroräume / Gewerbe', en: 'Office / Commercial space', fr: 'Bureau', tr: 'Ofis', ar: 'مكتب', ru: 'Офис' },
  },
  {
    name: { de: 'Lager', en: 'Warehouse', fr: 'Entrepôt', tr: 'Depo', ar: 'مستودع', ru: 'Склад' },
    description: { de: 'Lagerraum / Halle', en: 'Warehouse / Storage', fr: 'Entrepôt', tr: 'Depo', ar: 'مستودع', ru: 'Склад' },
  },
];

async function seedEstateTypes() {
  console.log('Seeding estate types...');

  const created: { name: string; id: string }[] = [];

  for (const et of ESTATE_TYPES) {
    const deName = (et.name as Record<string, string>).de!;

    // Use name.de as the stable lookup key
    const existing = await prisma.estateType.findFirst({
      where: { name: { path: ['de'], equals: deName } },
    });

    if (existing) {
      await prisma.estateType.update({
        where: { id: existing.id },
        data: { name: et.name, description: et.description },
      });
      created.push({ name: deName, id: existing.id });
    } else {
      const record = await prisma.estateType.create({
        data: { name: et.name, description: et.description, isActive: true },
      });
      created.push({ name: deName, id: record.id });
    }
  }

  console.log(`  ✓ ${created.length} estate types seeded`);
  return created;
}

// =============================================================================
// 4. Seed Estate Part Types / Room Types (transport.estate_part_types)
// =============================================================================

// Hardcoded from Estate.xlsx Sheet 2 — 17 room types × 6 languages
const ESTATE_PART_TYPES = [
  { name: { de: 'Wohnzimmer', en: 'Living Room', fr: 'Salon', tr: 'Oturma Odası', ar: 'غرفة المعيشة', ru: 'Гостиная' }, isOuterPart: false },
  { name: { de: 'Schlafzimmer', en: 'Bedroom', fr: 'Chambre', tr: 'Yatak Odası', ar: 'غرفة النوم', ru: 'Спальня' }, isOuterPart: false },
  { name: { de: 'Kinderzimmer', en: "Children's Room", fr: "Chambre d'enfant", tr: 'Çocuk Odası', ar: 'غرفة الأطفال', ru: 'Детская' }, isOuterPart: false },
  { name: { de: 'Küche', en: 'Kitchen', fr: 'Cuisine', tr: 'Mutfak', ar: 'مطبخ', ru: 'Кухня' }, isOuterPart: false },
  { name: { de: 'Badezimmer', en: 'Bathroom', fr: 'Salle de bain', tr: 'Banyo', ar: 'حمام', ru: 'Ванная' }, isOuterPart: false },
  { name: { de: 'Flur', en: 'Hallway', fr: 'Couloir', tr: 'Koridor', ar: 'رواق', ru: 'Прихожая' }, isOuterPart: false },
  { name: { de: 'Esszimmer', en: 'Dining Room', fr: 'Salle à manger', tr: 'Yemek Odası', ar: 'غرفة الطعام', ru: 'Столовая' }, isOuterPart: false },
  { name: { de: 'Arbeitszimmer', en: 'Study', fr: 'Bureau', tr: 'Çalışma Odası', ar: 'غرفة الدراسة', ru: 'Кабинет' }, isOuterPart: false },
  { name: { de: 'Gästezimmer', en: 'Guest Room', fr: "Chambre d'amis", tr: 'Misafir Odası', ar: 'غرفة الضيوف', ru: 'Гостевая' }, isOuterPart: false },
  { name: { de: 'Abstellraum', en: 'Storage Room', fr: 'Débarras', tr: 'Depo', ar: 'غرفة التخزين', ru: 'Кладовая' }, isOuterPart: false },
  { name: { de: 'Waschküche', en: 'Laundry Room', fr: 'Buanderie', tr: 'Çamaşırhane', ar: 'غرفة الغسيل', ru: 'Прачечная' }, isOuterPart: false },
  { name: { de: 'Balkon', en: 'Balcony', fr: 'Balcon', tr: 'Balkon', ar: 'شرفة', ru: 'Балкон' }, isOuterPart: false },
  { name: { de: 'Terrasse', en: 'Terrace', fr: 'Terrasse', tr: 'Teras', ar: 'تراس', ru: 'Терраса' }, isOuterPart: false },
  { name: { de: 'Büro', en: 'Office', fr: 'Bureau', tr: 'Ofis', ar: 'مكتب', ru: 'Офис' }, isOuterPart: false },
  // Outer parts (shown separately in UI)
  { name: { de: 'Keller', en: 'Cellar', fr: 'Cave', tr: 'Bodrum', ar: 'قبو', ru: 'Подвал' }, isOuterPart: true },
  { name: { de: 'Dachboden', en: 'Attic', fr: 'Grenier', tr: 'Çatı Katı', ar: 'علية', ru: 'Чердак' }, isOuterPart: true },
  { name: { de: 'Garten/Garage', en: 'Garden/Garage', fr: 'Jardin/Garage', tr: 'Bahçe/Garaj', ar: 'حديقة/مرآب', ru: 'Сад/Гараж' }, isOuterPart: true },
];

async function seedEstatePartTypes() {
  console.log('Seeding estate part types (room types)...');

  const created: { name: string; id: string }[] = [];

  for (const pt of ESTATE_PART_TYPES) {
    const deName = (pt.name as Record<string, string>).de!;

    const existing = await prisma.estatePartType.findFirst({
      where: { name: { path: ['de'], equals: deName } },
    });

    if (existing) {
      await prisma.estatePartType.update({
        where: { id: existing.id },
        data: { name: pt.name, description: pt.name, isOuterPart: pt.isOuterPart },
      });
      created.push({ name: deName, id: existing.id });
    } else {
      const record = await prisma.estatePartType.create({
        data: {
          name: pt.name,
          description: pt.name, // description = name for room types
          isActive: true,
          isOuterPart: pt.isOuterPart,
        },
      });
      created.push({ name: deName, id: record.id });
    }
  }

  console.log(`  ✓ ${created.length} estate part types seeded`);
  return created;
}

// =============================================================================
// 5. Seed Estate Type ↔ Part Type Mapping (transport.estate_type_part_type_map)
// =============================================================================

// From Estate.xlsx Sheet 4: which room types are valid for which estate types
// Key: estate type DE name → array of valid part type DE names
const ESTATE_TYPE_PART_MAP: Record<string, string[]> = {
  Wohnung: [
    'Wohnzimmer', 'Schlafzimmer', 'Kinderzimmer', 'Küche', 'Badezimmer',
    'Flur', 'Esszimmer', 'Arbeitszimmer', 'Gästezimmer', 'Abstellraum',
    'Waschküche', 'Balkon', 'Terrasse',
    'Keller', 'Dachboden', 'Garten/Garage',
  ],
  Haus: [
    'Wohnzimmer', 'Schlafzimmer', 'Kinderzimmer', 'Küche', 'Badezimmer',
    'Flur', 'Esszimmer', 'Arbeitszimmer', 'Gästezimmer', 'Abstellraum',
    'Waschküche', 'Balkon', 'Terrasse',
    'Keller', 'Dachboden', 'Garten/Garage',
  ],
  Büro: [
    'Büro', 'Küche', 'Badezimmer', 'Flur', 'Abstellraum',
    'Keller', 'Dachboden',
  ],
  Lager: [
    'Abstellraum', 'Keller', 'Dachboden', 'Garten/Garage',
  ],
};

async function seedEstateTypePartMap(
  estateTypes: { name: string; id: string }[],
  partTypes: { name: string; id: string }[],
) {
  console.log('Seeding estate type ↔ part type mapping...');

  const etMap = new Map(estateTypes.map((et) => [et.name, et.id]));
  const ptMap = new Map(partTypes.map((pt) => [pt.name, pt.id]));

  let count = 0;

  for (const [estateTypeName, partTypeNames] of Object.entries(ESTATE_TYPE_PART_MAP)) {
    const estateTypeId = etMap.get(estateTypeName);
    if (!estateTypeId) continue;

    for (const partTypeName of partTypeNames) {
      const estatePartTypeId = ptMap.get(partTypeName);
      if (!estatePartTypeId) continue;

      await prisma.estateTypePartTypeMap.upsert({
        where: {
          estateTypeId_estatePartTypeId: { estateTypeId, estatePartTypeId },
        },
        create: {
          estateTypeId,
          estatePartTypeId,
          isMainType: false,
        },
        update: {},
      });
      count++;
    }
  }

  console.log(`  ✓ ${count} mappings seeded`);
}

// =============================================================================
// 6. Seed Furniture Group Types + Furniture Types
//    (transport.furniture_group_types + transport.furniture_types)
// =============================================================================

// Furniture data: hardcoded from Estate.xlsx Sheet 3
// Full 227 items would come from xlsx parsing — this is a representative subset
// TODO: Parse Estate.xlsx Sheet 3 for complete furniture catalog
//       Need xlsx library: npm install xlsx

const FURNITURE_GROUPS = [
  {
    name: { de: 'Sitzmöbel', en: 'Seating', fr: 'Sièges', tr: 'Oturma Mobilyası', ar: 'مقاعد', ru: 'Сидения' },
    items: [
      { name: { de: 'Stuhl', en: 'Chair' }, volume: 0.3, assemblable: false },
      { name: { de: 'Sessel', en: 'Armchair' }, volume: 0.8, assemblable: false },
      { name: { de: 'Sofa 2-Sitzer', en: '2-Seater Sofa' }, volume: 1.5, assemblable: false },
      { name: { de: 'Sofa 3-Sitzer', en: '3-Seater Sofa' }, volume: 2.0, assemblable: false },
      { name: { de: 'Ecksofa', en: 'Corner Sofa' }, volume: 3.0, assemblable: true, disassembleCost: 4000, assembleCost: 5000 },
      { name: { de: 'Hocker', en: 'Stool' }, volume: 0.15, assemblable: false },
    ],
  },
  {
    name: { de: 'Tische', en: 'Tables', fr: 'Tables', tr: 'Masalar', ar: 'طاولات', ru: 'Столы' },
    items: [
      { name: { de: 'Esstisch', en: 'Dining Table' }, volume: 1.2, assemblable: true, disassembleCost: 3000, assembleCost: 3500 },
      { name: { de: 'Couchtisch', en: 'Coffee Table' }, volume: 0.5, assemblable: false },
      { name: { de: 'Schreibtisch', en: 'Desk' }, volume: 1.0, assemblable: true, disassembleCost: 2500, assembleCost: 3000 },
      { name: { de: 'Nachttisch', en: 'Nightstand' }, volume: 0.2, assemblable: false },
      { name: { de: 'Küchentisch', en: 'Kitchen Table' }, volume: 0.8, assemblable: true, disassembleCost: 2000, assembleCost: 2500 },
    ],
  },
  {
    name: { de: 'Schränke', en: 'Wardrobes & Cabinets', fr: 'Armoires', tr: 'Dolaplar', ar: 'خزانات', ru: 'Шкафы' },
    items: [
      { name: { de: 'Kleiderschrank 2-türig', en: '2-Door Wardrobe' }, volume: 1.8, assemblable: true, disassembleCost: 5000, assembleCost: 6000 },
      { name: { de: 'Kleiderschrank 3-türig', en: '3-Door Wardrobe' }, volume: 2.5, assemblable: true, disassembleCost: 6000, assembleCost: 7000 },
      { name: { de: 'Kommode', en: 'Dresser' }, volume: 0.8, assemblable: false },
      { name: { de: 'Sideboard', en: 'Sideboard' }, volume: 1.0, assemblable: false },
      { name: { de: 'Vitrine', en: 'Display Cabinet' }, volume: 1.2, assemblable: true, disassembleCost: 4000, assembleCost: 5000 },
      { name: { de: 'Schuhschrank', en: 'Shoe Cabinet' }, volume: 0.5, assemblable: false },
    ],
  },
  {
    name: { de: 'Betten', en: 'Beds', fr: 'Lits', tr: 'Yataklar', ar: 'أسرة', ru: 'Кровати' },
    items: [
      { name: { de: 'Einzelbett', en: 'Single Bed' }, volume: 1.5, assemblable: true, disassembleCost: 3000, assembleCost: 3500 },
      { name: { de: 'Doppelbett', en: 'Double Bed' }, volume: 2.5, assemblable: true, disassembleCost: 4000, assembleCost: 4500 },
      { name: { de: 'Kinderbett', en: "Children's Bed" }, volume: 1.0, assemblable: true, disassembleCost: 2500, assembleCost: 3000 },
      { name: { de: 'Hochbett', en: 'Bunk Bed' }, volume: 2.0, assemblable: true, disassembleCost: 5000, assembleCost: 6000 },
      { name: { de: 'Matratze', en: 'Mattress' }, volume: 0.8, assemblable: false },
    ],
  },
  {
    name: { de: 'Regale', en: 'Shelves', fr: 'Étagères', tr: 'Raflar', ar: 'أرفف', ru: 'Полки' },
    items: [
      { name: { de: 'Bücherregal', en: 'Bookshelf' }, volume: 0.0, assemblable: true, disassembleCost: 3000, assembleCost: 3500, calculationType: 'LINEAR_METER', volumePerMeter: 0.4 },
      { name: { de: 'Wandregal', en: 'Wall Shelf' }, volume: 0.0, assemblable: true, disassembleCost: 1500, assembleCost: 2000, calculationType: 'LINEAR_METER', volumePerMeter: 0.2 },
      { name: { de: 'Regalwand', en: 'Shelf Unit' }, volume: 2.0, assemblable: true, disassembleCost: 5000, assembleCost: 6000 },
    ],
  },
  {
    name: { de: 'Küchenmöbel', en: 'Kitchen Furniture', fr: 'Meubles de cuisine', tr: 'Mutfak Mobilyası', ar: 'أثاث المطبخ', ru: 'Кухонная мебель' },
    items: [
      { name: { de: 'Kühlschrank', en: 'Refrigerator' }, volume: 1.0, assemblable: false },
      { name: { de: 'Waschmaschine', en: 'Washing Machine' }, volume: 0.6, assemblable: false },
      { name: { de: 'Geschirrspüler', en: 'Dishwasher' }, volume: 0.5, assemblable: false },
      { name: { de: 'Herd/Backofen', en: 'Stove/Oven' }, volume: 0.6, assemblable: false },
      { name: { de: 'Mikrowelle', en: 'Microwave' }, volume: 0.1, assemblable: false },
      { name: { de: 'Einbauküche', en: 'Fitted Kitchen' }, volume: 0.0, assemblable: true, disassembleCost: 15000, assembleCost: 20000, flatRate: 35000, calculationType: 'LINEAR_METER', volumePerMeter: 0.5 },
    ],
  },
  {
    name: { de: 'Elektronik', en: 'Electronics', fr: 'Électronique', tr: 'Elektronik', ar: 'إلكترونيات', ru: 'Электроника' },
    items: [
      { name: { de: 'Fernseher', en: 'Television' }, volume: 0.3, assemblable: false },
      { name: { de: 'Computer/Monitor', en: 'Computer/Monitor' }, volume: 0.2, assemblable: false },
      { name: { de: 'Drucker', en: 'Printer' }, volume: 0.15, assemblable: false },
    ],
  },
  {
    name: { de: 'Kartons & Verpackung', en: 'Boxes & Packing', fr: 'Cartons', tr: 'Kutular', ar: 'صناديق', ru: 'Коробки' },
    items: [
      { name: { de: 'Umzugskarton Standard', en: 'Standard Moving Box' }, volume: 0.06, assemblable: false },
      { name: { de: 'Umzugskarton Groß', en: 'Large Moving Box' }, volume: 0.1, assemblable: false },
      { name: { de: 'Bücherkarton', en: 'Book Box' }, volume: 0.04, assemblable: false },
      { name: { de: 'Kleiderbox', en: 'Wardrobe Box' }, volume: 0.5, assemblable: false },
    ],
  },
  {
    name: { de: 'Sonstiges', en: 'Other', fr: 'Divers', tr: 'Diğer', ar: 'أخرى', ru: 'Прочее' },
    items: [
      { name: { de: 'Teppich', en: 'Carpet' }, volume: 0.0, assemblable: false, calculationType: 'LINEAR_METER', volumePerMeter: 0.3 },
      { name: { de: 'Spiegel', en: 'Mirror' }, volume: 0.1, assemblable: false },
      { name: { de: 'Lampe/Stehlampe', en: 'Lamp/Floor Lamp' }, volume: 0.2, assemblable: false },
      { name: { de: 'Fahrrad', en: 'Bicycle' }, volume: 0.8, assemblable: false },
      { name: { de: 'Pflanze (groß)', en: 'Plant (large)' }, volume: 0.3, assemblable: false },
      { name: { de: 'Klavier', en: 'Piano' }, volume: 3.0, assemblable: false },
      { name: { de: 'Aquarium', en: 'Aquarium' }, volume: 0.5, assemblable: false },
    ],
  },
];

async function seedFurnitureTypes() {
  console.log('Seeding furniture groups & types...');

  let groupCount = 0;
  let itemCount = 0;

  for (const group of FURNITURE_GROUPS) {
    const groupDeName = (group.name as Record<string, string>).de!;

    // Upsert group
    let groupRecord = await prisma.furnitureGroupType.findFirst({
      where: { name: { path: ['de'], equals: groupDeName } },
    });

    if (groupRecord) {
      await prisma.furnitureGroupType.update({
        where: { id: groupRecord.id },
        data: { name: group.name, description: group.name },
      });
    } else {
      groupRecord = await prisma.furnitureGroupType.create({
        data: { name: group.name, description: group.name, isActive: true },
      });
    }
    groupCount++;

    // Upsert items
    for (const item of group.items) {
      const itemDeName = (item.name as Record<string, string>).de!;
      const calcType = (item as Record<string, unknown>).calculationType as string ?? 'COUNT';
      const volumePerMeter = (item as Record<string, unknown>).volumePerMeter as number | undefined;
      const volume = calcType === 'LINEAR_METER' ? (volumePerMeter ?? 0) : item.volume;

      const existing = await prisma.furnitureType.findFirst({
        where: {
          furnitureGroupTypeId: groupRecord.id,
          name: { path: ['de'], equals: itemDeName },
        },
      });

      const data = {
        furnitureGroupTypeId: groupRecord.id,
        name: item.name,
        description: item.name,
        isActive: true,
        volume,
        assemblable: item.assemblable,
        disassembleCost: (item as Record<string, unknown>).disassembleCost as number ?? null,
        assembleCost: (item as Record<string, unknown>).assembleCost as number ?? null,
        flatRate: (item as Record<string, unknown>).flatRate as number ?? null,
        calculationType: calcType,
      };

      if (existing) {
        await prisma.furnitureType.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await prisma.furnitureType.create({ data });
      }
      itemCount++;
    }
  }

  console.log(`  ✓ ${groupCount} furniture groups, ${itemCount} furniture types seeded`);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('🌱 CDS Platform — Seed Script');
  console.log('='.repeat(50));

  // Check seed data files exist
  if (!fs.existsSync(COUNTRY_CSV_PATH)) {
    console.warn(`⚠ Country.csv not found at: ${COUNTRY_CSV_PATH}`);
  }
  if (!fs.existsSync(POSTCODE_CSV_PATH)) {
    console.warn(`⚠ PostCodeData.csv not found at: ${POSTCODE_CSV_PATH}`);
  }

  // Seed in order (some depend on previous)
  if (fs.existsSync(COUNTRY_CSV_PATH)) {
    await seedCountries();
  }

  if (fs.existsSync(POSTCODE_CSV_PATH)) {
    await seedPostCodes();
  }

  const estateTypes = await seedEstateTypes();
  const partTypes = await seedEstatePartTypes();
  await seedEstateTypePartMap(estateTypes, partTypes);
  await seedFurnitureTypes();

  console.log('='.repeat(50));
  console.log('✅ Seed completed successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
