import { useState, useRef, useEffect } from 'react';
import { Plus, X, Search, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface FilterDefinition {
  key: string;
  label: string;
  icon?: React.ReactNode;
  options: { value: string; label: string }[];
  defaultValue: string; // typically 'all'
}

interface ActiveFilter {
  key: string;
  value: string;
}

interface FilterBarProps {
  filters: FilterDefinition[];
  values: Record<string, string> | { [key: string]: string };
  onChange: (key: string, value: string) => void;
  onClearAll?: () => void;
}

function FilterChip({
  filter,
  value,
  onChange,
  onRemove,
}: {
  filter: FilterDefinition;
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectedOption = filter.options.find(o => o.value === value);
  const displayValue = selectedOption?.label || value;

  const filteredOptions = filter.options.filter(
    o => o.value !== filter.defaultValue && o.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-colors',
            'bg-background hover:bg-muted/50 border-border shadow-sm'
          )}
        >
          {filter.icon && <span className="text-muted-foreground">{filter.icon}</span>}
          <span className="text-muted-foreground">{filter.label}</span>
          <span className="text-foreground font-semibold">
            is {displayValue}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="ml-0.5 rounded-sm hover:bg-muted p-0.5"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0 bg-popover" sideOffset={4}>
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-8 pl-7 text-xs"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-48 overflow-y-auto p-1">
          {value !== filter.defaultValue && (
            <button
              onClick={() => { onChange(filter.defaultValue); setOpen(false); setSearch(''); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors text-left text-muted-foreground hover:bg-muted hover:text-foreground mb-0.5"
            >
              <X className="h-3.5 w-3.5" />
              Clear filter
            </button>
          )}
          {value !== filter.defaultValue && filteredOptions.length > 0 && (
            <div className="border-b border-border/50 mb-0.5" />
          )}
          {filteredOptions.map(option => (
            <button
              key={option.value}
              onClick={() => { onChange(option.value); setOpen(false); setSearch(''); }}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors text-left',
                value === option.value
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted text-foreground'
              )}
            >
              <div className={cn(
                'h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0',
                value === option.value ? 'border-primary bg-primary' : 'border-muted-foreground/30'
              )}>
                {value === option.value && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </div>
              {option.label}
            </button>
          ))}
          {filteredOptions.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-3 text-center">No options found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AddFilterButton({
  availableFilters,
  onAdd,
}: {
  availableFilters: FilterDefinition[];
  onAdd: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (availableFilters.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground">
          <Plus className="h-3.5 w-3.5" />
          Add filter
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1 bg-popover" sideOffset={4}>
        {availableFilters.map(filter => (
          <button
            key={filter.key}
            onClick={() => { onAdd(filter.key); setOpen(false); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted text-left text-foreground transition-colors"
          >
            {filter.icon && <span className="text-muted-foreground">{filter.icon}</span>}
            {filter.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export default function FilterBar({ filters, values, onChange, onClearAll }: FilterBarProps) {
  // Track which filters are "active" (shown as chips)
  const activeKeys = filters
    .filter(f => values[f.key] !== undefined && values[f.key] !== f.defaultValue)
    .map(f => f.key);

  // Also track manually added (but still at default) filters
  const [manuallyAdded, setManuallyAdded] = useState<Set<string>>(new Set());

  const visibleKeys = [...new Set([...activeKeys, ...manuallyAdded])];
  const availableFilters = filters.filter(f => !visibleKeys.includes(f.key));

  const handleAdd = (key: string) => {
    setManuallyAdded(prev => new Set([...prev, key]));
  };

  const handleRemove = (key: string) => {
    const filter = filters.find(f => f.key === key);
    if (filter) {
      onChange(key, filter.defaultValue);
    }
    setManuallyAdded(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const handleClearAll = () => {
    setManuallyAdded(new Set());
    onClearAll?.();
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {visibleKeys.map(key => {
        const filter = filters.find(f => f.key === key);
        if (!filter) return null;
        return (
          <FilterChip
            key={key}
            filter={filter}
            value={values[key] || filter.defaultValue}
            onChange={(v) => onChange(key, v)}
            onRemove={() => handleRemove(key)}
          />
        );
      })}
      <AddFilterButton availableFilters={availableFilters} onAdd={handleAdd} />
      {visibleKeys.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleClearAll}
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
