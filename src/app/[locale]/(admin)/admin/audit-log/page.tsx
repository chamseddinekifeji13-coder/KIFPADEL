import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale } from "@/i18n/config";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import type { AuditLogListEntry } from "@/modules/admin/repository";
import { fetchAuditLogEntries } from "@/modules/admin/repository";

const PRESET_ACTIONS = [
  { action: "CLUB_SUSPEND", label: "CLUB_SUSPEND" },
  { action: "PLAYER_SUSPEND", label: "PLAYER_SUSPEND" },
  { action: "SPONSOR_CREATE", label: "SPONSOR_CREATE" },
  { action: "SPONSOR_UPDATE", label: "SPONSOR_UPDATE" },
  { action: "SUPER_ADMIN_GRANTED", label: "SUPER_ADMIN_GRANTED" },
] as const;

function buildQuery(locale: string, entries: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(entries).forEach(([k, v]) => {
    if (v != null && String(v).trim().length > 0) sp.set(k, String(v).trim());
  });
  const q = sp.toString();
  return q.length > 0 ? `/${locale}/admin/audit-log?${q}` : `/${locale}/admin/audit-log`;
}

function MetadataPreview({ entry }: { entry: AuditLogListEntry }) {
  const md = entry.metadata ?? {};
  const reason = md.reason != null ? String(md.reason).trim() : "";

  const lineParts: string[] = [];
  Object.entries(md).forEach(([k, val]) => {
    if (k === "reason") return;
    let s = typeof val === "object" ? JSON.stringify(val) : String(val);
    if (s.length > 120) s = `${s.slice(0, 117)}…`;
    lineParts.push(`${k}: ${s}`);
  });

  const body = lineParts.slice(0, 6).join("\n");
  const rawFallback = JSON.stringify(md);
  const fallback =
    !reason && lineParts.length === 0 && rawFallback.length > 2
      ? rawFallback.length > 200
        ? `${rawFallback.slice(0, 197)}…`
        : rawFallback
      : null;

  return (
    <div className="max-w-[min(28rem,50vw)]">
      {reason ? (
        <p className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 mb-1 whitespace-pre-wrap break-words">
          reason: {reason.length > 200 ? `${reason.slice(0, 197)}…` : reason}
        </p>
      ) : null}
      {body.trim() ? (
        <pre className="text-[10px] leading-relaxed font-mono text-slate-600 whitespace-pre-wrap break-all max-h-28 overflow-hidden">
          {body}
        </pre>
      ) : fallback ? (
        <pre className="text-[10px] leading-relaxed font-mono text-slate-500 whitespace-pre-wrap break-all max-h-28 overflow-hidden">
          {fallback}
        </pre>
      ) : (
        <span className="text-[10px] text-slate-400">{}</span>
      )}
    </div>
  );
}

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ action?: string; target?: string; q?: string; limit?: string }>;
};

export default async function AdminAuditLogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const sp = await searchParams;
  const action = sp.action ?? "";
  const targetTable = sp.target ?? "";
  const q = sp.q ?? "";
  const limitParsed = Number(sp.limit);
  const limit = Number.isFinite(limitParsed) ? limitParsed : undefined;

  const entries = await fetchAuditLogEntries({
    action: action || null,
    targetTable: targetTable || null,
    q: q || null,
    limit: limit ?? null,
  });

  return (
    <div className="space-y-6">
      <SectionTitle title="Journal d'audit" subtitle="Lecture seule — lignes persistées lors des actions sensibles." />

      <Card className="p-4 border-slate-100 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Raccourcis action</p>
        <div className="flex flex-wrap gap-2">
          <Link href={buildQuery(locale, {})} className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-900 text-white">
            Toutes
          </Link>
          {PRESET_ACTIONS.map((p) => (
            <Link
              key={p.action}
              href={buildQuery(locale, { action: p.action })}
              className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {p.label}
            </Link>
          ))}
          <Link
            href={buildQuery(locale, { target: "clubs" })}
            className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            target=clubs
          </Link>
          <Link
            href={buildQuery(locale, { target: "profiles" })}
            className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            target=profiles
          </Link>
          <Link
            href={buildQuery(locale, { target: "sponsors" })}
            className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            target=sponsors
          </Link>
        </div>

        <form
          method="GET"
          className="flex flex-col sm:flex-row flex-wrap gap-2 items-start sm:items-end pt-2 border-t border-slate-50"
        >
          <div className="grid gap-1 flex-1 min-w-[140px]">
            <label className="text-[10px] font-bold uppercase text-slate-500">action (exact)</label>
            <input
              name="action"
              defaultValue={action}
              placeholder="ex. PLAYER_SUSPEND"
              className="h-9 rounded-lg border border-slate-200 px-2 text-xs w-full"
            />
          </div>
          <div className="grid gap-1 flex-1 min-w-[140px]">
            <label className="text-[10px] font-bold uppercase text-slate-500">target (table)</label>
            <input
              name="target"
              defaultValue={targetTable}
              placeholder="clubs, profiles, sponsors…"
              className="h-9 rounded-lg border border-slate-200 px-2 text-xs w-full"
            />
          </div>
          <div className="grid gap-1 flex-[2] min-w-[200px]">
            <label className="text-[10px] font-bold uppercase text-slate-500">Recherche</label>
            <input
              name="q"
              defaultValue={q}
              placeholder="texte ou UUID (cible ou acteur)"
              className="h-9 rounded-lg border border-slate-200 px-2 text-xs w-full"
            />
          </div>
          <div className="grid gap-1 w-24">
            <label className="text-[10px] font-bold uppercase text-slate-500">Limite</label>
            <input
              name="limit"
              type="number"
              min={10}
              max={100}
              defaultValue={limit ?? 75}
              className="h-9 rounded-lg border border-slate-200 px-2 text-xs w-full"
            />
          </div>
          <button type="submit" className="h-9 px-4 rounded-xl bg-gold text-black text-xs font-bold">
            Filtrer
          </button>
        </form>
      </Card>

      <Card className="overflow-hidden border-slate-100 p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 whitespace-nowrap">Date</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Acteur</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3 max-w-[12rem]">Target ID</th>
                <th className="px-4 py-3 min-w-[12rem]">Métadonnées</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 align-top hover:bg-slate-50/40">
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-600">
                    {new Date(row.created_at).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs font-semibold text-slate-900">{row.action}</td>
                  <td className="px-4 py-2 text-xs">
                    <div className="font-semibold text-slate-900">{row.actor_display_name ?? "—"}</div>
                    {row.actor_email ? <div className="text-slate-500">{row.actor_email}</div> : null}
                    <div className="text-[10px] text-slate-400 font-mono">
                      {(row.actor_global_role ? `${row.actor_global_role} · ` : "") + (row.actor_profile_id ?? "—")}
                    </div>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-700">{row.target_table ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-[10px] text-slate-500 break-all">{row.target_id ?? "—"}</td>
                  <td className="px-4 py-2">
                    <MetadataPreview entry={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {entries.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Aucune entrée avec ces filtres.</p>
        ) : null}
      </Card>
    </div>
  );
}
