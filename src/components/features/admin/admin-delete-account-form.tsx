import { ADMIN_DELETE_CONFIRM_PHRASE } from "@/modules/admin/account-deletion";
import { adminInputClassName, adminTextareaClassName } from "@/components/features/admin/admin-form-styles";

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
    <form
      action={action}
      className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name={idFieldName} value={entityId} />
      <p className="text-[10px] font-bold uppercase tracking-wider text-red-800">
        Suppression définitive — {entityLabel}
      </p>
      <textarea
        name="reason"
        required
        minLength={3}
        placeholder="Raison (audit obligatoire)"
        className={adminTextareaClassName}
      />
      <label className="block text-[10px] font-medium text-red-900">
        Tapez <span className="font-mono font-bold">{ADMIN_DELETE_CONFIRM_PHRASE}</span> pour confirmer
      </label>
      <input
        type="text"
        name="confirm_phrase"
        required
        autoComplete="off"
        className={`${adminInputClassName} font-mono`}
        placeholder={ADMIN_DELETE_CONFIRM_PHRASE}
      />
      <button
        type="submit"
        className="w-full h-9 rounded-lg bg-red-800 text-white text-xs font-bold hover:bg-red-900 transition-colors"
      >
        {buttonLabel}
      </button>
    </form>
  );
}
