import { Editor } from "@trycourier/react-editor";

function App() {
  return (
    <div>
      <h1>React Editor Development</h1>
      <Editor value="Hello, world!" onChange={() => {}} />
    </div>
  );
}

export default App;
