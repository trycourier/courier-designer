import { Button, NumberInput } from "@/components/ui-kit";
import {
  FontSizeIcon,
  LineHeightIcon,
  PaddingHorizontalIcon,
  PaddingVerticalIcon,
} from "@/components/ui-kit/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { useAtomValue } from "jotai";
import { emailFormattingEnabledAtom } from "../../store";
import { MAX_FONT_SIZE, MAX_LINE_HEIGHT } from "@/lib/constants/typography-limits";
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
 * Padding has no unset state per side, so an empty field cannot commit: `0`
 * would persist a value the author never chose. `NumberInput` keeps the box
 * empty while it is being retyped and restores the stored number on blur, so
 * nothing is written until a number arrives.
 */
const PADDING_COMMIT_EMPTY = false;

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

/** Same chain glyphs the brand-linked colour fields use. */
const LinkIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="courier-shrink-0"
  >
    <path
      d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.536 3.536 0 0 0-5-5l-1 1M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.536 3.536 0 0 0 5 5l1-1"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UnlinkIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="courier-shrink-0"
  >
    <path
      d="M7 9a3.5 3.5 0 0 0 4.6.4l2-2a3.536 3.536 0 0 0-5-5l-1 1M9 7a3.5 3.5 0 0 0-4.6-.4l-2 2a3.536 3.536 0 0 0 5 5l1-1"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M2 14L14 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/**
 * The "brand" badge at the end of the horizontal Frame input, matching the one
 * on the brand-linked colour fields: it reports that the value comes from the
 * brand, and clicking it toggles the link.
 */
const BrandLinkBadge = ({ isLinked, onToggle }: { isLinked: boolean; onToggle: () => void }) => (
  <span className="courier-absolute courier-right-2 courier-top-1/2 -courier-translate-y-1/2 courier-z-10">
    <Tooltip
      title={isLinked ? "Unlink from brand" : "Link to brand"}
      tippyOptions={{ placement: "top" }}
    >
      <button
        type="button"
        onClick={onToggle}
        data-testid="email-frame-padding-brand-badge"
        className={cn(
          "courier-flex courier-items-center courier-gap-1",
          "courier-rounded courier-px-1.5 courier-py-0.5",
          "courier-text-[10px] courier-font-medium courier-uppercase courier-tracking-wide",
          "courier-transition-colors",
          "courier-bg-neutral-200 courier-text-neutral-700 hover:courier-bg-neutral-300 dark:courier-bg-neutral-700 dark:courier-text-neutral-100 dark:hover:courier-bg-neutral-600"
        )}
      >
        {isLinked ? <LinkIcon /> : <UnlinkIcon />}
        brand
      </button>
    </Tooltip>
  </span>
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
}: EmailDocumentStyleFieldProps) => {
  // Gated inside the component, not at the host's render site, so a host that
  // supplies its own `render` prop cannot ship the control past the gate.
  const emailFormattingEnabled = useAtomValue(emailFormattingEnabledAtom);
  if (!emailFormattingEnabled) return null;

  const isLinked = documentStyles.isPaddingLinkedToBrand;
  // No brand attached means no link to offer — same gate the colours use.
  const showBadge = documentStyles.canLinkPaddingToBrand;

  return (
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
        {!isLinked && documentStyles.hasPaddingOverride && (
          <ResetToDefaultButton
            label="Reset to default frame spacing"
            testId="email-frame-padding-reset"
            onClick={documentStyles.resetPadding}
          />
        )}
      </div>
      {/* Stacked full width, not side by side: the horizontal row carries the
          brand badge, and at half width the badge would cover its own value. */}
      <div className="courier-flex courier-flex-col courier-gap-2 courier-mb-4">
        <div className="courier-relative">
          {/* A linked horizontal inset shows the brand's value and is not
              editable — the badge is the only way out of it, mirroring the
              brand-linked colour fields. */}
          <div className={cn(isLinked && "courier-pointer-events-none courier-opacity-50")}>
            <NumberInput
              startAdornment={<PaddingHorizontalIcon />}
              min={0}
              aria-label="Horizontal padding"
              data-testid="email-frame-padding-horizontal"
              commitEmpty={PADDING_COMMIT_EMPTY}
              value={documentStyles.emailPaddingHorizontal}
              className={cn(showBadge && "courier-pr-[4.5rem]")}
              onValueChange={(typed) => {
                if (typed === null) return;
                documentStyles.handlePaddingChange({ horizontal: Math.max(0, typed) });
              }}
            />
          </div>
          {showBadge && (
            <BrandLinkBadge
              isLinked={isLinked}
              onToggle={
                isLinked ? documentStyles.unlinkPaddingFromBrand : documentStyles.linkPaddingToBrand
              }
            />
          )}
        </div>
        {/* Vertical is always the template's own: the brand padding aligns the
            body gutter with the header/footer chrome, nothing more. */}
        <NumberInput
          startAdornment={<PaddingVerticalIcon />}
          min={0}
          aria-label="Vertical padding"
          data-testid="email-frame-padding-vertical"
          commitEmpty={PADDING_COMMIT_EMPTY}
          value={documentStyles.emailPaddingVertical}
          onValueChange={(typed) => {
            if (typed === null) return;
            documentStyles.handlePaddingChange({ vertical: Math.max(0, typed) });
          }}
        />
      </div>
    </>
  );
};

/**
 * Document-level base font size and line spacing, in px.
 *
 * The inputs are seeded with the renderer's base text metrics when the
 * properties are unset, the same way the Frame inputs are, so they show the
 * sizing the email actually has instead of sitting empty. Clearing a field still
 * means "unset" — it removes the property and the input falls back to showing
 * that default. The section's "Reset to default" link is what distinguishes
 * unset from explicitly set to the default value.
 *
 * The base size reaches the body tiers (text, quote, list, button label) while
 * headings keep their presets; the base line spacing reaches every tier. Any
 * block can override both.
 */
export const EmailBaseTypographyFields = ({
  documentStyles,
  renderInfoIcon = defaultInfoIcon,
}: EmailDocumentStyleFieldProps) => {
  const emailFormattingEnabled = useAtomValue(emailFormattingEnabledAtom);
  if (!emailFormattingEnabled) return null;

  return (
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
          <NumberInput
            startAdornment={<FontSizeIcon className={ADORNMENT_ICON} />}
            min={0}
            max={MAX_FONT_SIZE}
            aria-label="Base font size"
            data-testid="email-document-font-size"
            value={documentStyles.emailFontSizeValue}
            onValueChange={documentStyles.handleFontSizeChange}
          />
        </div>
        <div className="courier-flex-1">
          <NumberInput
            startAdornment={<LineHeightIcon className={ADORNMENT_ICON} />}
            min={0}
            max={MAX_LINE_HEIGHT}
            aria-label="Base line spacing"
            data-testid="email-document-line-height"
            value={documentStyles.emailLineHeightValue}
            onValueChange={documentStyles.handleLineHeightChange}
          />
        </div>
      </div>
    </>
  );
};

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
 * Preview and read-only mode add their own `.courier-editor-main .ProseMirror
 * { py-5 }`, which outweighs this wrapper's two-class override. Rather than
 * force it with `!important` here, `styles.css` exempts the email editor from
 * that rule — `!important` also stripped the padding read-only mode relies on
 * elsewhere, and the rule still has to apply to Slack, MSTeams and the brand
 * editor, which have no Frame of their own.
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
    className="[&_.ProseMirror]:courier-py-0"
    style={{
      padding: `${documentStyles.emailPaddingVertical}px ${documentStyles.emailPaddingHorizontal}px`,
    }}
  >
    {children}
  </div>
);
