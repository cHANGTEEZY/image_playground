import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon as HomeHugeIcon,
  DashboardSquare01Icon as DashboardHugeIcon,
  Shield01Icon as ShieldHugeIcon,
  SettingsIcon as SettingsHugeIcon,
  Image01Icon as ImageHugeIcon,
  CropIcon as CropHugeIcon,
  EraserIcon as EraserHugeIcon,
  SourceCodeIcon as SourceCodeHugeIcon,
  Resize01Icon as ResizeHugeIcon,
  Rotate01Icon as RotateHugeIcon,
  FileExportIcon as FileExportHugeIcon,
  InformationCircleIcon as InformationCircleHugeIcon,
  Stamp01Icon as StampHugeIcon,
  ReplaceIcon as ReplaceHugeIcon,
} from "@hugeicons/core-free-icons";
import type { SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "strokeWidth"> & {
  strokeWidth?: number;
};

export function HomeIcon(props: IconProps) {
  return <HugeiconsIcon icon={HomeHugeIcon} {...props} />;
}

export function DashboardIcon(props: IconProps) {
  return <HugeiconsIcon icon={DashboardHugeIcon} {...props} />;
}

export function ShieldIcon(props: IconProps) {
  return <HugeiconsIcon icon={ShieldHugeIcon} {...props} />;
}

export function SettingsIcon(props: IconProps) {
  return <HugeiconsIcon icon={SettingsHugeIcon} {...props} />;
}

export function ImageIcon(props: IconProps) {
  return <HugeiconsIcon icon={ImageHugeIcon} {...props} />;
}

export function CropIcon(props: IconProps) {
  return <HugeiconsIcon icon={CropHugeIcon} {...props} />;
}

export function EraserIcon(props: IconProps) {
  return <HugeiconsIcon icon={EraserHugeIcon} {...props} />;
}

export function SourceCodeIcon(props: IconProps) {
  return <HugeiconsIcon icon={SourceCodeHugeIcon} {...props} />;
}

export function ResizeIcon(props: IconProps) {
  return <HugeiconsIcon icon={ResizeHugeIcon} {...props} />;
}

export function RotateIcon(props: IconProps) {
  return <HugeiconsIcon icon={RotateHugeIcon} {...props} />;
}

export function FileExportIcon(props: IconProps) {
  return <HugeiconsIcon icon={FileExportHugeIcon} {...props} />;
}

export function InformationCircleIcon(props: IconProps) {
  return <HugeiconsIcon icon={InformationCircleHugeIcon} {...props} />;
}

export function StampIcon(props: IconProps) {
  return <HugeiconsIcon icon={StampHugeIcon} {...props} />;
}

export function ReplaceIcon(props: IconProps) {
  return <HugeiconsIcon icon={ReplaceHugeIcon} {...props} />;
}
