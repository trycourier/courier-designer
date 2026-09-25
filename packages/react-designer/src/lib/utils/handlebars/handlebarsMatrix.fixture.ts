/**
 * The C-20919 helper matrix: one row per helper and per interesting variation,
 * with the output the renderer should produce for `SAMPLE_DATA`.
 *
 * Kept as a fixture rather than inline cases so the same matrix drives both the
 * unit test here and the live template used to check the editor and preview.
 */
export const SAMPLE_DATA = {
  data: {
    user: {
      firstName: "ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      isAdmin: true,
      locale: "en-US",
    },
    order: {
      id: "A-1042",
      status: "shipped",
      total: 128.5,
      itemCount: 3,
      discount: 0,
      note: "Leave at the front door please",
      shippedAt: "2026-09-15T00:00:00Z",
      shippedTs: 1789430400,
    },
    items: [
      { name: "Keyboard", qty: 1, price: 89.5 },
      { name: "Mouse", qty: 2, price: 19.5 },
    ],
    tags: ["beta", "vip"],
    emptyList: [],
    profile: { plan: "pro", seats: 12 },
    field: "plan",
    csv: "red,green,blue",
    message: "Your order has shipped and is on its way to you",
    padded: "  spaced out  ",
    trailingComma: "pro,",
    jsonBlob: '{"plan":"pro","seats":12}',
    templateFragment: "Hi {{data.user.firstName}}",
    numberish: "42",
    temperature: -7.6,
    score: 87,
    attempts: 2,
    nickname: "",
    html: "<b>Bold</b>",
    url: "https://example.com/track/A-1042",
  },
};

export interface ValidCase {
  id: string;
  template: string;
  /** What the renderer produces for SAMPLE_DATA — the send. */
  expected: string;
  /**
   * What the editor's preview produces instead, where it cannot agree with the
   * send. Preview drops unfilled paths so `default` falls back as it will at
   * send; a path the author deliberately set to `""` is indistinguishable from
   * an unfilled one through a text input, so it falls back too. Set this only
   * where the divergence is understood and accepted.
   */
  expectedInPreview?: string;
}

export interface InvalidCase {
  id: string;
  template: string;
}

const V = (
  id: string,
  template: string,
  expected: string,
  expectedInPreview?: string
): ValidCase => ({
  id,
  template,
  ...(expectedInPreview === undefined ? {} : { expectedInPreview }),
  expected,
});
const X = (id: string, template: string): InvalidCase => ({ id, template });

export const VALID: ValidCase[] = [
  // block-control
  V("if-truthy-plain", "{{#if data.user.isAdmin}}Admin{{else}}Member{{/if}}", "Admin"),
  V(
    "if-else-empty-string",
    "{{#if data.nickname}}Hi {{data.nickname}}{{else}}Hi there{{/if}}",
    "Hi there"
  ),
  V("if-inverse-caret", "{{#if data.emptyList}}Items{{^}}No items{{/if}}", "No items"),
  V(
    "if-elseif-two",
    '{{#if (condition data.score ">=" 90)}}A{{else if (condition data.score ">=" 80)}}B{{/if}}',
    "B"
  ),
  V(
    "if-elseif-three",
    '{{#if (condition data.order.status "==" "pending")}}Pending{{else if (condition data.order.status "==" "shipped")}}Shipped{{else if (condition data.order.status "==" "delivered")}}Delivered{{else}}Unknown{{/if}}',
    "Shipped"
  ),
  V(
    "unless-block",
    "{{#unless data.order.discount}}No discount applied{{/unless}}",
    "No discount applied"
  ),
  V("unless-else", "{{#unless data.tags}}Untagged{{else}}Tagged{{/unless}}", "Tagged"),
  V(
    "each-array-objects",
    "{{#each data.items}}{{this.name}} x{{this.qty}}; {{/each}}",
    "Keyboard x1; Mouse x2; "
  ),
  V("each-bare-this", "{{#each data.tags}}[{{this}}]{{/each}}", "[beta][vip]"),
  V(
    "each-index-first-last",
    "{{#each data.items}}{{@index}}:{{this.name}}{{#unless @last}}, {{/unless}}{{/each}}",
    "0:Keyboard, 1:Mouse"
  ),
  V("each-else", "{{#each data.emptyList}}{{this}}{{else}}Nothing here{{/each}}", "Nothing here"),
  V(
    "if-inside-each",
    '{{#each data.items}}{{this.name}}{{#if (condition this.qty ">" 1)}} (bulk){{/if}} {{/each}}',
    "Keyboard Mouse (bulk) "
  ),
  V(
    "each-inside-if",
    "{{#if data.user.isAdmin}}Tags: {{#each data.tags}}{{this}} {{/each}}{{/if}}",
    "Tags: beta vip "
  ),
  V(
    "with-block",
    "{{#with data.order}}Order {{id}} is {{status}}{{/with}}",
    "Order A-1042 is shipped"
  ),
  V("with-nested", "{{#with data.profile}}{{plan}}/{{seats}}{{/with}}", "pro/12"),
  // `conditional` is not an `if`: it defaults to behavior:"hide" and renders the
  // block when the condition FAILS. Confirmed empty on a real send.
  V(
    "conditional-hides-when-true",
    "{{#conditional data.user.isAdmin}}Admin tools{{/conditional}}",
    ""
  ),
  V(
    "conditional-shows-when-true",
    '{{#conditional data.user.isAdmin behavior="show"}}Admin tools{{/conditional}}',
    "Admin tools"
  ),
  V("handlebars-comment", "{{! internal note }}Total: {{data.order.total}}", "Total: 128.5"),
  V(
    "comment-long-form",
    "{{!-- was {{data.secret}} --}}Total: {{data.order.total}}",
    "Total: 128.5"
  ),
  // comparison
  // `condition`'s `==` falls through to `===` in condition.ts, so a string never
  // equals a number. Named for what it actually is, not what it looks like.
  V(
    "condition-eq-is-strict",
    '{{#if (condition data.numberish "==" 42)}}loose eq{{else}}no{{/if}}',
    "no"
  ),
  V(
    "condition-eq-strict",
    '{{#if (condition data.numberish "===" "42")}}strict eq{{else}}no{{/if}}',
    "strict eq"
  ),
  V(
    "condition-neq",
    '{{#if (condition data.order.status "!=" "pending")}}not pending{{/if}}',
    "not pending"
  ),
  V(
    "condition-neq-strict",
    '{{#if (condition data.numberish "!==" 42)}}type differs{{else}}same type{{/if}}',
    "type differs"
  ),
  V("condition-lt", '{{#if (condition data.attempts "<" 3)}}retry allowed{{/if}}', "retry allowed"),
  V(
    "condition-lte",
    '{{#if (condition data.order.itemCount "<=" 3)}}small order{{/if}}',
    "small order"
  ),
  V("condition-gt", '{{#if (condition data.score ">" 80)}}above bar{{/if}}', "above bar"),
  V(
    "condition-gte",
    '{{#if (condition data.order.total ">=" 128.5)}}free shipping{{/if}}',
    "free shipping"
  ),
  V("and-helper", "{{#if (and data.user.isAdmin data.tags)}}Both{{else}}Not both{{/if}}", "Both"),
  V(
    "or-helper",
    "{{#if (or data.user.isAdmin data.order.discount)}}Perks{{else}}Standard{{/if}}",
    "Perks"
  ),
  V(
    "not-helper",
    "{{#if (not data.nickname)}}No nickname set{{else}}Has nickname{{/if}}",
    "No nickname set"
  ),
  V(
    "subexpr-two-deep",
    '{{#if (and (condition data.score ">=" 80) (not data.order.discount))}}Eligible{{else}}Not eligible{{/if}}',
    "Eligible"
  ),
  V(
    "subexpr-three-deep",
    '{{#if (or (and (condition data.score ">" 80) data.user.isAdmin) (not data.tags))}}Deep true{{else}}Deep false{{/if}}',
    "Deep true"
  ),
  V(
    "contains-block",
    '{{#contains data.message "shipped"}}Shipment update{{else}}Other update{{/contains}}',
    "Shipment update"
  ),
  V(
    "contains-negative",
    '{{#contains data.message "refund"}}Refund{{else}}No refund{{/contains}}',
    "No refund"
  ),
  // string
  V("capitalize", "{{capitalize data.user.firstName}}", "Ada"),
  V(
    "concat-separator",
    '{{concat data.user.firstName data.user.lastName separator=" "}}',
    "ada Lovelace"
  ),
  V("concat-no-separator", '{{concat "Order-" data.order.id}}', "Order-A-1042"),
  V("truncate-suffix", '{{truncate data.message 20 "..."}}', "Your order has shipp..."),
  V("truncate-no-suffix", "{{truncate data.message 10}}", "Your order"),
  V("truncate-shorter", '{{truncate data.order.id 40 "..."}}', "A-1042"),
  V("trim", ">{{trim data.padded}}<", ">spaced out<"),
  V("trim-left", ">{{trim-left data.padded}}<", ">spaced out  <"),
  V("trim-right", ">{{trim-right data.padded}}<", ">  spaced out<"),
  V("split-into-each", '{{#each (split data.csv ",")}}{{this}}-{{/each}}', "red-green-blue-"),
  // `default` falls back only on undefined/null, so an empty string passes
  // through — `data.nickname` is "".
  //
  // The one accepted preview/send divergence. Preview drops unfilled paths so
  // the far more common `{{default missing.path "x"}}` falls back the way it
  // will at send; through a text input a deliberate `""` is the same keystrokes
  // as unfilled, so this case falls back in preview and passes through at send.
  V(
    "default-keeps-empty-string",
    '{{default data.nickname "valued customer"}}',
    "",
    "valued customer"
  ),
  V(
    "quoted-arg-with-spaces",
    '{{default data.user.middleName "valued customer"}}',
    "valued customer"
  ),
  // The parser test that matters: `}}` inside a quoted argument must not end the
  // expression. Uses a missing path so the fallback actually renders.
  V(
    "quoted-arg-closing-braces",
    '{{default data.user.middleName "use }} carefully"}}',
    "use }} carefully"
  ),
  // math
  V("add", "{{add data.order.itemCount 2}}", "5"),
  // `assertIsNumber` only rejects NaN, so a numeric string passes through and
  // `add` concatenates. Confirmed on a real send.
  V("add-concatenates-strings", "{{add data.numberish 8}}", "428"),
  V("subtract", "{{subtract data.score 7}}", "80"),
  V("sub-alias", "{{sub data.score 7}}", "80"),
  V("multiply", "{{multiply data.order.itemCount 4}}", "12"),
  V("product-alias", "{{product data.order.itemCount 4}}", "12"),
  V("divide", "{{divide data.order.total 2}}", "64.25"),
  V("mod", "{{mod data.score 10}}", "7"),
  V("abs", "{{abs data.temperature}}", "7.6"),
  V("ceil", "{{ceil data.order.total}}", "129"),
  V("floor", "{{floor data.order.total}}", "128"),
  V("round", "{{round data.order.total}}", "129"),
  V("inc", "{{inc data.order.itemCount}}", "4"),
  V(
    "inc-with-index",
    "{{#each data.items}}{{inc @index}}. {{this.name}} {{/each}}",
    "1. Keyboard 2. Mouse "
  ),
  V("range-each", "{{#each (range 1 6 2)}}{{this}} {{/each}}", "1 3 5 "),
  V("helper-arg-is-helper", "{{round (divide data.order.total data.order.itemCount)}}", "43"),
  V(
    "math-chain-three-deep",
    "{{abs (subtract (multiply data.order.itemCount 2) data.score)}}",
    "81"
  ),
  // array / value
  // `filter` is a predicate, and its operators are uppercase words — `">"`
  // throws `Invalid Operator` at render and the message is undeliverable.
  V(
    "filter-predicate-true",
    '{{#if (filter "data" "data.score" "GREATER_THAN" 80)}}high{{else}}low{{/if}}',
    "high"
  ),
  V(
    "filter-predicate-false",
    '{{#if (filter "data" "data.attempts" "GREATER_THAN" 5)}}many{{else}}few{{/if}}',
    "few"
  ),
  V(
    "filter-contains",
    '{{#if (filter "data" "data.message" "CONTAINS" "shipped")}}yes{{else}}no{{/if}}',
    "yes"
  ),
  V("lookup-dynamic-key", "{{lookup data.profile data.field}}", "pro"),
  V("lookup-array-index", "{{lookup data.tags 1}}", "vip"),
  V("default-fallback", '{{default data.user.middleName "friend"}}', "friend"),
  V("default-passthrough", '{{default data.user.firstName "friend"}}', "ada"),
  V("json-parse", "{{#with (json-parse data.jsonBlob)}}{{plan}}/{{seats}}{{/with}}", "pro/12"),
  // `parse-string` unescapes escape sequences; it does NOT coerce to a number.
  // Confirmed on a real send: this concatenates to "428".
  V("parse-string-does-not-coerce", "{{add (parse-string data.numberish) 8}}", "428"),
  V("missing-path", "Hi {{data.user.middleName}}!", "Hi !"),
  V("missing-path-deep", "Plan: {{data.billing.plan.name}}.", "Plan: ."),
  V("triple-stache", "{{{data.html}}}", "<b>Bold</b>"),
  V("log-builtin", "{{log data.order.id}}Done", "Done"),
  // handlebars-intl, registered globally by the renderer (F-004). Outputs are
  // the send's: en-US, UTC.
  V(
    "formatNumber-currency",
    '[{{formatNumber data.order.total style="currency" currency="USD"}}]',
    "[$128.50]"
  ),
  V("formatNumber-percent", '{{formatNumber 0.25 style="percent"}}', "25%"),
  V("formatDate-iso", "{{formatDate data.order.shippedAt}}", "9/15/2026"),
  V(
    "formatDate-options",
    '{{formatDate data.order.shippedAt day="numeric" month="long" year="numeric"}}',
    "September 15, 2026"
  ),
  V("formatTime-epoch-ms", "{{formatTime 1790157600000}}", "9/23/2026"),
  V("formatMessage-arg", '{{formatMessage "Hi {name}" name=data.user.firstName}}', "Hi ada"),
  V(
    "formatMessage-plural",
    '{{formatMessage "{n, plural, one {# item} other {# items}}" n=data.order.itemCount}}',
    "3 items"
  ),
  V(
    "formatHTMLMessage-escapes",
    '{{formatHTMLMessage "<b>{v}</b>" v=data.html}}',
    "<b>&lt;b&gt;Bold&lt;/b&gt;</b>"
  ),
  V("intl-locales", '{{#intl locales="fr-FR"}}{{formatNumber 1234.5}}{{/intl}}', "1\u202f234,5"),
  // F-015: the send's `direction` check — "text-rtl" for RTL text, "" otherwise.
  V("text-direction-rtl", '[{{text-direction "مرحبا"}}]', "[text-rtl]"),
  V("text-direction-ltr", "[{{text-direction data.user.firstName}}]", "[]"),
  V("text-direction-missing", "[{{text-direction data.user.middleName}}]", "[]"),
  V("whitespace-control-if", "[{{~#if data.user.isAdmin~}}  T  {{~/if~}}]", "[T]"),
];

export const INVALID: InvalidCase[] = [
  X("invalid-unclosed-block", "{{#if data.user.isAdmin}}Admin"),
  X("invalid-mismatched-closer", "{{#if data.user.isAdmin}}Admin{{/unless}}"),
  X("invalid-stray-closer", "Admin{{/if}}"),
  X("invalid-unknown-helper", "{{frobnicate data.score}}"),
  X("invalid-unknown-block-helper", "{{#frobnicate data.score}}x{{/frobnicate}}"),
  X("invalid-condition-operator", '{{#if (condition data.score "=>" 80)}}x{{/if}}'),
  X("invalid-condition-single-eq", '{{#if (condition data.score "=" 87)}}x{{/if}}'),
  X("invalid-condition-missing-operand2", '{{#if (condition data.score ">=")}}x{{/if}}'),
  X("invalid-condition-one-operand", "{{#if (condition data.score)}}x{{/if}}"),
  X("invalid-unterminated-mustache", "Hello {{data.user.firstName"),
];
