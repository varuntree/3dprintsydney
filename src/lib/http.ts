export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) {
    const error = body?.error ?? { message: "Unknown error" };
    throw new Error(error.message ?? "Request failed");
  }
  return body.data as T;
}

export async function mutateJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json();
  if (!response.ok) {
    const error = body?.error ?? { message: "Unknown error" };
    throw new Error(error.message ?? "Request failed");
  }
  return body.data as T;
}
