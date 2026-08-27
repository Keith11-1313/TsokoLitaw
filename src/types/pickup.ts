export interface CheckoutPickupLocation {
  id: string;
  name: string;
}

export interface CheckoutPickupWindow {
  id: string;
  dateId: string;
  label: string;
  locations: readonly CheckoutPickupLocation[];
}

export interface CheckoutPickupDate {
  id: string;
  value: string;
  label: string;
  availabilityMode: "MADE_TO_ORDER" | "READY_STOCK" | "HYBRID";
  windows: readonly CheckoutPickupWindow[];
}

export interface CheckoutAvailability {
  dates: readonly CheckoutPickupDate[];
  graceMinutes: number;
  operatingDays: string;
  operatingHours: string;
}
