// Shared types for Dashboard sub-components

export interface PricingPlan {
  id: string;
  type: string;
  name: string;
  price: number;
  period: string;
  description: string;
  benefits: string[];
}

export interface PaymentQR {
  id: string;
  name: string;
  description: string;
  payment_instructions: string;
  qr_code_url: string;
  account_number?: string;
}

export interface RegisteredEvent {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  payment_status: string;
  attendance_status: string;
  qr_code: string;
  events: {
    title: string;
    date: string;
    time: string;
    venue: string;
  };
}

export const getPlanDisplayName = (type: string | null | undefined): string => {
  if (!type) return "None";
  switch (type.toLowerCase()) {
    case "individual": return "Small";
    case "sme": return "Medium";
    case "corporate": return "Large";
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

export const BUSINESS_CATEGORIES = [
  "Retail",
  "Construction",
  "Food & Beverage",
  "Professional Services",
  "Healthcare",
  "IT & Tech",
  "Logistics",
  "Agriculture",
] as const;
