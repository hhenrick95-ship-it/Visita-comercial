import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface FormNavigationProps {
  currentSection: number;
  totalSections: number;
  isSubmitting: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function FormNavigation({ 
  currentSection, 
  totalSections, 
  isSubmitting, 
  onPrevious, 
  onNext,
  onSubmit
}: FormNavigationProps) {
  const isLastSection = currentSection >= totalSections - 1;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLastSection) {
      onSubmit();
    } else {
      onNext();
    }
  };

  return (
    <div className="flex justify-between gap-4">
      {currentSection > 0 && (
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPrevious();
          }}
          className="w-full"
        >
          Anterior
        </Button>
      )}
      
      <Button
        type="button"
        disabled={isSubmitting}
        onClick={handleClick}
        className="w-full"
      >
        {isLastSection ? (
          isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar Formulário"
          )
        ) : (
          "Próxima"
        )}
      </Button>
    </div>
  );
}
