export class SubscriptionPlan {
  constructor(
    public readonly id: string, // e.g., 'BASIC', 'PRO', 'ENTERPRISE'
    public name: string,
    public maxUsers: number,
    public maxInvoices: number,
    public maxBranches: number,
    public description?: string,
    public price?: number,
  ) {}

  public updateLimits(
    maxUsers: number,
    maxInvoices: number,
    maxBranches: number,
  ): void {
    this.maxUsers = maxUsers;
    this.maxInvoices = maxInvoices;
    this.maxBranches = maxBranches;
  }
}
