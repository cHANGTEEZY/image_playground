import type { ComponentType } from "react";
import {
  HomeIcon,
  UsersIcon,
  ProfileIcon,
  ImageIcon,
  CropIcon,
  EraserIcon,
  SourceCodeIcon,
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
    title: "Playground",
    icon: ImageIcon,
    to: "/playground",
    children: [
      {
        title: "Remove Background",
        icon: EraserIcon,
        to: "/playground/remove-background",
      },
      { title: "Crop", icon: CropIcon, to: "/playground/crop" },
      { title: "SVG Tools", icon: SourceCodeIcon, to: "/playground/svg" },
    ],
  },
  { title: "Users", icon: UsersIcon, to: "/users" },
  { title: "Profile", icon: ProfileIcon, to: "/profile" },
];
