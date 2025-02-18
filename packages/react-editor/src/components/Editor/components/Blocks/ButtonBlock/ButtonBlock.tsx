import { BlockBase, type BlockBaseProps } from "../Block";

export const ButtonBlockIcon = () => (
  <svg width="20" height="12" viewBox="0 0 20 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 1.5H2C1.71875 1.5 1.5 1.75 1.5 2V10C1.5 10.2812 1.71875 10.5 2 10.5H18C18.25 10.5 18.5 10.2812 18.5 10V2C18.5 1.75 18.25 1.5 18 1.5ZM2 0H18C19.0938 0 20 0.90625 20 2V10C20 11.125 19.0938 12 18 12H2C0.875 12 0 11.125 0 10V2C0 0.90625 0.875 0 2 0Z" fill="#171717" />
  </svg>
)

export const ButtonBlock = ({ draggable = false }: Pick<BlockBaseProps, "draggable">) => {
  return <BlockBase draggable={draggable} icon={<ButtonBlockIcon />} draggableLabel="Button" label="Button block" />;
};
