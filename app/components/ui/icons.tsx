import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const defaults = {
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Icon({ size = 20, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...defaults} {...props}>
      {children}
    </svg>
  );
}

export function IconAssessment(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5l4 4h5a2 2 0 012 2v10a2 2 0 01-2 2z" />
    </Icon>
  );
}

export function IconHistory(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </Icon>
  );
}

export function IconDashboard(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 3v18h18M7 15V9m5 6V5m5 10v-4" />
    </Icon>
  );
}

export function IconAdmin(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 11a3 3 0 100-6 3 3 0 000 6zm-7 8a7 7 0 0114 0" />
    </Icon>
  );
}

export function IconProfile(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 20a7 7 0 0114 0M12 12a4 4 0 100-8 4 4 0 000 8z" />
    </Icon>
  );
}

export function IconLogin(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11 16l-4-4m0 0l4-4m-4 4h12" />
    </Icon>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 17l5-5m0 0l-5-5m5 5H9" />
    </Icon>
  );
}

export function IconSignUp(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14m-7-7h14" />
    </Icon>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Icon>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 18L18 6M6 6l12 12" />
    </Icon>
  );
}

export function IconChat(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 5h16v11H8l-4 4V5Z" />
      <path d="M8 10h8M8 13h5" />
    </Icon>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="7" y="2.5" width="10" height="19" rx="1.5" />
      <path d="M11 18.2h2" />
    </Icon>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M19 19l-4.3-4.3" />
    </Icon>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12l4 4L19 6" />
    </Icon>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14m-7-7h14" />
    </Icon>
  );
}

export function IconFolder(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </Icon>
  );
}

export function IconPill(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.5 8.5l7 7M9 3.5a5.5 5.5 0 017.8 7.8l-7 7A5.5 5.5 0 013 11.3l7-7z" />
    </Icon>
  );
}

export function IconShield(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
    </Icon>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M16 11a3 3 0 100-6 3 3 0 000 6zM8 11a3 3 0 100-6 3 3 0 000 6zM2 20a6 6 0 0112 0M14 20a5.5 5.5 0 0110 0" />
    </Icon>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </Icon>
  );
}

export function IconEmail(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </Icon>
  );
}

export function IconLock(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </Icon>
  );
}

export function IconUser(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20a7 7 0 0114 0" />
    </Icon>
  );
}

export function IconEye(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 4.2A10.7 10.7 0 0121 12c-.7 1.3-1.7 2.5-2.9 3.5M6.1 6.1C4.2 7.4 2.8 9.5 2 12c1.5 2.8 4.2 5 8 5 1.4 0 2.7-.3 3.9-.9" />
    </Icon>
  );
}

export function IconActivity(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </Icon>
  );
}

export function IconTrendUp(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </Icon>
  );
}

export function IconAlertTriangle(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3L2 20h20L12 3z" />
      <path d="M12 10v4M12 18h.01" />
    </Icon>
  );
}

export function IconMapPin(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21s-6-5.1-6-10a6 6 0 1112 0c0 4.9-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.5" />
    </Icon>
  );
}

export function IconClipboard(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h1a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2h1" />
    </Icon>
  );
}
