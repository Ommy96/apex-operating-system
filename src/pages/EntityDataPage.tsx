import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Trash2, ArrowLeft, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { useEntityTypes } from "@/hooks/useEntityTypes";
import { useEntities, Entity, EntityFormData } from "@/hooks/useEntities";
import { EntityForm } from "@/components/EntityForm";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import { getIconByName } from "@/lib/iconUtils";
import * as XLSX from 'xlsx';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function EntityDataPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const { entityTypes, isLoading: isLoadingTypes } = useEntityTypes();
  const entityType = entityTypes.find(et => et.slug === slug);
  
  const { 
    entities, 
    stats,
    isLoading: isLoadingEntities, 
    createEntity, 
    updateEntity, 
    deleteEntity,
    isCreating,
    isUpdating,
    isDeleting,
  } = useEntities(entityType?.id);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Entity | null>(null);

  const filteredEntities = useMemo(() => {
    return entities.filter(entity => {
      const matchesSearch = entity.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Object.values(entity.data).some(v => 
          String(v).toLowerCase().includes(searchTerm.toLowerCase())
        );
      const matchesStatus = statusFilter === "all" || entity.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [entities, searchTerm, statusFilter]);

  const handleSubmit = (data: EntityFormData) => {
    if (editingEntity) {
      updateEntity({ id: editingEntity.id, data }, {
        onSuccess: () => {
          setIsFormOpen(false);
          setEditingEntity(null);
        },
      });
    } else {
      createEntity(data, {
        onSuccess: () => {
          setIsFormOpen(false);
        },
      });
    }
  };

  const handleEdit = (entity: Entity) => {
    setEditingEntity(entity);
    setIsFormOpen(true);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteEntity(deleteTarget.id, {
        onSuccess: () => setDeleteTarget(null),
      });
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingEntity(null);
  };

  const handleExport = () => {
    if (!entityType) return;
    
    const exportData = filteredEntities.map(entity => ({
      'Display Name': entity.display_name,
      'Status': entity.status,
      'Tags': entity.tags.join(', '),
      ...entity.data,
      'Created At': new Date(entity.created_at).toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, entityType.name);
    XLSX.writeFile(wb, `${entityType.slug}-export.xlsx`);
  };

  if (isLoadingTypes) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!entityType) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/entity-types')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Entity Types
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="font-medium text-lg mb-2">Entity Type Not Found</h3>
            <p className="text-muted-foreground">The requested entity type does not exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const IconComponent = getIconByName(entityType.icon);
  const fieldSchema = entityType.field_schema || [];

  // Get display columns (first 4 custom fields)
  const displayFields = fieldSchema.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/entity-types')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <PageHeroHeader
        title={entityType.name}
        description={entityType.description || `Manage ${entityType.name.toLowerCase()} records`}
        icon={IconComponent}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="bg-white/10 hover:bg-white/20 text-white border-white/30"
              onClick={handleExport}
              disabled={entities.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) handleCloseForm(); setIsFormOpen(open); }}>
              <DialogTrigger asChild>
                <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 gap-2">
                  <Plus className="h-4 w-4" />
                  Add {entityType.name}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingEntity ? `Edit ${entityType.name}` : `Add ${entityType.name}`}
                  </DialogTitle>
                </DialogHeader>
                <EntityForm
                  entity={editingEntity}
                  fieldSchema={fieldSchema}
                  entityTypeName={entityType.name}
                  onSubmit={handleSubmit}
                  onCancel={handleCloseForm}
                  isSubmitting={isCreating || isUpdating}
                />
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`${getCardStyles(0 as CardVariant)} hover-scale`}>
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-muted-foreground text-xs">Total Records</CardDescription>
            <CardTitle className="text-2xl text-foreground">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={`${getCardStyles(1 as CardVariant)} hover-scale`}>
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-muted-foreground text-xs">Active</CardDescription>
            <CardTitle className="text-2xl text-foreground">{stats.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={`${getCardStyles(2 as CardVariant)} hover-scale`}>
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-muted-foreground text-xs">Inactive / Other</CardDescription>
            <CardTitle className="text-2xl text-foreground">{stats.inactive}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={`Search ${entityType.name.toLowerCase()}...`}
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      {isLoadingEntities ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredEntities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <IconComponent className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg mb-2">No Records Found</h3>
            <p className="text-muted-foreground mb-4">
              {entities.length === 0 
                ? `Start adding ${entityType.name.toLowerCase()} to your organization`
                : 'No records match your search criteria'
              }
            </p>
            {entities.length === 0 && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First {entityType.name}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                {displayFields.map(field => (
                  <TableHead key={field.id} className="hidden md:table-cell">
                    {field.name}
                  </TableHead>
                ))}
                <TableHead>Tags</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntities.map((entity) => (
                <TableRow key={entity.id}>
                  <TableCell className="font-medium">{entity.display_name}</TableCell>
                  <TableCell>
                    <Badge variant={entity.status === 'active' ? 'default' : 'secondary'}>
                      {entity.status}
                    </Badge>
                  </TableCell>
                  {displayFields.map(field => (
                    <TableCell key={field.id} className="hidden md:table-cell">
                      {field.type === 'checkbox' 
                        ? (entity.data[field.name] ? 'Yes' : 'No')
                        : String(entity.data[field.name] || '-')
                      }
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {entity.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {entity.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{entity.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          •••
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(entity)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem 
                            onClick={() => setDeleteTarget(entity)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.display_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
