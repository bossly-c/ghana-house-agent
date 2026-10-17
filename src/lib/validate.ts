// src/lib/validate.ts

export type ValidationError = { field: string; message: string };

export interface ValidationResult<T> {
  ok: boolean;
  data?: T;
  errors?: ValidationError[];
}

// ── Helpers ────────────────────────────────────────────────────────────
const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && isFinite(v);

function str(
  obj: Record<string, unknown>,
  key: string,
  { min = 1, max = 500, required = true } = {}
): ValidationError | null {
  const v = obj[key];
  if (!v && required) return { field: key, message: `${key} is required` };
  if (v && !isString(v)) return { field: key, message: `${key} must be text` };
  if (v && isString(v) && v.trim().length < min)
    return { field: key, message: `${key} must be at least ${min} characters` };
  if (v && isString(v) && v.trim().length > max)
    return { field: key, message: `${key} must be under ${max} characters` };
  return null;
}

function num(
  obj: Record<string, unknown>,
  key: string,
  { min = 0, max = 999_999_999, required = true } = {}
): ValidationError | null {
  const v = Number(obj[key]);
  if (required && (obj[key] === undefined || obj[key] === null || obj[key] === ""))
    return { field: key, message: `${key} is required` };
  if (!isNumber(v)) return { field: key, message: `${key} must be a number` };
  if (v < min) return { field: key, message: `${key} must be at least ${min}` };
  if (v > max) return { field: key, message: `${key} must be under ${max}` };
  return null;
}

function phone(v: unknown): boolean {
  if (!isString(v)) return false;
  // Allow: +233241234567 / 0241234567 / 233241234567
  return /^(\+?233|0)[0-9]{9}$/.test(v.replace(/\s/g, ""));
}

function isGhanaCoord(lat: unknown, lng: unknown): boolean {
  const la = Number(lat);
  const ln = Number(lng);
  return (
    isFinite(la) && la >= 4.5  && la <= 11.5 &&
    isFinite(ln) && ln >= -3.5 && ln <= 1.5
  );
}

// ── Property validator ─────────────────────────────────────────────────
export function validateCreateProperty(
  body: Record<string, unknown>
): ValidationResult<Record<string, unknown>> {
  const errors: ValidationError[] = [];

  // Text fields
  const checks = [
    str(body, "title",        { min: 5,  max: 120 }),
    str(body, "propertyType", { min: 2,  max: 80  }),
    str(body, "region",       { min: 2,  max: 60  }),
    str(body, "city",         { min: 2,  max: 80  }),
    str(body, "area",         { min: 2,  max: 120 }),
    str(body, "ownerName",    { min: 2,  max: 80  }),
    str(body, "description",  { min: 0,  max: 2000, required: false }),
    str(body, "address",      { min: 0,  max: 200,  required: false }),
    num(body, "price",        { min: 1,  max: 50_000_000 }),
  ];

  checks.forEach((e) => e && errors.push(e));

  // Listing type
  if (!["rent", "sale"].includes(String(body.listingType))) {
    errors.push({ field: "listingType", message: "Must be 'rent' or 'sale'" });
  }

  // Ghana coordinates check
  if (!isGhanaCoord(body.lat, body.lng)) {
    errors.push({
      field: "lat/lng",
      message: "Location must be within Ghana (tap the map to pin it)",
    });
  }

  // Phone number
  if (!phone(body.ownerPhone)) {
    errors.push({
      field: "ownerPhone",
      message: "Enter a valid Ghana phone number e.g. 0241234567",
    });
  }

  // Arrays
  if (!Array.isArray(body.viewingDays) || body.viewingDays.length === 0) {
    errors.push({ field: "viewingDays", message: "Pick at least one viewing day" });
  }

  // Images — must be URLs if provided
  if (Array.isArray(body.images)) {
    body.images.forEach((img: unknown, i: number) => {
      if (img && isString(img) && !img.startsWith("http")) {
        errors.push({ field: `images[${i}]`, message: "Must be a valid URL starting with http" });
      }
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: body };
}

// ── Viewing validator ──────────────────────────────────────────────────
export function validateCreateViewing(
  body: Record<string, unknown>
): ValidationResult<Record<string, unknown>> {
  const errors: ValidationError[] = [];

  const checks = [
    str(body, "propertyId", { min: 36, max: 36 }), // UUID
    str(body, "name",       { min: 2,  max: 80  }),
    str(body, "day",        { min: 2,  max: 20  }),
    str(body, "note",       { min: 0,  max: 500, required: false }),
  ];
  checks.forEach((e) => e && errors.push(e));

  if (!phone(body.phone)) {
    errors.push({
      field: "phone",
      message: "Enter a valid Ghana phone number e.g. 0241234567",
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: body };
}