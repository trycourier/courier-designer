import { InputField } from "@/components/ui-kit/InputField";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";

type SideBarItemDetailsProps = {
  element?: ProseMirrorNode;
  editor: Editor | null;
};

export const SideBarItemDetails = ({
  element,
  editor,
}: SideBarItemDetailsProps) => {
  if (!element) {
    return null;
  }

  console.log(element);

  return (
    <div className="flex flex-col gap-4 pt-4">
      <InputField
        key={`label-${element.attrs.id}`}
        labelProps={{ children: "Label" }}
        inputProps={{
          type: "text",
          name: "label",
          defaultValue: element.attrs.label,
          onChange: (e) => {
            editor?.commands.updateAttributes(element.type, {
              label: e.target.value,
            });
          },
        }}
      />
      <InputField
        key={`radius-${element.attrs.id}`}
        labelProps={{ children: "Radius" }}
        inputProps={{
          type: "number",
          name: "borderRadius",
          defaultValue: element.attrs.borderRadius,
          onChange: (e) => {
            editor?.commands.updateAttributes(element.type, {
              borderRadius: parseInt(e.target.value),
            });
          },
        }}
      />
    </div>
  );
};
