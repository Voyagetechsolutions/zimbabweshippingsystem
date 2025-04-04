
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Terminal,
} from "lucide-react";

const BulkOperations = () => {
  const [selectedOperation, setSelectedOperation] = useState<string>("import");
  const [selectedEntity, setSelectedEntity] = useState<string>("shipments");
  const [selectedFormat, setSelectedFormat] = useState<string>("csv");
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: string[];
    count?: number;
  } | null>(null);
  
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleSubmit = async () => {
    if (selectedOperation === "import" && !file) {
      toast({
        title: "No file selected",
        description: "Please select a file to import",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      if (selectedOperation === "import") {
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // In a real app, you would process the file and send it to an API
        setResult({
          success: true,
          message: `Successfully imported data from ${file?.name}`,
          count: Math.floor(Math.random() * 100) + 1,
          details: [
            "All records processed successfully",
            "Updated existing records where needed",
            "No duplicates were found"
          ]
        });
      } else if (selectedOperation === "export") {
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // In a real app, you would generate and download the export file
        setResult({
          success: true,
          message: `Successfully prepared ${selectedEntity} export`,
          count: Math.floor(Math.random() * 500) + 50,
          details: [
            `${selectedEntity} data exported to ${selectedFormat.toUpperCase()} format`,
            "Ready for download"
          ]
        });
      }
    } catch (error) {
      console.error("Bulk operation error:", error);
      setResult({
        success: false,
        message: "An error occurred during processing",
        details: ["Check the format of your import file", "Make sure you have the correct permissions"]
      });
    } finally {
      setProcessing(false);
    }
  };

  const downloadExport = () => {
    // In a real app, this would download the actual file
    // For now, simulate download by showing a success message
    toast({
      title: "Download started",
      description: `${selectedEntity}.${selectedFormat} is being downloaded`,
    });
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Bulk Operations</CardTitle>
          <CardDescription>
            Import and export data in bulk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="import" onValueChange={value => {
            setSelectedOperation(value);
            resetForm();
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="import" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <span>Import</span>
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-6">
              <div className="mb-4">
                <Label htmlFor="entity-type">Select Data Type</Label>
                <Select
                  value={selectedEntity}
                  onValueChange={setSelectedEntity}
                >
                  <SelectTrigger id="entity-type" className="mt-1">
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shipments">Shipments</SelectItem>
                    <SelectItem value="users">Users</SelectItem>
                    <SelectItem value="payments">Payments</SelectItem>
                    <SelectItem value="addresses">Addresses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="mb-4">
                <Label htmlFor="format">File Format</Label>
                <Select
                  value={selectedFormat}
                  onValueChange={setSelectedFormat}
                >
                  <SelectTrigger id="format" className="mt-1">
                    <SelectValue placeholder="Select file format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <TabsContent value="import" className="mt-0">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="file-upload">Upload File</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        id="file-upload"
                        type="file"
                        accept={
                          selectedFormat === "csv" ? ".csv" :
                          selectedFormat === "json" ? ".json" :
                          ".xlsx"
                        }
                        onChange={handleFileChange}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline">
                            <FileText className="h-4 w-4 mr-2" />
                            Template
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Download Template</AlertDialogTitle>
                            <AlertDialogDescription>
                              Use our template files to ensure your import data is formatted correctly.
                              Choose the template for {selectedEntity} in {selectedFormat.toUpperCase()} format.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction>
                              Download Template
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    {file && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Selected file: {file.name} ({Math.round(file.size / 1024)} KB)
                      </p>
                    )}
                  </div>
                  
                  <div className="pt-2">
                    <Button 
                      onClick={handleSubmit}
                      className="bg-zim-green hover:bg-zim-green/90"
                      disabled={!file || processing}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Import Data
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="export" className="mt-0">
                <div className="space-y-6">
                  <div className="border rounded-md p-4">
                    <h3 className="text-sm font-medium mb-2">Export Options</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select which data to include in your export.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="shadow-none border">
                        <CardContent className="p-3">
                          <Label className="flex items-center space-x-2">
                            <Input type="checkbox" className="w-4 h-4" defaultChecked />
                            <span>Include archived items</span>
                          </Label>
                        </CardContent>
                      </Card>
                      
                      <Card className="shadow-none border">
                        <CardContent className="p-3">
                          <Label className="flex items-center space-x-2">
                            <Input type="checkbox" className="w-4 h-4" defaultChecked />
                            <span>Include metadata</span>
                          </Label>
                        </CardContent>
                      </Card>
                      
                      <Card className="shadow-none border">
                        <CardContent className="p-3">
                          <Label className="flex items-center space-x-2">
                            <Input type="checkbox" className="w-4 h-4" defaultChecked />
                            <span>Include timestamps</span>
                          </Label>
                        </CardContent>
                      </Card>
                      
                      <Card className="shadow-none border">
                        <CardContent className="p-3">
                          <Label className="flex items-center space-x-2">
                            <Input type="checkbox" className="w-4 h-4" />
                            <span>Raw data only</span>
                          </Label>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Button 
                      onClick={handleSubmit}
                      className="bg-zim-green hover:bg-zim-green/90"
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Preparing...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Generate Export
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </div>
            
            {/* Results Section */}
            {result && (
              <div className={`mt-8 border rounded-lg p-5 ${
                result.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start">
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
                  )}
                  <div>
                    <h3 className={`font-medium ${
                      result.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {result.message}
                    </h3>
                    
                    {result.count && (
                      <p className="text-sm mt-1">
                        {result.count} records processed
                      </p>
                    )}
                    
                    {result.details && result.details.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm">
                        {result.details.map((detail, i) => (
                          <li key={i} className="flex items-center">
                            <span className="mr-2">•</span> {detail}
                          </li>
                        ))}
                      </ul>
                    )}
                    
                    <div className="mt-4 flex gap-3">
                      {result.success && selectedOperation === "export" && (
                        <Button 
                          onClick={downloadExport}
                          className="bg-zim-green hover:bg-zim-green/90"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download File
                        </Button>
                      )}
                      
                      <Button variant="outline" onClick={resetForm}>
                        Reset
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkOperations;
