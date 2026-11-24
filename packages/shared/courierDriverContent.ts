/* AUTO-SYNCED from movo-web/lib/courier/driverContent.ts by scripts/sync-shared.mjs — do not edit here. */

/**
 * Movo Courier driver application — Movo's copy (Nov 24 2026) and the draft
 * Courier Driver Agreement. Pure data, shared with the driver app
 * (movo-mobile packages/shared/courierDriverContent.ts via sync-shared).
 */

export const COURIER_DRIVER_INTRO = {
  title: "Become a Movo Courier Driver",
  tagline: "Deliver locally. Connect communities. Earn on your schedule.",
  body: [
    "Join Movo Courier and earn by delivering packages, documents, gifts and everyday goods across Winnipeg and surrounding Manitoba communities.",
    "Use your own vehicle, choose your working hours and accept delivery requests that suit your schedule.",
  ],
};

export const COURIER_DRIVER_WHY = [
  "Flexible working hours.",
  "Earn using your own vehicle.",
  "Local and intercity delivery opportunities.",
  "View delivery earnings before accepting requests.",
  "Secure in-app payouts.",
  "Dedicated driver support.",
];

export const COURIER_SERVICE_AREAS = {
  planned: "Our planned delivery network connects Winnipeg with Headingley, La Salle, Oakbank, Sunnyside, Dugald, St. Adolphe, Île-des-Chênes, Stonewall, Lorette, Niverville, Sanford, Selkirk, Steinbach, Portage la Prairie, Winkler/Morden and Brandon.",
  pilot: ["Winnipeg ↔ La Salle", "Winnipeg ↔ Steinbach"],
  note: "Additional routes will be activated as the network expands.",
};

export const COURIER_DRIVER_REQUIREMENTS = [
  "Must be at least 19 years old.",
  "Valid Class 5F driver's licence or equivalent.",
  "Minimum of one year of driving experience.",
  "Legally eligible to work in Canada.",
  "Access to a reliable and appropriately insured vehicle.",
  "Clean and acceptable driving record.",
  "Pass a criminal background check.",
  "Access to a compatible smartphone.",
];
export const COURIER_NO_EXPERIENCE = "No previous courier experience required.";

export const COURIER_VEHICLE_TYPES = [
  { id: "SEDAN", label: "Sedan" },
  { id: "HATCHBACK", label: "Hatchback" },
  { id: "SUV", label: "SUV" },
  { id: "MINIVAN", label: "Minivan" },
  { id: "PICKUP", label: "Pickup truck" },
  { id: "CARGO_VAN", label: "Cargo van" },
] as const;
export type CourierVehicleType = (typeof COURIER_VEHICLE_TYPES)[number]["id"];
export const COURIER_VEHICLE_NOTE = "Vehicles must be clean, roadworthy and suitable for transporting packages.";

export const COURIER_LICENSE_CLASSES = [
  { id: "CLASS_5F", label: "Class 5F (Manitoba)" },
  { id: "EQUIVALENT", label: "Equivalent full licence (another province)" },
] as const;

export const COURIER_MIN_AGE = 19;
export const COURIER_MIN_YEARS_DRIVING = 1;

/* Documents the application asks for (DocumentType keys) */
export const COURIER_DOCUMENTS = [
  { key: "PROFILE_PHOTO", label: "Profile Picture" },
  { key: "DRIVERS_LICENSE", label: "Driver's Licence" },
  { key: "BACKGROUND_CHECK", label: "Criminal Record Check" },
  { key: "DRIVERS_ABSTRACT", label: "MPI Driver Abstract" },
  { key: "WORK_ELIGIBILITY", label: "Proof of Work Eligibility" },
  { key: "VEHICLE_REGISTRATION", label: "Vehicle Registration and Insurance (covering courier activities)" },
  { key: "VEHICLE_PHOTO", label: "Vehicle Photos" },
] as const;

export const COURIER_DRIVER_RESPONSIBILITIES = [
  "Handle packages carefully and securely.",
  "Verify pickup and delivery details.",
  "Follow customer delivery instructions.",
  "Provide proof of delivery.",
  "Maintain professional conduct.",
  "Never open or tamper with packages.",
  "Report delivery issues or incidents immediately.",
];

export const COURIER_GET_STARTED = [
  "Submit your application.",
  "Upload the required documents.",
  "Complete the review and approval process.",
  "Connect your bank account through the Movo Driver app.",
  "Go online and start accepting delivery requests.",
];

export const COURIER_BANKING_NOTE = "You'll connect your bank account in the Movo Driver app after you're approved — no banking details are needed to apply.";

/* DRAFT for Movo to review — built from the requirements and responsibilities above */
export const COURIER_AGREEMENT_VERSION = "2026-11-24 (draft)";
export const COURIER_AGREEMENT = [
  { h: "1. Parties", p: "This Courier Driver Agreement is between Movo (\"Movo\") and the driver named in the signature below (\"Driver\"). The Driver is an independent contractor. Nothing in this Agreement creates an employment, partnership or agency relationship." },
  { h: "2. Services", p: "The Driver may accept Movo Courier delivery requests offered through the Movo platform. The Driver chooses their working hours and may decline any request. Delivery earnings are shown before a request is accepted." },
  { h: "3. Eligibility", p: "The Driver confirms they are at least 19 years old, hold a valid Class 5F driver's licence or equivalent with at least one year of driving experience, are legally eligible to work in Canada, have a clean and acceptable driving record, and have passed a criminal background check. The Driver will tell Movo promptly if any of this changes." },
  { h: "4. Vehicle and insurance", p: "The Driver will use a clean, roadworthy vehicle suitable for transporting packages, registered and insured with coverage that includes courier and delivery activities. The Driver is responsible for their vehicle, fuel, maintenance and insurance." },
  { h: "5. Handling packages", p: "The Driver will handle packages carefully and securely, verify pickup and delivery details, follow customer delivery instructions, provide proof of delivery (photos at pickup and drop-off), and never open or tamper with a package. The Driver will refuse items Movo does not carry." },
  { h: "6. Conduct and incidents", p: "The Driver will act professionally with customers and the public, follow all traffic and safety laws, and report delivery issues, damage, loss or incidents to Movo immediately." },
  { h: "7. Payment", p: "Earnings for completed deliveries, waiting time and tips are credited to the Driver's Movo wallet and paid out to the bank account the Driver connects in the Movo Driver app." },
  { h: "8. Cancellations", p: "A Driver who can no longer complete an accepted delivery must cancel it in the app as early as possible. Repeated late cancellations of booked-ahead deliveries may pause those offers." },
  { h: "9. Privacy", p: "The Driver will use customer names, phone numbers and addresses only to complete the delivery and will not keep or share them." },
  { h: "10. Ending this Agreement", p: "Either party may end this Agreement at any time by written notice. Movo may suspend access to the platform for safety, legal or conduct reasons." },
  { h: "11. Governing law", p: "This Agreement is governed by the laws of Manitoba and the federal laws of Canada that apply there." },
];
