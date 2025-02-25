import { Button, Divider } from "@/components/ui-kit";
import { useSetAtom } from "jotai";
import { ButtonBlock, DividerBlock, HeadingBlock, ImageBlock, SpacerBlock, TextBlock } from "../../Blocks";
import { setSelectedNodeAtom } from "../../TextMenu/store";
interface FormHeaderProps {
  type: 'text' | 'image' | 'spacer' | 'divider' | 'button' | 'blockquote' | 'heading';
}

export const FormHeader = ({ type }: FormHeaderProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  return (
    <div className="flex gap-4 flex-col">
      <Button className="w-fit" variant="secondary" buttonSize="small" onClick={() => {
        setSelectedNode(null);
      }}>Close</Button>
      {type === 'heading' && <HeadingBlock />}
      {type === 'text' && <TextBlock />}
      {type === 'image' && <ImageBlock />}
      {type === 'spacer' && <SpacerBlock />}
      {type === 'divider' && <DividerBlock />}
      {type === 'button' && <ButtonBlock />}
      {type === 'blockquote' && <p>Blockquote</p>}
      <Divider className="m-0" />
    </div>
  );
}; 