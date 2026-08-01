import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ComboboxProps {
  options: { value: string; label: string }[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  multiple?: boolean;
  values?: string[];
  onValuesChange?: (values: string[]) => void;
  /** Busca controlada (server-side). Quando definido, desliga o filtro local. */
  onSearchChange?: (search: string) => void;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Selecionar...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhum resultado encontrado.",
  className,
  multiple = false,
  values,
  onValuesChange,
  onSearchChange,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = !multiple ? options.find((option) => option.value === value) : undefined;
  const selectedValues = values ?? [];

  const isSelected = (v: string) =>
    multiple ? selectedValues.includes(v) : v === value;

  const triggerLabel = multiple
    ? selectedValues.length === 0
      ? placeholder
      : selectedValues.length === 1
      ? options.find((o) => o.value === selectedValues[0])?.label ?? selectedValues[0]
      : `${selectedValues.length} selecionados`
    : selectedOption
    ? selectedOption.label
    : value
    ? value
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between text-foreground", className)}
        >
          <span
            className={cn(
              "truncate",
              ((multiple && selectedValues.length === 0) || (!multiple && !value)) &&
                "text-muted-foreground"
            )}
          >
            {triggerLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-popover z-50" align="start">
        <Command shouldFilter={!onSearchChange}>
          <CommandInput placeholder={searchPlaceholder} onValueChange={onSearchChange} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    if (multiple) {
                      const exists = selectedValues.includes(option.value);
                      const next = exists
                        ? selectedValues.filter((v) => v !== option.value)
                        : [...selectedValues, option.value];
                      onValuesChange?.(next);
                    } else {
                      onValueChange?.(option.value === value ? "" : option.value);
                      setOpen(false);
                    }
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      isSelected(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
