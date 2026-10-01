import { useAtomValue } from "jotai";
import { Repeat } from "lucide-react";
import { variableViewModeAtom } from "../../TemplateEditor/store";

/**
 * Editor-only tag on a block the send repeats per item (`loop`), or naming a
 * group. Hidden in the rendered preview, which shows the email as sent.
 */
export const LoopBadge = ({ loop, label }: { loop?: string; label?: string }) => {
  const isRenderedPreview = useAtomValue(variableViewModeAtom) === "wysiwyg";
  if (isRenderedPreview || (!loop && !label)) return null;

  return (
    <button
      type="button"
      data-loop-badge
      contentEditable={false}
      className="c--loop-badge"
      title={loop ? `Repeats for each item in ${loop}` : label}
    >
      {loop ? (
        <>
          <Repeat className="courier-w-3 courier-h-3" strokeWidth={2} />
          <span>{loop}</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
};
