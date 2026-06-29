import { atom } from "jotai";
import { toast } from "sonner";
// No need for error utilities - using direct error objects
import {
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  apiUrlAtom,
  templateErrorAtom,
  tenantIdAtom,
  tokenAtom,
  templateIdAtom,
  routingAtom,
  type MessageRouting,
} from "../store";

import {
  templateEditorContentAtom,
  templateEditorPublishedAtAtom,
  templateEditorVersionAtom,
  renderEngineAtom,
  DEFAULT_RENDER_ENGINE,
} from "@/components/TemplateEditor/store";
import { cleanTemplateContent } from "@/lib/utils/getTitle/preserveStorageFormat";
import { normalizeVariableSpacing } from "@/lib/utils/normalizeVariableSpacing";
import { coalesceTextRuns } from "@/lib/utils/coalesceTextRuns";
import type { ElementalContent, RenderEngine } from "@/types";

/**
 * Prepares content for the chosen engine. Under Liquid: coalesces each text run
 * into a single `string` (so a `{% if %}…{% endif %}` block lives in one
 * interpolation field instead of being split across elements), normalizes
 * variable-token spacing (`{{ x }}`), and writes `render_options.engine`.
 * Under Handlebars (the default), the content is left byte-for-byte unchanged
 * UNLESS it currently declares `engine: "liquid"` — in which case the marker is
 * removed (the user switched back), preserving any other `render_options` keys.
 * Existing Handlebars content (no engine, `{}`, or `engine: "handlebars"`) is
 * untouched.
 */
function applyRenderEngine(content: ElementalContent, engine: RenderEngine): ElementalContent {
  if (engine !== DEFAULT_RENDER_ENGINE) {
    const merged = coalesceTextRuns(content);
    const spaced = normalizeVariableSpacing(merged, engine);
    return { ...spaced, render_options: { ...spaced.render_options, engine } };
  }

  const spaced = normalizeVariableSpacing(content, engine);

  // Handlebars: only mutate render_options if it currently claims Liquid; never
  // touch content that already lacks an engine marker.
  if (spaced.render_options?.engine !== "liquid") {
    return spaced;
  }

  const { engine: _omit, ...restOptions } = spaced.render_options;
  if (Object.keys(restOptions).length > 0) {
    return { ...spaced, render_options: restOptions };
  }

  const { render_options: _drop, ...rest } = spaced;
  return rest;
}

// Interface for save options
export interface SaveTemplateOptions {
  routing?: MessageRouting;
  content?: ElementalContent;
}

// Interface for duplicate template options
export interface DuplicateTemplateOptions {
  /** The ID for the new duplicated template. If not provided, uses "{currentTemplateId}-copy" */
  targetTemplateId?: string;
  /** Optional: Override the content to duplicate (defaults to current editor content) */
  content?: ElementalContent;
  /** Optional: Custom name for the new template (defaults to targetTemplateId) */
  name?: string;
}

// Interface for duplicate template result
export interface DuplicateTemplateResult {
  success: boolean;
  templateId: string;
  version?: string;
}

/**
 * Saves the current template to the backend.
 *
 * @param options - Optional save configuration
 * @param options.content - Content to save (defaults to current editor content)
 * @param options.routing - Routing configuration (defaults to value from TemplateEditor's routing prop)
 *
 * @deprecated Passing routing as an argument is deprecated.
 * The routing is now automatically synced from TemplateEditor's routing prop.
 * If you need to override routing, pass it as options.routing, but this should rarely be needed.
 */
export const saveTemplateAtom = atom(
  null,
  async (get, set, options?: MessageRouting | SaveTemplateOptions) => {
    // Handle both old (routing only) and new (options object) signatures
    let explicitRouting: MessageRouting | undefined;
    let providedContent: ElementalContent | undefined;

    // Detect if options is SaveTemplateOptions (has "content" or "routing" keys)
    // vs MessageRouting (has "method" and "channels" keys)
    const isSaveTemplateOptions =
      options &&
      typeof options === "object" &&
      ("content" in options || ("routing" in options && !("method" in options)));

    if (isSaveTemplateOptions) {
      // New signature with options object
      const opts = options as SaveTemplateOptions;
      explicitRouting = opts.routing;
      providedContent = opts.content;
    } else {
      // Old signature with just routing (deprecated but still supported)
      explicitRouting = options as MessageRouting | undefined;
    }

    // Use explicit routing if provided, otherwise fall back to routingAtom
    // routingAtom is automatically synced from TemplateEditor's routing prop
    const routing = explicitRouting ?? get(routingAtom);

    const apiUrl = get(apiUrlAtom);
    const token = get(tokenAtom);
    const tenantId = get(tenantIdAtom);
    const templateId = get(templateIdAtom);

    // Use provided content if available, otherwise fall back to atom
    const rawTemplateEditorContent = providedContent || get(templateEditorContentAtom);

    if (!rawTemplateEditorContent) {
      return;
    }

    // Apply the same cleaning logic as auto-save for ALL channels, then stamp
    // the selected rendering engine into render_options.
    const templateEditorContent = applyRenderEngine(
      cleanTemplateContent(rawTemplateEditorContent),
      get(renderEngineAtom)
    );

    if (!apiUrl) {
      set(templateErrorAtom, { message: "Missing API URL", toastProps: { duration: 5000 } });
      return;
    }

    set(isTemplateSavingAtom, true);
    // Don't clear templateErrorAtom here - clearing the error would trigger
    // the getTemplate effect in TemplateEditor, causing a loop when auth fails.
    // Errors will be set if this save operation fails.

    const data = {
      content: templateEditorContent,
      routing,
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-courier-client-key": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation SaveNotification($input: SaveNotificationInput!) {
              tenant {
                notification {
                  save(input: $input)  {
                    success
                    version
                    updatedAt
                    createdAt
                  }
                }
              }
            }
          `,
          variables: {
            input: {
              tenantId,
              notificationId: templateId,
              name: templateId,
              data,
            },
          },
        }),
      });

      const responseData = await response.json();
      // const status = response.status;
      if (responseData.data) {
        // @TODO: improve this
        // set(templateDataAtom, { data: { tenant: { notification: { data } } } });
        // toast.success("Template saved");

        set(templateEditorVersionAtom, responseData.data.tenant.notification.save.version);
      } else if (responseData.errors) {
        const errorMessages = responseData.errors?.map(
          (error: { message: string }) => error.message
        );
        set(templateErrorAtom, {
          message: errorMessages.join("\n"),
          toastProps: { duration: 4000 },
        });
      } else {
        set(templateErrorAtom, {
          message: "Error saving template",
          toastProps: { duration: 4000 },
        });
      }
      return responseData;
    } catch (error) {
      set(templateErrorAtom, {
        message: "Network connection failed",
        toastProps: {
          duration: 5000,
          description: "Failed to save template",
        },
      });
      throw error;
    } finally {
      set(isTemplateSavingAtom, false);
    }
  }
);

export const publishTemplateAtom = atom(null, async (get, set) => {
  const apiUrl = get(apiUrlAtom);
  const token = get(tokenAtom);
  const tenantId = get(tenantIdAtom);
  const templateId = get(templateIdAtom);
  const version = get(templateEditorVersionAtom);

  if (!version) {
    set(templateErrorAtom, { message: "Version not defined", toastProps: { duration: 5000 } });
    return;
  }

  if (!apiUrl) {
    set(templateErrorAtom, { message: "Missing API URL", toastProps: { duration: 5000 } });
    return;
  }

  set(isTemplatePublishingAtom, true);
  // Don't clear templateErrorAtom here - clearing the error would trigger
  // the getTemplate effect in TemplateEditor, causing a loop when auth fails.

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-courier-client-key": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
            mutation PublishNotification($input: PublishNotificationInput!) {
              tenant {
                notification {
                  publish(input: $input)  {
                    success
                    version
                    publishedAt
                  }
                }
              }
            }
          `,
        variables: {
          input: {
            tenantId,
            notificationId: templateId,
            version,
          },
        },
      }),
    });

    const data = await response.json();
    const status = response.status;
    if (status === 200) {
      toast.success("Template published");
      set(templateEditorPublishedAtAtom, new Date().toISOString());
      set(templateEditorVersionAtom, data.data.tenant.notification.publish.version);
    } else {
      set(templateErrorAtom, {
        message: "Error publishing template",
        toastProps: { duration: 4000 },
      });
    }
    return data;
  } catch (error) {
    set(templateErrorAtom, {
      message: "Network connection failed",
      toastProps: {
        duration: 5000,
        description: "Failed to publish template",
      },
    });
    throw error;
  } finally {
    set(isTemplatePublishingAtom, false);
  }
});

// Atom for duplicating a template to a new ID
export const duplicateTemplateAtom = atom(
  null,
  async (
    get,
    set,
    options: DuplicateTemplateOptions = {}
  ): Promise<DuplicateTemplateResult | undefined> => {
    const { content, name } = options;

    const apiUrl = get(apiUrlAtom);
    const token = get(tokenAtom);
    const tenantId = get(tenantIdAtom);
    const currentTemplateId = get(templateIdAtom);

    // Validate currentTemplateId before using it to generate targetTemplateId
    if (!options.targetTemplateId && !currentTemplateId) {
      set(templateErrorAtom, {
        message: "No template is currently loaded",
        toastProps: { duration: 5000 },
      });
      return;
    }

    // Use provided targetTemplateId or generate one with "-copy" suffix
    const targetTemplateId = options.targetTemplateId || `${currentTemplateId}-copy`;

    // Use provided content or fall back to current editor content
    const rawContent = content || get(templateEditorContentAtom);

    if (!rawContent) {
      set(templateErrorAtom, {
        message: "No template content to duplicate",
        toastProps: { duration: 5000 },
      });
      return;
    }

    if (!apiUrl) {
      set(templateErrorAtom, { message: "Missing API URL", toastProps: { duration: 5000 } });
      return;
    }

    set(isTemplateSavingAtom, true);
    // Don't clear templateErrorAtom here - clearing the error would trigger
    // the getTemplate effect in TemplateEditor, causing a loop when auth fails.

    // Clean the content before saving
    const templateContent = applyRenderEngine(
      cleanTemplateContent(rawContent),
      get(renderEngineAtom)
    );

    const data = {
      content: templateContent,
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-courier-client-key": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation SaveNotification($input: SaveNotificationInput!) {
              tenant {
                notification {
                  save(input: $input) {
                    success
                    version
                    updatedAt
                    createdAt
                  }
                }
              }
            }
          `,
          variables: {
            input: {
              tenantId,
              notificationId: targetTemplateId,
              name: name || targetTemplateId,
              data,
            },
          },
        }),
      });

      const responseData = await response.json();

      if (responseData.data?.tenant?.notification?.save?.success) {
        toast.success("Template duplicated successfully");
        return {
          success: true,
          templateId: targetTemplateId,
          version: responseData.data.tenant.notification.save.version,
        };
      } else if (responseData.errors) {
        const errorMessages = responseData.errors?.map(
          (error: { message: string }) => error.message
        );
        set(templateErrorAtom, {
          message: errorMessages.join("\n"),
          toastProps: { duration: 4000 },
        });
        return { success: false, templateId: targetTemplateId };
      } else {
        set(templateErrorAtom, {
          message: "Error duplicating template",
          toastProps: { duration: 4000 },
        });
        return { success: false, templateId: targetTemplateId };
      }
    } catch (error) {
      set(templateErrorAtom, {
        message: "Network connection failed",
        toastProps: {
          duration: 5000,
          description: "Failed to duplicate template",
        },
      });
      throw error;
    } finally {
      set(isTemplateSavingAtom, false);
    }
  }
);
