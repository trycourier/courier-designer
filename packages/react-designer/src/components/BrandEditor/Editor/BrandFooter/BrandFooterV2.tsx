import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MediumIcon,
  XIcon,
} from "@/components/ui-kit/Icon";
import { memo } from "react";

interface SocialLinks {
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  medium?: string;
  x?: string;
}

interface BrandFooterV2Props {
  unsubscribe?: boolean;
  preferences?: boolean;
  social?: SocialLinks;
  className?: string;
  style?: React.CSSProperties;
}

const ICON_COLOR = "#71717A";
const ICON_SIZE = 20;

const linkStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 400,
  lineHeight: "16px",
  letterSpacing: "-0.2px",
  color: ICON_COLOR,
  textDecoration: "underline",
  fontFamily: "Inter, sans-serif",
  whiteSpace: "nowrap",
};

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 12,
  backgroundColor: "rgba(0, 0, 0, 0.16)",
  flexShrink: 0,
};

function BrandFooterV2Component({
  unsubscribe = false,
  preferences = false,
  social,
  className,
  style,
}: BrandFooterV2Props) {
  const hasActions = unsubscribe || preferences;
  const socialEntries = social
    ? (
        [
          { key: "facebook", url: social.facebook, Icon: FacebookIcon },
          { key: "linkedin", url: social.linkedin, Icon: LinkedinIcon },
          { key: "instagram", url: social.instagram, Icon: InstagramIcon },
          { key: "medium", url: social.medium, Icon: MediumIcon },
          { key: "x", url: social.x, Icon: XIcon },
        ] as const
      ).filter(({ url }) => url)
    : [];
  const hasSocials = socialEntries.length > 0;

  if (!hasActions && !hasSocials) return null;

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "nowrap",
        ...style,
      }}
    >
      {hasActions && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {unsubscribe && <span style={linkStyle}>Unsubscribe</span>}
          {unsubscribe && preferences && <div style={dividerStyle} />}
          {preferences && <span style={linkStyle}>Manage Notification Preferences</span>}
        </div>
      )}
      {hasSocials && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {socialEntries.map(({ key, url, Icon }) => (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Icon width={ICON_SIZE} height={ICON_SIZE} color={ICON_COLOR} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export const BrandFooterV2 = memo(BrandFooterV2Component);
