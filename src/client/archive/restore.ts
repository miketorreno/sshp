"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { invalidateArchiveWrites } from "@/client/archive/queries";
import type { ActionResult } from "@/lib/action-result";
import {
  restoreBlockedCopy,
  type RestoreBlockedBy,
} from "@/server/archive/contract";

/**
 * Restoring from the archive.
 *
 * The command a row needs differs per section — a reading and an order are
 * addressed by the visit they belong to as well as by their own id — so each
 * section's button passes the command it means to run, and this holds the one
 * thing all five answers the same way: what the reader is told.
 *
 * A refusal names what stands in the way rather than repeating "not found". The read
 * already said which ancestor is still archived, and naming it is the difference
 * between an instruction and a dead end.
 */

/** What every archived row offers a Restore: its own id, and what blocks it. */
export type ArchiveRestorable = {
  id: string;
  restoreBlockedBy: RestoreBlockedBy | null;
};

export function useArchiveRestorer(title: string) {
  const queryClient = useQueryClient();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [isRestoring, startTransition] = useTransition();

  /**
   * One restore at a time across the section: two would be two writes racing for
   * the same archive, and the reader is told about neither. `restoringId` is the
   * row to wait on, so one button says "Restoring" while the rest say nothing.
   */
  const restore = <T extends ArchiveRestorable>(
    row: T,
    run: () => Promise<ActionResult<unknown>>,
  ) => {
    if (isRestoring) return;

    setRestoringId(row.id);
    startTransition(async () => {
      const result = await run();

      if (!result.ok) {
        toast.error(
          restoreBlockedCopy(row.restoreBlockedBy) ?? result.error.message,
        );
      } else {
        toast.success(`${title} record restored`);
        await invalidateArchiveWrites(queryClient);
      }

      setRestoringId(null);
    });
  };

  // The id is only meaningful while the transition is running: between the write
  // landing and the re-read finishing, the row is either gone or unblocked, so a
  // lingering id would leave a button waiting on a record that is no longer there.
  return { restoringId: isRestoring ? restoringId : null, restore };
}