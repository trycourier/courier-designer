import { TemplateEditor } from "@trycourier/react-designer";
import type { ElementalContent } from "@trycourier/react-designer";
import { useState } from "react";

/**
 * Initial value containing locales in various formats to test locale preservation:
 * - Text nodes with markdown content + content-string locales
 * - Text nodes with structured elements + structured-elements locales
 * - Text nodes with elements + mixed locale formats (content vs elements per language)
 * - Action nodes with locales
 * - Quote node with locales
 * - Image node with locales
 * - HTML node with locales
 * - Multiple channels (email + inbox with button pairs)
 */
const initialValue: ElementalContent = {
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "email",
      elements: [
        {
          type: "meta",
          title: "Locales Test Template",
          locales: {
            fr: { title: "Modèle de test de localisation" },
            es: { title: "Plantilla de prueba de localización" },
            ja: { title: "ロケールテストテンプレート" },
          },
        },
        // Text node with markdown content + content-string locales (legacy format)
        {
          type: "text",
          content: "**Welcome** to our platform, {{user.name}}!",
          align: "left",
          text_style: "h1",
          padding: "6px 0px",
          background_color: "transparent",
          locales: {
            fr: { content: "**Bienvenue** sur notre plateforme, {{user.name}} !" },
            es: { content: "**Bienvenido** a nuestra plataforma, {{user.name}}!" },
            ja: { content: "プラットフォームへようこそ、{{user.name}}！" },
          },
        },
        // Text node with structured elements + structured-elements locales (new format)
        {
          type: "text",
          elements: [
            { type: "string", content: "Your order ", bold: false },
            { type: "string", content: "#{{order.id}}", bold: true },
            { type: "string", content: " has been " },
            { type: "string", content: "confirmed", bold: true },
            { type: "string", content: "." },
          ],
          align: "left",
          padding: "6px 0px",
          locales: {
            fr: {
              elements: [
                { type: "string", content: "Votre commande " },
                { type: "string", content: "#{{order.id}}", bold: true },
                { type: "string", content: " a été " },
                { type: "string", content: "confirmée", bold: true },
                { type: "string", content: "." },
              ],
            },
            es: {
              elements: [
                { type: "string", content: "Su pedido " },
                { type: "string", content: "#{{order.id}}", bold: true },
                { type: "string", content: " ha sido " },
                { type: "string", content: "confirmado", bold: true },
                { type: "string", content: "." },
              ],
            },
          },
        },
        // Text with elements + mixed locales (some languages use content, others use elements)
        {
          type: "text",
          elements: [
            { type: "string", content: "Need help? " },
            {
              type: "link",
              content: "Contact support",
              href: "https://support.example.com",
            },
            { type: "string", content: " or visit our " },
            { type: "link", content: "FAQ", href: "https://faq.example.com" },
            { type: "string", content: "." },
          ],
          align: "left",
          padding: "6px 0px",
          locales: {
            fr: { content: "Besoin d'aide ? [Contacter le support](https://support.example.com/fr) ou visitez notre [FAQ](https://faq.example.com/fr)." },
            es: {
              elements: [
                { type: "string", content: "¿Necesita ayuda? " },
                { type: "link", content: "Contactar soporte", href: "https://support.example.com/es" },
                { type: "string", content: " o visite nuestras " },
                { type: "link", content: "Preguntas frecuentes", href: "https://faq.example.com/es" },
                { type: "string", content: "." },
              ],
            },
          },
        },
        // Image with localized src/href
        {
          type: "image",
          src: "https://placehold.co/600x200?text=Welcome+Banner",
          href: "https://example.com",
          align: "center",
          alt_text: "Welcome banner",
          width: "100%",
          locales: {
            fr: {
              src: "https://placehold.co/600x200?text=Bannière+de+bienvenue",
              href: "https://example.fr",
            },
            es: {
              src: "https://placehold.co/600x200?text=Banner+de+bienvenida",
              href: "https://example.es",
            },
          },
        },
        // Quote with locales
        {
          type: "quote",
          content: "The best way to predict the future is to create it.",
          align: "left",
          border_color: "#6366f1",
          locales: {
            fr: { content: "La meilleure façon de prédire l'avenir est de le créer." },
            es: { content: "La mejor manera de predecir el futuro es crearlo." },
          },
        },
        // Action (button) with locales
        {
          type: "action",
          content: "View your order",
          href: "https://example.com/orders/{{order.id}}",
          align: "center",
          background_color: "#6366f1",
          border_radius: "8px",
          padding: "12px 24px",
          locales: {
            fr: { content: "Voir votre commande", href: "https://example.fr/commandes/{{order.id}}" },
            es: { content: "Ver su pedido", href: "https://example.es/pedidos/{{order.id}}" },
          },
        },
        // HTML node with locales
        {
          type: "html",
          content: "<table width=\"100%\"><tr><td style=\"text-align:center;padding:20px;background:#f5f5f5;\"><small>You're receiving this because you signed up at example.com</small></td></tr></table>",
          locales: {
            fr: { content: "<table width=\"100%\"><tr><td style=\"text-align:center;padding:20px;background:#f5f5f5;\"><small>Vous recevez ceci car vous êtes inscrit sur example.fr</small></td></tr></table>" },
            es: { content: "<table width=\"100%\"><tr><td style=\"text-align:center;padding:20px;background:#f5f5f5;\"><small>Recibe esto porque se registró en example.es</small></td></tr></table>" },
          },
        },
      ],
    } as any,
    // Inbox channel with two action nodes (will become ButtonRow) that have locales
    {
      type: "channel",
      channel: "inbox",
      elements: [
        {
          type: "meta",
          title: "Order Confirmed",
          locales: {
            fr: { title: "Commande confirmée" },
            es: { title: "Pedido confirmado" },
          },
        },
        {
          type: "text",
          content: "Your order #{{order.id}} is confirmed.",
          locales: {
            fr: { content: "Votre commande #{{order.id}} est confirmée." },
            es: { content: "Su pedido #{{order.id}} está confirmado." },
          },
        },
        {
          type: "action",
          content: "View Order",
          href: "https://example.com/orders/{{order.id}}",
          background_color: "#000000",
          locales: {
            fr: { content: "Voir la commande", href: "https://example.fr/commandes/{{order.id}}" },
            es: { content: "Ver pedido", href: "https://example.es/pedidos/{{order.id}}" },
          },
        },
        {
          type: "action",
          content: "Track Shipment",
          href: "https://example.com/track/{{order.id}}",
          background_color: "#ffffff",
          color: "#000000",
          locales: {
            fr: { content: "Suivre l'envoi", href: "https://example.fr/suivi/{{order.id}}" },
            es: { content: "Rastrear envío", href: "https://example.es/rastreo/{{order.id}}" },
          },
        },
      ],
    } as any,
  ],
};

export function LocalesTestPage() {
  const [lastOutput, setLastOutput] = useState<ElementalContent | null>(null);

  return (
    <div>
      <div
        style={{
          padding: "12px 16px",
          marginBottom: "16px",
          backgroundColor: "#f0fdf4",
          borderRadius: "8px",
          border: "1px solid #86efac",
        }}
      >
        <strong>Locales Test:</strong> This editor is loaded with content containing locales in
        multiple formats — markdown content strings, structured elements arrays, and mixed. Edit the
        content and check the console output to verify locales survive the round-trip.
      </div>

      <TemplateEditor
        autoSave={false}
        value={initialValue}
        onChange={(value) => {
          console.log("onChange — Elemental output:", JSON.stringify(value, null, 2));
          setLastOutput(value);
        }}
        routing={{
          method: "single",
          channels: ["email", "inbox"],
        }}
      />

      {lastOutput && (
        <details
          style={{
            marginTop: "16px",
            padding: "12px 16px",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            border: "1px solid #e9ecef",
          }}
        >
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
            Last Elemental Output (click to expand)
          </summary>
          <pre
            style={{
              marginTop: "8px",
              fontSize: "12px",
              maxHeight: "400px",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {JSON.stringify(lastOutput, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
