import { BlockBase, type BlockBaseProps } from "../Block";

export const CustomCodeBlockIcon = () => (
  <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M6.5 3.5L3 7L6.5 10.5M13.5 3.5L17 7L13.5 10.5M11.5 1L8.5 13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CustomCodeBlock = ({ draggable = false }: Pick<BlockBaseProps, "draggable">) => {
  return (
    <BlockBase
      draggable={draggable}
      icon={<CustomCodeBlockIcon />}
      draggableLabel="Custom code"
      label="Custom code"
    />
  );
};
