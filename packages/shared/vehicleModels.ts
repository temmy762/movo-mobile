/* AUTO-SYNCED from movo-web/lib/vehicleModels.ts by scripts/sync-shared.mjs — do not edit here. */

/**
 * Makes and their common models for the Safe Ride "Your vehicle" step (web
 * booking and the customer app — synced into movo-mobile packages/shared by
 * scripts/sync-shared.mjs). Passenger cars, SUVs, vans and pickups sold in
 * Canada over roughly the last 25 years. Not exhaustive: the form always
 * offers "Other" to type a make or model that isn't listed.
 */

export const VEHICLE_OTHER = "Other";

export const VEHICLE_MODELS: Record<string, string[]> = {
  Acura: ["CSX", "ILX", "Integra", "MDX", "RDX", "RL", "RLX", "TL", "TLX", "TSX", "ZDX"],
  Audi: ["A3", "A4", "A5", "A6", "A7", "A8", "e-tron", "Q3", "Q4 e-tron", "Q5", "Q7", "Q8", "S4", "S5", "TT"],
  BMW: ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "7 Series", "i3", "i4", "iX", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "Z4"],
  Buick: ["Enclave", "Encore", "Encore GX", "Envision", "Envista", "LaCrosse", "Regal", "Verano"],
  Cadillac: ["ATS", "CT4", "CT5", "CTS", "Escalade", "Lyriq", "SRX", "XT4", "XT5", "XT6", "XTS"],
  Chevrolet: [
    "Blazer", "Bolt EV", "Bolt EUV", "Camaro", "Colorado", "Cruze", "Equinox", "Express", "Impala", "Malibu",
    "Orlando", "Silverado 1500", "Silverado 2500HD", "Sonic", "Spark", "Suburban", "Tahoe", "Trailblazer", "Traverse",
    "Trax", "Volt",
  ],
  Chrysler: ["200", "300", "Grand Caravan", "Pacifica", "Town & Country"],
  Dodge: ["Challenger", "Charger", "Dart", "Durango", "Grand Caravan", "Hornet", "Journey"],
  Ford: [
    "Bronco", "Bronco Sport", "Edge", "Escape", "Expedition", "Explorer", "F-150", "F-250", "F-150 Lightning",
    "Fiesta", "Flex", "Focus", "Fusion", "Maverick", "Mustang", "Mustang Mach-E", "Ranger", "Taurus", "Transit",
    "Transit Connect",
  ],
  Genesis: ["G70", "G80", "G90", "GV60", "GV70", "GV80"],
  GMC: ["Acadia", "Canyon", "Hummer EV", "Savana", "Sierra 1500", "Sierra 2500HD", "Terrain", "Yukon", "Yukon XL"],
  Honda: ["Accord", "Civic", "CR-V", "Fit", "HR-V", "Insight", "Odyssey", "Passport", "Pilot", "Prologue", "Ridgeline"],
  Hyundai: [
    "Accent", "Elantra", "Ioniq", "Ioniq 5", "Ioniq 6", "Kona", "Palisade", "Santa Cruz", "Santa Fe", "Sonata",
    "Tucson", "Veloster", "Venue",
  ],
  Infiniti: ["G37", "Q50", "Q60", "QX50", "QX55", "QX60", "QX80"],
  Jaguar: ["E-Pace", "F-Pace", "F-Type", "I-Pace", "XE", "XF", "XJ"],
  Jeep: ["Cherokee", "Compass", "Gladiator", "Grand Cherokee", "Grand Cherokee L", "Liberty", "Patriot", "Renegade", "Wagoneer", "Wrangler"],
  Kia: [
    "Carnival", "EV6", "EV9", "Forte", "K5", "Niro", "Optima", "Rio", "Sedona", "Seltos", "Sorento", "Soul",
    "Sportage", "Stinger", "Telluride",
  ],
  "Land Rover": ["Defender", "Discovery", "Discovery Sport", "LR4", "Range Rover", "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar"],
  Lexus: ["ES", "GS", "GX", "IS", "LS", "LX", "NX", "RC", "RX", "RZ", "TX", "UX"],
  Lincoln: ["Aviator", "Continental", "Corsair", "MKC", "MKX", "MKZ", "Nautilus", "Navigator"],
  Mazda: ["CX-3", "CX-30", "CX-5", "CX-50", "CX-70", "CX-9", "CX-90", "Mazda3", "Mazda5", "Mazda6", "MX-5 Miata"],
  "Mercedes-Benz": [
    "A-Class", "C-Class", "CLA", "E-Class", "EQB", "EQE", "EQS", "G-Class", "GLA", "GLB", "GLC", "GLE", "GLS",
    "S-Class", "Sprinter",
  ],
  Mini: ["Clubman", "Cooper", "Countryman"],
  Mitsubishi: ["Eclipse Cross", "Lancer", "Mirage", "Outlander", "Outlander PHEV", "RVR"],
  Nissan: [
    "Altima", "Armada", "Frontier", "Kicks", "Leaf", "Maxima", "Micra", "Murano", "Pathfinder", "Qashqai",
    "Rogue", "Sentra", "Titan", "Versa", "Ariya",
  ],
  Porsche: ["911", "Cayenne", "Macan", "Panamera", "Taycan"],
  Ram: ["1500", "2500", "3500", "ProMaster", "ProMaster City"],
  Subaru: ["Ascent", "BRZ", "Crosstrek", "Forester", "Impreza", "Legacy", "Outback", "Solterra", "WRX"],
  Tesla: ["Cybertruck", "Model 3", "Model S", "Model X", "Model Y"],
  Toyota: [
    "4Runner", "bZ4X", "C-HR", "Camry", "Corolla", "Corolla Cross", "Grand Highlander", "Highlander", "Matrix",
    "Prius", "RAV4", "RAV4 Prime", "Sequoia", "Sienna", "Tacoma", "Tundra", "Venza", "Yaris",
  ],
  Volkswagen: ["Atlas", "Atlas Cross Sport", "Beetle", "Golf", "GTI", "ID.4", "Jetta", "Passat", "Taos", "Tiguan"],
  Volvo: ["C40", "EX30", "S60", "S90", "V60", "V90", "XC40", "XC60", "XC90"],
};

/* Each make's models in alphabetical order (numbers first) */
for (const make of Object.keys(VEHICLE_MODELS)) {
  VEHICLE_MODELS[make] = [...VEHICLE_MODELS[make]].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

export const VEHICLE_MAKES: string[] = Object.keys(VEHICLE_MODELS).sort((a, b) => a.localeCompare(b));

/** The listed make matching `make` (any case), or null when it isn't listed */
export function listedMake(make: string): string | null {
  const m = make.trim().toLowerCase();
  return VEHICLE_MAKES.find((x) => x.toLowerCase() === m) ?? null;
}

/** The listed model of `make` matching `model` (any case), or null */
export function listedModel(make: string, model: string): string | null {
  const mk = listedMake(make);
  if (!mk) return null;
  const m = model.trim().toLowerCase();
  return VEHICLE_MODELS[mk].find((x) => x.toLowerCase() === m) ?? null;
}
