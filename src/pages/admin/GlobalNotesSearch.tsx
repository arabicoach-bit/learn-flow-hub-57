import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, FileText, Paperclip, Pin } from 'lucide-react';
import { useGlobalNotesSearch } from '@/hooks/use-global-notes-search';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const ENTITY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'lead', label: 'Leads' },
  { value: 'trial', label: 'Trials' },
  { value: 'student', label: 'Students' },
  { value: 'package', label: 'Packages' },
];

const ENTITY_COLORS: Record<string, string> = {
  lead: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  student: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  package: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

export default function GlobalNotesSearch() {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const { data: results, isLoading } = useGlobalNotesSearch(search, entityFilter);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Global Notes Search</h1>
          <p className="text-muted-foreground text-sm">Search across all leads, trials, students, and packages notes</p>
        </div>

        {/* Search bar */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes... (min 2 characters)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-1.5">
            {ENTITY_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={entityFilter === f.value ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setEntityFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="h-[calc(100vh-250px)]">
          <div className="space-y-2">
            {search.length < 2 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Type at least 2 characters to search</p>
              </div>
            ) : isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))
            ) : !results?.length ? (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No notes found for "{search}"</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
                {results.map((note) => (
                  <Card key={note.comment_id} className="p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={cn('text-[10px] h-5', ENTITY_COLORS[note.entity_type])}>
                            {note.entity_type}
                          </Badge>
                          <span className="text-sm font-medium">{note.entity_name}</span>
                          {note.is_pinned && (
                            <Pin className="h-3 w-3 text-primary" />
                          )}
                          {note.attachment_url && (
                            <Paperclip className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-3">
                          {note.comment}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] text-muted-foreground">
                            {note.author_name || 'System'} · {format(new Date(note.created_at), 'dd MMM yyyy, HH:mm')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </AdminLayout>
  );
}
