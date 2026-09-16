/**
 * The one place that talks to Courier.
 *
 * Every operation the designer performs is the same POST to the same endpoint
 * with the same three headers, and before this each of the six of them built
 * that request again, checked `response.status` again, and turned
 * `data.errors` into a message again — each in its own slightly different way.
 * A save reported GraphQL errors, a publish only looked at the HTTP status, and
 * a fetch did both differently.
 *
 * Here the transport is written once and every failure arrives as a thrown
 * `CourierApiError`, so callers can stop distinguishing "the request failed"
 * from "the request succeeded and said no". React Query turns that throw into
 * error state for free.
 */
import type { TemplateError } from "@/lib/utils/errors";

export interface CourierConnection {
  apiUrl: string;
  token: string;
  tenantId: string;
  templateId: string;
}

/**
 * A failure from the Courier API, carrying the toast the UI should show.
 *
 * The presentation lives with the error because the call sites used to invent
 * it: the same network failure produced a 4-second toast in one operation and
 * a 5-second one with a description in the next.
 */
export class CourierApiError extends Error {
  readonly toastProps: TemplateError["toastProps"];
  readonly status?: number;

  constructor(message: string, toastProps?: TemplateError["toastProps"], status?: number) {
    super(message);
    this.name = "CourierApiError";
    this.toastProps = toastProps;
    this.status = status;
  }

  /** The shape `templateErrorAtom` and the toaster expect. */
  toTemplateError(): TemplateError {
    return { message: this.message, toastProps: this.toastProps };
  }
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export interface GraphQLRequest {
  connection: Pick<CourierConnection, "apiUrl" | "token">;
  query: string;
  variables?: Record<string, unknown>;
  /** Used in the message when the network itself fails. */
  operation: string;
}

/**
 * Runs one GraphQL operation and returns its `data`.
 *
 * Throws `CourierApiError` for a missing endpoint, a transport failure, an
 * auth rejection, or a response whose `errors` array is populated.
 */
export const graphqlRequest = async <T>({
  connection,
  query,
  variables,
  operation,
}: GraphQLRequest): Promise<T> => {
  const { apiUrl, token } = connection;

  if (!apiUrl) {
    throw new CourierApiError("Missing API URL", { duration: 5000 });
  }

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-courier-client-key": `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new CourierApiError("Network connection failed", {
      duration: 5000,
      description: `Failed to ${operation}`,
    });
  }

  let body: GraphQLResponse<T>;
  try {
    body = (await response.json()) as GraphQLResponse<T>;
  } catch {
    throw new CourierApiError("Network connection failed", {
      duration: 5000,
      description: `Failed to ${operation}`,
    });
  }

  // GraphQL reports failure in the body, so check it before the status: a 200
  // carrying an `errors` array is still a failure, and its message is the
  // useful one.
  if (body.errors?.length) {
    throw new CourierApiError(
      body.errors.map((error) => error.message).join("\n"),
      { duration: 4000 },
      response.status
    );
  }

  if (response.status === 401) {
    throw new CourierApiError("Authentication failed", { duration: 6000 }, 401);
  }

  if (!response.ok || !body.data) {
    throw new CourierApiError(`Error ${operation}`, { duration: 4000 }, response.status);
  }

  return body.data;
};
