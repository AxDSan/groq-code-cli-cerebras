import { Vendor, CreateVendorRequest, UpdateVendorRequest } from '../Vendor';

export interface OpenRouterVendor extends Vendor {
  // OpenRouter specific fields
  defaultModel?: string;
  provider?: string;
}

export interface CreateOpenRouterVendorRequest extends CreateVendorRequest {
  defaultModel?: string;
  provider?: string;
}

export interface UpdateOpenRouterVendorRequest extends UpdateVendorRequest {
  defaultModel?: string;
  provider?: string;
}