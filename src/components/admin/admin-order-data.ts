import type { OrderStatus } from "@/components/ui/status-badge";

export interface AdminOrderRow {
  id: string;
  customer: string;
  email: string;
  items: string;
  quantity: string;
  total: string;
  status: OrderStatus;
  statusLabel: string;
  date: string;
}

export const adminOrders: readonly AdminOrderRow[] = [
  { id: "#ORD-010", customer: "Maria Santos", email: "maria@gmail.com", items: "Box of 8 · Cocoa × 4, Milk × 4", quantity: "1 box", total: "₱115.00", status: "CONFIRMED", statusLabel: "Confirmed", date: "Aug 23, 2026" },
  { id: "#ORD-008", customer: "Maria Santos", email: "maria@gmail.com", items: "Box of 6 · Cocoa × 6", quantity: "1 box", total: "₱85.00", status: "PREPARING", statusLabel: "Preparing", date: "Aug 15, 2026" },
  { id: "#ORD-004", customer: "Maria Santos", email: "maria@gmail.com", items: "Box of 4 · Palitaw × 2, Crushed Nuts × 2", quantity: "1 box", total: "₱65.00", status: "COMPLETED", statusLabel: "Completed", date: "Jul 30, 2026" },
  { id: "#ORD-002", customer: "Maria Santos", email: "maria@gmail.com", items: "Box of 4 · Cocoa × 4", quantity: "1 box", total: "₱60.00", status: "COMPLETED", statusLabel: "Completed", date: "Jul 12, 2026" },
  { id: "#ORD-011", customer: "Juan Dela Cruz", email: "juan@gmail.com", items: "Box of 6 · Palitaw × 6", quantity: "1 box", total: "₱85.00", status: "PREPARING", statusLabel: "Preparing", date: "Aug 24, 2026" },
  { id: "#ORD-012", customer: "Sophia Lim", email: "sophia@gmail.com", items: "Box of 4 · Cookies and Cream × 2, Crushed Nuts × 2", quantity: "1 box", total: "₱65.00", status: "PENDING_PAYMENT", statusLabel: "Pending payment", date: "Aug 24, 2026" },
  { id: "#ORD-013", customer: "Arnel Pineda", email: "arnel@gmail.com", items: "Box of 8 · Sesame Seeds × 8 · Extra cream × 1", quantity: "1 box", total: "₱128.00", status: "COMPLETED", statusLabel: "Completed", date: "Aug 21, 2026" },
  { id: "#ORD-014", customer: "Leonarda Vic", email: "leo.vic@gmail.com", items: "Box of 6 · Plain × 6", quantity: "1 box", total: "₱85.00", status: "COMPLETED", statusLabel: "Completed", date: "Aug 20, 2026" },
];
