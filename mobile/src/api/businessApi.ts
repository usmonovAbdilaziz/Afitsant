import { apiv1 } from "./baseApi";

export type BusinessListItem = {
  id: string;
  businessName: string;
  businessType: string;
  city: string;
  address: string;
  phone: string;
  isApproved: boolean;
  averageRating?: number;
  totalReviews?: number;
  latitude?: number;
  longitude?: number;
  description?: string | null;
  distance?: number;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TableListItem = {
  id: string;
  businessId: string;
  tableNumber: number | string;
  tableColumns?: number | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data: T;
};

const unwrapListPayload = <T>(payload: T[] | ApiEnvelope<T[]>): T[] => {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray(payload.data)
  ) {
    return payload.data;
  }

  return Array.isArray(payload) ? payload : [];
};

export async function getAllBusiness(): Promise<BusinessListItem[]> {
  const res = await apiv1.get<BusinessListItem[] | ApiEnvelope<BusinessListItem[]>>(
    "/business"
  );

  return unwrapListPayload(res.data);
}

export async function getTableByBusinessId(
  businessId: string
): Promise<TableListItem[]> {
  const res = await apiv1.get<TableListItem[] | ApiEnvelope<TableListItem[]>>(
    `/table?businessId=${businessId}`
  );

  return unwrapListPayload(res.data);
}
