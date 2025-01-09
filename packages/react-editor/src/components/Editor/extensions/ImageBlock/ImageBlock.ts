import type { ChainedCommands } from "@tiptap/core";
import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TextSelection } from "prosemirror-state";
import { ImageBlockView } from "./components/ImageBlockView";
import type { ImageBlockProps } from "./ImageBlock.types";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageBlock: {
      setImageBlock: (props: Partial<ImageBlockProps>) => ReturnType;
      setImageBlockAt: (props: { pos: number; src: string }) => ReturnType;
      setImageBlockAlign: (
        alignment: "left" | "center" | "right"
      ) => ReturnType;
      setImageBlockWidth: (width: number) => ReturnType;
    };
  }
}

export const defaultImageProps: ImageBlockProps = {
  sourcePath: "",
  link: "",
  alt: "",
  alignment: "center",
  size: "default",
  width: 500,
  borderWidth: 0,
  borderRadius: 0,
  borderColor: "transparent",
  isUploading: false,
};

export const ImageBlock = Node.create({
  name: "imageBlock",
  group: "block",
  draggable: true,
  selectable: true,
  atom: true,
  inline: false,

  addOptions() {
    return {
      placeholder: "",
    };
  },

  addAttributes() {
    return {
      sourcePath: {
        default: this.options.placeholder || defaultImageProps.sourcePath,
        parseHTML: (element) =>
          element.getAttribute("data-source-path") || this.options.placeholder,
        renderHTML: (attributes) => ({
          "data-source-path": attributes.sourcePath || this.options.placeholder,
        }),
      },
      link: {
        default: defaultImageProps.link,
        parseHTML: (element) => element.getAttribute("data-link"),
        renderHTML: (attributes) => ({
          "data-link": attributes.link,
        }),
      },
      alt: {
        default: defaultImageProps.alt,
        parseHTML: (element) => element.getAttribute("data-alt"),
        renderHTML: (attributes) => ({
          "data-alt": attributes.alt,
        }),
      },
      alignment: {
        default: defaultImageProps.alignment,
        parseHTML: (element) => element.getAttribute("data-alignment"),
        renderHTML: (attributes) => ({
          "data-alignment": attributes.alignment,
        }),
      },
      size: {
        default: defaultImageProps.size,
        parseHTML: (element) => element.getAttribute("data-size"),
        renderHTML: (attributes) => ({
          "data-size": attributes.size,
        }),
      },
      width: {
        default: defaultImageProps.width,
        parseHTML: (element) => element.getAttribute("data-width"),
        renderHTML: (attributes) => ({
          "data-width": attributes.width,
        }),
      },
      borderWidth: {
        default: defaultImageProps.borderWidth,
        parseHTML: (element) => element.getAttribute("data-border-width"),
        renderHTML: (attributes) => ({
          "data-border-width": attributes.borderWidth,
        }),
      },
      borderRadius: {
        default: defaultImageProps.borderRadius,
        parseHTML: (element) => element.getAttribute("data-border-radius"),
        renderHTML: (attributes) => ({
          "data-border-radius": attributes.borderRadius,
        }),
      },
      borderColor: {
        default: defaultImageProps.borderColor,
        parseHTML: (element) => element.getAttribute("data-border-color"),
        renderHTML: (attributes) => ({
          "data-border-color": attributes.borderColor,
        }),
      },
      isUploading: {
        default: defaultImageProps.isUploading,
        parseHTML: (element) => element.getAttribute("data-is-uploading"),
        renderHTML: (attributes) => ({
          "data-is-uploading": attributes.isUploading,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="image-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "image-block",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },

  addCommands() {
    return {
      setImageBlock:
        (props) =>
          ({ chain, editor }) => {
            return chain()
              .insertContent({
                type: this.name,
                attrs: {
                  ...defaultImageProps,
                  sourcePath: this.options.placeholder,
                  ...props,
                },
              })
              .command(({ tr }) => {
                const lastNode = tr.doc.lastChild;
                if (lastNode?.type.name === "imageBlock") {
                  const pos = tr.doc.content.size;
                  tr.insert(pos, editor.schema.nodes.paragraph.create());
                  tr.setSelection(TextSelection.create(tr.doc, pos + 1));
                }
                return true;
              })
              .run();
          },
      setImageBlockAt:
        ({ pos, src }) =>
          ({ chain, editor }) => {
            return chain()
              .insertContentAt(pos, {
                type: this.name,
                attrs: {
                  ...defaultImageProps,
                  sourcePath: src || this.options.placeholder,
                },
              })
              .command(({ tr }) => {
                tr.insert(pos + 1, editor.schema.nodes.paragraph.create());
                return true;
              })
              .run();
          },
      setImageBlockAlign:
        (alignment) =>
          ({ commands }) => {
            return commands.updateAttributes(this.name, { alignment });
          },
      setImageBlockWidth:
        (width) =>
          ({ commands }) => {
            return commands.updateAttributes(this.name, { width });
          },
      uploadImage:
        (file: File) =>
          ({ chain }: { chain: () => ChainedCommands }) => {
            const reader = new FileReader();

            reader.onload = () => {
              chain()
                .setImageBlock({
                  sourcePath: reader.result as string,
                  isUploading: true,
                })
                .run();
            };

            reader.readAsDataURL(file);
            return true;
          },
    };
  },
});
