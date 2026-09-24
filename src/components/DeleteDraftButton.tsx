"use client";

import { useTransition } from "react";

/**
 * Löschen-Button für Rechnungs-ENTWÜRFE mit Sicherheitsabfrage.
 * Übergibt die Server-Action als Prop (Server-Component kann sie nicht selbst confirmen).
 */
export function DeleteDraftButton({
  id,
  action,
}: {
  id: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        if (!confirm("Diesen Entwurf endgültig löschen? Dies kann nicht rückgängig gemacht werden.")) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        const fd = new FormData();
        fd.set("id", id);
        startTransition(() => action(fd));
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
      >
        {pending ? "Lösche…" : "Löschen"}
      </button>
    </form>
  );
}
