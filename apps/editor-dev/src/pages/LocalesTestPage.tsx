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
            "pt-BR": { title: "Modelo de teste de localização" },
          },
        },
        // Text node with content only, no elements, no markdown (plain content format)
        {
          type: "text",
          content: "Thank you for choosing our service. We hope you enjoy your experience.",
          align: "left",
          padding: "6px 0px",
          locales: {
            fr: { content: "Merci d'avoir choisi notre service. Nous espérons que vous apprécierez votre expérience." },
            es: { content: "Gracias por elegir nuestro servicio. Esperamos que disfrute su experiencia." },
            ja: { content: "当サービスをお選びいただきありがとうございます。素晴らしい体験となることを願っております。" },
            "pt-BR": { content: "Obrigado por escolher nosso serviço. Esperamos que aproveite sua experiência." },
          },
        },
        // Text node with markdown content + content-string locales (legacy format)
        {
          type: "text",
          content: "Welcome to our platform, {{user.name}}!",
          align: "left",
          text_style: "h1",
          padding: "6px 0px",
          background_color: "transparent",
          locales: {
            fr: { content: "Bienvenue sur notre plateforme, {{user.name}} !" },
            es: { content: "Bienvenido a nuestra plataforma, {{user.name}}!" },
            ja: { content: "プラットフォームへようこそ、{{user.name}}！" },
            "pt-BR": { content: "Bem-vindo à nossa plataforma, {{user.name}}!" },
          },
        },
        // Text node with structured elements + structured-elements locales (new format)
        {
          type: "text",
          text_style: "h3",
          elements: [
            { type: "string", content: "Your order ", italic: true },
            { type: "string", content: "#{{order.id}}", bold: true, italic: true },
            { type: "string", content: " has been ", italic: true },
            { type: "string", content: "confirmed", bold: true, italic: true },
            { type: "string", content: ".", italic: true },
          ],
          align: "left",
          padding: "6px 0px",
          locales: {
            fr: {
              elements: [
                { type: "string", content: "Votre commande ", italic: true },
                { type: "string", content: "#{{order.id}}", bold: true, italic: true },
                { type: "string", content: " a été ", italic: true },
                { type: "string", content: "confirmée", bold: true, italic: true },
                { type: "string", content: ".", italic: true },
              ],
            },
            es: {
              elements: [
                { type: "string", content: "Su pedido ", italic: true },
                { type: "string", content: "#{{order.id}}", bold: true, italic: true },
                { type: "string", content: " ha sido ", italic: true },
                { type: "string", content: "confirmado", bold: true, italic: true },
                { type: "string", content: ".", italic: true },
              ],
            },
            ja: {
              elements: [
                { type: "string", content: "ご注文 ", italic: true },
                { type: "string", content: "#{{order.id}}", bold: true, italic: true },
                { type: "string", content: " が", italic: true },
                { type: "string", content: "確認", bold: true, italic: true },
                { type: "string", content: "されました。", italic: true },
              ],
            },
            "pt-BR": {
              elements: [
                { type: "string", content: "Seu pedido ", italic: true },
                { type: "string", content: "#{{order.id}}", bold: true, italic: true },
                { type: "string", content: " foi ", italic: true },
                { type: "string", content: "confirmado", bold: true, italic: true },
                { type: "string", content: ".", italic: true },
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
            ja: {
              elements: [
                { type: "string", content: "お困りですか？ " },
                { type: "link", content: "サポートに連絡", href: "https://support.example.com/ja" },
                { type: "string", content: " または " },
                { type: "link", content: "よくある質問", href: "https://faq.example.com/ja" },
                { type: "string", content: "をご覧ください。" },
              ],
            },
            "pt-BR": {
              elements: [
                { type: "string", content: "Precisa de ajuda? " },
                { type: "link", content: "Fale com o suporte", href: "https://support.example.com/pt-br" },
                { type: "string", content: " ou acesse nosso " },
                { type: "link", content: "FAQ", href: "https://faq.example.com/pt-br" },
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
            ja: {
              src: "https://placehold.co/600x200?text=ようこそバナー",
              href: "https://example.jp",
            },
            "pt-BR": {
              src: "https://placehold.co/600x200?text=Banner+de+boas-vindas",
              href: "https://example.com.br",
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
            ja: { content: "未来を予測する最善の方法は、自ら創ることだ。" },
            "pt-BR": { content: "A melhor maneira de prever o futuro é criá-lo." },
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
            ja: { content: "注文を確認する", href: "https://example.jp/orders/{{order.id}}" },
            "pt-BR": { content: "Ver seu pedido", href: "https://example.com.br/pedidos/{{order.id}}" },
          },
        },
        // HTML node with locales
        {
          type: "html",
          content: "<table width=\"100%\"><tr><td style=\"text-align:center;padding:20px;background:#f5f5f5;\"><small>You're receiving this because you signed up at example.com</small></td></tr></table>",
          locales: {
            fr: { content: "<table width=\"100%\"><tr><td style=\"text-align:center;padding:20px;background:#f5f5f5;\"><small>Vous recevez ceci car vous êtes inscrit sur example.fr</small></td></tr></table>" },
            es: { content: "<table width=\"100%\"><tr><td style=\"text-align:center;padding:20px;background:#f5f5f5;\"><small>Recibe esto porque se registró en example.es</small></td></tr></table>" },
            ja: { content: "<table width=\"100%\"><tr><td style=\"text-align:center;padding:20px;background:#f5f5f5;\"><small>example.jpに登録されているため、このメールを受信しています</small></td></tr></table>" },
            "pt-BR": { content: "<table width=\"100%\"><tr><td style=\"text-align:center;padding:20px;background:#f5f5f5;\"><small>Você recebeu isto porque se cadastrou em example.com.br</small></td></tr></table>" },
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
            ja: { title: "注文確認" },
            "pt-BR": { title: "Pedido confirmado" },
          },
        },
        {
          type: "text",
          content: "Your order #{{order.id}} is confirmed.",
          locales: {
            fr: { content: "Votre commande #{{order.id}} est confirmée." },
            es: { content: "Su pedido #{{order.id}} está confirmado." },
            ja: { content: "ご注文 #{{order.id}} が確認されました。" },
            "pt-BR": { content: "Seu pedido #{{order.id}} foi confirmado." },
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
            ja: { content: "注文を見る", href: "https://example.jp/orders/{{order.id}}" },
            "pt-BR": { content: "Ver pedido", href: "https://example.com.br/pedidos/{{order.id}}" },
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
            ja: { content: "配送を追跡", href: "https://example.jp/track/{{order.id}}" },
            "pt-BR": { content: "Rastrear envio", href: "https://example.com.br/rastreio/{{order.id}}" },
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
        autoSave={true}
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

      <details
        style={{
          marginTop: "16px",
          padding: "12px 16px",
          backgroundColor: "#eef2ff",
          borderRadius: "8px",
          border: "1px solid #a5b4fc",
        }}
      >
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>
          Elemental Input (initial value)
        </summary>
        <pre
          style={{
            marginTop: "8px",
            fontSize: "12px",
            maxHeight: "800px",
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {JSON.stringify(initialValue, null, 2)}
        </pre>
      </details>

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
            Elemental Output (after designer round-trip)
          </summary>
          <pre
            style={{
              marginTop: "8px",
              fontSize: "12px",
              maxHeight: "800px",
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
