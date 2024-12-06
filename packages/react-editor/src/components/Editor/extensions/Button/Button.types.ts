export interface ButtonProps {
  label: string;
  link?: string;
  alignment: "left" | "center" | "right";
  size: "default" | "full";
  backgroundColor: string;
  textColor: string;
  borderWidth: number;
  borderRadius: number;
  borderColor: string;
}
