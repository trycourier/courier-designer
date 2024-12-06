import { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";
import { Input, InputProps } from "../Input";
import { Label, LabelProps } from "../Label";

interface InputFieldProps extends HTMLAttributes<HTMLDivElement> {
  labelProps: LabelProps;
  inputProps: InputProps;
}

export const InputField = ({
  labelProps,
  inputProps,
  className,
  ...props
}: InputFieldProps) => (
  <div
    {...props}
    className={cn("grid w-full max-w-sm items-center gap-1.5", className)}
  >
    <Label {...labelProps} />
    <Input {...inputProps} />
  </div>
);
