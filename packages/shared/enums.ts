/* AUTO-SYNCED from movo-web/prisma/schema.prisma by scripts/sync-shared.mjs — do not edit here. */

export const Role = {
  USER: "USER",
  DRIVER: "DRIVER",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const DriverStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;
export type DriverStatus = (typeof DriverStatus)[keyof typeof DriverStatus];

export const BookingStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const PaymentStatus = {
  UNPAID: "UNPAID",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const WalletTxType = {
  PAYOUT: "PAYOUT",
  TOPUP: "TOPUP",
  EARNING: "EARNING",
} as const;
export type WalletTxType = (typeof WalletTxType)[keyof typeof WalletTxType];

export const WalletTxStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type WalletTxStatus = (typeof WalletTxStatus)[keyof typeof WalletTxStatus];

export const SupportCategory = {
  CONTACT_DRIVER: "CONTACT_DRIVER",
  RIDE_ISSUE: "RIDE_ISSUE",
  PAYMENT_HELP: "PAYMENT_HELP",
  CHAT_SUPPORT: "CHAT_SUPPORT",
  GENERAL_INQUIRY: "GENERAL_INQUIRY",
} as const;
export type SupportCategory = (typeof SupportCategory)[keyof typeof SupportCategory];

export const SupportStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;
export type SupportStatus = (typeof SupportStatus)[keyof typeof SupportStatus];

export const IncidentType = {
  ACCIDENT: "ACCIDENT",
  UNSAFE_DRIVING: "UNSAFE_DRIVING",
  HARASSMENT: "HARASSMENT",
  VEHICLE_ISSUE: "VEHICLE_ISSUE",
  ROUTE_DEVIATION: "ROUTE_DEVIATION",
  OTHER: "OTHER",
  CUSTOMER_MISCONDUCT: "CUSTOMER_MISCONDUCT",
  MEDICAL_EMERGENCY: "MEDICAL_EMERGENCY",
  SAFETY_CONCERN: "SAFETY_CONCERN",
} as const;
export type IncidentType = (typeof IncidentType)[keyof typeof IncidentType];

export const ReviewStatus = {
  PENDING: "PENDING",
  AI_REVIEWED: "AI_REVIEWED",
  MANUALLY_REVIEWED: "MANUALLY_REVIEWED",
  RESOLVED: "RESOLVED",
  DISMISSED: "DISMISSED",
} as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const RiskLevel = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

export const OnboardingType = {
  INDIVIDUAL: "INDIVIDUAL",
  FLEET: "FLEET",
} as const;
export type OnboardingType = (typeof OnboardingType)[keyof typeof OnboardingType];

export const VehicleOption = {
  OWN: "OWN",
  RENT: "RENT",
} as const;
export type VehicleOption = (typeof VehicleOption)[keyof typeof VehicleOption];

export const BookingType = {
  NORMAL: "NORMAL",
  AIRPORT: "AIRPORT",
  HOURLY: "HOURLY",
  CARE: "CARE",
} as const;
export type BookingType = (typeof BookingType)[keyof typeof BookingType];

export const AssignmentType = {
  PRIMARY: "PRIMARY",
  RECOVERY: "RECOVERY",
} as const;
export type AssignmentType = (typeof AssignmentType)[keyof typeof AssignmentType];

export const CareRole = {
  PRIMARY: "PRIMARY",
  SUPPORT: "SUPPORT",
} as const;
export type CareRole = (typeof CareRole)[keyof typeof CareRole];

export const CareAssignmentStatus = {
  SEARCHING: "SEARCHING",
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  ARRIVED: "ARRIVED",
  STARTED: "STARTED",
  AWAITING_RETURN: "AWAITING_RETURN",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type CareAssignmentStatus = (typeof CareAssignmentStatus)[keyof typeof CareAssignmentStatus];

export const OnboardingAdminStatus = {
  PENDING: "PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type OnboardingAdminStatus = (typeof OnboardingAdminStatus)[keyof typeof OnboardingAdminStatus];

export const DocumentType = {
  DRIVERS_LICENSE: "DRIVERS_LICENSE",
  BACKGROUND_CHECK: "BACKGROUND_CHECK",
  DRIVERS_ABSTRACT: "DRIVERS_ABSTRACT",
  VEHICLE_REGISTRATION: "VEHICLE_REGISTRATION",
  VEHICLE_INSURANCE: "VEHICLE_INSURANCE",
  VEHICLE_PHOTO: "VEHICLE_PHOTO",
  PROFILE_PHOTO: "PROFILE_PHOTO",
  WORK_ELIGIBILITY: "WORK_ELIGIBILITY",
  BANKING_INFO: "BANKING_INFO",
  OTHER: "OTHER",
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const DocumentStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const RentalVehicleStatus = {
  AVAILABLE: "AVAILABLE",
  RENTED: "RENTED",
  MAINTENANCE: "MAINTENANCE",
  OUT_OF_SERVICE: "OUT_OF_SERVICE",
} as const;
export type RentalVehicleStatus = (typeof RentalVehicleStatus)[keyof typeof RentalVehicleStatus];

export const RentalPlan = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
} as const;
export type RentalPlan = (typeof RentalPlan)[keyof typeof RentalPlan];

export const RentalStatus = {
  REQUESTED: "REQUESTED",
  APPROVED: "APPROVED",
  DECLINED: "DECLINED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type RentalStatus = (typeof RentalStatus)[keyof typeof RentalStatus];

export const RenterType = {
  DRIVER: "DRIVER",
  USER: "USER",
} as const;
export type RenterType = (typeof RenterType)[keyof typeof RenterType];

export const NotificationType = {
  EMAIL: "EMAIL",
  IN_APP: "IN_APP",
  SMS: "SMS",
  PUSH: "PUSH",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationChannel = {
  RIDER: "RIDER",
  CHAUFFEUR: "CHAUFFEUR",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
} as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NotificationEventType = {
  RIDER_WELCOME: "RIDER_WELCOME",
  RIDER_EMAIL_VERIFICATION: "RIDER_EMAIL_VERIFICATION",
  RIDER_PASSWORD_RESET: "RIDER_PASSWORD_RESET",
  RIDER_BOOKING_CONFIRMED: "RIDER_BOOKING_CONFIRMED",
  RIDER_BOOKING_UPDATED: "RIDER_BOOKING_UPDATED",
  RIDER_DRIVER_ASSIGNED: "RIDER_DRIVER_ASSIGNED",
  RIDER_RIDE_COMPLETED: "RIDER_RIDE_COMPLETED",
  RIDER_PAYMENT_RECEIPT: "RIDER_PAYMENT_RECEIPT",
  RIDER_INCIDENT_SUBMITTED: "RIDER_INCIDENT_SUBMITTED",
  RIDER_INCIDENT_RESOLVED: "RIDER_INCIDENT_RESOLVED",
  CHAUFFEUR_WELCOME: "CHAUFFEUR_WELCOME",
  CHAUFFEUR_ONBOARDING_SUBMITTED: "CHAUFFEUR_ONBOARDING_SUBMITTED",
  CHAUFFEUR_ONBOARDING_APPROVED: "CHAUFFEUR_ONBOARDING_APPROVED",
  CHAUFFEUR_ONBOARDING_REJECTED: "CHAUFFEUR_ONBOARDING_REJECTED",
  CHAUFFEUR_BOOKING_ASSIGNED: "CHAUFFEUR_BOOKING_ASSIGNED",
  CHAUFFEUR_BOOKING_CANCELLED: "CHAUFFEUR_BOOKING_CANCELLED",
  CHAUFFEUR_PAYOUT_NOTIFICATION: "CHAUFFEUR_PAYOUT_NOTIFICATION",
  ADMIN_NEW_DRIVER_APPLICATION: "ADMIN_NEW_DRIVER_APPLICATION",
  ADMIN_NEW_INCIDENT_REPORT: "ADMIN_NEW_INCIDENT_REPORT",
  ADMIN_EMERGENCY_INCIDENT: "ADMIN_EMERGENCY_INCIDENT",
  ADMIN_NEW_FLEET_APPLICATION: "ADMIN_NEW_FLEET_APPLICATION",
  ADMIN_PAYOUT_REQUEST: "ADMIN_PAYOUT_REQUEST",
  SUPPORT_TICKET_CREATED: "SUPPORT_TICKET_CREATED",
  SUPPORT_TICKET_UPDATED: "SUPPORT_TICKET_UPDATED",
  SUPPORT_TICKET_RESOLVED: "SUPPORT_TICKET_RESOLVED",
  RIDER_BOOKING_CANCELLED: "RIDER_BOOKING_CANCELLED",
  RIDER_RIDE_UNAVAILABLE_REFUNDED: "RIDER_RIDE_UNAVAILABLE_REFUNDED",
  CHAUFFEUR_TOPUP_NOTIFICATION: "CHAUFFEUR_TOPUP_NOTIFICATION",
  CHAUFFEUR_RENTAL_APPROVED: "CHAUFFEUR_RENTAL_APPROVED",
  CHAUFFEUR_RENTAL_DECLINED: "CHAUFFEUR_RENTAL_DECLINED",
  CHAUFFEUR_CARE_PICKUP_READY: "CHAUFFEUR_CARE_PICKUP_READY",
  CHAUFFEUR_CARE_SUPPORT_EN_ROUTE: "CHAUFFEUR_CARE_SUPPORT_EN_ROUTE",
  CHAUFFEUR_UBER_RETURN_BOOKED: "CHAUFFEUR_UBER_RETURN_BOOKED",
  ADMIN_CARE_DISPATCH_FAILED: "ADMIN_CARE_DISPATCH_FAILED",
  ADMIN_CARE_SUPPORT_STRANDED: "ADMIN_CARE_SUPPORT_STRANDED",
  ADMIN_RIDE_DISPATCH_FAILED: "ADMIN_RIDE_DISPATCH_FAILED",
  ADMIN_RENTAL_REQUEST: "ADMIN_RENTAL_REQUEST",
  ADMIN_RENTAL_RETURN_REQUESTED: "ADMIN_RENTAL_RETURN_REQUESTED",
  ADMIN_SAFE_RIDE_BOOK_UBER: "ADMIN_SAFE_RIDE_BOOK_UBER",
} as const;
export type NotificationEventType = (typeof NotificationEventType)[keyof typeof NotificationEventType];

export const NotificationStatus = {
  PENDING: "PENDING",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  READ: "READ",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

export const ComplaintCategory = {
  CHAUFFEUR: "CHAUFFEUR",
  VEHICLE: "VEHICLE",
  BILLING: "BILLING",
  SAFETY: "SAFETY",
  LOST_PROPERTY: "LOST_PROPERTY",
  GENERAL: "GENERAL",
} as const;
export type ComplaintCategory = (typeof ComplaintCategory)[keyof typeof ComplaintCategory];

export const ComplaintStatus = {
  OPEN: "OPEN",
  INVESTIGATING: "INVESTIGATING",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;
export type ComplaintStatus = (typeof ComplaintStatus)[keyof typeof ComplaintStatus];

export const LostFoundStatus = {
  REPORTED: "REPORTED",
  MATCHED: "MATCHED",
  RETURNED: "RETURNED",
  CLOSED: "CLOSED",
} as const;
export type LostFoundStatus = (typeof LostFoundStatus)[keyof typeof LostFoundStatus];
