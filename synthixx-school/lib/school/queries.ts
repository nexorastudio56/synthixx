"use client";

import { sb } from "./client";

/**
 * Generic CRUD helpers scoped to a school. RLS already isolates rows by
 * school_id, but we also filter/stamp school_id for correctness and clarity.
 */

export async function listRows<T>(
  table: string,
  schoolId: string,
  opts?: { order?: string; ascending?: boolean },
): Promise<T[]> {
  const order = opts?.order ?? "created_at";
  const { data, error } = await sb()
    .from(table)
    .select("*")
    .eq("school_id", schoolId)
    .order(order, { ascending: opts?.ascending ?? false });
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function insertRow<T extends Record<string, unknown>>(
  table: string,
  schoolId: string,
  values: T,
) {
  const { data, error } = await sb()
    .from(table)
    .insert({ ...values, school_id: schoolId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRow(
  table: string,
  id: string,
  values: Record<string, unknown>,
) {
  const { data, error } = await sb()
    .from(table)
    .update(values as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRow(table: string, id: string) {
  const { error } = await sb().from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function bulkInsert(
  table: string,
  schoolId: string,
  rows: Record<string, unknown>[],
) {
  if (rows.length === 0) return [];
  const stamped = rows.map((r) => ({ ...r, school_id: schoolId }));
  const { data, error } = await sb().from(table).insert(stamped as never).select();
  if (error) throw error;
  return data ?? [];
}

/** Get payment transactions with student info and optional filtering. */
export async function getPaymentTransactions(
  schoolId: string,
  opts?: {
    status?: string;
    gateway?: string;
    studentId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  },
) {
  let query = sb()
    .from("fee_payments")
    .select(
      `*,
       student:students(id, name, class),
       fee:fees(id, month)
      `,
    )
    .eq("school_id", schoolId);

  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.gateway) query = query.eq("gateway", opts.gateway);
  if (opts?.studentId) query = query.eq("student_id", opts.studentId);
  if (opts?.dateFrom) query = query.gte("created_at", `${opts.dateFrom}T00:00:00Z`);
  if (opts?.dateTo) query = query.lte("created_at", `${opts.dateTo}T23:59:59Z`);

  query = query.order("created_at", { ascending: false });
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
