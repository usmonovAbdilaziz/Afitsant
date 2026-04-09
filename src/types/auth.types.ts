import { UserType } from '@/generated/prisma';

export type AppRole = 'CLIENT' | 'BUSINESS' | 'ADMIN' | 'STAFF';

export interface RegisterClientDto {
  email: string;
  phoneNumber: string;
  password: string;
  fullName: string;
  profilePhoto?: string;
}

export interface RegisterBusinessDto {
  email: string;
  phoneNumber: string;
  password: string;
  fullName: string;
  profilePhoto?: string;
  businessName: string;
  businessType: string;
  description?: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  phone: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    phoneNumber: string;
    fullName: string;
    userType: UserType;
    type?: UserType; // alias for backward compatibility on frontend
    businessId?: string | null;
    staffId?: string | null;
    profilePhoto: string | null;
    business?: {
      id: string;
      businessName: string;
      businessType: string;
      isApproved: boolean;
    };
  };
  token: string;
}

export interface AuthMeResponse {
  id: string;
  role: AppRole;
  businessId?: string | null;
  staffId?: string | null;
  phone?: string | null;
  fullName?: string | null;
  position?: string | null;
}

/** Standard registered-user token payload (Business/Admin/registered Client). */
export interface StandardJwtPayload {
  sub: string;
  userId: string;
  email: string;
  userType: UserType;
  role: AppRole;
  businessId?: string | null;
  staffId?: string | null;
}

/** Telegram-confirmed client token payload. */
export interface ClientJwtPayload {
  sub: string;
  type: 'CLIENT';
  role: 'CLIENT';
  clientId: string;
  phone: string;
  fullName: string;
}

export interface StaffLoginDto {
  fullName: string;
  phoneNumber: string;
}

export interface StaffAuthResponse {
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
  token: string;
}

export interface StaffJwtPayload {
  sub: string;
  staffId: string;
  fullName: string;
  phoneNumber: string;
  businessId: string;
  role: 'STAFF';
}

/** Union of all supported JWT payload shapes. */
export type JwtPayload =
  | StandardJwtPayload
  | ClientJwtPayload
  | StaffJwtPayload;

/** Type guards */
export const isStandardPayload = (p: JwtPayload): p is StandardJwtPayload =>
  'userId' in p;

export const isClientPayload = (p: JwtPayload): p is ClientJwtPayload =>
  'type' in p && p.type === 'CLIENT';

export const isStaffPayload = (p: JwtPayload): p is StaffJwtPayload =>
  'staffId' in p && p.role === 'STAFF';

// Legacy alias kept to avoid breaking older imports.
export const isGuestClientPayload = isClientPayload;
