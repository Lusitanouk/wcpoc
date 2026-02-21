import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface BatchRecord {
  name: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  country?: string;
  idType?: string;
  idNumber?: string;
  [key: string]: string | undefined;
}

interface BatchUploadProps {
  onRecordsLoaded: (records: BatchRecord[]) => void;
  records: BatchRecord[];
  onClear: () => void;
}

function parseCSV(text: string): BatchRecord[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  // Map common header variations
  const headerMap: Record<string, string> = {
    'name': 'name',
    'full name': 'name',
    'fullname': 'name',
    'full_name': 'name',
    'date of birth': 'dob',
    'dob': 'dob',
    'date_of_birth': 'dob',
    'birth_date': 'dob',
    'gender': 'gender',
    'sex': 'gender',
    'nationality': 'nationality',
    'citizenship': 'nationality',
    'country': 'country',
    'country/location': 'country',
    'location': 'country',
    'registered country': 'country',
    'id type': 'idType',
    'id_type': 'idType',
    'document type': 'idType',
    'document_type': 'idType',
    'id number': 'idNumber',
    'id_number': 'idNumber',
    'document number': 'idNumber',
    'document_number': 'idNumber',
    'passport number': 'idNumber',
    'passport_number': 'idNumber',
  };

  const mappedHeaders = headers.map(h => headerMap[h] || h);

  return lines.slice(1).filter(line => line.trim()).map(line => {
    // Simple CSV parsing (handles quoted fields)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const record: BatchRecord = { name: '' };
    mappedHeaders.forEach((header, i) => {
      if (values[i]?.trim()) {
        record[header] = values[i].trim();
      }
    });
    return record;
  }).filter(r => r.name.trim().length > 0);
}

const SAMPLE_CSV = `Name,Date of Birth,Gender,Nationality,Country,ID Type,ID Number
John Smith,1985-03-15,Male,US,United States,Passport,AB1234567
Maria Garcia,1990-07-22,Female,ES,Spain,National ID,X1234567A
Ahmed Hassan,,Male,EG,Egypt,,
Yuki Tanaka,1978-11-03,Female,JP,Japan,Passport,TK9876543`;

export function BatchUpload({ onRecordsLoaded, records, onClear }: BatchUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    setError(null);

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setError('Please upload a CSV file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setError('No valid records found. Ensure the CSV has a "Name" column.');
          return;
        }
        setFileName(file.name);
        onRecordsLoaded(parsed);
      } catch {
        setError('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
  }, [onRecordsLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (inputRef.current) inputRef.current.value = '';
  }, [processFile]);

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch-screening-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Preview columns
  const previewColumns = ['name', 'dob', 'gender', 'nationality', 'country', 'idType', 'idNumber'];
  const columnLabels: Record<string, string> = {
    name: 'Name',
    dob: 'DOB',
    gender: 'Gender',
    nationality: 'Nationality',
    country: 'Country',
    idType: 'ID Type',
    idNumber: 'ID Number',
  };

  if (records.length > 0) {
    // Find which columns have data
    const activeCols = previewColumns.filter(col => records.some(r => r[col]));
    const validCount = records.filter(r => r.name.trim()).length;
    const withIdCount = records.filter(r => r.idNumber).length;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">{fileName}</span>
            <Badge variant="secondary" className="text-[10px]">{records.length} records</Badge>
            {validCount === records.length ? (
              <Badge className="text-[10px] bg-status-false/15 text-status-false border-0 gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> All valid
              </Badge>
            ) : (
              <Badge className="text-[10px] bg-status-possible/15 text-status-possible border-0 gap-1">
                <AlertTriangle className="h-2.5 w-2.5" /> {validCount}/{records.length} valid
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onClear}>
            <X className="h-3 w-3" /> Clear
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <span>{validCount} names</span>
          <span>·</span>
          <span>{records.filter(r => r.dob).length} with DOB</span>
          <span>·</span>
          <span>{records.filter(r => r.nationality).length} with nationality</span>
          <span>·</span>
          <span>{withIdCount} with ID documents</span>
        </div>

        {/* Data preview table */}
        <div className="border rounded-md overflow-hidden">
          <ScrollArea className="max-h-[240px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50 sticky top-0">
                  <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-8">#</th>
                  {activeCols.map(col => (
                    <th key={col} className="text-left px-2 py-1.5 font-medium text-muted-foreground">
                      {columnLabels[col] || col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((record, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-2 py-1.5 text-muted-foreground font-mono">{i + 1}</td>
                    {activeCols.map(col => (
                      <td key={col} className="px-2 py-1.5">
                        {record[col] || <span className="text-muted-foreground/40">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileInput}
          className="hidden"
        />
        <div className={`rounded-full p-3 ${isDragging ? 'bg-primary/10' : 'bg-muted'}`}>
          <Upload className={`h-6 w-6 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">
            {isDragging ? 'Drop your file here' : 'Drop CSV file or click to upload'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            CSV format with columns: Name, DOB, Gender, Nationality, Country, ID Type, ID Number
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive p-2 rounded-md bg-destructive/10">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">Max 5MB · CSV only · Header row required</p>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={downloadTemplate}>
          <Download className="h-3 w-3" /> Download Template
        </Button>
      </div>
    </div>
  );
}
