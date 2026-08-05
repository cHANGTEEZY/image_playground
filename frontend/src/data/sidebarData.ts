import type { ComponentType } from "react";
import {
  CropIcon,
  EraserIcon,
  FileExportIcon,
  HomeIcon,
  InformationCircleIcon,
  ReplaceIcon,
  ResizeIcon,
  RotateIcon,
  SourceCodeIcon,
  StampIcon,
} from "@/components/icons";

type IconComponent = ComponentType<{ className?: string }>;

export interface SidebarItem {
  title: string;
  icon: IconComponent;
  to: string;
  children?: SidebarItem[];
}

export const sidebarItems: SidebarItem[] = [
  { title: "Home", icon: HomeIcon, to: "/" },
  {
    title: "Background",
    icon: EraserIcon,
    to: "/playground/background",
    children: [
      {
        title: "Remove Background",
        icon: EraserIcon,
        to: "/playground/remove-background",
      },
      {
        title: "Background Replace",
        icon: ReplaceIcon,
        to: "/playground/background-replace",
      },
    ],
  },
  {
    title: "Transform",
    icon: ResizeIcon,
    to: "/playground/transform",
    children: [
      { title: "Crop", icon: CropIcon, to: "/playground/crop" },
      { title: "Resize / Scale", icon: ResizeIcon, to: "/playground/resize" },
      { title: "Rotate / Flip", icon: RotateIcon, to: "/playground/rotate" },
    ],
  },
  {
    title: "Convert & Export",
    icon: FileExportIcon,
    to: "/playground/convert-export",
    children: [
      { title: "Convert & Compress", icon: FileExportIcon, to: "/playground/convert" },
      { title: "EXIF Viewer & Strip", icon: InformationCircleIcon, to: "/playground/exif" },
    ],
  },
  {
    title: "Enhance",
    icon: StampIcon,
    to: "/playground/enhance",
    children: [
      { title: "Watermark", icon: StampIcon, to: "/playground/watermark" },
      { title: "SVG Tools", icon: SourceCodeIcon, to: "/playground/svg" },
    ],
  },
];
