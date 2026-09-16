/**
 * Template I/O. Functions in, promises out, no state.
 *
 * These were write-only atoms that fetched, parsed, decided what counted as an
 * error, set three loading flags and wrote their results into five other atoms.
 * Splitting the I/O out leaves each one a plain async function you can read top
 * to bottom and call from a test without a store — and leaves the question of
 * "is it loading" to the layer that should have owned it all along.
 */
import { cleanTemplateContent } from "@/lib/utils/getTitle/preserveStorageFormat";
import type { ElementalContent } from "@/types";
import type { MessageRouting, TenantData } from "@/components/Providers/store";
import { graphqlRequest, type CourierConnection } from "./graphql-client";
import { GET_TENANT, PUBLISH_NOTIFICATION, SAVE_NOTIFICATION } from "./queries";

export interface FetchTemplateOptions {
  includeBrand?: boolean;
}

/** The GetTenant payload, in the envelope `templateDataAtom` has always held. */
export const fetchTemplate = async (
  connection: CourierConnection,
  { includeBrand = true }: FetchTemplateOptions = {}
): Promise<TenantData> => {
  const data = await graphqlRequest<TenantData["data"]>({
    connection,
    query: GET_TENANT,
    operation: "fetch template data",
    variables: {
      tenantId: connection.tenantId,
      input: { notificationId: connection.templateId, version: "latest" },
      brandInput: { version: "latest" },
      includeBrand,
    },
  });

  const result: TenantData = { data };
  return result;
};

export interface SaveTemplateInput {
  content: ElementalContent;
  routing?: MessageRouting;
}

export interface SaveTemplateResult {
  success: boolean;
  version: string;
  updatedAt?: string;
  createdAt?: string;
}

export const saveTemplate = async (
  connection: CourierConnection,
  { content, routing }: SaveTemplateInput
): Promise<SaveTemplateResult> => {
  const data = await graphqlRequest<{
    tenant: { notification: { save: SaveTemplateResult } };
  }>({
    connection,
    query: SAVE_NOTIFICATION,
    operation: "save template",
    variables: {
      input: {
        tenantId: connection.tenantId,
        notificationId: connection.templateId,
        name: connection.templateId,
        // The same cleaning auto-save applies, for every channel.
        data: { content: cleanTemplateContent(content), routing },
      },
    },
  });

  return data.tenant.notification.save;
};

export interface PublishTemplateResult {
  success: boolean;
  version: string;
  publishedAt?: string;
}

export const publishTemplate = async (
  connection: CourierConnection,
  version: string
): Promise<PublishTemplateResult> => {
  const data = await graphqlRequest<{
    tenant: { notification: { publish: PublishTemplateResult } };
  }>({
    connection,
    query: PUBLISH_NOTIFICATION,
    operation: "publish template",
    variables: {
      input: {
        tenantId: connection.tenantId,
        notificationId: connection.templateId,
        version,
      },
    },
  });

  return data.tenant.notification.publish;
};

export interface DuplicateTemplateInput {
  targetTemplateId: string;
  content: ElementalContent;
  routing?: MessageRouting;
  name?: string;
}

export interface DuplicateTemplateOutcome {
  success: boolean;
  templateId: string;
  version?: string;
}

/** A save aimed at a different notification id — that is all a duplicate is. */
export const duplicateTemplate = async (
  connection: CourierConnection,
  { targetTemplateId, content, routing, name }: DuplicateTemplateInput
): Promise<DuplicateTemplateOutcome> => {
  const data = await graphqlRequest<{
    tenant: { notification: { save: SaveTemplateResult } };
  }>({
    connection,
    query: SAVE_NOTIFICATION,
    operation: "duplicate template",
    variables: {
      input: {
        tenantId: connection.tenantId,
        notificationId: targetTemplateId,
        name: name ?? targetTemplateId,
        data: { content: cleanTemplateContent(content), routing },
      },
    },
  });

  const save = data.tenant.notification.save;
  return { success: Boolean(save?.success), templateId: targetTemplateId, version: save?.version };
};
