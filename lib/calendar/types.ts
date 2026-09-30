import type { BookingCategory, BookingStatus } from "@/lib/bookings";

export type CalendarViewId = "agenda" | "day" | "threeDay" | "week" | "month";

export type ToneId =
  | "sky"
  | "blue"
  | "teal"
  | "green"
  | "lime"
  | "rose"
  | "orange"
  | "purple"
  | "indigo"
  | "gray";

export type CustomEventKind = "leave" | "event";

/** Slim booking shape sent to the calendar client. */
export interface CalendarBooking {
  id: string;
  code: string;
  travelerName: string;
  travelerPhone: string;
  travelerEmail: string;
  companyName?: string;
  portal?: string;
  userEmail?: string;
  fromAddress: string;
  toAddress: string;
  pickupDate: string;
  pickupTime: string;
  travelers: number;
  luggage: number;
  flightNumber?: string;
  comment?: string;
  status: BookingStatus;
  category: BookingCategory;
  transferType: string;
  paymentMethod: string;
  price?: number;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehicleName?: string;
  createdAt: number;
  updatedAt: number;
}

/** Non-booking entries (driver leave, misc.) stored in `calendar_events`. */
export interface CustomEventDTO {
  id: string;
  title: string;
  kind: CustomEventKind;
  allDay: boolean;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  driverName?: string;
  notes?: string;
  tone?: ToneId;
  createdBy?: string;
  createdAt: number;
}

export interface CalendarPayload {
  bookings: CalendarBooking[];
  events: CustomEventDTO[];
  pendingCount: number;
  serverTime: number;
}

export interface CalEvent {
  key: string;
  id: string;
  source: "booking" | "custom";
  title: string;
  subtitle?: string;
  date: string;
  start: number;
  end: number;
  allDay: boolean;
  dayIndex?: number;
  dayCount?: number;
  tone: ToneId;
  tentative: boolean;
  cancelled: boolean;
  unassigned: boolean;
  icon: "clipboard" | "palm" | "none";
  booking?: CalendarBooking;
  custom?: CustomEventDTO;
  searchText: string;
}

export interface CalendarFilters {
  partners: string[];
  drivers: string[];
  showCancelled: boolean;
  onlyUnassigned: boolean;
}

export const DEFAULT_FILTERS: CalendarFilters = {
  partners: [],
  drivers: [],
  showCancelled: true,
  onlyUnassigned: false,
};
