/**
 * The four values every Courier call needs, and whether we have all of them.
 *
 * Each of the six api atoms read these separately and each decided for itself
 * what to do when one was missing — one returned silently, one set an error,
 * one carried on and let the request 401. Asking in one place means the query
 * can simply not run until it can succeed.
 */
import { useAtomValue } from "@/lib/store";
import { useMemo } from "react";
import type { CourierConnection } from "@/services/graphql-client";
import { apiUrlAtom, templateIdAtom, tenantIdAtom, tokenAtom } from "../store";

export interface ConnectionState extends CourierConnection {
  /** True when a request can actually be made. */
  isComplete: boolean;
}

export const useCourierConnection = (): ConnectionState => {
  const apiUrl = useAtomValue(apiUrlAtom);
  const token = useAtomValue(tokenAtom);
  const tenantId = useAtomValue(tenantIdAtom);
  const templateId = useAtomValue(templateIdAtom);

  return useMemo(
    () => ({
      apiUrl,
      token,
      tenantId,
      templateId,
      isComplete: Boolean(apiUrl && token && tenantId && templateId),
    }),
    [apiUrl, token, tenantId, templateId]
  );
};
