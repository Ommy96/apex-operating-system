import React, { useState, useCallback, useEffect } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Eye, 
  EyeOff,
  Grip,
  Maximize2,
  Minimize2,
  Plus
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const ResponsiveGridLayout = WidthProvider(Responsive);

export interface DashboardWidget {
  id: string;
  title: string;
  component: React.ReactNode;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  resizable: boolean;
  visible: boolean;
  category: 'stats' | 'charts' | 'actions' | 'reports';
}

interface DashboardCustomizerProps {
  widgets: DashboardWidget[];
  onLayoutChange?: (layout: Layout[]) => void;
  onWidgetVisibilityChange?: (widgetId: string, visible: boolean) => void;
  className?: string;
}

interface SavedLayout {
  name: string;
  layout: Layout[];
  widgetVisibility: Record<string, boolean>;
  createdAt: string;
}

export function DashboardCustomizer({ 
  widgets, 
  onLayoutChange,
  onWidgetVisibilityChange,
  className = '' 
}: DashboardCustomizerProps) {
  const [currentLayout, setCurrentLayout] = useState<Layout[]>([]);
  const [widgetVisibility, setWidgetVisibility] = useState<Record<string, boolean>>({});
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([]);
  const [layoutName, setLayoutName] = useState('');

  // Initialize layout and visibility from localStorage or defaults
  useEffect(() => {
    const savedLayoutData = localStorage.getItem('dashboard-layout');
    const savedVisibility = localStorage.getItem('dashboard-widget-visibility');
    const savedLayoutsList = localStorage.getItem('dashboard-saved-layouts');

    if (savedLayoutData) {
      setCurrentLayout(JSON.parse(savedLayoutData));
    } else {
      // Create default layout
      const defaultLayout = widgets.map((widget, index) => ({
        i: widget.id,
        x: (index % 4) * widget.defaultSize.w,
        y: Math.floor(index / 4) * widget.defaultSize.h,
        w: widget.defaultSize.w,
        h: widget.defaultSize.h,
        minW: widget.minSize.w,
        minH: widget.minSize.h,
        isDraggable: true,
        isResizable: widget.resizable
      }));
      setCurrentLayout(defaultLayout);
    }

    if (savedVisibility) {
      setWidgetVisibility(JSON.parse(savedVisibility));
    } else {
      const defaultVisibility = widgets.reduce((acc, widget) => {
        acc[widget.id] = widget.visible;
        return acc;
      }, {} as Record<string, boolean>);
      setWidgetVisibility(defaultVisibility);
    }

    if (savedLayoutsList) {
      setSavedLayouts(JSON.parse(savedLayoutsList));
    }
  }, [widgets]);

  // Save to localStorage whenever layout or visibility changes
  useEffect(() => {
    localStorage.setItem('dashboard-layout', JSON.stringify(currentLayout));
  }, [currentLayout]);

  useEffect(() => {
    localStorage.setItem('dashboard-widget-visibility', JSON.stringify(widgetVisibility));
  }, [widgetVisibility]);

  const handleLayoutChange = useCallback((layout: Layout[]) => {
    setCurrentLayout(layout);
    onLayoutChange?.(layout);
  }, [onLayoutChange]);

  const toggleWidgetVisibility = useCallback((widgetId: string) => {
    setWidgetVisibility(prev => {
      const newVisibility = { ...prev, [widgetId]: !prev[widgetId] };
      onWidgetVisibilityChange?.(widgetId, newVisibility[widgetId]);
      return newVisibility;
    });
  }, [onWidgetVisibilityChange]);

  const resetLayout = useCallback(() => {
    const defaultLayout = widgets.map((widget, index) => ({
      i: widget.id,
      x: (index % 4) * widget.defaultSize.w,
      y: Math.floor(index / 4) * widget.defaultSize.h,
      w: widget.defaultSize.w,
      h: widget.defaultSize.h,
      minW: widget.minSize.w,
      minH: widget.minSize.h,
      isDraggable: true,
      isResizable: widget.resizable
    }));
    
    const defaultVisibility = widgets.reduce((acc, widget) => {
      acc[widget.id] = widget.visible;
      return acc;
    }, {} as Record<string, boolean>);

    setCurrentLayout(defaultLayout);
    setWidgetVisibility(defaultVisibility);
    toast.success('Layout reset to defaults');
  }, [widgets]);

  const saveCurrentLayout = useCallback(() => {
    if (!layoutName.trim()) {
      toast.error('Please enter a layout name');
      return;
    }

    const newSavedLayout: SavedLayout = {
      name: layoutName.trim(),
      layout: currentLayout,
      widgetVisibility,
      createdAt: new Date().toISOString()
    };

    const updatedLayouts = [...savedLayouts, newSavedLayout];
    setSavedLayouts(updatedLayouts);
    localStorage.setItem('dashboard-saved-layouts', JSON.stringify(updatedLayouts));
    setLayoutName('');
    toast.success(`Layout "${newSavedLayout.name}" saved successfully`);
  }, [layoutName, currentLayout, widgetVisibility, savedLayouts]);

  const loadSavedLayout = useCallback((savedLayout: SavedLayout) => {
    setCurrentLayout(savedLayout.layout);
    setWidgetVisibility(savedLayout.widgetVisibility);
    toast.success(`Layout "${savedLayout.name}" loaded`);
  }, []);

  const deleteSavedLayout = useCallback((index: number) => {
    const updatedLayouts = savedLayouts.filter((_, i) => i !== index);
    setSavedLayouts(updatedLayouts);
    localStorage.setItem('dashboard-saved-layouts', JSON.stringify(updatedLayouts));
    toast.success('Layout deleted');
  }, [savedLayouts]);

  const visibleWidgets = widgets.filter(widget => widgetVisibility[widget.id] !== false);
  const hiddenWidgets = widgets.filter(widget => widgetVisibility[widget.id] === false);

  const getWidgetsByCategory = (category: string) => 
    widgets.filter(widget => widget.category === category);

  const WidgetCategorySection = ({ 
    title, 
    category, 
    icon 
  }: { 
    title: string; 
    category: string;
    icon: React.ReactNode;
  }) => {
    const categoryWidgets = getWidgetsByCategory(category);
    
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          {icon}
          {title}
        </h4>
        <div className="grid gap-2">
          {categoryWidgets.map(widget => (
            <label
              key={widget.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={widgetVisibility[widget.id] !== false}
                  onCheckedChange={() => toggleWidgetVisibility(widget.id)}
                />
                <span className="text-sm font-medium">{widget.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {widgetVisibility[widget.id] !== false ? (
                  <Eye className="h-4 w-4 text-success" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Badge variant="outline" className="text-xs">
                  {widget.category}
                </Badge>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Customization Controls */}
      <Card className="shadow-elevation-1">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Dashboard Customization
              <Badge variant={isCustomizing ? "default" : "secondary"}>
                {isCustomizing ? "Editing" : "Viewing"}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={isCustomizing ? "default" : "outline"}
                size="sm"
                onClick={() => setIsCustomizing(!isCustomizing)}
              >
                <Grip className="h-4 w-4 mr-2" />
                {isCustomizing ? "Done" : "Customize"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetLayout}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Layouts
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Manage Dashboard Layouts</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* Save Current Layout */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Save Current Layout</h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter layout name..."
                          value={layoutName}
                          onChange={(e) => setLayoutName(e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-md"
                        />
                        <Button onClick={saveCurrentLayout}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Saved Layouts */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Saved Layouts ({savedLayouts.length})</h4>
                      {savedLayouts.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {savedLayouts.map((layout, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{layout.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Saved {new Date(layout.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => loadSavedLayout(layout)}
                                >
                                  Load
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteSavedLayout(index)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          No saved layouts yet
                        </p>
                      )}
                    </div>

                    <Separator />

                    {/* Widget Visibility Controls */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Widget Visibility</h4>
                      <div className="grid gap-4">
                        <WidgetCategorySection
                          title="Statistics"
                          category="stats"
                          icon={<Maximize2 className="h-4 w-4" />}
                        />
                        <WidgetCategorySection
                          title="Charts & Analytics"
                          category="charts"
                          icon={<Maximize2 className="h-4 w-4" />}
                        />
                        <WidgetCategorySection
                          title="Quick Actions"
                          category="actions"
                          icon={<Plus className="h-4 w-4" />}
                        />
                        <WidgetCategorySection
                          title="Reports"
                          category="reports"
                          icon={<Minimize2 className="h-4 w-4" />}
                        />
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {visibleWidgets.length} of {widgets.length} widgets visible
            </Badge>
            {hiddenWidgets.length > 0 && (
              <Badge variant="secondary">
                {hiddenWidgets.length} hidden
              </Badge>
            )}
            <Badge variant="outline">
              Grid: 12 columns
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Responsive Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: currentLayout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={120}
        onLayoutChange={handleLayoutChange}
        isDraggable={isCustomizing}
        isResizable={isCustomizing}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
        compactType="vertical"
        preventCollision={false}
      >
        {visibleWidgets.map(widget => (
          <div
            key={widget.id}
            className={`dashboard-widget ${isCustomizing ? 'customizing' : ''}`}
          >
            <div className={`h-full ${isCustomizing ? 'border-2 border-dashed border-primary/50 rounded-lg p-2' : ''}`}>
              {isCustomizing && (
                <div className="flex items-center justify-between mb-2 p-2 bg-primary/10 rounded text-xs">
                  <span className="font-medium">{widget.title}</span>
                  <div className="flex items-center gap-1">
                    <Grip className="h-3 w-3 text-muted-foreground cursor-move" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => toggleWidgetVisibility(widget.id)}
                    >
                      <EyeOff className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              <div className={isCustomizing ? 'pointer-events-none' : ''}>
                {widget.component}
              </div>
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>

      <style>{`
        .layout {
          position: relative;
        }
        .dashboard-widget.customizing {
          cursor: move;
        }
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top;
        }
        .react-grid-item.cssTransforms {
          transition-property: transform;
        }
        .react-grid-item > .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          bottom: 0;
          right: 0;
          cursor: se-resize;
        }
        .react-grid-item > .react-resizable-handle::after {
          content: "";
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 5px;
          height: 5px;
          border-right: 2px solid rgba(0, 0, 0, 0.4);
          border-bottom: 2px solid rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
}