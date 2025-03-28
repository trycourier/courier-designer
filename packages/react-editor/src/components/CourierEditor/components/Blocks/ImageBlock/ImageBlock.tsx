import { BlockBase, type BlockBaseProps } from "../Block";

export const ImageBlockIcon = () => (
  <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M14 1.5H2C1.71875 1.5 1.5 1.75 1.5 2V12V12.0312L1.625 11.8438L4.125 8.34375C4.28125 8.125 4.5 8 4.75 8C4.96875 8 5.21875 8.125 5.34375 8.3125L6.3125 9.65625L8.90625 6.3125C9.03125 6.125 9.25 6 9.5 6C9.71875 6 9.9375 6.125 10.0938 6.3125L14.3438 11.8125L14.5 12V2C14.5 1.75 14.25 1.5 14 1.5ZM2 0H14C15.0938 0 16 0.90625 16 2V12C16 13.125 15.0938 14 14 14H2C0.875 14 0 13.125 0 12V2C0 0.90625 0.875 0 2 0ZM4.5 6C3.9375 6 3.46875 5.71875 3.1875 5.25C2.90625 4.8125 2.90625 4.21875 3.1875 3.75C3.46875 3.3125 3.9375 3 4.5 3C5.03125 3 5.5 3.3125 5.78125 3.75C6.0625 4.21875 6.0625 4.8125 5.78125 5.25C5.5 5.71875 5.03125 6 4.5 6Z"
      fill="#171717"
    />
  </svg>
);

export const ImageBlock = ({ draggable = false }: Pick<BlockBaseProps, "draggable">) => {
  return (
    <BlockBase
      draggable={draggable}
      icon={<ImageBlockIcon />}
      draggableLabel="Image"
      label="Image block"
    />
  );
};
