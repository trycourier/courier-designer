/**
 * The template writes: save, publish, duplicate.
 *
 * Each was an atom that set a loading flag, ran a request, parsed the result
 * three different ways and cleared the flag in a `finally`. Here each is a call
 * to a service, and the in-flight bookkeeping happens once, in `useWrite`.
 */
import { useCallback } from "react";
import { toast } from "sonner";
import {
  duplicateTemplate,
  publishTemplate,
  saveTemplate,
  type DuplicateTemplateOutcome,
  type PublishTemplateResult,
  type SaveTemplateResult,
} from "@/services/template-service";
import type { ElementalContent } from "@/types";
import { useAtomValue, useSetAtom } from "@/lib/store";
import {
  templateEditorContentAtom,
  templateEditorPublishedAtAtom,
  templateEditorVersionAtom,
} from "@/components/TemplateEditor/store";
import { routingAtom, type MessageRouting } from "../store";
import { useCourierConnection } from "./useCourierConnection";
import { templateRefetchTokenAtom } from "./queryState";
import { writeNames } from "./queryKeys";
import { useWrite } from "./useWrite";

export interface SaveTemplateOptions {
  routing?: MessageRouting;
  content?: ElementalContent;
}

export interface DuplicateTemplateOptions {
  /** The ID for the new duplicated template. Defaults to `{templateId}-copy`. */
  targetTemplateId?: string;
  /** Override the content to duplicate (defaults to current editor content). */
  content?: ElementalContent;
  /** Custom name for the new template (defaults to targetTemplateId). */
  name?: string;
}

export const useTemplateMutations = () => {
  const connection = useCourierConnection();
  const routing = useAtomValue(routingAtom);
  const editorContent = useAtomValue(templateEditorContentAtom);
  const version = useAtomValue(templateEditorVersionAtom);
  const setVersion = useSetAtom(templateEditorVersionAtom);
  const setPublishedAt = useSetAtom(templateEditorPublishedAtAtom);
  const refetch = useSetAtom(templateRefetchTokenAtom);

  const save = useWrite(
    writeNames.templateSave,
    useCallback(
      async (options?: SaveTemplateOptions): Promise<SaveTemplateResult | undefined> => {
        const content = options?.content ?? editorContent;
        if (!content) {
          return undefined;
        }
        const result = await saveTemplate(connection, {
          content,
          routing: options?.routing ?? routing,
        });
        if (result?.version) {
          setVersion(result.version);
        }
        return result;
      },
      [connection, editorContent, routing, setVersion]
    )
  );

  const publish = useWrite(
    writeNames.templatePublish,
    useCallback(async (): Promise<PublishTemplateResult | undefined> => {
      if (!version) {
        // Nothing has been saved yet, so there is no version to promote.
        return undefined;
      }
      const result = await publishTemplate(connection, version);
      toast.success("Template published");
      setPublishedAt(new Date().toISOString());
      if (result?.version) {
        setVersion(result.version);
      }
      refetch((token) => token + 1);
      return result;
    }, [connection, version, setPublishedAt, setVersion, refetch])
  );

  const duplicate = useWrite(
    writeNames.templateDuplicate,
    useCallback(
      async (options?: DuplicateTemplateOptions): Promise<DuplicateTemplateOutcome | undefined> => {
        const content = options?.content ?? editorContent;
        if (!content) {
          return undefined;
        }
        return duplicateTemplate(connection, {
          targetTemplateId: options?.targetTemplateId ?? `${connection.templateId}-copy`,
          content,
          routing,
          name: options?.name,
        });
      },
      [connection, editorContent, routing]
    )
  );

  return { save, publish, duplicate };
};
