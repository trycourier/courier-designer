import { CourierEditor, CourierTemplateProvider, useCourierTemplate } from "@trycourier/react-editor";
import "@trycourier/react-editor/styles.css";
import "./style.css";

const ActionPanel = () => {
  const { saveTemplate } = useCourierTemplate();

  const handleSaveTemplate = async () => {
    const response = await saveTemplate();
    console.log("save template response", response);
  }

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "row", gap: 20 }}>
      <button style={{ backgroundColor: "green", color: "white", padding: 10, borderRadius: 5 }} onClick={handleSaveTemplate}>Save</button>
    </div>
  )
}

function App() {
  return (
    <CourierTemplateProvider templateId="sasha-1" tenantId="foobar" token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6InVzZXJfaWQ6YWJjMTIzIHRlbmFudDoqOiogdGVuYW50OmZvb2Jhcjpub3RpZmljYXRpb246KjoqIiwidGVuYW50X3Njb3BlIjoicHVibGlzaGVkL3Byb2R1Y3Rpb24iLCJ0ZW5hbnRfaWQiOiI0MGZhMTI4MC02ODQ2LTRiNjAtOWRmOS00YTczZGQxYzhlYjAiLCJpYXQiOjE3NDEwNTA4MzIsImp0aSI6IjQxOGE5MDA2LTdhZDEtNGRjNy04YzE0LTQwYTE3MzM0N2YxZSJ9.GaSBxdBeCKJuKTxmpWxqzto_D45WW6i88-EGu2_Emk8" apiUrl={import.meta.env.VITE_API_URL}>
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
