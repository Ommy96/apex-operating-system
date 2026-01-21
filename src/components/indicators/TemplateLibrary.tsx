import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Search, Plus, Users, Target, FileText, GraduationCap, Briefcase, TrendingUp } from 'lucide-react';
import { useIndicatorTemplates, useImportFromTemplate, IndicatorTemplate, useIndicators } from '@/hooks/useIndicators';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface TemplateLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryIcons: Record<string, any> = {
  beneficiaries: Users,
  programs: Target,
  reports: FileText,
  outcomes: GraduationCap,
  community: Briefcase,
};

const categoryColors: Record<string, string> = {
  beneficiaries: 'bg-blue-100 text-blue-700 border-blue-200',
  programs: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  reports: 'bg-amber-100 text-amber-700 border-amber-200',
  outcomes: 'bg-purple-100 text-purple-700 border-purple-200',
  community: 'bg-pink-100 text-pink-700 border-pink-200',
};

export function TemplateLibrary({ open, onOpenChange }: TemplateLibraryProps) {
  const { data: templates = [], isLoading } = useIndicatorTemplates();
  const { data: existingIndicators = [] } = useIndicators();
  const importTemplate = useImportFromTemplate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get unique categories
  const categories = [...new Set(templates.map(t => t.category))];

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Check if template is already imported
  const isImported = (templateCode: string) => {
    return existingIndicators.some(i => i.code === templateCode);
  };

  const handleImport = async (template: IndicatorTemplate) => {
    try {
      await importTemplate.mutateAsync(template);
    } catch (error) {
      console.error('Error importing template:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Indicator Template Library
          </DialogTitle>
          <DialogDescription>
            Browse and import pre-configured indicators. Customize them after import.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              All
            </TabsTrigger>
            {categories.map((cat) => {
              const Icon = categoryIcons[cat] || Target;
              return (
                <TabsTrigger 
                  key={cat} 
                  value={cat}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground capitalize"
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {cat}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg">No templates found</h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your search or category filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
              {filteredTemplates.map((template) => {
                const alreadyImported = isImported(template.code);
                const Icon = categoryIcons[template.category] || Target;

                return (
                  <Card 
                    key={template.id}
                    className={cn(
                      'transition-all duration-200',
                      alreadyImported ? 'opacity-60' : 'hover:shadow-md hover:-translate-y-0.5'
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant="outline" 
                              className={cn('text-xs', categoryColors[template.category])}
                            >
                              <Icon className="h-3 w-3 mr-1" />
                              {template.category}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {template.code}
                            </Badge>
                          </div>
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                        </div>
                      </div>
                      <CardDescription className="text-xs line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {template.formula_type}
                          </Badge>
                          <span>•</span>
                          <span>{template.aggregation_period}</span>
                          {template.default_target && (
                            <>
                              <span>•</span>
                              <span>Target: {template.default_target}</span>
                            </>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={alreadyImported ? 'ghost' : 'default'}
                          disabled={alreadyImported || importTemplate.isPending}
                          onClick={() => handleImport(template)}
                          className="h-8"
                        >
                          {alreadyImported ? (
                            'Imported'
                          ) : importTemplate.isPending ? (
                            'Importing...'
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-1" />
                              Import
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
