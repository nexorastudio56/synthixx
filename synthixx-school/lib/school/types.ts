// Shared TypeScript types for the School Management agent.

export interface GradeBand {
  grade: string;
  min: number;
}

export interface School {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  letterhead: string | null;
  academic_year: string | null;
  grading_scheme: GradeBand[] | null;
  jazzcash_number: string | null;
  jazzcash_name: string | null;
  easypaisa_number: string | null;
  easypaisa_name: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_title: string | null;
  payment_note: string | null;
  created_at: string;
}

export interface FeeStructure {
  id: string;
  school_id: string;
  class: string;
  amount: number;
  created_at: string;
}

export interface SchoolClass {
  id: string;
  school_id: string;
  name: string;
  order_index: number;
  created_at: string;
}

export interface Section {
  id: string;
  school_id: string;
  class_name: string;
  name: string;
  teacher_id: string | null;
  created_at: string;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  class_name: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  school_id: string;
  name: string;
  class: string | null;
  roll_no: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  photo_url: string | null;
  status: "active" | "alumni";
  created_at: string;
}

export interface Teacher {
  id: string;
  school_id: string;
  name: string;
  subject: string | null;
  phone: string | null;
  salary: number | null;
  photo_url: string | null;
  created_at: string;
}

export interface Fee {
  id: string;
  school_id: string;
  student_id: string | null;
  month: string | null;
  amount: number | null;
  status: "paid" | "unpaid" | "partial";
  paid_date: string | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  school_id: string;
  student_id: string | null;
  date: string;
  status: "present" | "absent" | "leave";
  class: string | null;
  created_at: string;
}

export interface Exam {
  id: string;
  school_id: string;
  student_id: string | null;
  subject: string | null;
  marks: number | null;
  total_marks: number | null;
  exam_date: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  school_id: string;
  type: string;
  message: string;
  recipient_type: string;
  recipient_id: string | null;
  channel: string;
  status: string;
  sent_at: string;
}

export interface Assignment {
  id: string;
  school_id: string;
  class: string | null;
  subject: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  file_url: string | null;
  teacher_id: string | null;
  created_at: string;
}

export interface SchoolEvent {
  id: string;
  school_id: string;
  title: string;
  date: string;
  type: string | null;
  description: string | null;
  status: "upcoming" | "ongoing" | "completed";
  created_at: string;
}

export interface Book {
  id: string;
  school_id: string;
  title: string;
  author: string | null;
  category: string | null;
  total_copies: number;
  available_copies: number;
  created_at: string;
}

export interface BookIssue {
  id: string;
  school_id: string;
  book_id: string | null;
  student_id: string | null;
  issue_date: string;
  return_date: string | null;
  returned: boolean;
  fine_amount: number;
  created_at: string;
}

export interface Route {
  id: string;
  school_id: string;
  route_name: string;
  area: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_no: string | null;
  capacity: number | null;
  monthly_fee: number | null;
  created_at: string;
}

export interface CanteenItem {
  id: string;
  school_id: string;
  name: string;
  price: number;
  category: string | null;
  available: boolean;
  created_at: string;
}

export interface CanteenBalance {
  id: string;
  school_id: string;
  student_id: string | null;
  balance: number;
  last_updated: string;
}

export interface HealthProfile {
  id: string;
  school_id: string;
  student_id: string | null;
  blood_group: string | null;
  allergies: string | null;
  conditions: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  vaccination: string | null;
  created_at: string;
}

export interface NurseVisit {
  id: string;
  school_id: string;
  student_id: string | null;
  date: string;
  complaint: string | null;
  treatment: string | null;
  referred: boolean;
  created_at: string;
}

export interface Activity {
  id: string;
  school_id: string;
  name: string;
  type: "sport" | "academic" | "art";
  created_at: string;
}

export interface Achievement {
  id: string;
  school_id: string;
  student_id: string | null;
  title: string;
  description: string | null;
  date: string | null;
  certificate_text: string | null;
  created_at: string;
}

export interface Salary {
  id: string;
  school_id: string;
  teacher_id: string | null;
  month: string | null;
  base_salary: number | null;
  bonus: number | null;
  deduction: number | null;
  net_salary: number | null;
  status: "paid" | "unpaid";
  paid_date: string | null;
  created_at: string;
}

export interface Leave {
  id: string;
  school_id: string;
  teacher_id: string | null;
  leave_type: "sick" | "casual" | "annual";
  from_date: string | null;
  to_date: string | null;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface SchoolDocument {
  id: string;
  school_id: string;
  type: string;
  title: string | null;
  body: string | null;
  student_id: string | null;
  created_at: string;
}

export interface Alumnus {
  id: string;
  school_id: string;
  name: string;
  graduation_year: number | null;
  class: string | null;
  current_status: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  notes: string | null;
  created_at: string;
}

export interface TimetableEntry {
  id: string;
  school_id: string;
  class_name: string;
  day: string;
  period: number;
  subject: string | null;
  teacher_id: string | null;
  room: string | null;
  created_at: string;
}

export interface AdmissionLead {
  id: string;
  school_id: string;
  name: string;
  parent_name: string | null;
  phone: string | null;
  email: string | null;
  class_applied: string | null;
  notes: string | null;
  status: "new" | "contacted" | "admitted" | "rejected";
  created_at: string;
}

export interface StudentPoints {
  id: string;
  school_id: string;
  student_id: string;
  points: number;
  reason: string | null;
  badge: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  school_id: string;
  title: string;
  body: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AnnouncementReaction {
  id: string;
  school_id: string;
  announcement_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface FeePayment {
  id: string;
  school_id: string;
  fee_id: string | null;
  gateway: "jazzcash" | "easypaisa" | "cashmaal" | "bank_transfer";
  txn_ref: string;
  amount: number;
  status: "pending" | "processing" | "paid" | "failed" | "cancelled" | "refunded";
  raw: unknown;
  created_at: string;
  student_id?: string | null;
  payer_email?: string | null;
  currency?: string | null;
  payment_method?: string | null;
  gateway_transaction_id?: string | null;
  gateway_order_id?: string | null;
  initiated_at?: string | null;
  paid_at?: string | null;
  failed_at?: string | null;
  cancelled_at?: string | null;
  updated_at?: string | null;
  marked_by?: string | null;
  marked_at?: string | null;
  mark_reason?: string | null;
}

export interface PaymentTransaction extends FeePayment {
  student_name?: string;
  student_class?: string;
  fee_month?: string;
  fee_id_local?: string;
}
