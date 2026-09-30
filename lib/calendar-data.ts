import type { Filter } from "mongodb";
import { getBookingsCollection, type Booking } from "./bookings";
import type { CalendarBooking } from "./calendar/types";

export function toCalendarBooking(doc: Booking & { _id?: unknown }): CalendarBooking {
  return {
    id: String(doc._id),
    code: doc.bookingCode,
    travelerName: doc.travelerName || "",
    travelerPhone: doc.travelerPhone || "",
    travelerEmail: doc.travelerEmail || "",
    companyName: doc.companyName,
    portal: doc.portal,
    userEmail: doc.userEmail,
    fromAddress: doc.fromAddress || "",
    toAddress: doc.toAddress || "",
    pickupDate: doc.pickupDate,
    pickupTime: doc.pickupTime,
    travelers: doc.travelers ?? 0,
    luggage: doc.luggage ?? 0,
    flightNumber: doc.flightNumber,
    comment: doc.comment,
    status: doc.status,
    category: doc.category,
    transferType: doc.transferType,
    paymentMethod: doc.paymentMethod,
    price: doc.price,
    driverId: doc.assignedDriverId || undefined,
    driverName: doc.assignedDriverName || undefined,
    vehicleId: doc.assignedVehicleId || undefined,
    vehicleName: doc.assignedVehicleName || undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const PROJECTION = {
  auditTrail: 0,
  priceApprovalRequest: 0,
  priceApprovalResponse: 0,
  bookingTrackToken: 0,
  sharedLinkToken: 0,
} as const;

export async function listBookingsInRange(from: string, to: string): Promise<CalendarBooking[]> {
  const col = await getBookingsCollection();
  const docs = await col
    .find({ pickupDate: { $gte: from, $lte: to } }, { projection: PROJECTION })
    .sort({ pickupDate: 1, pickupTime: 1 })
    .toArray();
  return docs.map((doc) => toCalendarBooking(doc as Booking));
}

export async function searchBookings(regex: RegExp, limit = 60): Promise<CalendarBooking[]> {
  const col = await getBookingsCollection();
  const fields = [
    "travelerName",
    "bookingCode",
    "companyName",
    "assignedDriverName",
    "assignedVehicleName",
    "fromAddress",
    "toAddress",
    "travelerPhone",
    "travelerEmail",
    "flightNumber",
    "comment",
  ];
  const filter = { $or: fields.map((field) => ({ [field]: regex })) } as Filter<Booking>;
  const docs = await col
    .find(filter, { projection: PROJECTION })
    .sort({ pickupDate: -1, pickupTime: -1 })
    .limit(limit)
    .toArray();
  return docs.map((doc) => toCalendarBooking(doc as Booking));
}

export async function countPendingBookings(): Promise<number> {
  const col = await getBookingsCollection();
  return col.countDocuments({ status: "pending" });
}
