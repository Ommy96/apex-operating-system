import { useState } from 'react';
import { Check, ChevronsUpDown, Building2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useOrganization } from '@/hooks/useOrganization';
import { Skeleton } from '@/components/ui/skeleton';

interface OrganizationSwitcherProps {
  collapsed?: boolean;
}

export function OrganizationSwitcher({ collapsed = false }: OrganizationSwitcherProps) {
  const [open, setOpen] = useState(false);
  const { 
    currentOrganization, 
    userOrganizations, 
    isLoading, 
    switchOrganization 
  } = useOrganization();

  const handleSelect = async (orgId: string) => {
    if (orgId !== currentOrganization?.organization_id) {
      await switchOrganization(orgId);
    }
    setOpen(false);
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 p-2", collapsed && "justify-center")}>
        <Skeleton className="h-8 w-8 rounded-lg" />
        {!collapsed && <Skeleton className="h-4 w-24" />}
      </div>
    );
  }

  if (!currentOrganization) {
    return null;
  }

  const hasMultipleOrgs = userOrganizations && userOrganizations.length > 1;

  if (collapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl bg-sidebar-accent/30 hover:bg-sidebar-accent/50"
            disabled={!hasMultipleOrgs}
          >
            <Building2 className="h-5 w-5 text-sidebar-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start" side="right">
          <Command>
            <CommandInput placeholder="Search organization..." />
            <CommandList>
              <CommandEmpty>No organization found.</CommandEmpty>
              <CommandGroup heading="Your Organizations">
                {userOrganizations?.map((org) => (
                  <CommandItem
                    key={org.organization_id}
                    value={org.organization_name}
                    onSelect={() => handleSelect(org.organization_id)}
                    className="cursor-pointer"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    <div className="flex flex-col flex-1">
                      <span>{org.organization_name}</span>
                      <span className="text-xs text-muted-foreground capitalize">{org.user_role}</span>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        currentOrganization?.organization_id === org.organization_id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between px-3 py-2.5 h-auto rounded-xl",
            "bg-sidebar-accent/30 hover:bg-sidebar-accent/50",
            "text-sidebar-foreground"
          )}
          disabled={!hasMultipleOrgs}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary/20 flex-shrink-0">
              <Building2 className="h-4 w-4 text-sidebar-primary" />
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-medium truncate max-w-[140px]">
                {currentOrganization.organization_name}
              </span>
              <span className="text-xs text-sidebar-foreground/60 capitalize">
                {currentOrganization.user_role}
              </span>
            </div>
          </div>
          {hasMultipleOrgs && (
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search organization..." />
          <CommandList>
            <CommandEmpty>No organization found.</CommandEmpty>
            <CommandGroup heading="Your Organizations">
              {userOrganizations?.map((org) => (
                <CommandItem
                  key={org.organization_id}
                  value={org.organization_name}
                  onSelect={() => handleSelect(org.organization_id)}
                  className="cursor-pointer"
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  <div className="flex flex-col flex-1">
                    <span>{org.organization_name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{org.user_role}</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      currentOrganization?.organization_id === org.organization_id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
