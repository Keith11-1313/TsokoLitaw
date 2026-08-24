import type { OrderStatus } from "@/components/ui/status-badge";

export interface MockOrder { id: string; date: string; pickup: string; status: OrderStatus; total: number; box: string; coatings: string; reviewed?: boolean }
export const MOCK_ORDERS: readonly MockOrder[] = [
  { id: "ORD-010", date: "August 23, 2026", pickup: "August 28 · 2:00 PM · Social Hall", status: "CONFIRMED", total: 128, box: "Box of 8", coatings: "Classic Cocoa × 4, Matcha × 4" },
  { id: "ORD-008", date: "August 15, 2026", pickup: "August 20 · 3:00 PM · Court", status: "PREPARING", total: 103, box: "Box of 6", coatings: "Classic Cocoa × 6" },
  { id: "ORD-004", date: "July 30, 2026", pickup: "August 4 · 1:00 PM · Social Hall", status: "COMPLETED", total: 78, box: "Box of 4", coatings: "Strawberry × 2, Caramel × 2" },
  { id: "ORD-002", date: "July 12, 2026", pickup: "July 17 · 2:00 PM · Court", status: "COMPLETED", total: 60, box: "Box of 4", coatings: "Classic Cocoa × 4", reviewed: true },
];
export function getMockOrder(id: string) { return MOCK_ORDERS.find((order) => order.id === id); }
