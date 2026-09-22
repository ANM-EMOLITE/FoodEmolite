export interface ActivityLogResponse {
  id: number;
  actorType: string;
  actorId?: number | null;
  actorName?: string | null;
  action: string;
  description: string;
  createdAt: string;
}

export interface ActivityLogSearchRequest {
  keyword?: string | null;
  action?: string | null;
  /** Nhóm thao tác: CREATE | UPDATE | DELETE | OTHER. */
  actionGroup?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
}
