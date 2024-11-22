export type EditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export const Editor: React.FC<EditorProps> = ({ value, onChange }) => {
  console.log("onChange", onChange);
  return <div>Editor: {value}</div>;
};
