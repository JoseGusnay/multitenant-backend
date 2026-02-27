export interface ProvisioningDto {
  name: string;
  subdomain: string;
  adminEmail?: string;
  adminPassword?: string;
  timezone?: string;
  countryCode?: string;
  phone?: string;
  planId?: string;
}
