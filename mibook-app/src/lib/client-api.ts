export async function api<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || "Erro de requisição") as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data.data ?? data;
}

export const http = {
  get: <T = any>(url: string) => api<T>(url),
  post: <T = any>(url: string, body?: unknown) =>
    api<T>(url, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T = any>(url: string, body?: unknown) =>
    api<T>(url, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T = any>(url: string, body?: unknown) =>
    api<T>(url, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: <T = any>(url: string, body?: unknown) =>
    api<T>(url, { method: "DELETE", body: body !== undefined ? JSON.stringify(body) : undefined }),
};

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  icon: string;
  ownerId: string;
  role: string;
  createdAt: number;
}

export interface ViewItem {
  id: string;
  workspaceId: string;
  parentId: string | null;
  name: string;
  icon: string;
  coverUrl: string | null;
  layout: "document" | "database";
  content: string;
  position: number;
  trashedAt: number | null;
  createdAt: number;
  updatedAt: number;
  isFavorite?: boolean;
}

export interface DbField {
  id: string;
  viewId: string;
  name: string;
  type:
    | "text"
    | "number"
    | "select"
    | "multiSelect"
    | "date"
    | "checkbox"
    | "url"
    | "person";
  options: string;
  position: number;
  hidden: boolean;
}

export interface DbRow {
  id: string;
  viewId: string;
  values: string;
  position: number;
  createdAt: number;
  updatedAt: number;
}

export interface Member {
  userId: string;
  role: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
}
