import { Button, Input } from "@/components/ui-kit";
import {
  FontSizeIcon,
  LineHeightIcon,
  PaddingHorizontalIcon,
  PaddingVerticalIcon,
} from "@/components/ui-kit/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { EMAIL_EDITOR_TEXT_STYLES } from "@/lib/constants/email-editor-tiptap-styles";
import { Info } from "lucide-react";
import type { useEmailDocumentStyles } from "../../hooks/useEmailDocumentStyles";

export type EmailDocumentStyles = ReturnType<typeof useEmailDocumentStyles>;

/** Placeholders for the base controls: the plain-text tier's presets. */
const BASE_FONT_SIZE = parseFloat(EMAIL_EDITOR_TEXT_STYLES.p.fontSize);
const BASE_LINE_HEIGHT = parseFloat(EMAIL_EDITOR_TEXT_STYLES.p.lineHeight);

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
          onChange={(e) =>
            documentStyles.handlePaddingChange({
              horizontal: Math.max(0, Number(e.target.value) || 0),
            })
          }
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
          onChange={(e) =>
            documentStyles.handlePaddingChange({
              vertical: Math.max(0, Number(e.target.value) || 0),
            })
          }
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
          placeholder={String(BASE_FONT_SIZE)}
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
          placeholder={String(BASE_LINE_HEIGHT)}
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
 */
export const EmailBodyFrame = ({
  documentStyles,
  children,
}: {
  documentStyles: EmailDocumentStyles;
  children: React.ReactNode;
}) => (
  <div
    data-testid="email-body-frame"
    style={{
      padding: `${documentStyles.emailPaddingVertical}px ${documentStyles.emailPaddingHorizontal}px`,
    }}
  >
    {children}
  </div>
);
