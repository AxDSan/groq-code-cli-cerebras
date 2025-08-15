import { Vendor, CreateVendorRequest, UpdateVendorRequest } from './Vendor';
import { OpenRouterVendor, CreateOpenRouterVendorRequest, UpdateOpenRouterVendorRequest } from './openrouter/OpenRouterVendor';

export class VendorManager {
  private vendors: Map<string, Vendor> = new Map();
  
  // Create a new vendor
  createVendor(vendorData: CreateVendorRequest): Vendor {
    const vendor: Vendor = {
      id: this.generateId(),
      name: vendorData.name,
      apiKey: vendorData.apiKey,
      enabled: vendorData.enabled ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.vendors.set(vendor.id, vendor);
    return vendor;
  }
  
  // Create a new OpenRouter vendor
  createOpenRouterVendor(vendorData: CreateOpenRouterVendorRequest): OpenRouterVendor {
    const vendor: OpenRouterVendor = {
      id: this.generateId(),
      name: vendorData.name,
      apiKey: vendorData.apiKey,
      enabled: vendorData.enabled ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      defaultModel: vendorData.defaultModel,
      provider: vendorData.provider
    };
    
    this.vendors.set(vendor.id, vendor);
    return vendor;
  }
  
  // Get a vendor by ID
  getVendor(id: string): Vendor | undefined {
    return this.vendors.get(id);
  }
  
  // Get all vendors
  getAllVendors(): Vendor[] {
    return Array.from(this.vendors.values());
  }
  
  // Update a vendor
  updateVendor(id: string, updateData: UpdateVendorRequest): Vendor | null {
    const vendor = this.vendors.get(id);
    if (!vendor) {
      return null;
    }
    
    // Update fields if provided
    if (updateData.name !== undefined) vendor.name = updateData.name;
    if (updateData.apiKey !== undefined) vendor.apiKey = updateData.apiKey;
    if (updateData.enabled !== undefined) vendor.enabled = updateData.enabled;
    
    vendor.updatedAt = new Date();
    return vendor;
  }
  
  // Update an OpenRouter vendor
  updateOpenRouterVendor(id: string, updateData: UpdateOpenRouterVendorRequest): OpenRouterVendor | null {
    const vendor = this.vendors.get(id);
    if (!vendor || !this.isOpenRouterVendor(vendor)) {
      return null;
    }
    
    // Update common fields
    if (updateData.name !== undefined) vendor.name = updateData.name;
    if (updateData.apiKey !== undefined) vendor.apiKey = updateData.apiKey;
    if (updateData.enabled !== undefined) vendor.enabled = updateData.enabled;
    
    // Update OpenRouter specific fields
    if (updateData.defaultModel !== undefined) vendor.defaultModel = updateData.defaultModel;
    if (updateData.provider !== undefined) vendor.provider = updateData.provider;
    
    vendor.updatedAt = new Date();
    return vendor;
  }
  
  // Delete a vendor
  deleteVendor(id: string): boolean {
    return this.vendors.delete(id);
  }
  
  // Check if a vendor is an OpenRouter vendor
  private isOpenRouterVendor(vendor: Vendor): vendor is OpenRouterVendor {
    return 'provider' in vendor || 'defaultModel' in vendor;
  }
  
  // Generate a simple ID (in a real app, you might use UUIDs)
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}