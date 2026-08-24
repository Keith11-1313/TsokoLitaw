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
  {
    id: "#ORD-008",
    customer: "Maria Santos",
    email: "maria@gmail.com",
    items: "Choco Litaw",
    quantity: "1 Box",
    total: "₱180.00",
    status: "COMPLETED",
    statusLabel: "Completed",
    date: "Today",
  },
  {
    id: "#ORD-007",
    customer: "Juan Dela Cruz",
    email: "juan.dc@yahoo.com",
    items: "Cha-cha Litaw x2, SB Litaw",
    quantity: "3 Boxes",
    total: "₱216.00",
    status: "PREPARING",
    statusLabel: "Processing",
    date: "Today",
  },
  {
    id: "#ORD-006",
    customer: "Sophia Lim",
    email: "sophia.lim@gmail.com",
    items: "Caramel Litaw",
    quantity: "2 Boxes",
    total: "₱360.00",
    status: "PENDING_PAYMENT",
    statusLabel: "Pending",
    date: "Today",
  },
  {
    id: "#ORD-005",
    customer: "Arnel Pineda",
    email: "arnel@rockmail.com",
    items: "Choco Litaw",
    quantity: "1 Box",
    total: "₱198.00",
    status: "COMPLETED",
    statusLabel: "Completed",
    date: "Yesterday",
  },
  {
    id: "#ORD-004",
    customer: "Leonarda Vic",
    email: "leo.vic@gmail.com",
    items: "SB Litaw",
    quantity: "1 Box",
    total: "₱198.00",
    status: "COMPLETED",
    statusLabel: "Completed",
    date: "Yesterday",
  },
  {
    id: "#ORD-003",
    customer: "Dindo Alcantara",
    email: "dindo.alc@outlook.com",
    items: "Choco Chips Add-on",
    quantity: "1 Pack",
    total: "₱18.00",
    status: "COMPLETED",
    statusLabel: "Completed",
    date: "Oct 12, 2025",
  },
  {
    id: "#ORD-002",
    customer: "Elena Guerrero",
    email: "elena.g@gmail.com",
    items: "Caramel Litaw",
    quantity: "1 Box",
    total: "₱18.00",
    status: "COMPLETED",
    statusLabel: "Completed",
    date: "Oct 11, 2025",
  },
  {
    id: "#ORD-001",
    customer: "Ramon Revilla",
    email: "ramon.rev@gmail.com",
    items: "Melted Chocolate",
    quantity: "2 Cups",
    total: "₱36.00",
    status: "COMPLETED",
    statusLabel: "Completed",
    date: "Oct 10, 2025",
  },
];
