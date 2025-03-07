export type TextMenuItemState = 'enabled' | 'disabled' | 'hidden';

export type TextMenuItem = {
  state: TextMenuItemState;
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
}

export const defaultTextMenuConfig: TextMenuConfig = {
  contentType: { state: 'enabled' },
  bold: { state: 'enabled' },
  italic: { state: 'enabled' },
  underline: { state: 'enabled' },
  strike: { state: 'enabled' },
  alignLeft: { state: 'enabled' },
  alignCenter: { state: 'enabled' },
  alignRight: { state: 'enabled' },
  alignJustify: { state: 'enabled' },
  quote: { state: 'enabled' },
  link: { state: 'enabled' },
  variable: { state: 'enabled' },
};

export const getTextMenuConfigForNode = (nodeName: string): TextMenuConfig => {
  switch (nodeName) {
    case 'button':
      return {
        bold: { state: 'enabled' },
        italic: { state: 'enabled' },
        underline: { state: 'enabled' },
        strike: { state: 'enabled' },
      };
    case 'paragraph':
    case 'heading':
    case 'blockquote':
      return defaultTextMenuConfig;
    default:
      return {
        contentType: { state: 'hidden' },
        bold: { state: 'hidden' },
        italic: { state: 'hidden' },
        underline: { state: 'hidden' },
        strike: { state: 'hidden' },
        alignLeft: { state: 'hidden' },
        alignCenter: { state: 'hidden' },
        alignRight: { state: 'hidden' },
        alignJustify: { state: 'hidden' },
        quote: { state: 'hidden' },
        link: { state: 'hidden' },
        variable: { state: 'hidden' },
      };
  }
}; 