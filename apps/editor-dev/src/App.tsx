import { Editor } from "@trycourier/react-editor";
import "@trycourier/react-editor/styles.css";

function App() {
  return (
    <div
      style={{
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h1 style={{ marginBottom: 20 }}>React Editor Development</h1>
      <Editor value="Hello, world!" onChange={() => {}} />
    </div>
  );
}

export default App;
