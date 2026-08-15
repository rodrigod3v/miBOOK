"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Table2, KanbanSquare, CalendarDays, Plus, Settings2, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { http, type DbField, type DbRow, type ViewItem } from "@/lib/client-api";
import { useSocket } from "@/lib/use-socket";

export interface SelectOption {
  id: string;
  label: string;
  color: string;
}

export interface DbConfig {
  view: "table" | "board" | "calendar";
  groupBy: string | null;
}

export function getFieldOptions(field: DbField): SelectOption[] {
  try {
    return JSON.parse(field.options);
  } catch {
    return [];
  }
}

export function getCellValue(row: DbRow, fieldId: string): any {
  try {
    const values = JSON.parse(row.values || "{}");
    return values[fieldId] ?? null;
  } catch {
    return null;
  }
}

export function setCellValue(row: DbRow, fieldId: string, value: any): Record<string, any> {
  let values: Record<string, any> = {};
  try {
    values = JSON.parse(row.values || "{}");
  } catch {
    values = {};
  }
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
    delete values[fieldId];
  } else {
    values[fieldId] = value;
  }
  return values;
}

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "select", label: "Seleção" },
  { value: "multiSelect", label: "Multi-seleção" },
  { value: "date", label: "Data" },
  { value: "checkbox", label: "Caixa" },
  { value: "url", label: "URL" },
  { value: "person", label: "Pessoa" },
];

export function DatabasePage({
  workspaceId,
  viewId,
  initialView,
}: {
  workspaceId: string;
  viewId: string;
  initialView: ViewItem;
}) {
  const [fields, setFields] = useState<DbField[]>([]);
  const [rows, setRows] = useState<DbRow[]>([]);
  const [config, setConfig] = useState<DbConfig>(() => {
    try {
      return { view: "table", groupBy: null, ...JSON.parse(initialView.content) };
    } catch {
      return { view: "table", groupBy: null };
    }
  });
  const [name, setName] = useState(initialView.name);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const { on, emitRefresh } = useSocket();

  const load = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([
        http.get<DbField[]>(`/api/workspaces/${workspaceId}/views/${viewId}/db/fields`),
        http.get<DbRow[]>(`/api/workspaces/${workspaceId}/views/${viewId}/db/rows`),
      ]);
      setFields(f);
      setRows(r);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [workspaceId, viewId]);

  useEffect(() => {
    load();
    const off = on("refresh", (payload: any) => {
      if (payload.viewId === viewId) load();
    });
    return off;
  }, [load, on, viewId]);

  async function saveConfig(patch: Partial<DbConfig>) {
    const next = { ...config, ...patch };
    setConfig(next);
    try {
      await http.patch(`/api/workspaces/${workspaceId}/views/${viewId}`, { config: patch });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function addField() {
    try {
      const f = await http.post<DbField>(`/api/workspaces/${workspaceId}/views/${viewId}/db/fields`, {
        name: newFieldName.trim() || "Sem nome",
        type: newFieldType,
      });
      setFields((prev) => [...prev, f]);
      setNewFieldName("");
      emitRefresh(viewId, "db");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function renameField(fieldId: string, nextName: string) {
    await http.patch(`/api/workspaces/${workspaceId}/views/${viewId}/db/fields/${fieldId}`, {
      name: nextName,
    });
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, name: nextName } : f)));
    emitRefresh(viewId, "db");
  }

  async function deleteField(fieldId: string) {
    try {
      await http.del(`/api/workspaces/${workspaceId}/views/${viewId}/db/fields/${fieldId}`);
      setFields((prev) => prev.filter((f) => f.id !== fieldId));
      emitRefresh(viewId, "db");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function addRow() {
    const r = await http.post<DbRow>(`/api/workspaces/${workspaceId}/views/${viewId}/db/rows`);
    setRows((prev) => [...prev, r]);
    emitRefresh(viewId, "db");
  }

  async function updateRow(rowId: string, values: Record<string, any>) {
    const updated = await http.patch<DbRow>(
      `/api/workspaces/${workspaceId}/views/${viewId}/db/rows/${rowId}`,
      { values },
    );
    setRows((prev) => prev.map((r) => (r.id === rowId ? updated : r)));
    emitRefresh(viewId, "db");
  }

  async function deleteRow(rowId: string) {
    await http.del(`/api/workspaces/${workspaceId}/views/${viewId}/db/rows/${rowId}`);
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    emitRefresh(viewId, "db");
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [sortFieldId, setSortFieldId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const visibleFields = useMemo(() => fields.filter((f) => !f.hidden), [fields]);

  const filteredRows = useMemo(() => {
    let list = [...rows];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => {
        try {
          const vals = Object.values(JSON.parse(r.values || "{}")).join(" ").toLowerCase();
          return vals.includes(q);
        } catch {
          return false;
        }
      });
    }
    if (sortFieldId) {
      list.sort((a, b) => {
        const valA = getCellValue(a, sortFieldId);
        const valB = getCellValue(b, sortFieldId);
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        const comp = String(valA).localeCompare(String(valB), undefined, { numeric: true });
        return sortOrder === "asc" ? comp : -comp;
      });
    }
    return list;
  }, [rows, searchQuery, sortFieldId, sortOrder]);

  async function updateFieldOptions(fieldId: string, options: SelectOption[]) {
    const f = await http.patch<DbField>(
      `/api/workspaces/${workspaceId}/views/${viewId}/db/fields/${fieldId}`,
      { options },
    );
    setFields((prev) => prev.map((x) => (x.id === fieldId ? f : x)));
    emitRefresh(viewId, "db");
  }

  const shared = {
    fields,
    rows: filteredRows,
    visibleFields,
    config,
    saveConfig,
    updateRow,
    deleteRow,
    addRow,
    addField,
    renameField,
    deleteField,
    updateFieldOptions,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-6 py-3">
          <input
            className="w-8 text-2xl outline-none"
            value={initialView.icon}
            readOnly
            aria-label="ícone"
          />
          <input
            className="flex-1 bg-transparent text-2xl font-bold tracking-tight outline-none placeholder:text-muted-foreground"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={async () => {
              const n = name.trim();
              if (n && n !== initialView.name) {
                await http.patch(`/api/workspaces/${workspaceId}/views/${viewId}`, { name: n });
              }
            }}
            placeholder="Banco de dados"
          />
          <div className="flex items-center gap-2">
            <div className="relative">
              <Input
                className="h-8 w-44 pl-8 text-xs"
                placeholder="Filtrar registros..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    {sortFieldId ? `Ordem: ${fields.find(f => f.id === sortFieldId)?.name}` : "Ordenar"}
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setSortFieldId(null); }}>
                  Sem ordenação
                </DropdownMenuItem>
                {visibleFields.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    onClick={() => {
                      if (sortFieldId === f.id) {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortFieldId(f.id);
                        setSortOrder("asc");
                      }
                    }}
                  >
                    {f.name} {sortFieldId === f.id ? (sortOrder === "asc" ? "(A-Z)" : "(Z-A)") : ""}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <ViewButton active={config.view === "table"} onClick={() => saveConfig({ view: "table" })} icon={<Table2 className="h-4 w-4" />} label="Tabela" />
            <ViewButton active={config.view === "board"} onClick={() => saveConfig({ view: "board" })} icon={<KanbanSquare className="h-4 w-4" />} label="Quadro" />
            <ViewButton active={config.view === "calendar"} onClick={() => saveConfig({ view: "calendar" })} icon={<CalendarDays className="h-4 w-4" />} label="Calendário" />
          </div>
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="mr-1 h-4 w-4" /> Nova linha
          </Button>
          <Popover>
            <PopoverTrigger
              render={
                <Button size="sm" variant="outline">
                  <Settings2 className="mr-1 h-4 w-4" /> Campo
                </Button>
              }
            />
            <PopoverContent className="w-72" align="end">
              <div className="space-y-3">
                <p className="text-sm font-medium">Adicionar campo</p>
                <Input placeholder="Nome do campo" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} />
                <Select value={newFieldType} onValueChange={(v) => v && setNewFieldType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button className="w-full" onClick={addField}>
                  Adicionar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-6xl p-6">
          {fields.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Adicione um campo para começar.
            </div>
          ) : config.view === "table" ? (
            <TableView {...shared} />
          ) : config.view === "board" ? (
            <BoardView {...shared} />
          ) : (
            <CalendarView {...shared} />
          )}
        </div>
      </div>
    </div>
  );
}

function ViewButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
      onClick={onClick}
    >
      {icon} {label}
    </button>
  );
}

interface SharedProps {
  fields: DbField[];
  rows: DbRow[];
  visibleFields: DbField[];
  config: DbConfig;
  saveConfig: (p: Partial<DbConfig>) => Promise<void>;
  updateRow: (rowId: string, values: Record<string, any>) => Promise<void>;
  deleteRow: (rowId: string) => Promise<void>;
  addField: () => Promise<void>;
  renameField: (fieldId: string, name: string) => Promise<void>;
  deleteField: (fieldId: string) => Promise<void>;
  updateFieldOptions: (fieldId: string, options: SelectOption[]) => Promise<void>;
}

function FieldMenu({ field, renameField, deleteField }: { field: DbField; renameField: SharedProps["renameField"]; deleteField: SharedProps["deleteField"] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(field.name);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="start">
        <div className="flex items-center gap-1 px-2 py-1">
          <Pencil className="h-3 w-3 text-muted-foreground" />
          <Input
            className="h-7 w-40"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                await renameField(field.id, name.trim());
                setOpen(false);
              }
            }}
          />
        </div>
        <DropdownMenuItem
          className="text-destructive"
          onClick={async () => {
            await deleteField(field.id);
            setOpen(false);
          }}
        >
          <X className="mr-2 h-4 w-4" /> Excluir campo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TableView(props: SharedProps) {
  const { fields, rows, visibleFields, updateRow, deleteRow, renameField, deleteField, updateFieldOptions } = props;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="w-10 px-2 py-2" />
            {visibleFields.map((f) => (
              <th key={f.id} className="min-w-[140px] border-l px-3 py-2 text-left font-medium">
                <div className="flex items-center gap-1">
                  <span className="flex-1 truncate">{f.name}</span>
                  <FieldMenu field={f} renameField={renameField} deleteField={deleteField} />
                </div>
              </th>
            ))}
            <th className="w-10 px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="group border-b last:border-0 hover:bg-accent/40">
              <td className="px-2 py-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem className="text-destructive" onClick={() => deleteRow(row.id)}>
                      <X className="mr-2 h-4 w-4" /> Excluir linha
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
              {visibleFields.map((f) => (
                <td key={f.id} className="border-l px-3 py-1">
                  <CellEditor field={f} row={row} updateRow={updateRow} updateFieldOptions={updateFieldOptions} />
                </td>
              ))}
              <td className="px-2" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CellEditor({
  field,
  row,
  updateRow,
  updateFieldOptions,
}: {
  field: DbField;
  row: DbRow;
  updateRow: (rowId: string, values: Record<string, any>) => Promise<void>;
  updateFieldOptions?: SharedProps["updateFieldOptions"];
}) {
  const value = getCellValue(row, field.id);
  const options = getFieldOptions(field);

  async function set(v: any) {
    await updateRow(row.id, setCellValue(row, field.id, v));
  }

  switch (field.type) {
    case "checkbox":
      return (
        <Checkbox
          checked={!!value?.checkbox}
          onCheckedChange={(c) => set({ checkbox: !!c })}
          className="h-4 w-4"
        />
      );
    case "number":
      return (
        <input
          type="number"
          className="w-full rounded bg-transparent px-1 py-0.5 outline-none hover:bg-accent/60 focus:bg-accent/60"
          value={value?.number ?? ""}
          onChange={(e) => set({ number: e.target.value === "" ? null : Number(e.target.value) })}
        />
      );
    case "date":
      return (
        <input
          type="date"
          className="w-full rounded bg-transparent px-1 py-0.5 text-sm outline-none hover:bg-accent/60 focus:bg-accent/60"
          value={value?.date ?? ""}
          onChange={(e) => set({ date: e.target.value })}
        />
      );
    case "select": {
      const selected = options.find((o) => o.id === value?.select);
      return (
        <Select value={value?.select ?? ""} onValueChange={(id) => set({ select: id })}>
          <SelectTrigger className="h-7 w-full border-transparent bg-transparent text-sm shadow-none hover:bg-accent/60">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: o.color }} />
                  {o.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case "multiSelect": {
      const selected = (value?.multiSelect || []) as string[];
      return (
        <MultiSelectEditor
          field={field}
          options={options}
          selected={selected}
          onSet={(ids) => set({ multiSelect: ids })}
          updateFieldOptions={updateFieldOptions || (async () => {})}
        />
      );
    }
    case "url":
      return (
        <input
          className="w-full rounded bg-transparent px-1 py-0.5 text-sm text-blue-600 outline-none hover:bg-accent/60 focus:bg-accent/60 dark:text-blue-400"
          value={value?.url ?? ""}
          onChange={(e) => set({ url: e.target.value })}
        />
      );
    case "person":
      return (
        <input
          className="w-full rounded bg-transparent px-1 py-0.5 text-sm outline-none hover:bg-accent/60 focus:bg-accent/60"
          value={Array.isArray(value?.person) ? value.person.join(", ") : ""}
          onChange={(e) => set({ person: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
        />
      );
    default:
      return (
        <input
          className="w-full rounded bg-transparent px-1 py-0.5 text-sm outline-none hover:bg-accent/60 focus:bg-accent/60"
          value={value?.text ?? ""}
          onChange={(e) => set({ text: e.target.value })}
        />
      );
  }
}

function MultiSelectEditor({
  field,
  options,
  selected,
  onSet,
  updateFieldOptions,
}: {
  field: DbField;
  options: SelectOption[];
  selected: string[];
  onSet: (ids: string[]) => void;
  updateFieldOptions: SharedProps["updateFieldOptions"];
}) {
  const [open, setOpen] = useState(false);
  function addOption() {
    const label = window.prompt("Nova opção");
    if (!label) return;
    const opts = [...options, { id: crypto.randomUUID(), label, color: "#94a3b8" }];
    updateFieldOptions(field.id, opts);
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button className="flex min-h-7 w-full flex-wrap items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-accent/60">
            {selected.length === 0 && <span className="text-muted-foreground">—</span>}
            {selected.map((id) => {
              const o = options.find((x) => x.id === id);
              return o ? (
                <span key={id} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-white" style={{ backgroundColor: o.color }}>
                  {o.label}
                </span>
              ) : null;
            })}
          </button>
        }
      />
      <PopoverContent className="w-56" align="start">
        <div className="space-y-1">
          {options.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent">
              <input
                type="checkbox"
                className="h-3.5 w-3.5"
                checked={selected.includes(o.id)}
                onChange={(e) => {
                  onSet(e.target.checked ? [...selected, o.id] : selected.filter((s) => s !== o.id));
                }}
              />
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: o.color }} />
              {o.label}
            </label>
          ))}
          <button className="mt-1 flex w-full items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent" onClick={addOption}>
            <Plus className="h-3 w-3" /> Nova opção
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BoardView(props: SharedProps) {
  const { fields, rows, config, saveConfig, updateRow, updateFieldOptions } = props;
  const [groupByField, setGroupByField] = useState<string | null>(config.groupBy);

  const groupField = fields.find((f) => f.id === groupByField && (f.type === "select" || f.type === "multiSelect"));
  const selectFields = fields.filter((f) => f.type === "select" || f.type === "multiSelect");

  async function chooseGroup(fieldId: string | null) {
    setGroupByField(fieldId);
    await saveConfig({ groupBy: fieldId });
  }

  const options = groupField ? getFieldOptions(groupField) : [];
  const columns = groupField
    ? options.map((o) => ({
        option: o,
        rows: rows.filter((r) => {
          const v = getCellValue(r, groupField.id);
          if (groupField.type === "select") return v?.select === o.id;
          return (v?.multiSelect || []).includes(o.id);
        }),
      }))
    : [{ option: null, rows }];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Agrupar por</span>
        <Select value={groupByField || "none"} onValueChange={(v) => chooseGroup(v === "none" ? null : v)}>
          <SelectTrigger className="h-8 w-48">
            <SelectValue placeholder="Selecionar campo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem agrupamento</SelectItem>
            {selectFields.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={col.option?.id || "none"} className="flex w-64 shrink-0 flex-col rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 px-3 py-2">
              {col.option && <span className="h-3 w-3 rounded-full" style={{ backgroundColor: col.option.color }} />}
              <span className="text-sm font-medium">{col.option?.label || "Sem grupo"}</span>
              <span className="text-xs text-muted-foreground">{col.rows.length}</span>
            </div>
            <div className="flex-1 space-y-2 px-2 pb-2">
              {col.rows.map((row) => (
                <div key={row.id} className="rounded-md border bg-background p-2 shadow-sm">
                  {fields
                    .filter((f) => !f.hidden)
                    .filter((f) => f.id !== groupField?.id)
                    .slice(0, 2)
                    .map((f) => (
                      <div key={f.id} className="mb-1">
                        <CellEditor field={f} row={row} updateRow={updateRow} updateFieldOptions={updateFieldOptions} />
                      </div>
                    ))}
                  {groupField && (
                    <div className="mt-1">
                      <CellEditor field={groupField} row={row} updateRow={updateRow} updateFieldOptions={updateFieldOptions} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarView(props: SharedProps) {
  const { fields, rows, config, saveConfig, updateRow, updateFieldOptions } = props;
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const dateField = fields.find((f) => f.id === config.groupBy && f.type === "date");
  const dateFields = fields.filter((f) => f.type === "date");

  const cellDate = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const firstDay = new Date(month.year, month.month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(cellDate(month.year, month.month, d));

  const rowsByDate = useMemo(() => {
    const map: Record<string, DbRow[]> = {};
    if (dateField) {
      rows.forEach((r) => {
        const v = getCellValue(r, dateField.id)?.date;
        if (v) {
          if (!map[v]) map[v] = [];
          map[v].push(r);
        }
      });
    }
    return map;
  }, [rows, dateField]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Data por</span>
        <Select
          value={dateField?.id || "none"}
          onValueChange={(v) => saveConfig({ groupBy: v === "none" ? null : v })}
        >
          <SelectTrigger className="h-8 w-48">
            <SelectValue placeholder="Campo de data" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhum</SelectItem>
            {dateFields.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMonth((m) => (m.month === 0 ? { year: m.year - 1, month: 11 } : { ...m, month: m.month - 1 }))}>
            ‹
          </Button>
          <span className="w-32 text-center text-sm font-medium">
            {new Date(month.year, month.month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setMonth((m) => (m.month === 11 ? { year: m.year + 1, month: 0 } : { ...m, month: m.month + 1 }))}>
            ›
          </Button>
        </div>
      </div>

      {!dateField ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Selecione um campo de data para exibir o calendário.
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
            <div key={d} className="bg-muted/40 px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {cells.map((date, i) => {
            const today = cellDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
            const dayRows = date ? rowsByDate[date] || [] : [];
            return (
              <div
                key={i}
                className={`min-h-28 bg-background p-1.5 ${date ? "" : "bg-muted/20"}`}
              >
                {date && (
                  <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${date === today ? "bg-primary font-medium text-primary-foreground" : ""}`}>
                    {Number(date.slice(8))}
                  </div>
                )}
                <div className="space-y-1">
                  {dayRows.map((row) => (
                    <div key={row.id} className="rounded border bg-card px-1.5 py-1 text-xs shadow-sm">
                      {fields
                        .filter((f) => !f.hidden && f.id !== dateField.id)
                        .slice(0, 1)
                        .map((f) => (
                          <div key={f.id}>
                            <CellEditor field={f} row={row} updateRow={updateRow} updateFieldOptions={updateFieldOptions} />
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
