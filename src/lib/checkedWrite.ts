import { toast } from "sonner";
import { logger } from "@/lib/logger";

type SupabaseResult = { error: { message?: string } | null } & Record<string, any>;

/**
 * Primary write: a failure must stop the flow. Throws so the caller's
 * existing error handler (mutation onError / catch + toast) reports it.
 */
export async function mustWrite<T extends SupabaseResult>(context: string, op: PromiseLike<T>): Promise<T> {
  const result = await op;
  if (result.error) {
    logger.error(`${context} failed`, result.error);
    throw new Error(`${context} failed: ${result.error.message ?? "unknown error"}`);
  }
  return result;
}

/**
 * Secondary write (audit trail, access log, timeline entry): the main action
 * already succeeded, so do not abort it — but never swallow the failure.
 */
export async function softWrite<T extends SupabaseResult>(context: string, op: PromiseLike<T>): Promise<T> {
  const result = await op;
  if (result.error) {
    logger.error(`${context} failed`, result.error);
    toast.error(`${context} failed: ${result.error.message ?? "unknown error"}`);
  }
  return result;
}
