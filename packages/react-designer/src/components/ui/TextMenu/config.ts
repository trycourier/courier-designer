export type TextMenuItemState = "enabled" | "disabled" | "hidden";

export interface TextMenuItem {
  state: TextMenuItemState;
}

export interface ConditionalRule {
  id: string;
  trigger: {
    type: "node";
    name: string;
    active: boolean;
  };
  conditions: {
    activeItems: Array<keyof TextMenuConfig>;
  };
  action: {
    type: "toggle_off";
    targets: Array<keyof TextMenuConfig>;
  };
}

export interface TextMenuConfig {
  contentType?: TextMenuItem;
  bold?: TextMenuItem;
  italic?: TextMenuItem;
  underline?: TextMenuItem;
  strike?: TextMenuItem;
  alignLeft?: TextMenuItem;
  alignCenter?: TextMenuItem;
  alignRight?: TextMenuItem;
  alignJustify?: TextMenuItem;
  quote?: TextMenuItem;
  orderedList?: TextMenuItem;
  unorderedList?: TextMenuItem;
  link?: TextMenuItem;
  variable?: TextMenuItem;
  conditionalRules?: ConditionalRule[];
}

export const defaultTextMenuConfig: TextMenuConfig = {
  contentType: { state: "enabled" },
  bold: { state: "enabled" },
  italic: { state: "enabled" },
  underline: { state: "enabled" },
  strike: { state: "enabled" },
  alignLeft: { state: "enabled" },
  alignCenter: { state: "enabled" },
  alignRight: { state: "enabled" },
  alignJustify: { state: "enabled" },
  quote: { state: "enabled" },
  orderedList: { state: "enabled" },
  unorderedList: { state: "enabled" },
  link: { state: "enabled" },
  variable: { state: "enabled" },
};

export const getTextMenuConfigForNode = (
  nodeName: string,
  hasTextSelection: boolean = false
): TextMenuConfig => {
  const isTextNode = ["paragraph", "heading", "blockquote"].includes(nodeName);

  if (isTextNode && hasTextSelection) {
    // When there's a text selection in a text node
    return {
      contentType: { state: "enabled" },
      bold: { state: "enabled" },
      italic: { state: "enabled" },
      underline: { state: "enabled" },
      strike: { state: "enabled" },
      alignLeft: { state: "hidden" },
      alignCenter: { state: "hidden" },
      alignRight: { state: "hidden" },
      alignJustify: { state: "hidden" },
      quote: { state: "hidden" },
      orderedList: { state: "hidden" },
      unorderedList: { state: "hidden" },
      link: { state: "enabled" },
      variable: { state: "enabled" },
    };
  }

  if (isTextNode && !hasTextSelection) {
    // When a text node is selected but no text selection
    return {
      contentType: { state: "enabled" },
      bold: { state: "hidden" },
      italic: { state: "hidden" },
      underline: { state: "hidden" },
      strike: { state: "hidden" },
      alignLeft: { state: "enabled" },
      alignCenter: { state: "enabled" },
      alignRight: { state: "enabled" },
      alignJustify: { state: "enabled" },
      quote: { state: "enabled" },
      orderedList: { state: "enabled" },
      unorderedList: { state: "enabled" },
      link: { state: "hidden" },
      variable: { state: "enabled" },
    };
  }

  switch (nodeName) {
    case "list":
      return {
        contentType: { state: "hidden" }, // No content type conversion
        bold: { state: hasTextSelection ? "enabled" : "hidden" },
        italic: { state: hasTextSelection ? "enabled" : "hidden" },
        underline: { state: hasTextSelection ? "enabled" : "hidden" },
        strike: { state: hasTextSelection ? "enabled" : "hidden" },
        alignLeft: { state: "enabled" },
        alignCenter: { state: "enabled" },
        alignRight: { state: "enabled" },
        alignJustify: { state: "enabled" },
        quote: { state: "hidden" }, // Can't convert list to blockquote
        orderedList: { state: "enabled" }, // Toggle between list types
        unorderedList: { state: "enabled" }, // Toggle between list types
        link: { state: hasTextSelection ? "enabled" : "hidden" },
        variable: { state: "enabled" },
      };
    case "button":
      return {
        bold: { state: "hidden" },
        italic: { state: "hidden" },
        underline: { state: "hidden" },
        strike: { state: "hidden" },
      };
    default:
      return {
        contentType: { state: "hidden" },
        bold: { state: "hidden" },
        italic: { state: "hidden" },
        underline: { state: "hidden" },
        strike: { state: "hidden" },
        alignLeft: { state: "hidden" },
        alignCenter: { state: "hidden" },
        alignRight: { state: "hidden" },
        alignJustify: { state: "hidden" },
        quote: { state: "hidden" },
        orderedList: { state: "hidden" },
        unorderedList: { state: "hidden" },
        link: { state: "hidden" },
        variable: { state: "hidden" },
      };
  }
};
