import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Image, FileText } from "lucide-react";

interface ExportMenuProps {
  exportFunctionsRef: React.RefObject<{
    exportToPNG: () => Promise<void>;
    exportToPDF: () => Promise<void>;
  } | null>;
}

export const ExportMenu = ({ exportFunctionsRef }: ExportMenuProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportAsImage = async () => {
    if (!exportFunctionsRef.current) return;
    setIsExporting(true);
    try {
      await exportFunctionsRef.current.exportToPNG();
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsPDF = async () => {
    if (!exportFunctionsRef.current) return;
    setIsExporting(true);
    try {
      await exportFunctionsRef.current.exportToPDF();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting} className="gap-2">
          <Download className="h-4 w-4" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsImage} className="gap-2 cursor-pointer">
          <Image className="h-4 w-4" />
          Export as Image (PNG)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsPDF} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
