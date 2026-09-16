import { BlockBase, type BlockBaseProps } from "../Block";

export const TextBlockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M1.5 1.5V3C1.5 3.4375 1.15625 3.75 0.75 3.75C0.3125 3.75 0 3.4375 0 3V1.25C0 0.5625 0.53125 0 1.25 0H12.75C13.4375 0 14 0.5625 14 1.25V3C14 3.4375 13.6562 3.75 13.25 3.75C12.8125 3.75 12.5 3.4375 12.5 3V1.5H7.75V12.5H9.25C9.65625 12.5 10 12.8438 10 13.25C10 13.6875 9.65625 14 9.25 14H4.75C4.3125 14 4 13.6875 4 13.25C4 12.8438 4.3125 12.5 4.75 12.5H6.25V1.5H1.5Z"
      fill="currentColor"
    />
  </svg>
);

export const TextBlock = ({ draggable = false }: Pick<BlockBaseProps, "draggable">) => {
  return (
    <BlockBase
      draggable={draggable}
      icon={<TextBlockIcon />}
      draggableLabel="Text"
      label="Text block"
    />
  );
};
