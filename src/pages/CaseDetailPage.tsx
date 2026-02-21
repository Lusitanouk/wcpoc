import { useState, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Shield, Newspaper, CreditCard, User, MapPin, Calendar, Hash,
  Edit, UserPlus, ArrowRightLeft, Archive, Trash2, RefreshCw, ToggleRight,
  ChevronDown, MessageSquare, Send, Clock, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getCaseById, getMatchesForCase, getGroupById, groups } from '@/data/mock-data';
import { generateMediaCheckResult } from '@/data/media-mock-data';
import { generatePassportCheckResult } from '@/data/passport-mock-data';
import { ResultsView } from '@/components/screening/ResultsView';
import { MediaCheckResultsView } from '@/components/screening/MediaCheckResultsView';
import { PassportCheckResultsView } from '@/components/screening/PassportCheckResultsView';
import type { CheckType, MediaCheckResult, PassportCheckResult, CaseNote } from '@/types';

const checkTypeIcons: Record<CheckType, React.ReactNode> = {
  'World-Check': <Shield className="h-3.5 w-3.5" />,
  'Media Check': <Newspaper className="h-3.5 w-3.5" />,
  'Passport Check': <CreditCard className="h-3.5 w-3.5" />,
};

const analysts = ['John Smith', 'Jane Doe', 'Alex Turner', 'Maria Lopez', 'Sam Wilson'];

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const caseData = id ? getCaseById(id) : undefined;
  const matches = id ? getMatchesForCase(id) : [];

  const activeCheckType = (searchParams.get('check') as CheckType) || caseData?.checkTypes[0] || 'World-Check';
  const setActiveCheckType = (ct: CheckType) => {
    const params: Record<string, string> = { check: ct };
    if (ct === 'World-Check') {
      const bucket = searchParams.get('bucket');
      if (bucket) params.bucket = bucket;
    }
    setSearchParams(params, { replace: true });
  };

  // Workflow dialogs
  const [editDialog, setEditDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [moveDialog, setMoveDialog] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [localNotes, setLocalNotes] = useState<CaseNote[]>([]);

  const allNotes = useMemo(() => {
    const base = caseData?.notes || [];
    return [...base, ...localNotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [caseData?.notes, localNotes]);

  const addNote = () => {
    if (!newNote.trim() || !caseData) return;
    setLocalNotes(prev => [...prev, {
      id: `note-${Date.now()}`,
      author: 'Current User',
      text: newNote.trim(),
      createdAt: new Date().toISOString().split('T')[0],
    }]);
    setNewNote('');
  };

  const mediaResult: MediaCheckResult | null = useMemo(() => {
    if (!caseData || !caseData.checkTypes.includes('Media Check')) return null;
    return generateMediaCheckResult(caseData.id, caseData.name);
  }, [caseData?.id]);

  const passportResult: PassportCheckResult | null = useMemo(() => {
    if (!caseData || !caseData.checkTypes.includes('Passport Check')) return null;
    return generatePassportCheckResult(caseData.id, {
      givenName: caseData.name.split(' ')[0] || '',
      lastName: caseData.name.split(' ').slice(1).join(' ') || '',
      gender: 'Male', issuingState: 'USA', nationality: 'USA', dob: '1975-06-15',
      documentType: 'Passport',
      identificationNumber: `P${Math.floor(Math.random() * 900000000 + 100000000)}`,
      dateOfExpiry: '2028-06-15',
    });
  }, [caseData?.id]);

  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Case not found.</p>
        <Link to="/cases">
          <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Cases</Button>
        </Link>
      </div>
    );
  }

  const group = getGroupById(caseData.groupId);
  const sd = caseData.screeningData;

  return (
    <div>
      <Link to="/cases" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Cases
      </Link>

      {/* Case Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold">{caseData.name}</h1>
            <Badge variant="outline" className={`text-[10px] ${
              caseData.rating === 'High' ? 'border-destructive text-destructive'
              : caseData.rating === 'Medium' ? 'border-amber-500 text-amber-600'
              : 'border-muted-foreground text-muted-foreground'
            }`}>{caseData.rating} Risk</Badge>
            <Badge variant="secondary" className="text-[10px]">{caseData.entityType}</Badge>
            {caseData.status === 'Archived' && <Badge variant="secondary" className="text-[10px]">Archived</Badge>}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-mono">{caseData.id}</span>
            <span>•</span>
            <span>Group: {group?.name || '—'}</span>
            <span>•</span>
            <span>Assigned: <span className="text-foreground font-medium">{caseData.assignee}</span></span>
            <span>•</span>
            <span>OGS: {caseData.ogsEnabled ? 'Active' : 'Off'}</span>
          </div>
        </div>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              Actions <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditDialog(true)}>
              <Edit className="h-3.5 w-3.5 mr-2" /> Edit Case
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAssignDialog(true)}>
              <UserPlus className="h-3.5 w-3.5 mr-2" /> Reassign
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMoveDialog(true)}>
              <ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> Move Group
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <RefreshCw className="h-3.5 w-3.5 mr-2" /> Rescreen
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ToggleRight className="h-3.5 w-3.5 mr-2" /> {caseData.ogsEnabled ? 'Disable' : 'Enable'} OGS
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Archive className="h-3.5 w-3.5 mr-2" /> Archive
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Screening Data & Activity grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Screening Identifiers */}
        <Card className="p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Screening Data
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-xs">
            {sd.dob && (
              <div>
                <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> DOB</span>
                <span className="font-medium">{sd.dob}</span>
              </div>
            )}
            {sd.gender && (
              <div>
                <span className="text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Gender</span>
                <span className="font-medium">{sd.gender}</span>
              </div>
            )}
            {sd.nationality && (
              <div>
                <span className="text-muted-foreground">Nationality</span>
                <span className="font-medium block">{sd.nationality}</span>
              </div>
            )}
            {sd.country && (
              <div>
                <span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Country</span>
                <span className="font-medium">{sd.country}</span>
              </div>
            )}
            {sd.idType && (
              <div>
                <span className="text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" /> Primary ID ({sd.idType})</span>
                <span className="font-medium font-mono">{sd.idNumber || '—'}</span>
              </div>
            )}
            {sd.secondaryIdType && (
              <div>
                <span className="text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" /> Secondary ID ({sd.secondaryIdType})</span>
                <span className="font-medium font-mono">{sd.secondaryIdNumber || '—'}</span>
              </div>
            )}
            {sd.customFields && Object.entries(sd.customFields).map(([key, val]) => (
              <div key={key}>
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium block">{val}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t text-[11px] text-muted-foreground">
            <span>Created: {caseData.createdAt}</span>
            <span>Last Screened: {caseData.lastScreenedAt}</span>
            <span>Mode: {caseData.mode}</span>
            <span>OGS Freq: {group?.ongoingFrequency || '—'}</span>
          </div>
        </Card>

        {/* Activity / Notes */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Activity / Notes
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
            {allNotes.length === 0 && (
              <p className="text-xs text-muted-foreground">No notes yet.</p>
            )}
            {allNotes.map(note => (
              <div key={note.id} className="text-xs border-l-2 border-muted pl-2">
                <div className="flex items-center gap-2 text-muted-foreground mb-0.5">
                  <span className="font-medium text-foreground">{note.author}</span>
                  <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{note.createdAt}</span>
                </div>
                <p>{note.text}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <Input
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="h-7 text-xs flex-1"
              onKeyDown={e => e.key === 'Enter' && addNote()}
            />
            <Button variant="outline" size="sm" className="h-7 px-2" onClick={addNote} disabled={!newNote.trim()}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Check type tabs */}
      {caseData.checkTypes.length > 1 && (
        <div className="flex gap-1 mb-6 p-1 bg-muted rounded-lg">
          {caseData.checkTypes.map(ct => (
            <button
              key={ct}
              onClick={() => setActiveCheckType(ct)}
              className={`flex items-center gap-1.5 flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeCheckType === ct
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              {checkTypeIcons[ct]}
              {ct}
            </button>
          ))}
        </div>
      )}

      {activeCheckType === 'World-Check' && (
        <ResultsView matches={matches} caseName={caseData.name} caseId={caseData.id} checkTypes={['World-Check']} />
      )}
      {activeCheckType === 'Media Check' && mediaResult && (
        <MediaCheckResultsView result={mediaResult} caseName={caseData.name} caseId={caseData.id} />
      )}
      {activeCheckType === 'Passport Check' && passportResult && (
        <PassportCheckResultsView result={passportResult} caseName={caseData.name} caseId={caseData.id} />
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reassign Case</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select a new analyst for <strong>{caseData.name}</strong></p>
            <Select defaultValue={caseData.assignee}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {analysts.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAssignDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={() => setAssignDialog(false)}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Group Dialog */}
      <Dialog open={moveDialog} onOpenChange={setMoveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Move to Group</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Move <strong>{caseData.name}</strong> to a different group</p>
            <Select defaultValue={caseData.groupId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMoveDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={() => setMoveDialog(false)}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Case Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Case</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Case Name</label>
              <Input defaultValue={caseData.name} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Entity Type</label>
              <Select defaultValue={caseData.entityType}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Individual', 'Organisation', 'Vessel', 'Unspecified'] as const).map(t =>
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">DOB</label>
              <Input defaultValue={sd.dob || ''} className="h-8 text-sm" type="date" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Gender</label>
              <Select defaultValue={sd.gender || ''}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nationality</label>
              <Input defaultValue={sd.nationality || ''} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Country</label>
              <Input defaultValue={sd.country || ''} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Primary ID Type</label>
              <Input defaultValue={sd.idType || ''} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Primary ID Number</label>
              <Input defaultValue={sd.idNumber || ''} className="h-8 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={() => setEditDialog(false)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
