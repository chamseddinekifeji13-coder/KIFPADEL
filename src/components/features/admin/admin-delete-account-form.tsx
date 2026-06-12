import { ADMIN_DELETE_CONFIRM_PHRASE } from "@/modules/admin/account-deletion";

type AdminDeleteAccountFormProps = {
  locale: string;
  entityId: string;
  entityLabel: string;
  idFieldName: "player_id" | "club_id";
  action: (formData: FormData) => Promise<void>;
  buttonLabel: string;
};

export function AdminDeleteAccountForm({
  locale,
  entityId,
  entityLabel,
  idFieldName,
  action,
  buttonLabel,
}: AdminDeleteAccountFormProps) {
  return (
    <form action={action} className="space-y-2 rounded-lg border border-red-200 bg-red-50/50 p-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name={idFieldName} value={entityId} />
      <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">
        Suppression définitive — {entityLabel}
      </p>
      <textarea
        name="reason"
        required
        minLength={3}
        placeholder="Raison (audit obligatoire)"
        className="w-full rounded border border-red-200 px-2 py-1 text-xs min-h-[48px] bg-white"
      />
      <label className="block text-[10px] text-red-800">
        Tapez <span className="font-mono font-bold">{ADMIN_DELETE_CONFIRM_PHRASE}</span> pour confirmer
      </label>
      <input
        type="text"
        name="confirm_phrase"
        required
        autoComplete="off"
        className="w-full rounded border border-red-200 px-2 py-1 text-xs font-mono bg-white"
        placeholder={ADMIN_DELETE_CONFIRM_PHRASE}
      />
      <button
        type="submit"
        className="w-full h-8 rounded-lg bg-red-900 text-white text-xs font-bold hover:bg-red-950"
      >
        {buttonLabel}
      </button>
    </form>
  );
}
