// NOTE: styles.css is exported as a separate entry point in package.json
// Users should import it explicitly: import '@trycourier/react-designer/styles.css'

export * from "./components/TemplateEditor";
export * from "./components/BrandEditor";
export * from "./components/Providers";

// Isolated v2 subtree (self-contained brand footer + rich-text editor).
export * from "./v2";
// export * from "./components/EditorProvider";

// Hooks
export * from "./components/hooks";

// Types
export type { VariableValidationConfig, VariableValidationContext } from "./types/validation.types";
export type { FontEntry, FontProvider } from "./types/font.types";

// Error handling utilities
export * from "./lib/utils/errors";
export * from "./components/ui-kit/ErrorBoundary";

export { CHANNELS } from "@/channels";
export type { ChannelType } from "@/store";
export type { ElementalContent } from "@/types";

export { PreviewPanel } from "@/components/ui/PreviewPanel";
export { Tooltip } from "@/components/ui/Tooltip";
export { TextMenu } from "@/components/ui/TextMenu";
export { VariableInput, VariableTextarea } from "@/components/ui/VariableEditor";
export { getFlattenedVariables } from "@/components/utils/getFlattenedVariables";
export { Status as TemplateStatus } from "@/components/ui/Status";

export {
  ToggleGroup,
  ToggleGroupItem,
  Toggle,
  Divider,
  Input,
  InputColor,
  DEFAULT_PRESET_COLORS,
  FontSelect,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui-kit";

export { ThemeProvider, useTheme } from "@/components/ui-kit/ThemeProvider";
export {
  defaultTheme,
  lightTheme,
  darkTheme,
} from "@/components/ui-kit/ThemeProvider/ThemeProvider.types";
export type { Theme } from "@/components/ui-kit/ThemeProvider/ThemeProvider.types";

export {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MediumIcon,
  XIcon,
} from "@/components/ui-kit/Icon";

export {
  cn,
  convertElementalToTiptap,
  convertTiptapToElemental,
  parseFontFamily,
  buildFontFamily,
} from "@/lib/utils";
export { blockDefaults } from "@/lib/constants/block-defaults";
export {
  BRAND_PADDING_HORIZONTAL_REF,
  BRAND_PADDING_VERTICAL_REF,
  formatPaddingWithBrandHorizontal,
  isBrandLinkedPadding,
} from "@/lib/utils/cssValues";
export {
  EMAIL_EDITOR_TEXT_STYLES,
  EMAIL_EDITOR_FONT_FAMILY,
} from "@/lib/constants/email-editor-tiptap-styles";

export { useAutoSave } from "@/hooks/useAutoSave";
export { useLocalization } from "@/hooks/useLocalization";
export type {
  TranslatableField,
  UseLocalizationOptions,
  UseLocalizationResult,
} from "@/hooks/useLocalization";
export {
  extractExistingLocales,
  extractTextFields,
  updateLocaleTranslation,
  updateLocaleTranslationWithElements,
} from "@/lib/utils/extractTextFields";
export { useGoogleFontLoader } from "@/components/TemplateEditor/hooks/useGoogleFontLoader";

export { TranslationEditor, getTranslationToolbarConfig } from "@/components/TranslationEditor";
export type {
  TranslationEditorProps,
  TranslationEditorToolbarConfig,
} from "@/components/TranslationEditor";
export { getTextMenuConfigForNode } from "@/components/ui/TextMenu/config";
export type { TextMenuConfig } from "@/components/ui/TextMenu/config";
export { convertElementsArrayToTiptapNodes } from "@/lib/utils/convertElementalToTiptap/convertElementalToTiptap";

export { MonacoCodeEditor } from "@/components/extensions/HTML/MonacoCodeEditor";

// Shadow DOM compatibility
export { applyShadowDomDndFix } from "@/components/utils/shadowDomDndFix";

// Locale preview
export { previewLocaleAtom } from "@/components/TemplateEditor/store";
export { applyLocaleToContent } from "@/lib/utils/applyLocaleToContent";

/**
 * Handlebars preview, for a host that renders preview on its own surface rather
 * than through `TemplateEditor`'s `variableViewMode`. Feeding elemental through
 * this before rendering gives the same output the editor's preview produces.
 */
/**
 * Document-level handlebars validation, for a host that wants to warn before a
 * send or gate a publish. Gate on `severity === "blocking"`, never on `code`
 * and never on whether a chip looks red — the editor flags more than the
 * renderer refuses.
 */
export { useTemplateIssues } from "@/hooks/useTemplateIssues";
export { collectTemplateIssues, severityForCode } from "@/lib/utils/handlebars/templateIssues";
export type { TemplateIssue, TemplateIssueSeverity } from "@/lib/utils/handlebars/templateIssues";
export type { HandlebarsIssueCode } from "@/lib/utils/handlebars/validateHandlebars";

/**
 * The segmentation layer, for a host rendering handlebars on a surface of its
 * own — an HTML/code view, say. Splitting a run of text into text, variable and
 * expression segments is what lets that surface chip variables and leave blocks
 * as blocks, identically to the design view, instead of guessing with a regex.
 *
 * `segmentText` is block-context aware: `{{this.name}}` is invalid on its own
 * and valid inside `{{#each}}`, and the segment's `isInvalid` carries that. Ask
 * it about a bare token to get the top-level verdict.
 *
 * Working on raw HTML? These report every occurrence, including one inside a
 * tag — `href="{{data.url}}"`. Splicing markup in there destroys the attribute,
 * so range-guard tags before substituting.
 */
export { segmentText, isVariableLike, hasHandlebars } from "@/lib/utils/handlebars/segmentText";
export type { HandlebarsSegment } from "@/lib/utils/handlebars/segmentText";
export {
  classifyExpression,
  isPlainVariable,
  tokenizeArgs,
} from "@/lib/utils/handlebars/classifyExpression";
export type {
  HandlebarsExpression,
  HandlebarsExpressionKind,
} from "@/lib/utils/handlebars/classifyExpression";
/**
 * The variable rules, so a host judges a reference the way the chips do rather
 * than round-tripping through `segmentText` to reach a verdict the library
 * already makes. `variableArguments` is the one that matters for a helper call:
 * it pulls the path-shaped operands out, hash arguments (`key=data.v`)
 * included, so a variable used inside a helper reaches Preview & Test exactly
 * as a bare one does.
 */
export {
  variableArguments,
  classifyVariableReference,
  isAcceptedVariable,
  isRejectedVariable,
  isBlockScopedReference,
  isLoopReference,
  knownNamespaces,
  namespaceOf,
} from "@/lib/utils/handlebars/variableRules";
export { stripWhitespaceControl } from "@/lib/utils/handlebars/variableRules";
export type {
  VariableContext,
  VariableVerdict,
  HostVariableValidator,
} from "@/lib/utils/handlebars/variableRules";
/** The same chips for a plain-text field — a header such as CC or Reply-To. */
export { renderVariablesInTextString } from "@/components/utils/htmlBlockVariables";
/**
 * Which names a `{{set}}` defines for the part that holds it. The send renders
 * each stored string part on its own, so a host judging the same references
 * needs the same rule rather than its own copy.
 */
export { setDefinedNamesInPart } from "@/lib/utils/handlebars/setScope";
/** Whether an element's `if` or a list's `loop` is JavaScript that parses. */
export { isParseableJs } from "@/lib/utils/handlebars/jsExpression";
/** How far a `../` reference reaches: enclosing `each`/`with` blocks only. */
export { contextDepthOf } from "@/lib/utils/handlebars/blockContext";
export type { BlockMarker } from "@/lib/utils/handlebars/blockContext";
/** Every payload path a run of text refers to, standalone or inside a helper. */
export { variableReferencesIn } from "@/lib/utils/handlebars/variableReferences";
export type { VariableReferenceOptions } from "@/lib/utils/handlebars/variableReferences";

export { scanHandlebars } from "@/lib/utils/handlebars/scanHandlebars";
export type { HandlebarsSpan } from "@/lib/utils/handlebars/scanHandlebars";
/**
 * Handlebars chips as an HTML string, for a surface that cannot mount React —
 * an `iframe srcDoc`, or anything injected via `dangerouslySetInnerHTML`.
 * Emits the same class names the design view uses and no inline colour, so
 * `styles.css` remains the single source of styling; load that stylesheet into
 * the surface for the chips to look right. Occurrences inside an HTML tag are
 * left untouched, since splicing markup into an attribute would destroy it.
 */
export {
  renderVariablesInHtmlString,
  extractVariablesFromHtmlString,
} from "@/components/utils/htmlBlockVariables";

/** Render one field, where building an elemental tree around it would be silly. */
export { renderHandlebarsPreview } from "@/lib/utils/handlebars/renderPreview";
export { convertSingleBraceVariables } from "@/lib/utils/handlebars/singleBraceVariables";
/** The data the editor renders Handlebars against, for a host field outside it. */
export { useHandlebarsPreviewData } from "@/hooks/useHandlebarsPreviewData";

export { renderElementalPreview } from "@/lib/utils/handlebars/renderElementalPreview";
export type { ElementalPreviewResult } from "@/lib/utils/handlebars/renderElementalPreview";
export { HandlebarsExpressionNode } from "@/components/extensions/HandlebarsExpression";
