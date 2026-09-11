"use client";

import { useState } from "react";
import { logTaskAction } from "@/app/actions/newsroom";

type Member = { id: string; name: string; role: string };
type TaskType = { id: string; name: string; defaultWeight: number };

/**
 * Logging has to be nearly frictionless — it's where all the adoption risk lives
 * (PLAN.md §5). The default path is one select and one button: credit yourself,
 * right now. Everything else is progressive disclosure.
 */
export function LogTaskForm({
  storyId,
  taskTypes,
  members,
  currentUserId,
  canCreditOthers,
}: {
  storyId: string;
  taskTypes: TaskType[];
  members: Member[];
  currentUserId: string;
  canCreditOthers: boolean;
}) {
  const [creditOthers, setCreditOthers] = useState(false);
  const [mode, setMode] = useState<"log" | "assign">("log");
  const [selected, setSelected] = useState<string[]>([currentUserId]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <form
      action={logTaskAction}
      className="p-4 rounded-lg border border-line bg-surface grid gap-3"
    >
      <input type="hidden" name="storyId" value={storyId} />
      <input type="hidden" name="mode" value={mode} />
      {!creditOthers && (
        <input type="hidden" name="creditedUserIds" value={currentUserId} />
      )}
      {creditOthers &&
        selected.map((id) => (
          <input key={id} type="hidden" name="creditedUserIds" value={id} />
        ))}

      <div className="flex gap-3 flex-wrap items-end">
        <label className="grid gap-1 flex-1 min-w-52">
          <span className="text-xs uppercase tracking-wider text-muted">
            {mode === "assign" ? "Assign a task" : "I just did..."}
          </span>
          <select
            name="taskTypeId"
            required
            defaultValue=""
            className="px-3 py-2 rounded-md border border-line bg-background"
          >
            <option value="" disabled>
              Pick a task type
            </option>
            {taskTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.defaultWeight} pt
                {t.defaultWeight === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 flex-1 min-w-52">
          <span className="text-xs uppercase tracking-wider text-muted">
            Note (optional)
          </span>
          <input
            name="note"
            placeholder="second pass, checked all quotes"
            className="px-3 py-2 rounded-md border border-line bg-background w-full"
          />
        </label>

        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-accent text-white text-sm hover:opacity-90 transition-opacity cursor-pointer"
        >
          {mode === "assign" ? "Assign" : "Log it"}
        </button>
      </div>

      {canCreditOthers && (
        <div className="flex gap-4 flex-wrap text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={creditOthers}
              onChange={(e) => {
                setCreditOthers(e.target.checked);
                if (!e.target.checked) setSelected([currentUserId]);
              }}
            />
            Credit someone else
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={mode === "assign"}
              onChange={(e) => setMode(e.target.checked ? "assign" : "log")}
            />
            Assign as upcoming work instead of logging it as done
          </label>
        </div>
      )}

      {creditOthers && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted mb-2">
            Credit — pick more than one to split the task
          </div>
          <div className="flex gap-2 flex-wrap">
            {members.map((m) => {
              const on = selected.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  className={`px-2.5 py-1 rounded-full border text-xs transition-colors cursor-pointer ${
                    on
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-line bg-background text-muted hover:border-accent"
                  }`}
                >
                  {m.name}
                  {m.id === currentUserId ? " (you)" : ""}
                </button>
              );
            })}
          </div>
          {selected.length > 1 && (
            <p className="mt-2 text-xs text-muted">
              Credit splits evenly — {(1 / selected.length).toFixed(2)} of the
              task&rsquo;s weight each.
            </p>
          )}
          {selected.length === 0 && (
            <p className="mt-2 text-xs text-over">Pick at least one person.</p>
          )}
        </div>
      )}
    </form>
  );
}
