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
  link: { state: "enabled" },
  variable: { state: "enabled" },
};

export const getTextMenuConfigForNode = (
  nodeName: string,
  hasTextSelection: boolean = false
): TextMenuConfig => {
  const isTextNode = ["paragraph", "heading", "blockquote", "list"].includes(nodeName);

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
      link: { state: "hidden" },
      variable: { state: "enabled" },
    };
  }

  switch (nodeName) {
    case "button":
      return {
        bold: { state: "enabled" },
        italic: { state: "enabled" },
        underline: { state: "enabled" },
        strike: { state: "enabled" },
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
        link: { state: "hidden" },
        variable: { state: "hidden" },
      };
  }
};
