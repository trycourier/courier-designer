/**
 * Replaces the routing coverage that lived in `api/saveTemplateRouting.test.tsx`
 * before the fetch layer moved out of atoms. Same questions — what does a save
 * actually put on the wire — asked of a function instead of a store.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ElementalContent } from "@/types";
import type { CourierConnection } from "./graphql-client";
import { CourierApiError } from "./graphql-client";
import { duplicateTemplate, fetchTemplate, publishTemplate, saveTemplate } from "./template-service";

const connection: CourierConnection = {
  apiUrl: "https://api.courier.com/q",
  token: "test-token",
  tenantId: "tenant-1",
  templateId: "template-1",
};

const content: ElementalContent = {
  version: "2022-01-01",
  elements: [{ type: "channel", channel: "email", elements: [] }],
} as ElementalContent;

/** Captures the outgoing request and replies with `body`. */
const mockFetch = (body: unknown, status = 200) => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const sentVariables = (fetchMock: ReturnType<typeof vi.fn>) =>
  JSON.parse(fetchMock.mock.calls[0][1].body).variables;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("saveTemplate", () => {
  it("sends the routing it was given", async () => {
    const fetchMock = mockFetch({
      data: { tenant: { notification: { save: { success: true, version: "3" } } } },
    });
    const routing = { method: "single" as const, channels: ["sms"] };

    await saveTemplate(connection, { content, routing });

    expect(sentVariables(fetchMock).input.data.routing).toEqual(routing);
  });

  it("sends no routing when none was given", async () => {
    const fetchMock = mockFetch({
      data: { tenant: { notification: { save: { success: true, version: "3" } } } },
    });

    await saveTemplate(connection, { content });

    expect(sentVariables(fetchMock).input.data.routing).toBeUndefined();
  });

  it("addresses the save at the configured tenant and template", async () => {
    const fetchMock = mockFetch({
      data: { tenant: { notification: { save: { success: true, version: "3" } } } },
    });

    await saveTemplate(connection, { content });

    const { input } = sentVariables(fetchMock);
    expect(input.tenantId).toBe("tenant-1");
    expect(input.notificationId).toBe("template-1");
    expect(input.name).toBe("template-1");
  });

  it("returns the save result", async () => {
    mockFetch({
      data: { tenant: { notification: { save: { success: true, version: "7" } } } },
    });

    await expect(saveTemplate(connection, { content })).resolves.toMatchObject({
      success: true,
      version: "7",
    });
  });

  it("sends the auth headers Courier expects", async () => {
    const fetchMock = mockFetch({
      data: { tenant: { notification: { save: { success: true, version: "1" } } } },
    });

    await saveTemplate(connection, { content });

    const { headers } = fetchMock.mock.calls[0][1];
    expect(headers.Authorization).toBe("Bearer test-token");
    expect(headers["x-courier-client-key"]).toBe("Bearer test-token");
  });
});

describe("duplicateTemplate", () => {
  it("is a save aimed at a different notification id", async () => {
    const fetchMock = mockFetch({
      data: { tenant: { notification: { save: { success: true, version: "1" } } } },
    });

    const result = await duplicateTemplate(connection, {
      targetTemplateId: "template-1-copy",
      content,
    });

    expect(sentVariables(fetchMock).input.notificationId).toBe("template-1-copy");
    expect(result).toEqual({ success: true, templateId: "template-1-copy", version: "1" });
  });
});

describe("publishTemplate", () => {
  it("promotes the version it is given", async () => {
    const fetchMock = mockFetch({
      data: { tenant: { notification: { publish: { success: true, version: "4" } } } },
    });

    await publishTemplate(connection, "3");

    expect(sentVariables(fetchMock).input.version).toBe("3");
  });
});

describe("fetchTemplate", () => {
  it("returns the payload in the envelope templateData has always held", async () => {
    mockFetch({ data: { tenant: { tenantId: "tenant-1", notification: { version: "2" } } } });

    const result = await fetchTemplate(connection);

    expect(result.data?.tenant?.notification?.version).toBe("2");
  });

  it("asks for the brand only when told to", async () => {
    const fetchMock = mockFetch({ data: { tenant: {} } });

    await fetchTemplate(connection, { includeBrand: false });

    expect(sentVariables(fetchMock).includeBrand).toBe(false);
  });
});

describe("failures", () => {
  it("raises GraphQL errors even on a 200", async () => {
    mockFetch({ errors: [{ message: "Not authorized" }, { message: "Nope" }] }, 200);

    await expect(saveTemplate(connection, { content })).rejects.toMatchObject({
      name: "CourierApiError",
      message: "Not authorized\nNope",
    });
  });

  it("reports an auth rejection", async () => {
    mockFetch({}, 401);

    await expect(fetchTemplate(connection)).rejects.toMatchObject({
      message: "Authentication failed",
    });
  });

  it("reports a transport failure with the operation that failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline"))
    );

    const error = await fetchTemplate(connection).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CourierApiError);
    expect((error as CourierApiError).message).toBe("Network connection failed");
    expect((error as CourierApiError).toTemplateError().toastProps?.description).toBe(
      "Failed to fetch template data"
    );
  });

  it("refuses to call without an endpoint", async () => {
    const fetchMock = mockFetch({ data: {} });

    await expect(
      saveTemplate({ ...connection, apiUrl: "" }, { content })
    ).rejects.toMatchObject({ message: "Missing API URL" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
