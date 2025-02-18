import { BlockBase, type BlockBaseProps } from "../Block";

export const DividerBlockIcon = () => (
  <svg width="16" height="2" viewBox="0 0 16 2" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 1C0 0.59375 0.3125 0.25 0.75 0.25H15.25C15.6562 0.25 16 0.59375 16 1C16 1.4375 15.6562 1.75 15.25 1.75H0.75C0.3125 1.75 0 1.4375 0 1Z" fill="#171717" />
  </svg>
)

export const DividerBlock = ({ draggable = false }: Pick<BlockBaseProps, "draggable">) => {
  return <BlockBase draggable={draggable} icon={<DividerBlockIcon />} draggableLabel="Divider" label="Divider block" />;
};
