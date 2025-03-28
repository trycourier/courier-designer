import { memo, useCallback, useEffect, useState } from "react";

export type ImageBlockWidthProps = {
  onChange: (value: number) => void;
  value: number;
};

export const ImageBlockWidth = memo(({ onChange, value }: ImageBlockWidthProps) => {
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = parseInt(e.target.value);
      onChange(nextValue);
      setCurrentValue(nextValue);
    },
    [onChange]
  );

  return (
    <div className="courier-flex courier-items-center courier-gap-2">
      <input
        className="courier-h-2 courier-bg-neutral-200 courier-border-0 courier-rounded courier-appearance-none courier-fill-neutral-300"
        type="range"
        min="1"
        max="100"
        step="1"
        onChange={handleChange}
        value={currentValue}
      />
      <span className="courier-text-xs courier-font-semibold courier-text-neutral-500 courier-select-none">
        {value}%
      </span>
    </div>
  );
});

ImageBlockWidth.displayName = "ImageBlockWidth";
