"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const modes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: Monitor },
];
const subscribe = () => () => {};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const current =
    modes.find((mode) => mode.value === (mounted ? theme : "system")) ||
    modes[2];
  const Icon = current.icon;
  return (
    <Select
      value={current.value}
      onValueChange={(value) => value && setTheme(value)}
    >
      <SelectTrigger
        aria-label="Appearance"
        className="h-9 w-[106px] bg-background"
      >
        <SelectValue>
          <span className="flex items-center gap-2">
            <Icon className="size-4" />
            {current.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {modes.map(({ value, label, icon: ModeIcon }) => (
          <SelectItem key={value} value={value}>
            <ModeIcon className="size-4" />
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
