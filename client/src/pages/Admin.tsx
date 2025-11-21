import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Download, CheckCircle, AlertCircle, Plus, Building2, Trash2, BarChart3, Pencil, X, Lock, Image as ImageIcon, Upload, Map } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { US_STATES } from "@shared/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Zod schema for company form with union validation and additional locations
const companyFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  description: z.string().optional(),
  services: z.string().optional(),
  coverageArea: z.string().optional(),
  tier: z.enum(["free", "verified", "featured", "premium"]).default("free"),
  isUnion: z.enum(["yes", "no"]).default("no"),
  unionName: z.string().optional(),
  additionalLocations: z.array(z.object({
    city: z.string().min(1, "City is required"),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  })).optional(),
}).refine(
  (data) => {
    // If isUnion is "yes", unionName must be provided
    if (data.isUnion === "yes" && (!data.unionName || data.unionName.trim() === "")) {
      return false;
    }
    return true;
  },
  {
    message: "Union name is required when company is marked as union",
    path: ["unionName"],
  }
);

type CompanyFormValues = z.infer<typeof companyFormSchema>;

// Zod schema for disposal site form
const disposalFormSchema = z.object({
  name: z.string().min(1, "Facility name is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  materialsAccepted: z.string().optional(),
  hours: z.string().optional(),
  tier: z.enum(["free", "verified", "featured", "premium"]).default("free"),
  additionalLocations: z.array(z.object({
    city: z.string().min(1, "City is required"),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  })).optional(),
});

type DisposalFormValues = z.infer<typeof disposalFormSchema>;

// Manage Section Component with Edit/Delete
function ManageSection() {
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [editingDisposal, setEditingDisposal] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{type: 'company' | 'disposal', id: number, name: string} | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [disposalSearch, setDisposalSearch] = useState("");
  const [companyStateFilter, setCompanyStateFilter] = useState<string>("all");
  const [disposalStateFilter, setDisposalStateFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: companies, isLoading: companiesLoading } = useQuery<Array<any>>({
    queryKey: ["/api/companies"],
  });
  
  const { data: disposalSites, isLoading: sitesLoading } = useQuery<Array<any>>({
    queryKey: ["/api/disposal-sites"],
  });

  // Helper function to extract state from address
  const getStateFromAddress = (address: string): string | null => {
    if (!address) return null;
    const stateMatch = US_STATES.find(state => {
      const regex = new RegExp(`\\b${state.code}\\b|\\b${state.name}\\b`, 'i');
      return regex.test(address);
    });
    return stateMatch?.code || null;
  };

  // Filter companies based on search and state
  const filteredCompanies = companies?.filter(company => {
    // State filter
    if (companyStateFilter !== "all") {
      const companyState = getStateFromAddress(company.address);
      if (companyState !== companyStateFilter) return false;
    }
    
    // Text search filter
    if (!companySearch) return true;
    const search = companySearch.toLowerCase();
    
    // Check main fields
    const mainFieldsMatch = (
      company.name?.toLowerCase().includes(search) ||
      company.address?.toLowerCase().includes(search) ||
      company.phone?.toLowerCase().includes(search) ||
      company.email?.toLowerCase().includes(search) ||
      company.tier?.toLowerCase().includes(search)
    );
    
    // Check additional locations - handle both string and array formats
    let additionalLocationsMatch = false;
    try {
      const locations = typeof company.additionalLocations === 'string' 
        ? JSON.parse(company.additionalLocations) 
        : company.additionalLocations;
      
      if (Array.isArray(locations)) {
        additionalLocationsMatch = locations.some((loc: any) => 
          loc.city?.toLowerCase().includes(search) ||
          loc.address?.toLowerCase().includes(search)
        );
      }
    } catch (e) {
      // If parsing fails, skip additional locations check
    }
    
    return mainFieldsMatch || additionalLocationsMatch;
  }) || [];

  // Filter disposal sites based on search and state
  const filteredDisposalSites = disposalSites?.filter(site => {
    // State filter
    if (disposalStateFilter !== "all") {
      const siteState = getStateFromAddress(site.address);
      if (siteState !== disposalStateFilter) return false;
    }
    
    // Text search filter
    if (!disposalSearch) return true;
    const search = disposalSearch.toLowerCase();
    
    // Check main fields
    const mainFieldsMatch = (
      site.name?.toLowerCase().includes(search) ||
      site.address?.toLowerCase().includes(search) ||
      site.phone?.toLowerCase().includes(search) ||
      site.email?.toLowerCase().includes(search) ||
      site.tier?.toLowerCase().includes(search)
    );
    
    // Check additional locations - handle both string and array formats
    let additionalLocationsMatch = false;
    try {
      const locations = typeof site.additionalLocations === 'string' 
        ? JSON.parse(site.additionalLocations) 
        : site.additionalLocations;
      
      if (Array.isArray(locations)) {
        additionalLocationsMatch = locations.some((loc: any) => 
          loc.city?.toLowerCase().includes(search) ||
          loc.address?.toLowerCase().includes(search)
        );
      }
    } catch (e) {
      // If parsing fails, skip additional locations check
    }
    
    return mainFieldsMatch || additionalLocationsMatch;
  }) || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'company' | 'disposal', id: number }) => {
      const endpoint = type === 'company' ? `/api/admin/companies/${id}` : `/api/admin/disposal-sites/${id}`;
      const res = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/disposal-sites"] });
      toast({
        title: "Deleted Successfully",
        description: `${variables.type === 'company' ? 'Company' : 'Disposal site'} has been removed.`,
      });
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete. Check your API key.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate({ type: deleteTarget.type, id: deleteTarget.id });
    }
  };

  return (
    <>
      <Tabs defaultValue="companies" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="companies">Companies ({companies?.length || 0})</TabsTrigger>
          <TabsTrigger value="disposal-sites">Disposal Sites ({disposalSites?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Companies</CardTitle>
              <CardDescription>View, edit, and delete hydro-vac companies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search companies by name, address, phone, email, or tier..."
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-companies"
                    />
                  </div>
                  <Select value={companyStateFilter} onValueChange={setCompanyStateFilter}>
                    <SelectTrigger className="w-48" data-testid="select-company-state">
                      <SelectValue placeholder="Filter by state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {US_STATES.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(companySearch || companyStateFilter !== "all") && (
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredCompanies.length} of {companies?.length || 0} companies
                    {companyStateFilter !== "all" && ` in ${US_STATES.find(s => s.code === companyStateFilter)?.name}`}
                  </p>
                )}
              </div>
              {companiesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : !companies || companies.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No companies yet. Add one using the "Add Company" tab.</p>
              ) : filteredCompanies.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No companies match your search.</p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredCompanies.map((company) => (
                    <div key={company.id} className="flex items-center justify-between gap-4 p-4 border rounded-lg hover-elevate" data-testid={`company-item-${company.id}`}>
                      <div className="flex-1">
                        <p className="font-medium">{company.name}</p>
                        <p className="text-sm text-muted-foreground">{company.address}</p>
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="capitalize">Tier: {company.tier}</span>
                          <span>ID: {company.id}</span>
                          {company.phone && <span>{company.phone}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCompany(company)}
                          data-testid={`button-edit-company-${company.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteTarget({ type: 'company', id: company.id, name: company.name })}
                          data-testid={`button-delete-company-${company.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disposal-sites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Disposal Sites</CardTitle>
              <CardDescription>View, edit, and delete disposal facilities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search disposal sites by name, address, phone, email, or tier..."
                      value={disposalSearch}
                      onChange={(e) => setDisposalSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-disposals"
                    />
                  </div>
                  <Select value={disposalStateFilter} onValueChange={setDisposalStateFilter}>
                    <SelectTrigger className="w-48" data-testid="select-disposal-state">
                      <SelectValue placeholder="Filter by state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {US_STATES.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(disposalSearch || disposalStateFilter !== "all") && (
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredDisposalSites.length} of {disposalSites?.length || 0} disposal sites
                    {disposalStateFilter !== "all" && ` in ${US_STATES.find(s => s.code === disposalStateFilter)?.name}`}
                  </p>
                )}
              </div>
              {sitesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : !disposalSites || disposalSites.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No disposal sites yet. Add one using the "Add Disposal Site" tab.</p>
              ) : filteredDisposalSites.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No disposal sites match your search.</p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredDisposalSites.map((site) => (
                    <div key={site.id} className="flex items-center justify-between gap-4 p-4 border rounded-lg hover-elevate" data-testid={`disposal-item-${site.id}`}>
                      <div className="flex-1">
                        <p className="font-medium">{site.name}</p>
                        <p className="text-sm text-muted-foreground">{site.address}</p>
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="capitalize">Tier: {site.tier}</span>
                          <span>ID: {site.id}</span>
                          {site.phone && <span>{site.phone}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingDisposal(site)}
                          data-testid={`button-edit-disposal-${site.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteTarget({ type: 'disposal', id: site.id, name: site.name })}
                          data-testid={`button-delete-disposal-${site.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all related data (analytics, landing pages, subscription links).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Company Dialog */}
      <EditCompanyDialog
        company={editingCompany}
        onClose={() => setEditingCompany(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
          setEditingCompany(null);
        }}
      />

      {/* Edit Disposal Dialog */}
      <EditDisposalDialog
        disposal={editingDisposal}
        onClose={() => setEditingDisposal(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/disposal-sites"] });
          setEditingDisposal(null);
        }}
      />
    </>
  );
}

// Edit Company Dialog Component
function EditCompanyDialog({ company, onClose, onSuccess }: any) {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState<string>(company?.logoUrl || "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    values: company ? {
      name: company.name || "",
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      description: company.description || "",
      services: company.services || "",
      coverageArea: company.coverageArea || "",
      tier: company.tier || "free",
      isUnion: company.isUnion ? "yes" : "no",
      unionName: company.unionName || "",
      additionalLocations: company.additionalLocations || [],
    } : undefined,
  });
  
  const unionValue = form.watch("isUnion");
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "additionalLocations"
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      setLogoUrl(data.imageUrl);
      toast({
        title: "Image Uploaded",
        description: "Logo has been uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data: CompanyFormValues) => {
      // Convert isUnion string to boolean for backend
      const payload = {
        ...data,
        isUnion: data.isUnion === "yes",
        logoUrl: logoUrl || null
      };
      
      console.log("[Frontend] Submitting company update:", payload);
      console.log("[Frontend] Additional locations:", payload.additionalLocations);
      console.log("[Frontend] Logo URL:", logoUrl);
      
      const res = await fetch(`/api/admin/companies/${company.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Updated Successfully",
        description: "Company information has been saved.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update company.",
        variant: "destructive",
      });
    },
  });

  if (!company) return null;

  return (
    <Dialog open={!!company} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Company</DialogTitle>
          <DialogDescription>Update company information</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field}) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tier</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="featured">Featured</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Company Logo / Truck Image</Label>
              <div className="flex items-center gap-4">
                {logoUrl && (
                  <div className="relative w-24 h-24 border rounded-md overflow-hidden">
                    <img src={logoUrl} alt="Company logo" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => setLogoUrl("")}
                      data-testid="button-remove-logo"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    data-testid="input-logo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    data-testid="button-upload-logo"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {logoUrl ? "Change Image" : "Upload Image"}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a company logo or truck photo (max 5MB)
                  </p>
                </div>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="isUnion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Union Status</FormLabel>
                  <FormControl>
                    <RadioGroup
                      className="flex flex-wrap gap-4"
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <RadioGroupItem value="yes" data-testid="radio-is-union-yes" />
                        </FormControl>
                        <FormLabel className="font-normal">Union</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <RadioGroupItem value="no" data-testid="radio-is-union-no" />
                        </FormControl>
                        <FormLabel className="font-normal">Non-union</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="unionName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Union Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={unionValue !== "yes"}
                      data-testid="input-union-name"
                    />
                  </FormControl>
                  <FormDescription>
                    Required when the company is marked as union.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Additional Locations</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => append({ city: "", address: "", lat: undefined, lng: undefined })}
                  data-testid="button-add-location"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add location
                </Button>
              </div>
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add satellite offices such as Gary, IN or Mishawaka, IN.
                </p>
              ) : null}
              {fields.map((fieldItem, index) => (
                <div key={fieldItem.id} className="grid gap-3 rounded-md border p-4">
                  <FormField
                    control={form.control}
                    name={`additionalLocations.${index}.city`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid={`input-location-city-${index}`} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`additionalLocations.${index}.address`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid={`input-location-address-${index}`} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name={`additionalLocations.${index}.lat`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              step="any"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              data-testid={`input-location-lat-${index}`} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`additionalLocations.${index}.lng`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              step="any"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              data-testid={`input-location-lng-${index}`} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(index)}
                    data-testid={`button-remove-location-${index}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove location
                  </Button>
                </div>
              ))}
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Disposal Dialog Component
function EditDisposalDialog({ disposal, onClose, onSuccess }: any) {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState<string>(disposal?.logoUrl || "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<DisposalFormValues>({
    resolver: zodResolver(disposalFormSchema),
    values: disposal ? {
      name: disposal.name || "",
      address: disposal.address || "",
      phone: disposal.phone || "",
      email: disposal.email || "",
      website: disposal.website || "",
      materialsAccepted: disposal.materialsAccepted || "",
      hours: disposal.hours || "",
      tier: disposal.tier || "free",
      additionalLocations: disposal.additionalLocations || [],
    } : undefined,
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      setLogoUrl(data.imageUrl);
      toast({
        title: "Image Uploaded",
        description: "Image has been uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data: DisposalFormValues) => {
      const payload = {
        ...data,
        logoUrl: logoUrl || null
      };
      
      const res = await fetch(`/api/admin/disposal-sites/${disposal.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Updated Successfully",
        description: "Disposal site information has been saved.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update disposal site.",
        variant: "destructive",
      });
    },
  });

  if (!disposal) return null;

  return (
    <Dialog open={!!disposal} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Disposal Site</DialogTitle>
          <DialogDescription>Update disposal site information</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tier</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="featured">Featured</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Facility Image / Logo</Label>
              <div className="flex items-center gap-4">
                {logoUrl && (
                  <div className="relative w-24 h-24 border rounded-md overflow-hidden">
                    <img src={logoUrl} alt="Facility image" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => setLogoUrl("")}
                      data-testid="button-remove-disposal-logo"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    data-testid="input-disposal-logo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    data-testid="button-upload-disposal-logo"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {logoUrl ? "Change Image" : "Upload Image"}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a facility photo or logo (max 5MB)
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Analytics Section Component
function AnalyticsSection() {
  const { data: analyticsData, isLoading } = useQuery<Array<{ companyId: number; companyName: string; totalClicks: number; tier: string }>>({
    queryKey: ["/api/analytics/summary"],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Company Engagement Analytics
        </CardTitle>
        <CardDescription>
          Track how many times users click on company information (phone, email, website)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !analyticsData || analyticsData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No analytics data yet. Engagement tracking will appear here as users interact with company listings.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Companies Tracked</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{analyticsData.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Clicks</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{analyticsData.reduce((sum, item) => sum + item.totalClicks, 0)}</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Average Clicks per Company</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {(analyticsData.reduce((sum, item) => sum + item.totalClicks, 0) / analyticsData.length).toFixed(1)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Company Rankings */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Top Performing Companies</h3>
              <div className="space-y-2">
                {analyticsData.map((company, index) => (
                  <div
                    key={company.companyId}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{company.companyName}</p>
                        <p className="text-sm text-muted-foreground capitalize">{company.tier} tier</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{company.totalClicks}</p>
                      <p className="text-xs text-muted-foreground">clicks</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Use this data to sell subscriptions!</AlertTitle>
              <AlertDescription>
                Show companies their engagement numbers to demonstrate value. Companies with higher clicks are getting more leads. 
                Use this to upsell free listings to paid tiers.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Add Company Form Component
function AddCompanyForm() {
  const [apiKey, setApiKey] = useState("");
  const [locations, setLocations] = useState<Array<{city: string; address?: string}>>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      description: "",
      services: "",
      coverageArea: "",
      tier: "free",
      isUnion: "no",
      unionName: "",
      additionalLocations: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CompanyFormValues) => {
      const response = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-api-key': apiKey
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create company');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "Company Created",
        description: "The company has been added successfully.",
      });
      form.reset();
      setLocations([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CompanyFormValues) => {
    data.additionalLocations = locations.length > 0 ? locations : undefined;
    createMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Company</CardTitle>
        <CardDescription>Create a new hydro-vac company listing</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-company-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-website" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription Tier</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-tier">
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="featured">Featured</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4">
              <Label className="mb-2 block">Admin API Key *</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter admin API key"
                data-testid="input-api-key"
              />
            </div>

            <Button 
              type="submit" 
              disabled={createMutation.isPending || !apiKey}
              data-testid="button-submit"
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Company
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Add Disposal Site Form Component
function AddDisposalSiteForm() {
  const [apiKey, setApiKey] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<DisposalFormValues>({
    resolver: zodResolver(disposalFormSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      materialsAccepted: "",
      hours: "",
      tier: "free",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DisposalFormValues) => {
      const response = await fetch('/api/admin/disposal-sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-api-key': apiKey
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create disposal site');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/disposal-sites"] });
      toast({
        title: "Disposal Site Created",
        description: "The disposal site has been added successfully.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DisposalFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Disposal Site</CardTitle>
        <CardDescription>Create a new disposal facility listing</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility Name *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-facility-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription Tier</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-tier">
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="featured">Featured</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4">
              <Label className="mb-2 block">Admin API Key *</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter admin API key"
                data-testid="input-api-key"
              />
            </div>

            <Button 
              type="submit" 
              disabled={createMutation.isPending || !apiKey}
              data-testid="button-submit"
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Disposal Site
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Reusable Image Upload Field Component
function ImageUploadField({ 
  value, 
  onChange, 
  onRemove,
  label = "Background Image"
}: { 
  value: string | null; 
  onChange: (file: File) => void;
  onRemove: () => void;
  label?: string;
}) {
  const [preview, setPreview] = useState<string | null>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync preview with external value prop changes
  useEffect(() => {
    setPreview(value);
    // Clear file input when value changes externally
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [value]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      onChange(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-4">
        {preview && (
          <div className="relative group">
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-48 object-cover rounded-md border"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleRemove}
              data-testid="button-remove-image"
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            data-testid="input-image-upload"
          />
          {!preview && <ImageIcon className="h-5 w-5 text-muted-foreground" />}
        </div>
        <p className="text-sm text-muted-foreground">
          Upload a custom image (max 5MB). Recommended: 1920x600px
        </p>
      </div>
    </div>
  );
}

// Import Data Section - Bulk import from Google Places API
function ImportDataSection() {
  const [apiKey, setApiKey] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState({
    state: "",
    type: "company" as "company" | "disposal",
    query: "hydro excavation service",
  });
  const [results, setResults] = useState<{
    imported: Array<{ name: string; address?: string }>;
    skipped: Array<{ name: string; reason: string }>;
    failed: Array<{ name: string; reason: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async () => {
      const location = `${formData.state}, USA`;
      const res = await fetch('/api/import/search-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-api-key': apiKey,
        },
        body: JSON.stringify({
          query: formData.query,
          location,
          type: formData.type,
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Import failed');
      }

      return res.json();
    },
    onSuccess: (data) => {
      setResults(data);
      setError(null);
      
      // Invalidate appropriate cache
      if (formData.type === "company") {
        queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/disposal-sites"] });
      }

      toast({
        title: "Import Complete",
        description: `Imported ${data.imported.length} items, skipped ${data.skipped.length}, failed ${data.failed.length}`,
      });
    },
    onError: (err: Error) => {
      setError(err.message);
      toast({
        title: "Import Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !formData.state || !formData.query) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmImport = () => {
    setShowConfirmDialog(false);
    setResults(null);
    setError(null);
    importMutation.mutate();
  };

  // Update default query when type changes
  useEffect(() => {
    if (formData.type === "company") {
      setFormData(prev => ({ ...prev, query: "hydro excavation service" }));
    } else {
      setFormData(prev => ({ ...prev, query: "hydrovac disposal facility" }));
    }
  }, [formData.type]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from Google Places</CardTitle>
        <CardDescription>
          Bulk import companies or disposal sites from Google Places API
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* State Selector */}
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
              >
                <SelectTrigger id="state" data-testid="select-state">
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state: { code: string; name: string }) => (
                    <SelectItem key={state.code} value={state.name}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select which state to search in
              </p>
            </div>

            {/* Type Selector */}
            <div className="space-y-2">
              <Label>Type *</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value: "company" | "disposal") =>
                  setFormData(prev => ({ ...prev, type: value }))
                }
                data-testid="radio-type"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="company" id="type-company" />
                  <Label htmlFor="type-company" className="font-normal cursor-pointer">
                    Companies
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="disposal" id="type-disposal" />
                  <Label htmlFor="type-disposal" className="font-normal cursor-pointer">
                    Disposal Sites
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-muted-foreground">
                What to import
              </p>
            </div>
          </div>

          {/* Search Query */}
          <div className="space-y-2">
            <Label htmlFor="query">Search Query *</Label>
            <Input
              id="query"
              value={formData.query}
              onChange={(e) => setFormData(prev => ({ ...prev, query: e.target.value }))}
              placeholder="e.g., hydro excavation service"
              data-testid="input-query"
            />
            <p className="text-sm text-muted-foreground">
              What to search for on Google Places (query auto-fills based on type)
            </p>
          </div>

          {/* Admin API Key */}
          <div className="space-y-2">
            <Label htmlFor="import-api-key">Admin API Key *</Label>
            <Input
              id="import-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter admin API key"
              data-testid="input-api-key"
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Import Information</AlertTitle>
            <AlertDescription>
              Imports may take 30-60 seconds. Up to 20 results will be imported per search.
              Duplicates will be automatically skipped.
            </AlertDescription>
          </Alert>

          <Button
            type="submit"
            disabled={importMutation.isPending || !apiKey || !formData.state}
            data-testid="button-import"
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Import Data
              </>
            )}
          </Button>
        </form>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Import Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results Display */}
        {results && (
          <div className="mt-8 space-y-6">
            <h3 className="text-lg font-semibold">Import Results</h3>
            
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Imported
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-2xl font-bold">{results.imported.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Skipped
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-2xl font-bold">{results.skipped.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Failed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <X className="h-5 w-5 text-red-600" />
                    <span className="text-2xl font-bold">{results.failed.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Lists */}
            <div className="space-y-4">
              {results.imported.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge variant="default" data-testid="badge-imported">Success</Badge>
                    Imported Items
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.imported.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 border rounded-md bg-green-50 dark:bg-green-950"
                        data-testid={`imported-item-${idx}`}
                      >
                        <p className="font-medium">{item.name}</p>
                        {item.address && (
                          <p className="text-sm text-muted-foreground">{item.address}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.skipped.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge variant="secondary" data-testid="badge-skipped">Skipped</Badge>
                    Skipped Items
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.skipped.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 border rounded-md bg-yellow-50 dark:bg-yellow-950"
                        data-testid={`skipped-item-${idx}`}
                      >
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.failed.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge variant="destructive" data-testid="badge-failed">Failed</Badge>
                    Failed Items
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.failed.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 border rounded-md bg-red-50 dark:bg-red-950"
                        data-testid={`failed-item-${idx}`}
                      >
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Import</AlertDialogTitle>
            <AlertDialogDescription>
              This will import up to 20 {formData.type === "company" ? "companies" : "disposal sites"} from Google Places API for {formData.state}.
              <br /><br />
              The search query is: <strong>"{formData.query}"</strong>
              <br /><br />
              Duplicates will be automatically skipped. This operation may take 30-60 seconds.
              <br /><br />
              Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-import">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport} data-testid="button-confirm-import">
              Yes, Import Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// State Landing Pages Management Section
function StateLandingPagesSection() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('admin_api_key') || "");
  const [editingPage, setEditingPage] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Save API key to localStorage whenever it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('admin_api_key', apiKey);
    }
  }, [apiKey]);

  const { data: pages, isLoading } = useQuery<Array<any>>({
    queryKey: ["/api/state-landing-pages"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any; imageFile: File | null; apiKey: string }) => {
      console.log('🟢 [MUTATION] Starting mutation with:', {
        hasImageFile: !!data.imageFile,
        apiKeyLength: data.apiKey?.length || 0,
        apiKeyPreview: data.apiKey?.substring(0, 4) + '...'
      });
      
      // First upload image if there's a new one
      let imageUrl = data.updates.backgroundImageUrl;
      
      if (data.imageFile) {
        console.log('🟢 [MUTATION] Uploading image file...');
        const formData = new FormData();
        formData.append('image', data.imageFile);
        
        console.log('🟢 [MUTATION] Sending fetch to /api/upload-image');
        const uploadRes = await fetch('/api/upload-image', {
          method: 'POST',
          headers: {
            'x-admin-api-key': data.apiKey,
          },
          body: formData,
          credentials: 'include',
        });
        
        console.log('🟢 [MUTATION] Upload response status:', uploadRes.status);
        
        if (!uploadRes.ok) {
          const contentType = uploadRes.headers.get('content-type');
          let errorMessage = `Upload failed (Status: ${uploadRes.status})`;
          
          try {
            if (contentType?.includes('application/json')) {
              const error = await uploadRes.json();
              errorMessage = error.error || errorMessage;
            } else {
              const text = await uploadRes.text();
              errorMessage = text || errorMessage;
            }
          } catch (e) {
            console.error('Failed to parse error response:', e);
          }
          
          console.error('🔴 [MUTATION] Upload failed:', errorMessage);
          throw new Error(errorMessage);
        }
        
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.imageUrl;
        console.log('🟢 [MUTATION] Upload successful, imageUrl:', imageUrl);
      }

      // Then update the state landing page
      console.log('🟢 [MUTATION] Updating state landing page...');
      const res = await fetch(`/api/admin/state-landing-pages/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-api-key': data.apiKey,
        },
        body: JSON.stringify({ ...data.updates, backgroundImageUrl: imageUrl }),
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update state landing page');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/state-landing-pages"] });
      setEditingPage(null);
      setImageFile(null);
      toast({
        title: "Success",
        description: "State landing page updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (page: any) => {
    setEditingPage(page);
    setImageFile(null);
  };

  const handleCloseDialog = () => {
    setEditingPage(null);
    setImageFile(null);
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("🔵 [FRONTEND] Form submitted");
    console.log("🔵 [FRONTEND] editingPage:", !!editingPage);
    console.log("🔵 [FRONTEND] imageFile:", !!imageFile);
    console.log("🔵 [FRONTEND] apiKey:", !!apiKey);
    
    if (!editingPage) {
      console.log("🔴 [FRONTEND] ERROR: No editing page");
      return;
    }
    
    if (!apiKey) {
      console.log("🔴 [FRONTEND] ERROR: No API key provided");
      alert("Please enter your Admin API Key");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const manualImageUrl = formData.get('backgroundImageUrl') as string;
    const updates = {
      headline: formData.get('headline') as string,
      subheadline: formData.get('subheadline') as string,
      ctaText: formData.get('ctaText') as string,
      backgroundImageUrl: manualImageUrl || editingPage.backgroundImageUrl,
    };

    console.log("🔵 [FRONTEND] Calling mutation with:", { 
      id: editingPage.id, 
      hasImageFile: !!imageFile,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey.length,
      apiKeyPreview: apiKey.substring(0, 4) + '...' // First 4 chars only for security
    });

    if (!apiKey || apiKey.length === 0) {
      console.error("🔴 [FRONTEND] CRITICAL: API key is empty!");
      toast({
        title: "Error",
        description: "Admin API Key is required. Please enter your API key.",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({ 
      id: editingPage.id, 
      updates,
      imageFile: imageFile,
      apiKey: apiKey,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>State Landing Pages</CardTitle>
        <CardDescription>
          Manage hero images and content for state-specific landing pages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pages?.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
            >
              <div className="flex items-center gap-4">
                {page.backgroundImageUrl && (
                  <img
                    src={page.backgroundImageUrl}
                    alt={page.stateName}
                    className="w-24 h-16 object-cover rounded"
                  />
                )}
                <div>
                  <h3 className="font-semibold">
                    {page.stateName} ({page.stateCode})
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {page.headline}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(page)}
                data-testid={`button-edit-state-${page.stateCode}`}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingPage} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Edit {editingPage?.stateName} Landing Page
              </DialogTitle>
              <DialogDescription>
                Update the hero image and content for this state's landing page
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdate} className="space-y-4">
              <ImageUploadField
                value={editingPage?.backgroundImageUrl || null}
                onChange={(file) => setImageFile(file)}
                onRemove={() => setImageFile(null)}
                label="Hero Background Image (Upload File)"
              />

              <div className="space-y-2">
                <Label htmlFor="backgroundImageUrl">OR Enter Image URL Manually</Label>
                <Input
                  id="backgroundImageUrl"
                  name="backgroundImageUrl"
                  defaultValue={editingPage?.backgroundImageUrl || ''}
                  placeholder="/uploads/indiana-hero.jpeg"
                  data-testid="input-background-image-url"
                />
                <p className="text-sm text-muted-foreground">
                  If you already uploaded an image, enter its path here (e.g., /uploads/filename.jpg)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  name="headline"
                  defaultValue={editingPage?.headline}
                  placeholder="e.g., Indiana's Preferred Hydro Excavation Company"
                  data-testid="input-headline"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subheadline">Subheadline</Label>
                <Textarea
                  id="subheadline"
                  name="subheadline"
                  defaultValue={editingPage?.subheadline}
                  placeholder="Optional additional description"
                  rows={3}
                  data-testid="input-subheadline"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ctaText">Call-to-Action Button Text</Label>
                <Input
                  id="ctaText"
                  name="ctaText"
                  defaultValue={editingPage?.ctaText}
                  placeholder="e.g., Contact Us Today"
                  data-testid="input-cta-text"
                />
              </div>

              <div className="border-t pt-4">
                <Label className="mb-2 block">Admin API Key *</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter admin API key"
                  data-testid="input-api-key"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={(e) => {
                    console.log("🟣 [BUTTON CLICK] Save button was clicked!");
                    alert("Save button clicked! Check console for details.");
                    const form = e.currentTarget.closest('form');
                    if (form) {
                      const fakeEvent = new Event('submit', { bubbles: true, cancelable: true });
                      form.dispatchEvent(fakeEvent);
                      handleUpdate(fakeEvent as any);
                    }
                  }}
                  disabled={updateMutation.isPending || !apiKey}
                  data-testid="button-save"
                >
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Admin Dashboard Content (shown only when authenticated)
function AdminDashboard() {
  const { toast } = useToast();
  
  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/admin/logout", {}, { requireAuth: true });
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your HydroVacFinder platform
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
          Logout
        </Button>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="manage" data-testid="tab-manage">
            <Pencil className="h-4 w-4 mr-2" />
            Manage
          </TabsTrigger>
          <TabsTrigger value="state-pages" data-testid="tab-state-pages">
            <Map className="h-4 w-4 mr-2" />
            State Pages
          </TabsTrigger>
          <TabsTrigger value="import-data" data-testid="tab-import-data">
            <Download className="h-4 w-4 mr-2" />
            Import Data
          </TabsTrigger>
          <TabsTrigger value="add-company" data-testid="tab-add-company">
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </TabsTrigger>
          <TabsTrigger value="add-disposal" data-testid="tab-add-disposal">
            <Building2 className="h-4 w-4 mr-2" />
            Add Disposal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsSection />
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <ManageSection />
        </TabsContent>

        <TabsContent value="state-pages" className="space-y-6">
          <StateLandingPagesSection />
        </TabsContent>

        <TabsContent value="import-data" className="space-y-6">
          <ImportDataSection />
        </TabsContent>

        <TabsContent value="add-company" className="space-y-6">
          <AddCompanyForm />
        </TabsContent>

        <TabsContent value="add-disposal" className="space-y-6">
          <AddDisposalSiteForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Admin Login Screen
function AdminLogin({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await apiRequest("POST", "/api/admin/login", { password });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      
      onLoginSuccess();
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Access</CardTitle>
          <CardDescription>
            Enter your admin password to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                disabled={loading}
                data-testid="input-admin-password"
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !password}
              data-testid="button-login"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Admin Component with Authentication Gate
export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/check");
        const data = await res.json();
        setIsAuthenticated(data.authenticated);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }
  
  // Show admin dashboard if authenticated
  return <AdminDashboard />;
}
