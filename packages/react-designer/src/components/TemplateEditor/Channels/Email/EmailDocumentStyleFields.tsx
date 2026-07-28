import { Button, Input } from "@/components/ui-kit";
import {
  FontSizeIcon,
  LineHeightIcon,
  PaddingHorizontalIcon,
  PaddingVerticalIcon,
} from "@/components/ui-kit/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { Info } from "lucide-react";
import type { useEmailDocumentStyles } from "../../hooks/useEmailDocumentStyles";

export type EmailDocumentStyles = ReturnType<typeof useEmailDocumentStyles>;

/**
 * The font-size and line-height glyphs are drawn on a 28-unit viewBox (Icon
 * derives the viewBox from width/height, so shrinking those would crop them), so
 * scale with CSS to match the 16px padding icons above.
 */
const ADORNMENT_ICON = "courier-w-4 courier-h-4";

interface EmailDocumentStyleFieldProps {
  documentStyles: EmailDocumentStyles;
  /** Slot for the host's own info icon, so studio can pass a Font Awesome one. */
  renderInfoIcon?: () => React.ReactNode;
}

const defaultInfoIcon = () => (
  <Info className="courier-ml-1.5 courier-h-3.5 courier-w-3.5 courier-text-muted-foreground courier-cursor-help" />
);

/**
 * A padding edit, or null when the field is mid-edit and empty.
 *
 * Clearing the field to retype must not persist `0` — that would queue an
 * autosave for a value the author never chose. The typography fields treat empty
 * the same way (as "unset"); padding has no unset state per-side, so an empty
 * field simply leaves the stored value alone until a number arrives.
 */
const parsePaddingInput = (raw: string): number | null => {
  if (raw.trim() === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
};

/**
 * The reset affordance for a document-level section. A subdued text link rather
 * than an icon, so what it does is legible without hovering — and it only shows
 * once the section actually has an override to clear.
 */
const ResetToDefaultButton = ({
  label,
  testId,
  onClick,
}: {
  /** Accessible name; keeps the visible text as a prefix so both agree. */
  label: string;
  testId: string;
  onClick: () => void;
}) => (
  <Button
    type="button"
    variant="link"
    buttonSize="xs"
    aria-label={label}
    data-testid={testId}
    onClick={onClick}
    className="courier-text-muted-foreground hover:courier-text-foreground courier-transition-colors"
  >
    Reset to default
  </Button>
);

/**
 * Document-level body padding — the frame around the email content.
 *
 * Left/right becomes the body gutter and top/bottom the body spacers, matching
 * how the renderer expands the `padding` shorthand on the email channel node.
 * The inputs are seeded with the renderer's own default inset, so what they show
 * is what the email has; reset removes the property again.
 */
export const EmailFramePaddingFields = ({
  documentStyles,
  renderInfoIcon = defaultInfoIcon,
}: EmailDocumentStyleFieldProps) => (
  <>
    <div className="courier-flex courier-items-center courier-justify-between courier-mb-3">
      <h4 className="courier-text-sm courier-font-medium courier-flex courier-items-center">
        <span>Frame</span>
        <Tooltip
          title="The spacing around the email body. Set the sides to 0 to remove the gutter entirely."
          tippyOptions={{ maxWidth: 260 }}
        >
          {renderInfoIcon()}
        </Tooltip>
      </h4>
      {documentStyles.hasPaddingOverride && (
        <ResetToDefaultButton
          label="Reset to default frame spacing"
          testId="email-frame-padding-reset"
          onClick={documentStyles.resetPadding}
        />
      )}
    </div>
    <div className="courier-flex courier-flex-row courier-gap-3 courier-mb-4">
      <div className="courier-flex-1">
        <Input
          startAdornment={<PaddingHorizontalIcon />}
          type="number"
          min={0}
          aria-label="Horizontal padding"
          data-testid="email-frame-padding-horizontal"
          value={documentStyles.emailPaddingHorizontal}
          onChange={(e) => {
            const horizontal = parsePaddingInput(e.target.value);
            if (horizontal !== null) documentStyles.handlePaddingChange({ horizontal });
          }}
        />
      </div>
      <div className="courier-flex-1">
        <Input
          startAdornment={<PaddingVerticalIcon />}
          type="number"
          min={0}
          aria-label="Vertical padding"
          data-testid="email-frame-padding-vertical"
          value={documentStyles.emailPaddingVertical}
          onChange={(e) => {
            const vertical = parsePaddingInput(e.target.value);
            if (vertical !== null) documentStyles.handlePaddingChange({ vertical });
          }}
        />
      </div>
    </div>
  </>
);

/**
 * Document-level base font size and line spacing, in px.
 *
 * Empty means "renderer default". The base size reaches the body tiers (text,
 * quote, list, button label) while headings keep their presets; the base line
 * spacing reaches every tier. Any block can override both.
 */
export const EmailBaseTypographyFields = ({
  documentStyles,
  renderInfoIcon = defaultInfoIcon,
}: EmailDocumentStyleFieldProps) => (
  <>
    <div className="courier-flex courier-items-center courier-justify-between courier-mb-3">
      <h4 className="courier-text-sm courier-font-medium courier-flex courier-items-center">
        <span>Text</span>
        <Tooltip
          title="Base font size and line spacing in pixels, applied to body text, quotes, lists and button labels. Headings keep their own sizes. Any block can override these."
          tippyOptions={{ maxWidth: 260 }}
        >
          {renderInfoIcon()}
        </Tooltip>
      </h4>
      {documentStyles.hasTypographyOverride && (
        <ResetToDefaultButton
          label="Reset to default text styles"
          testId="email-document-typography-reset"
          onClick={documentStyles.resetTypography}
        />
      )}
    </div>
    <div className="courier-flex courier-flex-row courier-gap-3 courier-mb-4">
      <div className="courier-flex-1">
        <Input
          startAdornment={<FontSizeIcon className={ADORNMENT_ICON} />}
          type="number"
          min={0}
          aria-label="Base font size"
          data-testid="email-document-font-size"
          value={documentStyles.emailFontSize ?? ""}
          onChange={(e) =>
            documentStyles.handleFontSizeChange(
              e.target.value.trim() === "" ? null : Number(e.target.value)
            )
          }
        />
      </div>
      <div className="courier-flex-1">
        <Input
          startAdornment={<LineHeightIcon className={ADORNMENT_ICON} />}
          type="number"
          min={0}
          aria-label="Base line spacing"
          data-testid="email-document-line-height"
          value={documentStyles.emailLineHeight ?? ""}
          onChange={(e) =>
            documentStyles.handleLineHeightChange(
              e.target.value.trim() === "" ? null : Number(e.target.value)
            )
          }
        />
      </div>
    </div>
  </>
);

/**
 * The document body frame applied to the editor canvas, so the editor shows the
 * same inset the sent email has. Wrap the content editor (not the brand
 * header/footer, which the renderer pads separately).
 *
 * The frame owns the *whole* vertical inset, which is why it zeroes the
 * `.ProseMirror` vertical padding underneath it. That global padding predates
 * document-level padding and stood in for an inset the author could not set;
 * leaving it would add a constant 40px to whatever the author chooses, so a
 * Frame of 20px would preview as 60px and dialling it down to 0 would preview
 * *more* space than 20px did. Scoped to this wrapper so the other channels and
 * the brand/translation editors keep their own `.ProseMirror` padding.
 *
 * The zeroing is `!important` because preview and read-only mode add their own
 * `.courier-editor-main .ProseMirror { py-5 }` — three classes to this
 * wrapper's two, so without it that rule wins and the canvas silently gains
 * 20px per side in Preview & Test and in the version-comparison panes,
 * whatever the author set. That rule still applies to Slack, MSTeams and the
 * brand editor, which have no Frame of their own, so it cannot just be deleted.
 */
export const EmailBodyFrame = ({
  documentStyles,
  children,
}: {
  /**
   * Only the resolved inset is needed, so a read-only surface can pass
   * `resolveEmailDocumentStyles(channel)` instead of the live editor's hook.
   */
  documentStyles: Pick<EmailDocumentStyles, "emailPaddingVertical" | "emailPaddingHorizontal">;
  children: React.ReactNode;
}) => (
  <div
    data-testid="email-body-frame"
    className="[&_.ProseMirror]:!courier-py-0"
    style={{
      padding: `${documentStyles.emailPaddingVertical}px ${documentStyles.emailPaddingHorizontal}px`,
    }}
  >
    {children}
  </div>
);
