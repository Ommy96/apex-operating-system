import { useState } from "react";
import { Plus, Search, Edit, Trash2, Settings2, Database, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { useEntityTypes, EntityType, EntityTypeFormData } from "@/hooks/useEntityTypes";
import { EntityTypeForm } from "@/components/EntityTypeForm";
import { useNavigate } from "react-router-dom";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import { getIconByName } from "@/lib/iconUtils";
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

export default function EntityTypesManagement() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { 
    entityTypes, 
    isLoading, 
    createEntityType, 
    updateEntityType, 
    deleteEntityType,
    isCreating,
    isUpdating,
    isDeleting,
  } = useEntityTypes();

  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<EntityType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EntityType | null>(null);

  const filteredTypes = entityTypes.filter(et =>
    et.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    et.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (data: EntityTypeFormData) => {
    if (editingType) {
      updateEntityType({ id: editingType.id, data }, {
        onSuccess: () => {
          setIsFormOpen(false);
          setEditingType(null);
        },
      });
    } else {
      createEntityType(data, {
        onSuccess: () => {
          setIsFormOpen(false);
        },
      });
    }
  };

  const handleEdit = (entityType: EntityType) => {
    setEditingType(entityType);
    setIsFormOpen(true);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteEntityType(deleteTarget.id, {
        onSuccess: () => setDeleteTarget(null),
      });
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingType(null);
  };

  const activeCount = entityTypes.filter(et => et.is_active).length;
  const totalFields = entityTypes.reduce((sum, et) => sum + (et.field_schema?.length || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeroHeader
        title="Entity Types"
        description="Define custom data structures for any sector - beneficiaries, facilities, projects, and more"
        icon={Database}
        actions={
          isAdmin ? (
            <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) handleCloseForm(); setIsFormOpen(open); }}>
              <DialogTrigger asChild>
                <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 gap-2 shadow-strong">
                  <Plus className="h-4 w-4" />
                  New Entity Type
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingType ? 'Edit Entity Type' : 'Create Entity Type'}</DialogTitle>
                </DialogHeader>
                <EntityTypeForm
                  entityType={editingType}
                  onSubmit={handleSubmit}
                  onCancel={handleCloseForm}
                  isSubmitting={isCreating || isUpdating}
                />
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`${getCardStyles(0 as CardVariant)} hover-scale`}>
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-muted-foreground text-xs">Total Entity Types</CardDescription>
            <CardTitle className="text-2xl text-foreground">{entityTypes.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={`${getCardStyles(1 as CardVariant)} hover-scale`}>
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-muted-foreground text-xs">Active Types</CardDescription>
            <CardTitle className="text-2xl text-foreground">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={`${getCardStyles(2 as CardVariant)} hover-scale`}>
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-muted-foreground text-xs">Total Custom Fields</CardDescription>
            <CardTitle className="text-2xl text-foreground">{totalFields}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search entity types..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Entity Types Grid */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg mb-2">No Entity Types Defined</h3>
            <p className="text-muted-foreground mb-4">
              Create your first entity type to start collecting sector-agnostic data
            </p>
            {isAdmin && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Entity Type
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTypes.map((entityType, index) => {
            const IconComponent = getIconByName(entityType.icon);
            
            return (
              <Card 
                key={entityType.id} 
                className={`${getCardStyles((index % 6) as CardVariant)} hover-scale transition-all duration-300`}
              >
                <CardHeader className="py-3 px-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-primary/10`}>
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-foreground leading-tight">{entityType.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">/{entityType.slug}</p>
                      </div>
                    </div>
                    <Badge variant={entityType.is_active ? "default" : "secondary"} className="shrink-0 text-xs">
                      {entityType.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="py-2 px-4">
                  {entityType.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {entityType.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <Settings2 className="h-3 w-3" />
                    <span>{entityType.field_schema?.length || 0} custom fields</span>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex gap-2 pt-2 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => navigate(`/entities/${entityType.slug}`)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Data
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEdit(entityType)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(entityType)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entity Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This will also delete all associated records and cannot be undone.
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
