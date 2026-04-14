export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  birthdate: string;
  address: string;
  city: string;
  phone: string;
  secondary_phone: string;
  email: string;
  personal_id_number: string;
  id_card_number: string;
  obs: string;
}

export interface Pet {
  id: number;
  client_id: number;
  nickname: string;
  species: string;
  breed: string;
  crossbreed: string;
  mix_with: string;
  color: string;
  distinctive_marks: string;
  birthday: string;
  gender: string;
  chip_number: string;
  rabic_tag_number: string;
  microchip_location: string;
  insurance_number: string;
  passport: string;
  pet_description: string;
  weight: string;
  allergies: string;
  blood_type: string;
  hormonal_status: string;
  obs: string;
}

export interface Vet {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  title: string;
  phone: string;
  status: string;
  license_number: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: number;
  patient_id: number;
  vet_id: number;
  service: string;
  observations: string;
  date: string;
  duration: string;
  reason: string;
  notification_message: string;
  user_note: string;
}

export interface Record {
  id: number;
  date: string;
  pet_id: number;
  pet: string;
  vet: string;
  service: string;
  diagnosis: string;
  diagnosis_description: string;
  presumptive_diagnosis: string;
  treatment_description: string;
  recommendations: string;
  comments: string;
}

export interface Prescription {
  id: number;
  record_id: number;
  vet_id: number;
  pet_id: number;
  product_name: string;
  quantity: string;
  unit: string;
  label: string;
  recommendations: string;
  prescribed_at: string;
  expires_at: string;
  status: string;
  internal_notes: string;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: number;
  pet_id: number;
  protocol_name: string;
  name: string;
  administration_date: string;
  due_date: string;
}

export interface Sale {
  id: number;
  vet_id: number;
  customer_id: number;
  invoice_id: string;
  subtotal: string;
  total: string;
  tax_amount: string;
  amount_paid: string;
  payment_type: string;
  status: string;
  payment_date: string;
  created_at: string;
  updated_at: string;
}

export type ClinicRole = 'clinic_admin' | 'vet' | 'assistant';

export type ClinicStatus = 'trial' | 'active' | 'past_due' | 'canceled';

export interface AppSession {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  clinicId: string;
  clinicName: string;
  role: ClinicRole;
  isOwner: boolean;
  clinicStatus: ClinicStatus;
  trialEnd: string | null;
  graceEnd: string | null;
  clinicAccessible: boolean;
}

export interface ClinicMembershipSummary {
  clinicId: string;
  clinicName: string;
  role: ClinicRole;
  isOwner: boolean;
  clinicStatus: ClinicStatus;
  trialEnd: string | null;
  graceEnd: string | null;
  clinicAccessible: boolean;
  isActive: boolean;
}

export interface ClinicTeamMember {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  role: ClinicRole;
  isOwner: boolean;
  createdAt: string;
}

export interface ClinicTeamInvite {
  id: string;
  email: string;
  role: ClinicRole;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  status: 'pending' | 'accepted' | 'expired';
}

export interface ClinicTeamSnapshot {
  members: ClinicTeamMember[];
  invites: ClinicTeamInvite[];
  trialUserLimit: number;
  activeUserCount: number;
  pendingInviteCount: number;
  isTrial: boolean;
}

export interface Column {
  key: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'number' | 'textarea';
  options?: string[];
  readOnly?: boolean;
}
