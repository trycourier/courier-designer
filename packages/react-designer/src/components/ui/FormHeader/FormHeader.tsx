import { Button, Divider } from "@/components/ui-kit";
import { useSetAtom } from "jotai";
import {
  BlockquoteBlock,
  ButtonBlock,
  CustomCodeBlock,
  DividerBlock,
  HeadingBlock,
  ImageBlock,
  SpacerBlock,
  TextBlock,
} from "../Blocks";
import { setSelectedNodeAtom } from "../TextMenu/store";
interface FormHeaderProps {
  type:
    | "text"
    | "image"
    | "spacer"
    | "divider"
    | "button"
    | "blockquote"
    | "heading"
    | "customCode";
}

export const FormHeader = ({ type }: FormHeaderProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  return (
    <div className="courier-flex courier-gap-4 courier-flex-col">
      <Button
        className="courier-w-fit"
        variant="secondary"
        buttonSize="small"
        onClick={() => {
          setSelectedNode(null);
        }}
      >
        Close
      </Button>
      {type === "heading" && <HeadingBlock />}
      {type === "text" && <TextBlock />}
      {type === "image" && <ImageBlock />}
      {type === "spacer" && <SpacerBlock />}
      {type === "divider" && <DividerBlock />}
      {type === "button" && <ButtonBlock />}
      {type === "blockquote" && <BlockquoteBlock />}
      {type === "customCode" && <CustomCodeBlock />}
      <Divider className="courier-m-0" />
    </div>
  );
};
