// Base Vendor interface
export interface Vendor {
  id: string;
  name: string;
  apiKey: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Vendor creation request
export interface CreateVendorRequest {
  name: string;
  apiKey: string;
  enabled: boolean;
}

// Vendor update request
export interface UpdateVendorRequest {
  name?: string;
  apiKey?: string;
  enabled?: boolean;
}