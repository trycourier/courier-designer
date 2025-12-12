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
  type MessageRouting,
} from "../store";

import {
  templateEditorContentAtom,
  templateEditorPublishedAtAtom,
  templateEditorVersionAtom,
} from "@/components/TemplateEditor/store";
import { cleanTemplateContent } from "@/lib/utils/getTitle/preserveStorageFormat";
import type { ElementalContent } from "@/types";

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

// Function atoms
export const saveTemplateAtom = atom(
  null,
  async (get, set, options?: MessageRouting | SaveTemplateOptions) => {
    // Handle both old (routing only) and new (options object) signatures
    let routing: MessageRouting | undefined;
    let providedContent: ElementalContent | undefined;

    if (options && typeof options === "object" && "content" in options) {
      // New signature with options object
      routing = options.routing;
      providedContent = options.content;
    } else {
      // Old signature with just routing
      routing = options as MessageRouting | undefined;
    }

    const apiUrl = get(apiUrlAtom);
    const token = get(tokenAtom);
    const tenantId = get(tenantIdAtom);
    const templateId = get(templateIdAtom);

    // Use provided content if available, otherwise fall back to atom
    const rawTemplateEditorContent = providedContent || get(templateEditorContentAtom);

    if (!rawTemplateEditorContent) {
      return;
    }

    // Apply the same cleaning logic as auto-save for ALL channels
    const templateEditorContent = cleanTemplateContent(rawTemplateEditorContent);

    if (!apiUrl) {
      set(templateErrorAtom, { message: "Missing API URL", toastProps: { duration: 5000 } });
      return;
    }

    set(isTemplateSavingAtom, true);
    set(templateErrorAtom, null);

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
  set(templateErrorAtom, null);

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

    if (!currentTemplateId) {
      set(templateErrorAtom, {
        message: "No template is currently loaded",
        toastProps: { duration: 5000 },
      });
      return;
    }

    set(isTemplateSavingAtom, true);
    set(templateErrorAtom, null);

    // Clean the content before saving
    const templateContent = cleanTemplateContent(rawContent);

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
