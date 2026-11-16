import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { calendarDateToLocal } from "@/lib/formDate";

export function SubmissionDatePicker({ label, value, onChange, from, to }: {
  label: string; value: string; onChange: (value: string) => void; from?: string; to?: string;
}) {
  return (
    <div className="space-y-2 min-w-0">
      <p className="text-sm font-medium">{label}</p>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full min-h-11 justify-start gap-2" aria-label={label}>
            <CalendarIcon className="h-4 w-4 shrink-0" />
            {value ? format(calendarDateToLocal(value), "dd/MM/yyyy") : "Todas as datas"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" locale={ptBR} selected={value ? calendarDateToLocal(value) : undefined}
            onSelect={date => onChange(date ? format(date, "yyyy-MM-dd") : "")}
            disabled={date => Boolean((from && format(date, "yyyy-MM-dd") < from) || (to && format(date, "yyyy-MM-dd") > to))}
            initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );
}