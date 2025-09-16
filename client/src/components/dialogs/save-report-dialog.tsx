import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface SaveReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, description: string) => Promise<void>;
  isLoading?: boolean;
  defaultName?: string;
  defaultDescription?: string;
}

export function SaveReportDialog({
  open,
  onOpenChange,
  onSave,
  isLoading = false,
  defaultName = "",
  defaultDescription = "",
}: SaveReportDialogProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Report name required",
        description: "Please enter a name for your report",
        variant: "destructive",
      });
      return;
    }

    try {
      await onSave(name.trim(), description.trim());
      setName("");
      setDescription("");
      onOpenChange(false);
      
      toast({
        title: "Report saved",
        description: `Report "${name}" has been saved successfully`,
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      if (!newOpen) {
        setName(defaultName);
        setDescription(defaultDescription);
      }
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-white border border-gray-200 shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Save className="h-5 w-5" />
            <span>Save Report</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-name">Report Name</Label>
            <Input
              id="report-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter report name..."
              disabled={isLoading}
              data-testid="input-report-name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="report-description">Description (Optional)</Label>
            <Textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter report description..."
              rows={3}
              disabled={isLoading}
              data-testid="input-report-description"
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            data-testid="button-cancel-save"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading || !name.trim()}
            data-testid="button-save-report"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}