import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Product {
  id: string;
  type: "FE" | "OTO" | "Downsell";
  name: string;
  price: string;
  conversion: string;
  parentId?: string; // Which product this connects from
  connectionType?: "buy" | "no"; // Which handle it connects from
  level: number; // Hierarchy level for display
}

interface FunnelWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
  userId: string | undefined;
}

export const FunnelWizard = ({ open, onOpenChange, onBack, userId }: FunnelWizardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [funnelName, setFunnelName] = useState("");
  const [products, setProducts] = useState<Product[]>([
    { id: "1", type: "FE", name: "Frontend", price: "", conversion: "", level: 0 },
  ]);
  const [isCreating, setIsCreating] = useState(false);

  const addOTO = () => {
    // Find the last OTO or Frontend to connect from via "buy"
    const lastMainProduct = [...products]
      .reverse()
      .find((p) => p.type === "FE" || p.type === "OTO");
    
    const otoCount = products.filter((p) => p.type === "OTO").length;
    
    const newProduct: Product = {
      id: Date.now().toString(),
      type: "OTO",
      name: `OTO ${otoCount + 1}`,
      price: "",
      conversion: "",
      parentId: lastMainProduct?.id,
      connectionType: "buy",
      level: 0,
    };
    
    setProducts([...products, newProduct]);
  };

  const addDownsell = (parentId: string) => {
    const parent = products.find((p) => p.id === parentId);
    if (!parent) return;
    
    // Count all existing downsells globally
    const totalDownsells = products.filter((p) => p.type === "Downsell").length;
    
    const newProduct: Product = {
      id: Date.now().toString(),
      type: "Downsell",
      name: `Downsell ${totalDownsells + 1}`,
      price: "",
      conversion: "",
      parentId: parentId,
      connectionType: "no",
      level: parent.level + 1,
    };
    
    // Insert after parent
    const parentIndex = products.findIndex((p) => p.id === parentId);
    const newProducts = [...products];
    newProducts.splice(parentIndex + 1, 0, newProduct);
    setProducts(newProducts);
  };

  const removeProduct = (id: string) => {
    const productToRemove = products.find((p) => p.id === id);
    
    // Don't allow removing the Frontend product
    if (productToRemove?.type === "FE") {
      toast({
        title: "Cannot remove Frontend",
        description: "Every funnel must have a Frontend product",
        variant: "destructive",
      });
      return;
    }
    
    if (products.length > 1) {
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  const updateProduct = (id: string, field: keyof Product, value: string) => {
    setProducts(
      products.map((p) => {
        if (p.id === id) {
          return { ...p, [field]: value };
        }
        return p;
      })
    );
  };

  const createFunnel = async () => {
    // Validation
    if (!funnelName.trim()) {
      toast({
        title: "Funnel name required",
        description: "Please enter a name for your funnel",
        variant: "destructive",
      });
      return;
    }

    const invalidProducts = products.filter(
      (p) => !p.price || !p.conversion || parseFloat(p.price) <= 0 || parseFloat(p.conversion) <= 0
    );

    if (invalidProducts.length > 0) {
      toast({
        title: "Invalid product data",
        description: "Please enter valid price and conversion rate for all products",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Create nodes and edges with proper hierarchy
      const nodes = [];
      const edges = [];
      const nodeMap = new Map<string, string>(); // productId -> nodeId
      let yPosition = 100;
      const baseXPosition = 400;
      const spacing = 200;
      const levelXOffset = 150;

      // Create all nodes
      products.forEach((product, index) => {
        const nodeId = product.type === "FE" 
          ? "frontend" 
          : `${product.type.toLowerCase()}-${index}`;
        
        nodeMap.set(product.id, nodeId);
        
        const xPosition = baseXPosition + (product.level * levelXOffset);
        
        nodes.push({
          id: nodeId,
          type: "funnelStep",
          position: { x: xPosition, y: yPosition },
          data: {
            name: product.name,
            price: parseFloat(product.price),
            conversion: parseFloat(product.conversion),
            nodeType: product.type === "FE" ? "frontend" : product.type.toLowerCase(),
          },
        });
        
        yPosition += spacing;
      });

      // Create edges based on parent-child relationships
      products.forEach((product) => {
        if (!product.parentId) return; // Skip frontend (no parent)
        
        const sourceNodeId = nodeMap.get(product.parentId);
        const targetNodeId = nodeMap.get(product.id);
        
        if (!sourceNodeId || !targetNodeId) return;
        
        const sourceHandle = product.connectionType || "yes";
        const label = sourceHandle === "buy" ? "Buy" : "No Thanks";
        
        edges.push({
          id: `${sourceNodeId}-${targetNodeId}-${sourceHandle}`,
          source: sourceNodeId,
          target: targetNodeId,
          sourceHandle: sourceHandle === "buy" ? "yes" : "no",
          targetHandle: null,
          type: "custom",
          animated: true,
          label,
        });
      });

      // Connect downsells to the next OTO (both Buy and No Thanks)
      const otos = products.filter((p) => p.type === "OTO");
      const downsells = products.filter((p) => p.type === "Downsell");
      
      downsells.forEach((downsell) => {
        // Find the next OTO after this downsell
        const downsellIndex = products.findIndex((p) => p.id === downsell.id);
        const nextOTO = products.slice(downsellIndex + 1).find((p) => p.type === "OTO");
        
        if (nextOTO) {
          const downsellNodeId = nodeMap.get(downsell.id);
          const nextOTONodeId = nodeMap.get(nextOTO.id);
          
          if (downsellNodeId && nextOTONodeId) {
            // Buy edge
            edges.push({
              id: `${downsellNodeId}-${nextOTONodeId}-yes`,
              source: downsellNodeId,
              target: nextOTONodeId,
              sourceHandle: "yes",
              targetHandle: null,
              type: "custom",
              animated: true,
              label: "Buy",
            });
            
            // No Thanks edge
            edges.push({
              id: `${downsellNodeId}-${nextOTONodeId}-no`,
              source: downsellNodeId,
              target: nextOTONodeId,
              sourceHandle: "no",
              targetHandle: null,
              type: "custom",
              animated: true,
              label: "No Thanks",
            });
          }
        }
      });

      // Create the funnel in Supabase
      const { data, error } = await supabase
        .from("funnels")
        .insert({
          user_id: userId,
          name: funnelName,
          nodes,
          edges,
          traffic_sources: [],
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Funnel created!",
        description: "Your funnel has been generated successfully",
      });

      onOpenChange(false);
      navigate(`/funnel/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Error creating funnel",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <DialogTitle>Funnel Wizard</DialogTitle>
              <DialogDescription>
                Configure your funnel products and we'll build it for you
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6">
          <ScrollArea className="h-full">
            <div className="space-y-6 pb-4 pr-4">
              {/* Funnel Name */}
              <div className="space-y-2">
                <Label htmlFor="funnel-name">Funnel Name *</Label>
                <Input
                  id="funnel-name"
                  placeholder="e.g., My Product Launch Funnel"
                  value={funnelName}
                  onChange={(e) => setFunnelName(e.target.value)}
                />
              </div>

            {/* Products Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Products *</Label>
                <Button variant="outline" size="sm" onClick={addOTO}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add OTO
                </Button>
              </div>

              {products.map((product, index) => (
                <div
                  key={product.id}
                  style={{ marginLeft: `${product.level * 24}px` }}
                  className="border rounded-lg p-3 space-y-2 bg-muted/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {product.type === "FE" ? "Frontend" : product.type === "OTO" ? "OTO" : "Downsell"}
                      </span>
                      {product.connectionType && (
                        <span className="text-xs text-muted-foreground">
                          (from {product.connectionType === "buy" ? "Buy" : "No Thanks"})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {product.type !== "FE" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeProduct(product.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-[2fr_1fr_100px] gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`name-${product.id}`} className="text-xs">Name</Label>
                      <Input
                        id={`name-${product.id}`}
                        value={product.name}
                        onChange={(e) =>
                          updateProduct(product.id, "name", e.target.value)
                        }
                        placeholder="Product name"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`price-${product.id}`} className="text-xs">Price ($)</Label>
                      <Input
                        id={`price-${product.id}`}
                        type="number"
                        min="0"
                        max="1000000"
                        step="1"
                        value={product.price}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          if (value > 1000000) return;
                          updateProduct(product.id, "price", e.target.value);
                        }}
                        onInput={(e) => {
                          const input = e.target as HTMLInputElement;
                          const value = input.value.replace('.', '').replace('-', '');
                          if (value.length > 7) {
                            input.value = input.value.slice(0, -1);
                          }
                        }}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`conversion-${product.id}`} className="text-xs">Conv (%)</Label>
                      <Input
                        id={`conversion-${product.id}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={product.conversion}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.replace('.', '').length > 5) return;
                          const numValue = parseFloat(value) || 0;
                          if (numValue > 100) return;
                          updateProduct(product.id, "conversion", value);
                        }}
                        onInput={(e) => {
                          const input = e.target as HTMLInputElement;
                          const value = input.value;
                          if (value.replace('.', '').replace('-', '').length > 4) {
                            input.value = value.slice(0, -1);
                          }
                        }}
                        placeholder="0.0"
                      />
                    </div>
                  </div>
                  
                  {(product.type === "OTO" || product.type === "Downsell") && (
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addDownsell(product.id)}
                        className="w-full"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Downsell (from No Thanks)
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onBack} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={createFunnel} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Funnel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
