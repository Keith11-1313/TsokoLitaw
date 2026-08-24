import type { OrderStatus } from "@/components/ui/status-badge";

export interface MockOrder { id: string; date: string; pickup: string; status: OrderStatus; total: number; box: string; coatings: string; reviewed?: boolean }
export const MOCK_ORDERS: readonly MockOrder[] = [
  { id: "ORD-010", date: "August 23, 2026", pickup: "September 5 · 2:00 PM · Social Hall", status: "CONFIRMED", total: 115, box: "Box of 8", coatings: "Cocoa × 4, Milk × 4" },
  { id: "ORD-008", date: "August 15, 2026", pickup: "September 5 · 3:00 PM · Court", status: "PREPARING", total: 85, box: "Box of 6", coatings: "Cocoa × 6" },
  { id: "ORD-004", date: "July 30, 2026", pickup: "September 7 · 1:00 PM · Social Hall", status: "COMPLETED", total: 65, box: "Box of 4", coatings: "Palitaw × 2, Crushed Nuts × 2" },
  { id: "ORD-002", date: "July 12, 2026", pickup: "September 7 · 2:00 PM · Court", status: "COMPLETED", total: 60, box: "Box of 4", coatings: "Cocoa × 4", reviewed: true },
];
export function getMockOrder(id: string) { return MOCK_ORDERS.find((order) => order.id === id); }
