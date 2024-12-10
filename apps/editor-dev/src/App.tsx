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
      <div style={{ width: "90vw", height: "80vh" }}>
        <Editor
          value={{
            version: "2022-01-01",
            elements: [],
          }}
          // onChange={(value) => {
          //   console.log("value", JSON.stringify(value, null, 2));
          // }}
        />
      </div>
    </div>
  );
}

export default App;
