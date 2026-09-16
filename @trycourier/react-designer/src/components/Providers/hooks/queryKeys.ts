/**
 * What a fetched template belongs to.
 *
 * The key carries the tenant and template id, so opening a different template
 * is a different cache entry rather than something the editor has to remember
 * to clear. Several `setTemplateData(null)` / `setIsTemplateLoading(null)`
 * resets existed only to do by hand what this does by construction.
 */
export const templateQueryKey = (tenantId: string, templateId: string, includeBrand: boolean) =>
  `${tenantId}/${templateId}?brand=${includeBrand}`;

/** Names for the in-flight write counters. */
export const writeNames = {
  templateSave: "template:save",
  templatePublish: "template:publish",
  templateDuplicate: "template:duplicate",
  brandSave: "brand:save",
  brandPublish: "brand:publish",
} as const;
