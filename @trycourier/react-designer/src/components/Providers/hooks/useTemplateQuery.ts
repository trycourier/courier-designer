/**
 * The template fetch.
 *
 * This replaces `getTemplateAtom` and the effect in `TemplateEditor` that had
 * to decide when to call it — an effect whose dependency list included the very
 * loading flag the call sets, guarded by
 * `(templateData && isTemplateLoading === false)` to stop it looping. Here the
 * key decides when to fetch, so that apparatus goes.
 */
import { useEffect, useRef } from "react";
import { useAtom, useAtomValue } from "@/lib/store";
import { fetchTemplate } from "@/services/template-service";
import { useCourierConnection } from "./useCourierConnection";
import { templateQueryKey } from "./queryKeys";
import {
  INITIAL_ASYNC_STATE,
  templateQueryAtom,
  templateRefetchTokenAtom,
  type AsyncState,
} from "./queryState";
import type { TenantData } from "../store";

export interface UseTemplateQueryOptions {
  includeBrand?: boolean;
  /** Set false to keep the editor from fetching at all (host-driven content). */
  enabled?: boolean;
}

export const useTemplateQuery = ({
  includeBrand = true,
  enabled = true,
}: UseTemplateQueryOptions = {}): AsyncState<TenantData> => {
  const connection = useCourierConnection();
  const [stored, setState] = useAtom(templateQueryAtom);
  // Total in the value it returns: a store that has not been seeded — or a
  // suite that mocks the store wholesale — must not crash the bridge reading
  // `isFetching` off it.
  const state = stored ?? (INITIAL_ASYNC_STATE as AsyncState<TenantData>);
  const refetchToken = useAtomValue(templateRefetchTokenAtom);

  const key = templateQueryKey(connection.tenantId, connection.templateId, includeBrand);
  const shouldFetch = enabled && connection.isComplete;

  /**
   * Which request is current. A response from an earlier one is not a conflict
   * to arbitrate, it is simply stale — the same rule the document state model
   * applies to a late GET (C-20386).
   */
  const requestId = useRef(0);

  useEffect(() => {
    if (!shouldFetch) {
      return;
    }
    const id = ++requestId.current;

    setState((previous) => ({
      // Switching template must not leave the previous one's document on screen
      // while the new one loads.
      ...(previous?.key === key ? previous : { data: null, isFetched: false }),
      error: null,
      isFetching: true,
      key,
    }));

    fetchTemplate(connection, { includeBrand })
      .then((data) => {
        if (id !== requestId.current) {
          return;
        }
        setState({ data, error: null, isFetching: false, isFetched: true, key });
      })
      .catch((error: unknown) => {
        if (id !== requestId.current) {
          return;
        }
        setState((previous) => ({
          ...(previous ?? INITIAL_ASYNC_STATE),
          error,
          isFetching: false,
          isFetched: true,
          key,
        }));
      });
    // `connection` is memoised on the four values `key` is built from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refetchToken, shouldFetch, includeBrand, setState]);

  return state;
};
