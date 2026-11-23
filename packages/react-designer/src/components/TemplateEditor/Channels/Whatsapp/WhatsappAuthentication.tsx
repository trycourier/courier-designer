import { Input, Label, Switch } from "@/components/ui-kit";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { IPhoneFrame } from "../../IPhoneFrame";
import { VariableChipIcon } from "@/components/ui/VariableEditor/shared";

/** An authentication template's settings, as the host stores them. Unset fields are WhatsApp's defaults. */
export interface WhatsappAuthenticationSettings {
  /** On unless turned off. */
  securityRecommendation?: boolean;
  /** 1–90. */
  codeExpirationMinutes?: number;
  /** 30–900; unset is WhatsApp's 10 minutes. */
  messageSendTtlSeconds?: number;
}

export interface WhatsappAuthenticationProps {
  settings?: WhatsappAuthenticationSettings;
  /** Called with the whole settings object, only with values WhatsApp accepts. */
  onChange?: (settings: WhatsappAuthenticationSettings) => void;
  /** The variable the send fills the code from. */
  codeVariable?: string;
  readOnly?: boolean;
}

const EXPIRY = { min: 1, max: 90, initial: 10 };
const LIFETIME = { min: 30, max: 900, initial: 600 };

/** WhatsApp writes an authentication message itself; this is its English text for the chosen settings. */
export const WhatsappAuthenticationMessage = ({
  settings = {},
  codeVariable = "data.code",
}: Pick<WhatsappAuthenticationProps, "settings" | "codeVariable">) => {
  const security = settings.securityRecommendation ?? true;
  const expiry = settings.codeExpirationMinutes;

  return (
    <IPhoneFrame screenClassName="courier-whatsapp-screen">
      <div className="courier-whatsapp-message" data-testid="whatsapp-authentication-message">
        <div className="courier-whatsapp-editor courier-whatsapp-authentication-bubble">
          <p className="courier-m-0">
            {/* The editor's own read-only chip: WhatsApp fills the code in bold */}
            <span className="courier-variable-chip" title={`{{${codeVariable}}}`}>
              <span className="courier-flex-shrink-0 courier-flex courier-items-center">
                <VariableChipIcon />
              </span>
              <span>{codeVariable}</span>
            </span>{" "}
            is your verification code.
            {security && " For your security, do not share this code."}
          </p>
          {expiry !== undefined && (
            <p className="courier-whatsapp-authentication-footer">
              Expires in {expiry} {expiry === 1 ? "minute" : "minutes"}.
            </p>
          )}
        </div>
        <div className="courier-whatsapp-buttons">
          <div className="courier-whatsapp-button">
            <Copy size={14} aria-hidden />
            <span>Copy code</span>
          </div>
        </div>
      </div>
    </IPhoneFrame>
  );
};

/** A number field that reports only whole numbers within its range; anything else stays local, flagged. */
const BoundedNumber = ({
  value,
  min,
  max,
  unit,
  disabled,
  onValid,
  label,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  disabled?: boolean;
  onValid: (value: number) => void;
  label: string;
}) => {
  const [text, setText] = useState(String(value));

  useEffect(() => setText(String(value)), [value]);

  const parsed = Number(text);
  const valid = /^\d+$/.test(text) && parsed >= min && parsed <= max;

  return (
    <div className="courier-flex courier-flex-col courier-gap-1">
      <Input
        type="number"
        aria-label={label}
        min={min}
        max={max}
        value={text}
        disabled={disabled}
        endAdornment={<span className="courier-text-xs courier-text-muted-foreground">{unit}</span>}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          if (/^\d+$/.test(next) && Number(next) >= min && Number(next) <= max) {
            onValid(Number(next));
          }
        }}
      />
      {!valid && (
        <p className="courier-m-0 courier-text-xs courier-text-destructive">
          A whole number from {min} to {max}.
        </p>
      )}
    </div>
  );
};

const Setting = ({
  label,
  hint,
  checked,
  disabled,
  onCheckedChange,
  children,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: React.ReactNode;
}) => (
  <div className="courier-flex courier-flex-col courier-gap-2">
    <div className="courier-flex courier-items-center courier-justify-between courier-gap-2">
      <Label>{label}</Label>
      <Switch
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
    {hint && <p className="courier-m-0 courier-text-xs courier-text-muted-foreground">{hint}</p>}
    {checked && children}
  </div>
);

/** The right sidebar of an authentication template: WhatsApp writes the message, the customer picks its options. */
export const WhatsappAuthenticationSideBar = ({
  settings = {},
  onChange,
  readOnly,
}: WhatsappAuthenticationProps) => {
  const save = (next: WhatsappAuthenticationSettings) => onChange?.(next);
  const security = settings.securityRecommendation ?? true;
  const { codeExpirationMinutes: expiry, messageSendTtlSeconds: lifetime } = settings;
  const without = (key: keyof WhatsappAuthenticationSettings) => {
    const { [key]: _removed, ...rest } = settings;
    return rest;
  };

  return (
    <div className="courier-flex courier-flex-col courier-gap-5" data-sidebar-form>
      <p className="courier-m-0 courier-text-xs courier-text-muted-foreground">
        The text of an authentication message is written by WhatsApp and can&apos;t be edited. You
        choose only the options below.
      </p>
      <Setting
        label="Security sentence"
        checked={security}
        disabled={readOnly}
        onCheckedChange={(checked) => save({ ...settings, securityRecommendation: checked })}
      />
      <Setting
        label="Code expiry footer"
        checked={expiry !== undefined}
        disabled={readOnly}
        onCheckedChange={(checked) =>
          save(
            checked
              ? { ...settings, codeExpirationMinutes: EXPIRY.initial }
              : without("codeExpirationMinutes")
          )
        }
      >
        <BoundedNumber
          label="Code expiry in minutes"
          value={expiry ?? EXPIRY.initial}
          min={EXPIRY.min}
          max={EXPIRY.max}
          unit="min"
          disabled={readOnly}
          onValid={(value) => save({ ...settings, codeExpirationMinutes: value })}
        />
      </Setting>
      <Setting
        label="Message lifetime"
        hint="A message WhatsApp can't deliver within this time is dropped. Default 10 minutes."
        checked={lifetime !== undefined}
        disabled={readOnly}
        onCheckedChange={(checked) =>
          save(
            checked
              ? { ...settings, messageSendTtlSeconds: LIFETIME.initial }
              : without("messageSendTtlSeconds")
          )
        }
      >
        <BoundedNumber
          label="Message lifetime in seconds"
          value={lifetime ?? LIFETIME.initial}
          min={LIFETIME.min}
          max={LIFETIME.max}
          unit="sec"
          disabled={readOnly}
          onValid={(value) => save({ ...settings, messageSendTtlSeconds: value })}
        />
      </Setting>
    </div>
  );
};

/** In place of the WhatsApp editor for an authentication template: the message read-only, its options on the right. */
export const WhatsappAuthenticationLayout = (props: WhatsappAuthenticationProps) => (
  <div className="courier-flex courier-flex-1 courier-flex-row courier-overflow-hidden">
    <div className="courier-relative courier-flex courier-flex-col courier-flex-1 courier-py-8 courier-items-center">
      <WhatsappAuthenticationMessage settings={props.settings} codeVariable={props.codeVariable} />
    </div>
    {!props.readOnly && (
      <div className="courier-editor-sidebar courier-w-64 courier-flex-shrink-0">
        <div className="courier-p-4 courier-h-full">
          <WhatsappAuthenticationSideBar {...props} />
        </div>
      </div>
    )}
  </div>
);
