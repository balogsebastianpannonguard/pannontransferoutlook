"use client";

export interface StaffDriver {
  _id: string;
  name: string;
  phone?: string;
  status?: string;
}

export interface StaffVehicle {
  _id: string;
  name: string;
  plates?: string;
  status?: string;
  condition?: string;
}

export interface StaffLists {
  drivers: StaffDriver[];
  vehicles: StaffVehicle[];
}

let cache: Promise<StaffLists> | null = null;

export function loadStaff(force = false): Promise<StaffLists> {
  if (!cache || force) {
    cache = Promise.all([
      fetch("/api/drivers", { credentials: "include" }).then((r) => (r.ok ? r.json() : { drivers: [] })),
      fetch("/api/vehicles", { credentials: "include" }).then((r) => (r.ok ? r.json() : { vehicles: [] })),
    ])
      .then(([d, v]) => ({
        drivers: (d.drivers ?? []) as StaffDriver[],
        vehicles: (v.vehicles ?? []) as StaffVehicle[],
      }))
      .catch(() => {
        cache = null;
        return { drivers: [], vehicles: [] };
      });
  }
  return cache;
}
