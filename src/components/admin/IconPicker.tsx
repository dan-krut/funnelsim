import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MousePointer2,
  Calculator,
  Zap,
  Cloud,
  Share2,
  Layout,
  Star,
  Shield,
  Users,
  Rocket,
  Target,
  Globe,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Available icons for the IconPicker.
 * Each icon has a name (matching Lucide icon name) and the icon component.
 */
const AVAILABLE_ICONS: { name: string; icon: LucideIcon }[] = [
  { name: "MousePointer2", icon: MousePointer2 },
  { name: "Calculator", icon: Calculator },
  { name: "Zap", icon: Zap },
  { name: "Cloud", icon: Cloud },
  { name: "Share2", icon: Share2 },
  { name: "Layout", icon: Layout },
  { name: "Star", icon: Star },
  { name: "Shield", icon: Shield },
  { name: "Users", icon: Users },
  { name: "Rocket", icon: Rocket },
  { name: "Target", icon: Target },
  { name: "Globe", icon: Globe },
];

/**
 * Map icon name to its component for easy lookup.
 */
const iconMap: Record<string, LucideIcon> = AVAILABLE_ICONS.reduce(
  (acc, { name, icon }) => {
    acc[name] = icon;
    return acc;
  },
  {} as Record<string, LucideIcon>
);

interface IconPickerProps {
  /** Currently selected icon name */
  value: string;
  /** Callback when icon selection changes */
  onChange: (icon: string) => void;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Optional label for the picker */
  label?: string;
}

/**
 * IconPicker component for selecting Lucide icons.
 * Displays a button with the current icon, which opens a popover with a grid of available icons.
 * Includes search/filter functionality.
 */
export const IconPicker = ({
  value,
  onChange,
  disabled = false,
  label,
}: IconPickerProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get the current icon component
  const CurrentIcon = iconMap[value] || Zap;

  // Filter icons based on search query
  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) {
      return AVAILABLE_ICONS;
    }
    const query = searchQuery.toLowerCase();
    return AVAILABLE_ICONS.filter((item) =>
      item.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="button"
            aria-label="Select icon"
            disabled={disabled}
            className="w-full justify-start gap-2"
          >
            <CurrentIcon className="h-4 w-4" />
            <span className="text-muted-foreground">{value || "Select icon"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="space-y-3">
            <Input
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
              aria-label="Search icons"
            />
            <div className="grid grid-cols-4 gap-2">
              <TooltipProvider delayDuration={200}>
                {filteredIcons.map(({ name, icon: Icon }) => (
                  <Tooltip key={name}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={value === name ? "default" : "outline"}
                        size="icon"
                        role="button"
                        aria-label={name}
                        className={cn(
                          "h-10 w-10",
                          value === name && "ring-2 ring-primary ring-offset-2"
                        )}
                        onClick={() => handleSelect(name)}
                      >
                        <Icon className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{name}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
            {filteredIcons.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No icons found matching "{searchQuery}"
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default IconPicker;

// Export the available icons list for use in other components
export { AVAILABLE_ICONS, iconMap };
