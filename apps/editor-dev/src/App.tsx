import { CourierEditor, CourierTemplateProvider } from "@trycourier/react-editor";
import "@trycourier/react-editor/styles.css";
import "./style.css";

function App() {
  return (
    <CourierTemplateProvider templateId="123" tenantId="456" token="789">
      <div
        style={{
          padding: "40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h1 style={{ marginBottom: 20 }}>React Editor Development</h1>
        <div style={{ width: "70vw", height: "80vh" }}>
          <CourierEditor
            autoSave={false}
            // theme={{
            //   background: "#ff0000",
            // }}
            // theme="myTheme"

            variables={{
              user: {
                firstName: "John",
                lastName: "Doe",
                email: "john@example.com"
              },
              company: {
                name: "Acme Inc",
                address: {
                  street: "123 Main St",
                  city: "San Francisco"
                }
              }
            }}
          // onChange={(value) => {
          //   console.log("value", JSON.stringify(value, null, 2));
          // }}
          />
        </div>
      </div>
    </CourierTemplateProvider>
  );
}

export default App;
