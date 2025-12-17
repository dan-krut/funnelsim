import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FunnelCanvas } from "@/components/FunnelCanvas";
import { ReactFlowProvider } from "reactflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Check, Plus, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { ExportMenu } from "@/components/ExportMenu";

const FunnelBuilder = () => {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [funnelData, setFunnelData] = useState<any>(null);
  const [loadingFunnel, setLoadingFunnel] = useState(true);
  const [funnelName, setFunnelName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  const addNodeRef = useRef<((type: "oto" | "downsell") => void) | null>(null);
  const exportFunctionsRef = useRef<{
    exportToPNG: () => Promise<void>;
    exportToPDF: () => Promise<void>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      loadFunnel();
    }
  }, [user, id]);

  const loadFunnel = async () => {
    setLoadingFunnel(true);
    const { data, error } = await supabase
      .from("funnels")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast({
        title: "Error loading funnel",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboard");
    } else {
      setFunnelData(data);
      setFunnelName(data.name || "Untitled Funnel");
      setLogoUrl(data.logo_url || null);
    }
    setLoadingFunnel(false);
  };

  const saveFunnelName = async () => {
    if (!id) return;
    
    setSaving(true);
    const { error } = await supabaseClient
      .from("funnels")
      .update({ name: funnelName })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error saving funnel name",
        description: error.message,
        variant: "destructive",
      });
    } else {
      updateFunnelName(funnelName);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const updateFunnelName = (name: string) => {
    setFunnelData((prev: any) => prev ? { ...prev, name } : prev);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingLogo(true);

    try {
      // Delete old logo if exists
      if (logoUrl) {
        const oldPath = logoUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('funnel-logos')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new logo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('funnel-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('funnel-logos')
        .getPublicUrl(filePath);

      // Update funnel with logo URL
      const { error: updateError } = await supabase
        .from('funnels')
        .update({ logo_url: publicUrl })
        .eq('id', id);

      if (updateError) throw updateError;

      setLogoUrl(publicUrl);
      toast({
        title: "Logo uploaded",
        description: "Your funnel logo has been updated",
      });
    } catch (error: any) {
      toast({
        title: "Error uploading logo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!logoUrl || !id || !user) return;

    try {
      const oldPath = logoUrl.split('/').pop();
      if (oldPath) {
        await supabase.storage
          .from('funnel-logos')
          .remove([`${user.id}/${oldPath}`]);
      }

      const { error } = await supabase
        .from('funnels')
        .update({ logo_url: null })
        .eq('id', id);

      if (error) throw error;

      setLogoUrl(null);
      toast({
        title: "Logo removed",
        description: "Your funnel logo has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Error removing logo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading || loadingFunnel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading funnel...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b bg-background/80 backdrop-blur-sm z-10">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Input
              value={funnelName}
              onChange={(e) => setFunnelName(e.target.value)}
              className="max-w-sm font-semibold"
              placeholder="Funnel Name"
            />
            <Button
              onClick={saveFunnelName}
              variant={saved ? "default" : "outline"}
              size="sm"
              disabled={saving}
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            {logoUrl ? (
              <div className="flex items-center gap-2">
                <img 
                  src={logoUrl} 
                  alt="Funnel logo" 
                  className="h-8 max-h-8 object-contain"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleRemoveLogo}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingLogo ? "Uploading..." : "Add Logo"}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => addNodeRef.current?.("oto")} size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add OTO
            </Button>
            <Button onClick={() => addNodeRef.current?.("downsell")} size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Downsell
            </Button>
            <ExportMenu exportFunctionsRef={exportFunctionsRef} />
          </div>
        </div>
      </header>
      <ReactFlowProvider>
        <FunnelCanvas
          funnelId={id}
          initialData={funnelData}
          onNameChange={updateFunnelName}
          canvasRef={canvasRef}
          addNodeRef={addNodeRef}
          exportFunctionsRef={exportFunctionsRef}
        />
      </ReactFlowProvider>
    </div>
  );
};

export default FunnelBuilder;
