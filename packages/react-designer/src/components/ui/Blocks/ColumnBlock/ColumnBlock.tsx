import { BlockBase, type BlockBaseProps } from "../Block";

export const ColumnBlockIcon = () => (
  <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M14 1.5V12.5H18C18.25 12.5 18.5 12.2812 18.5 12V2C18.5 1.75 18.25 1.5 18 1.5H14ZM12.5 1.5H7.5V12.5H12.5V1.5ZM6 12.5V1.5H2C1.71875 1.5 1.5 1.75 1.5 2V12C1.5 12.2812 1.71875 12.5 2 12.5H6ZM0 2C0 0.90625 0.875 0 2 0H18C19.0938 0 20 0.90625 20 2V12C20 13.125 19.0938 14 18 14H2C0.875 14 0 13.125 0 12V2Z"
      fill="currentColor"
    />
  </svg>
);

export const ColumnBlock = ({ draggable = false }: Pick<BlockBaseProps, "draggable">) => {
  return (
    <BlockBase
      draggable={draggable}
      icon={<ColumnBlockIcon />}
      draggableLabel="Column layout"
      label="Column layout"
    />
  );
};
