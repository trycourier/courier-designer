import { Editor } from "@trycourier/courier-editor";
import "@trycourier/courier-editor/styles.css";
import "./style.css";

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
      <div style={{ width: "70vw", height: "70vh" }}>
        <Editor
          // theme={{
          //   accent: "#ff0000",
          // }}
          // theme="myTheme"
          imageBlockPlaceholder={
            import.meta.env.VITE_IMAGE_PLACEHOLDER_URL || ""
          }
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
