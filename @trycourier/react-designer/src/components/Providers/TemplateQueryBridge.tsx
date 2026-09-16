/**
 * The one place the template fetch becomes atom state.
 *
 * The designer publishes `templateDataAtom`, `isTemplateLoadingAtom` and
 * friends, and sixteen components read them. Rather than rewrite every reader,
 * the fetch moved into a query hook and this republishes what it knows.
 *
 * The point is that there is exactly one writer. Before, `getTemplateAtom`,
 * `saveTemplateAtom`, `publishTemplateAtom`, `duplicateTemplateAtom`,
 * `saveBrandAtom` and `publishBrandAtom` each set these flags, `TemplateEditor`
 * reset two of them by hand when the template id changed, and `BrandEditor`
 * cleared a third on tenant change — nine writers for five booleans, which is
 * why "is it loading" had more than one answer depending on who you asked.
 */
import { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "@/lib/store";
import { CourierApiError } from "@/services/graphql-client";
import {
  templateEditorPublishedAtAtom,
  templateEditorVersionAtom,
} from "@/components/TemplateEditor/store";
import { useTemplateQuery } from "./hooks/useTemplateQuery";
import { useCourierConnection } from "./hooks/useCourierConnection";
import { countPending, pendingWritesAtom } from "./hooks/queryState";
import { writeNames } from "./hooks/queryKeys";
import {
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  templateDataAtom,
  templateErrorAtom,
} from "./store";

/**
 * Publishes "is an operation of this kind running" as the tri-state the UI
 * expects: null until one has ever run (the Status chip stays hidden), then
 * true while running and false once finished.
 */
const useWriteFlag = (count: number, publish: (value: boolean | null) => void) => {
  const hasRun = useRef(false);
  useEffect(() => {
    if (count > 0) {
      hasRun.current = true;
      publish(true);
    } else if (hasRun.current) {
      publish(false);
    }
  }, [count, publish]);
};

export interface TemplateQueryBridgeProps {
  /** Mirrors TemplateEditor's `brandEditor` prop: whether to fetch the brand. */
  includeBrand?: boolean;
}

export const TemplateQueryBridge = ({ includeBrand = true }: TemplateQueryBridgeProps) => {
  const connection = useCourierConnection();
  const setTemplateData = useSetAtom(templateDataAtom);
  const setIsTemplateLoading = useSetAtom(isTemplateLoadingAtom);
  const setTemplateError = useSetAtom(templateErrorAtom);
  const setPublishedAt = useSetAtom(templateEditorPublishedAtAtom);
  const setVersion = useSetAtom(templateEditorVersionAtom);
  const setIsSaving = useSetAtom(isTemplateSavingAtom);
  const setIsPublishing = useSetAtom(isTemplatePublishingAtom);

  const query = useTemplateQuery({ includeBrand });

  // Counted in the store, so two components each calling useTemplateActions
  // cannot disagree about whether a save is in progress.
  const pending = useAtomValue(pendingWritesAtom);
  useWriteFlag(countPending(pending, writeNames.templateSave, writeNames.brandSave), setIsSaving);
  useWriteFlag(
    countPending(pending, writeNames.templatePublish, writeNames.brandPublish),
    setIsPublishing
  );

  // `isTemplateLoadingAtom` keeps its three meanings, because readers depend on
  // all three: null is "no fetch is possible or none has begun", true is one in
  // flight, false is one that has settled. What changes is that the answer is
  // derived from the query rather than assigned by whoever ran last.
  useEffect(() => {
    // When there is nothing to fetch the editor is host-driven — the `value`
    // prop is the document — and it is not this component's place to say
    // whether anything is loading. TemplateEditor answers that instead.
    if (!connection.isComplete) {
      return;
    }
    setIsTemplateLoading(query.isFetching || !query.isFetched);
  }, [connection.isComplete, query.isFetching, query.isFetched, setIsTemplateLoading]);

  useEffect(() => {
    if (!query.data) {
      return;
    }
    const tenant = query.data.data?.tenant;
    setTemplateData(query.data);
    setPublishedAt(tenant?.notification?.publishedAt ?? null);
    setVersion(tenant?.notification?.version);
  }, [query.data, setTemplateData, setPublishedAt, setVersion]);

  useEffect(() => {
    if (!query.error) {
      return;
    }
    setTemplateError(
      query.error instanceof CourierApiError
        ? query.error.toTemplateError()
        : {
            message: "Network connection failed",
            toastProps: { duration: 5000, description: "Failed to fetch template data" },
          }
    );
  }, [query.error, setTemplateError]);

  return null;
};
