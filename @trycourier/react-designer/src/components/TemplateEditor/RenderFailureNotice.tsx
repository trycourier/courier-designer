/**
 * What the author sees when the editor cannot faithfully show the document it
 * was handed (C-20386, criterion 8).
 *
 * The canvas stays mounted but goes read-only underneath this. That is the
 * point of the whole criterion: the danger was never the blank canvas itself,
 * it was that the author starts typing into it and the next autosave writes
 * their empty document over content that was really there.
 */
import type { RenderProblem } from "@/lib/utils/documentHealth/documentHealth";

export interface RenderFailureNoticeProps {
  problems: RenderProblem[];
}

export const RenderFailureNotice = ({ problems }: RenderFailureNoticeProps) => {
  if (problems.length === 0) {
    return null;
  }

  // One line per distinct complaint: three unknown blocks of the same type is
  // one thing to tell someone, not three.
  const details = Array.from(new Set(problems.map((problem) => problem.detail)));

  return (
    <div
      role="alert"
      className="courier-m-4 courier-rounded-md courier-border courier-border-destructive courier-bg-background courier-p-4 courier-text-sm"
    >
      <p className="courier-font-medium">Couldn&apos;t open this template</p>
      <ul className="courier-mt-2 courier-list-disc courier-pl-5 courier-text-muted-foreground">
        {details.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>
      <p className="courier-mt-2 courier-text-muted-foreground">
        Editing is turned off so the content that is here is not overwritten.
      </p>
    </div>
  );
};
