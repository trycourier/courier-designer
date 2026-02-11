import { test, expect, setupComponentTest, getMainEditor } from "./test-utils";

test.describe("Locales Preservation", () => {
  test.beforeEach(async ({ page }) => {
    await setupComponentTest(page);
  });

  test("should preserve locales in text/paragraph nodes", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert paragraph with locales via editor commands
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        ed.commands.insertContent({
          type: "paragraph",
          attrs: {
            textAlign: "left",
            locales: {
              "eu-fr": { content: "Bonjour le monde\n" },
              "es-es": { content: "Hola mundo\n" }
            }
          },
          content: [
            { type: "text", text: "Hello World" }
          ]
        });
      }
    });

    await page.waitForTimeout(500);

    // Verify content appears
    await expect(editor).toContainText("Hello World");

    // Check that locales are preserved in the final Elemental output
    const elementalContent = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.templateEditorContent) {
        return (window as any).__COURIER_CREATE_TEST__?.templateEditorContent;
      }
      return null;
    });

    expect(elementalContent).toBeTruthy();
    expect(elementalContent?.elements).toBeDefined();

    // Find the email channel
    const emailChannel = elementalContent?.elements?.find((el: any) => el.type === "channel" && el.channel === "email");
    expect(emailChannel).toBeDefined();

    // Find the text element within the email channel
    const textElement = emailChannel?.elements?.find((el: any) => el.type === "text");
    expect(textElement).toBeDefined();
    expect(textElement?.locales).toBeDefined();
    expect(textElement?.locales?.["eu-fr"]?.content).toBe("Bonjour le monde\n");
    expect(textElement?.locales?.["es-es"]?.content).toBe("Hola mundo\n");
  });

  test("should preserve locales in button/action nodes", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        ed.commands.insertContent({
          type: "button",
          attrs: {
            label: "Click Here",
            link: "https://example.com",
            locales: {
              "eu-fr": {
                content: "Cliquez ici",
                href: "https://exemple.fr"
              }
            }
          },
          content: [{ type: "text", text: "Click Here" }]
        });
      }
    });

    await page.waitForTimeout(500);

    await expect(editor).toContainText("Click Here");

    const elementalContent = await page.evaluate(() => {
      return (window as any).__COURIER_CREATE_TEST__?.templateEditorContent;
    });

    const emailChannel = elementalContent?.elements?.find((el: any) => el.type === "channel" && el.channel === "email");
    const actionElement = emailChannel?.elements?.find((el: any) => el.type === "action");

    expect(actionElement).toBeDefined();
    expect(actionElement?.locales).toBeDefined();
    expect(actionElement?.locales?.["eu-fr"]?.content).toBe("Cliquez ici");
    expect(actionElement?.locales?.["eu-fr"]?.href).toBe("https://exemple.fr");
  });

  test("should preserve locales in blockquote nodes", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        ed.commands.insertContent({
          type: "blockquote",
          attrs: {
            locales: {
              "eu-fr": { content: "Citation française" }
            }
          },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "English quote" }]
            }
          ]
        });
      }
    });

    await page.waitForTimeout(500);

    await expect(editor).toContainText("English quote");

    const elementalContent = await page.evaluate(() => {
      return (window as any).__COURIER_CREATE_TEST__?.templateEditorContent;
    });

    const emailChannel = elementalContent?.elements?.find((el: any) => el.type === "channel" && el.channel === "email");
    const quoteElement = emailChannel?.elements?.find((el: any) => el.type === "quote");

    expect(quoteElement).toBeDefined();
    expect(quoteElement?.locales).toBeDefined();
    expect(quoteElement?.locales?.["eu-fr"]?.content).toBe("Citation française");
  });

  test("should preserve locales in image nodes", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        ed.commands.insertContent({
          type: "imageBlock",
          attrs: {
            sourcePath: "https://example.com/image.jpg",
            alt: "Test image",
            locales: {
              "eu-fr": {
                src: "https://exemple.fr/image.jpg",
                alt_text: "Image de test"
              }
            }
          }
        });
      }
    });

    await page.waitForTimeout(1000);

    // Check the elemental content directly (skip visual check)
    const elementalContent = await page.evaluate(() => {
      return (window as any).__COURIER_CREATE_TEST__?.templateEditorContent;
    });

    const emailChannel = elementalContent?.elements?.find((el: any) => el.type === "channel" && el.channel === "email");
    const imgElement = emailChannel?.elements?.find((el: any) => el.type === "image");

    expect(imgElement).toBeDefined();
    expect(imgElement?.locales).toBeDefined();
    expect(imgElement?.locales?.["eu-fr"]?.src).toBe("https://exemple.fr/image.jpg");
    expect(imgElement?.locales?.["eu-fr"]?.alt_text).toBe("Image de test");
  });

  test("should preserve locales in HTML/custom code nodes", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        ed.commands.insertContent({
          type: "customCode",
          attrs: {
            code: "<div>English HTML</div>",
            locales: {
              "eu-fr": { content: "<div>HTML français</div>" }
            }
          }
        });
      }
    });

    await page.waitForTimeout(1000);

    // Check the elemental content directly (skip visual check)
    const elementalContent = await page.evaluate(() => {
      return (window as any).__COURIER_CREATE_TEST__?.templateEditorContent;
    });

    const emailChannel = elementalContent?.elements?.find((el: any) => el.type === "channel" && el.channel === "email");
    const htmlElement = emailChannel?.elements?.find((el: any) => el.type === "html");

    expect(htmlElement).toBeDefined();
    expect(htmlElement?.locales).toBeDefined();
    expect(htmlElement?.locales?.["eu-fr"]?.content).toBe("<div>HTML français</div>");
  });

  test("should handle multiple nodes with different locales", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;

        // Insert paragraph with EU-FR locale
        ed.commands.insertContent({
          type: "paragraph",
          attrs: {
            locales: {
              "eu-fr": { content: "Paragraphe français\n" }
            }
          },
          content: [{ type: "text", text: "English paragraph" }]
        });

        // Insert heading with ES-ES locale
        ed.commands.insertContent({
          type: "heading",
          attrs: {
            level: 1,
            locales: {
              "es-es": { content: "Título español\n" }
            }
          },
          content: [{ type: "text", text: "English heading" }]
        });

        // Insert button with both locales
        ed.commands.insertContent({
          type: "button",
          attrs: {
            label: "Click Me",
            locales: {
              "eu-fr": { content: "Cliquez-moi" },
              "es-es": { content: "Haz clic en mí" }
            }
          },
          content: [{ type: "text", text: "Click Me" }]
        });
      }
    });

    await page.waitForTimeout(500);

    await expect(editor).toContainText("English paragraph");
    await expect(editor).toContainText("English heading");
    await expect(editor).toContainText("Click Me");

    const elementalContent = await page.evaluate(() => {
      return (window as any).__COURIER_CREATE_TEST__?.templateEditorContent;
    });

    const emailChannel = elementalContent?.elements?.find((el: any) => el.type === "channel" && el.channel === "email");
    expect(emailChannel?.elements).toBeDefined();
    expect(emailChannel?.elements?.length).toBeGreaterThanOrEqual(3);

    // Check paragraph locales
    const paragraph = emailChannel?.elements?.find((el: any) => el.type === "text" && !el.text_style);
    expect(paragraph?.locales?.["eu-fr"]?.content).toBe("Paragraphe français\n");

    // Check heading locales
    const heading = emailChannel?.elements?.find((el: any) => el.type === "text" && el.text_style === "h1");
    expect(heading?.locales?.["es-es"]?.content).toBe("Título español\n");

    // Check button locales
    const button = emailChannel?.elements?.find((el: any) => el.type === "action");
    expect(button?.locales?.["eu-fr"]?.content).toBe("Cliquez-moi");
    expect(button?.locales?.["es-es"]?.content).toBe("Haz clic en mí");
  });

  test("should not add locales property to nodes without locales", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert paragraph without locales
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        ed.commands.insertContent({
          type: "paragraph",
          content: [{ type: "text", text: "Plain text without locales" }]
        });
      }
    });

    await page.waitForTimeout(500);

    await expect(editor).toContainText("Plain text without locales");

    const elementalContent = await page.evaluate(() => {
      return (window as any).__COURIER_CREATE_TEST__?.templateEditorContent;
    });

    const emailChannel = elementalContent?.elements?.find((el: any) => el.type === "channel" && el.channel === "email");
    const textElement = emailChannel?.elements?.find((el: any) => el.type === "text");

    expect(textElement).toBeDefined();
    // Elemental text nodes store inline content in `elements`, not a top-level `content` field
    const textContent = textElement?.elements?.map((el: any) => el.content).join("");
    expect(textContent).toContain("Plain text without locales");
    // Should not have locales property
    expect(textElement?.locales).toBeUndefined();
  });
});
