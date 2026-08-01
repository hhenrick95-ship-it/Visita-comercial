import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DateTreeFilter } from "@/components/ui/date-tree-filter";
import { VisitFilters } from "@/hooks/useVisitFilters";

interface DashboardFiltersProps {
  filters: VisitFilters;
  availableDates: string[];
  availableClients: string[];
  availableVendors: string[];
  availableManagers: string[];
  onDateSelectionChange: (years: string[], months: string[]) => void;
  onClientChange: (value: string) => void;
  onVendorChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onManagerChange: (values: string[]) => void;
  onClearFilters: () => void;
}

export function DashboardFilters({
  filters,
  availableDates,
  availableClients,
  availableVendors,
  availableManagers,
  onDateSelectionChange,
  onClientChange,
  onVendorChange,
  onAddressChange,
  onManagerChange,
  onClearFilters,
}: DashboardFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
        <CardDescription>Refine a visualização dos dados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <DateTreeFilter
            availableDates={availableDates}
            selectedYears={filters.selectedYears}
            selectedMonths={filters.selectedMonths}
            onSelectionChange={onDateSelectionChange}
          />
          <div>
            <label className="text-sm font-medium mb-2 block">Gestor</label>
            <Combobox
              options={availableManagers.map(m => ({ value: m, label: m }))}
              multiple
              values={filters.filterManagers}
              onValuesChange={onManagerChange}
              placeholder="Selecione..."
              searchPlaceholder="Buscar gestor..."
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Cliente</label>
            <Combobox
              options={availableClients.map(c => ({ value: c, label: c }))}
              value={filters.filterClient}
              onValueChange={onClientChange}
              placeholder="Selecione..."
              searchPlaceholder="Buscar cliente..."
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Vendedor</label>
            <Combobox
              options={availableVendors.map(v => ({ value: v, label: v }))}
              value={filters.filterVendor}
              onValueChange={onVendorChange}
              placeholder="Selecione..."
              searchPlaceholder="Buscar vendedor..."
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Endereço</label>
            <Input
              placeholder="Buscar por endereço..."
              value={filters.filterAddress}
              onChange={(e) => onAddressChange(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={onClearFilters} variant="outline" className="w-full">
          Limpar Filtros
        </Button>
      </CardContent>
    </Card>
  );
}
