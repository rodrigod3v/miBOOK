import { db } from "./db";
import {
  workspaces,
  workspaceMembers,
  views,
  dbFields,
  dbRows,
  favorites,
} from "./schema";
import { desc, eq, and, isNull } from "drizzle-orm";
import { uid } from "./auth";

export const GETTING_STARTED_CONTENT = JSON.stringify([
  {
    type: "heading",
    props: {
      level: 1,
      textColor: "default",
      backgroundColor: "default",
      textAlignment: "left",
      toggled: false,
    },
    content: [{ type: "text", text: "Bem-vindo ao miBOOK", styles: {} }],
    children: [],
  },
  {
    type: "paragraph",
    props: { textColor: "default", backgroundColor: "default", textAlignment: "left" },
    content: [
      {
        type: "text",
        text: "Este é o seu novo espaço de trabalho. Crie páginas, organize com bancos de dados e colabore em tempo real.",
        styles: {},
      },
    ],
    children: [],
  },
  {
    type: "bulletListItem",
    props: { textColor: "default", backgroundColor: "default", textAlignment: "left" },
    content: [
      { type: "text", text: "Clique em + para criar uma nova página ou banco de dados.", styles: {} },
    ],
    children: [],
  },
  {
    type: "bulletListItem",
    props: { textColor: "default", backgroundColor: "default", textAlignment: "left" },
    content: [
      {
        type: "text",
        text: "Use / para inserir blocos: títulos, listas, tarefas, imagens, tabelas e mais.",
        styles: {},
      },
    ],
    children: [],
  },
  {
    type: "bulletListItem",
    props: { textColor: "default", backgroundColor: "default", textAlignment: "left" },
    content: [
      {
        type: "text",
        text: "Convite pessoas sem limites no menu Membros.",
        styles: {},
      },
    ],
    children: [],
  },
]);

export function createWorkspace(userId: string, name: string, icon: string) {
  const wsId = uid();
  db.insert(workspaces).values({ id: wsId, name, icon, ownerId: userId }).run();
  db.insert(workspaceMembers)
    .values({ workspaceId: wsId, userId, role: "owner" })
    .run();

  const introId = uid();
  db.insert(views)
    .values({
      id: introId,
      workspaceId: wsId,
      parentId: null,
      name: "Introdução",
      icon: "👋",
      layout: "document",
      content: GETTING_STARTED_CONTENT,
      position: 0,
    })
    .run();

  const dbViewId = uid();
  db.insert(views)
    .values({
      id: dbViewId,
      workspaceId: wsId,
      parentId: null,
      name: "Banco de Dados",
      icon: "🗃️",
      layout: "database",
      content: JSON.stringify({ view: "table", groupBy: null }),
      position: 1,
    })
    .run();
  seedDatabase(dbViewId);

  return db.select().from(workspaces).where(eq(workspaces.id, wsId)).get()!;
}

export function seedDatabase(viewId: string) {
  const fields = [
    { id: uid(), name: "Tarefa", type: "text" as const, position: 0 },
    { id: uid(), name: "Status", type: "select" as const, position: 1 },
    { id: uid(), name: "Prioridade", type: "select" as const, position: 2 },
    { id: uid(), name: "Data", type: "date" as const, position: 3 },
    { id: uid(), name: "Feito", type: "checkbox" as const, position: 4 },
  ];
  const statusOptions = JSON.stringify([
    { id: uid(), label: "A fazer", color: "#94a3b8" },
    { id: uid(), label: "Em andamento", color: "#3b82f6" },
    { id: uid(), label: "Concluído", color: "#22c55e" },
  ]);
  const priorityOptions = JSON.stringify([
    { id: uid(), label: "Baixa", color: "#a3e635" },
    { id: uid(), label: "Média", color: "#f59e0b" },
    { id: uid(), label: "Alta", color: "#ef4444" },
  ]);
  db.insert(dbFields)
    .values(
      fields.map((f, i) => ({
        id: f.id,
        viewId,
        name: f.name,
        type: f.type,
        options: f.type === "select" ? (i === 1 ? statusOptions : priorityOptions) : "[]",
        position: f.position,
      })),
    )
    .run();

  const rows = [
    ["Planejar o lançamento", "Em andamento", "Alta", "2026-08-14", true],
    ["Escrever documentação", "A fazer", "Média", "2026-08-20", false],
    ["Revisar com a equipe", "A fazer", "Baixa", "2026-08-25", false],
  ];
  const fieldsById: Record<number, string> = {};
  fields.forEach((f, i) => (fieldsById[i] = f.id));
  rows.forEach((row, ri) => {
    const rid = uid();
    db.insert(dbRows)
      .values({
        id: rid,
        viewId,
        values: JSON.stringify({
          [fieldsById[0]]: { text: row[0] as string },
          [fieldsById[1]]: { select: (row[1] as string).toLowerCase().replace(/ /g, "-") },
          [fieldsById[2]]: { select: (row[2] as string).toLowerCase() },
          [fieldsById[3]]: { date: row[3] as string },
          [fieldsById[4]]: { checkbox: row[4] },
        }),
        position: ri,
      })
      .run();
  });
}

export function getWorkspacesForUser(userId: string) {
  return db
    .select({
      workspace: workspaces,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(desc(workspaces.createdAt))
    .all();
}

export function listViews(workspaceId: string) {
  return db
    .select()
    .from(views)
    .where(eq(views.workspaceId, workspaceId))
    .all();
}

export function getFavoriteViewIds(userId: string): Set<string> {
  const rows = db.select().from(favorites).where(eq(favorites.userId, userId)).all();
  return new Set(rows.map((r) => r.viewId));
}

export function buildTree(viewsList: typeof views.$inferSelect[]) {
  const map = new Map<string, any>();
  viewsList.forEach((v) => map.set(v.id, { ...v, children: [] }));
  const roots: any[] = [];
  viewsList
    .filter((v) => !v.trashedAt)
    .sort((a, b) => a.position - b.position)
    .forEach((v) => {
      const node = map.get(v.id)!;
      if (v.parentId && map.has(v.parentId) && !map.get(v.parentId)!.trashedAt) {
        map.get(v.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });
  return roots;
}
