import { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";

// Type-safe function to get a Lucide icon by name
export function getIconByName(iconName: string): LucideIcon {
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  return icons[iconName] || LucideIcons.HelpCircle;
}

// Available icons for entity type selection
export const AVAILABLE_ICONS = [
  "Users", "User", "Building", "School", "Hospital", "Home", "Heart", "Leaf", 
  "Sun", "Droplet", "Zap", "Globe", "Map", "MapPin", "Briefcase", "Clipboard",
  "FileText", "Package", "Truck", "Car", "Activity", "Target", "Award", "Star",
  "Database", "Layers", "Box", "Archive", "Folder", "Settings", "Tool", "Wrench"
] as const;

// Color options for entity types
export const COLOR_OPTIONS = [
  { name: "Blue", value: "blue" },
  { name: "Green", value: "green" },
  { name: "Purple", value: "purple" },
  { name: "Orange", value: "orange" },
  { name: "Red", value: "red" },
  { name: "Teal", value: "teal" },
  { name: "Pink", value: "pink" },
  { name: "Yellow", value: "yellow" },
] as const;
