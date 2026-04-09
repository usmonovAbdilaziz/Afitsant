import { api } from "./baseApi";

type LoginRequest = {
  email?: string;
  password?: string;
  fullName?: string;
  phoneNumber?: string;
};

export type AuthUser = {
  id: string;
  email?: string | null;
  fullName?: string | null;
  phoneNumber?: string | null;
  profilePhoto?: string | null;
  role: string;
  userType: string;
  type: string;
  businessId?: string | null;
  staffId?: string | null;
  business?: {
    id: string;
    businessName: string;
    businessType: string;
    isApproved?: boolean;
    address?: string;
    city?: string;
    phone?: string;
  };
};

export type AuthLoginResponse = {
  token: string;
  user: AuthUser;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data: T;
};

type BusinessLoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    phoneNumber: string;
    fullName: string;
    userType?: string;
    type?: string;
    role?: string;
    businessId?: string | null;
    staffId?: string | null;
    profilePhoto?: string | null;
    business?: {
      id: string;
      businessName: string;
      businessType: string;
      isApproved?: boolean;
    };
  };
};

type StaffLoginResponse = {
  token: string;
  staff: {
    id: string;
    fullName: string;
    phoneNumber: string;
    position: string;
    profilePhoto: string | null;
    businessId: string;
    isActive: boolean;
  };
  business: {
    id: string;
    businessName: string;
    businessType: string;
    address: string;
    city: string;
    phone: string;
  };
};

const normalizeRole = (value: string | undefined, fallback: string) =>
  String(value ?? fallback).trim().toUpperCase();

const unwrapApiResponse = <T>(payload: T | ApiEnvelope<T>): T => {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (("success" in payload) || !("token" in payload))
  ) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
};

const normalizeBusinessLogin = (
  response: BusinessLoginResponse
): AuthLoginResponse => {
  const role = normalizeRole(
    response.user.role ?? response.user.userType ?? response.user.type,
    "BUSINESS"
  );

  return {
    token: response.token,
    user: {
      ...response.user,
      role,
      userType: normalizeRole(response.user.userType, role),
      type: normalizeRole(response.user.type, role),
    },
  };
};

const normalizeStaffLogin = (
  response: StaffLoginResponse
): AuthLoginResponse => ({
  token: response.token,
  user: {
    id: response.staff.id,
    fullName: response.staff.fullName,
    phoneNumber: response.staff.phoneNumber,
    profilePhoto: response.staff.profilePhoto,
    role: "STAFF",
    userType: "STAFF",
    type: "STAFF",
    businessId: response.staff.businessId ?? response.business.id,
    staffId: response.staff.id,
    business: {
      id: response.business.id,
      businessName: response.business.businessName,
      businessType: response.business.businessType,
      address: response.business.address,
      city: response.business.city,
      phone: response.business.phone,
      isApproved: true,
    },
  },
});

export const LoginStaff = async (
  body: LoginRequest
): Promise<AuthLoginResponse> => {
  const { data } = await api.post<ApiEnvelope<StaffLoginResponse> | StaffLoginResponse>(
    "/auth/staff/login",
    body
  );
  return normalizeStaffLogin(unwrapApiResponse(data));
};

export const LoginBusiness = async (
  body: LoginRequest
): Promise<AuthLoginResponse> => {
  const { data } = await api.post<
    ApiEnvelope<BusinessLoginResponse> | BusinessLoginResponse
  >("/auth/login", body);
  return normalizeBusinessLogin(unwrapApiResponse(data));
};
