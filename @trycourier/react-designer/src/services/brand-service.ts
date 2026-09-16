/**
 * Brand I/O. Same shape as the template service: functions in, promises out.
 */
import { graphqlRequest, type CourierConnection } from "./graphql-client";
import { PUBLISH_BRAND, SAVE_TENANT_BRAND } from "./queries";

type BrandConnection = Pick<CourierConnection, "apiUrl" | "token" | "tenantId">;

export const saveBrand = async (
  connection: BrandConnection,
  settings?: Record<string, unknown>
): Promise<void> => {
  await graphqlRequest({
    connection,
    query: SAVE_TENANT_BRAND,
    operation: "save brand settings",
    variables: { input: { tenantId: connection.tenantId, settings } },
  });
};

export const publishBrand = async (connection: BrandConnection): Promise<void> => {
  await graphqlRequest({
    connection,
    query: PUBLISH_BRAND,
    operation: "publish brand",
    variables: { input: { tenantId: connection.tenantId } },
  });
};
