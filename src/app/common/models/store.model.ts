export interface StoreResponse {
  id: number;
  refCode: string;
  ownerAccountId: number;
  storeName: string;
  thumbnailFileRefCode: string | null;
  thumbnailUrl: string | null;
  phoneNumber: string | null;
  address: string | null;
  description: string | null;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
}
