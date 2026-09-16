import { BlockBase, type BlockBaseProps } from "../Block";

export const HeadingBlockIcon = () => (
  <svg width="18" height="13" viewBox="0 0 18 13" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M1.5 1.75V6H8.5V1.75C8.5 1.34375 8.8125 1 9.25 1C9.65625 1 10 1.34375 10 1.75V6.75V12.25C10 12.6875 9.65625 13 9.25 13C8.8125 13 8.5 12.6875 8.5 12.25V7.5H1.5V12.25C1.5 12.6875 1.15625 13 0.75 13C0.3125 13 0 12.6875 0 12.25V6.75V1.75C0 1.34375 0.3125 1 0.75 1C1.15625 1 1.5 1.34375 1.5 1.75ZM15.75 1.75V11.5H17.25C17.6562 11.5 18 11.8438 18 12.25C18 12.6875 17.6562 13 17.25 13H15H12.75C12.3125 13 12 12.6875 12 12.25C12 11.8438 12.3125 11.5 12.75 11.5H14.25V3.03125L13.0938 3.65625C12.75 3.875 12.2812 3.75 12.0938 3.375C11.875 3 12 2.5625 12.375 2.34375L14.625 1.09375C14.8438 0.96875 15.125 0.96875 15.375 1.125C15.5938 1.25 15.75 1.5 15.75 1.75Z"
      fill="currentColor"
    />
  </svg>
);

export const HeadingBlock = ({ draggable = false }: Pick<BlockBaseProps, "draggable">) => {
  return (
    <BlockBase
      draggable={draggable}
      icon={<HeadingBlockIcon />}
      draggableLabel="Heading"
      label="Heading block"
    />
  );
};
