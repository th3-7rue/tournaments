"use client";

import { useTransition } from "react";
import { deleteMatchServerAction } from "@/app/delete-match";
import { toast } from "sonner";

interface DeleteButtonProps {
  matchId: string;
}

export default function DeleteButton({ matchId }: DeleteButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (
      !window.confirm(
        "Sei sicuro di voler eliminare questa partita? Questa azione non può essere annullata.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        const result = await deleteMatchServerAction(matchId);
        if (result?.error) {
          throw new Error(result.error);
        }
        toast.success("Partita eliminata!", {
          description: "La partita è stata rimossa dal calendario.",
        });
      } catch (e: any) {
        toast.error("Errore", {
          description: e.message || "Impossibile eliminare la partita.",
        });
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-red-700 hover:text-red-600 transition flex items-center gap-1 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <>
          <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span>...</span>
        </>
      ) : (
        <>🗑️ Elimina</>
      )}
    </button>
  );
}
