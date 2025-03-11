import { CourierEditor, CourierTemplateProvider, useCourierTemplate } from "@trycourier/react-editor";
import "@trycourier/react-editor/styles.css";
import "./style.css";

const ActionPanel = () => {
  const { saveTemplate, publishTemplate } = useCourierTemplate();

  const handleSaveTemplate = async () => {
    await saveTemplate();
  }

  const handlePublishTemplate = async () => {
    await publishTemplate();
  }

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "row", gap: 20 }}>
      <button style={{ backgroundColor: "green", color: "white", padding: 10, borderRadius: 5 }} onClick={handleSaveTemplate}>Save</button>
      <button style={{ backgroundColor: "blue", color: "white", padding: 10, borderRadius: 5 }} onClick={handlePublishTemplate}>Publish</button>
    </div>
  )
}

function App() {
  return (
    <CourierTemplateProvider templateId="sasha-1" tenantId="foobar" token={import.meta.env.VITE_JWT_TOKEN} apiUrl={import.meta.env.VITE_API_URL}>
      <div
        style={{
          padding: "40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h1 style={{ marginBottom: 20 }}>React Editor Development</h1>
        <ActionPanel />
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
