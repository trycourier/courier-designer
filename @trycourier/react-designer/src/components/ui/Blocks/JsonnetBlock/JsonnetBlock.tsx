import { BlockBase, type BlockBaseProps } from "../Block";

export const JsonnetBlockIcon = () => (
  <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M7.5 1C5.5 1 5.5 7 3.5 7C5.5 7 5.5 13 7.5 13M12.5 1C14.5 1 14.5 7 16.5 7C14.5 7 14.5 13 12.5 13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const JsonnetBlock = ({ draggable = false }: Pick<BlockBaseProps, "draggable">) => {
  return (
    <BlockBase
      draggable={draggable}
      icon={<JsonnetBlockIcon />}
      draggableLabel="Jsonnet"
      label="Jsonnet"
    />
  );
};
