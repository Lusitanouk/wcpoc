import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { PassportData, DocumentType } from '@/types';

interface PassportCheckFormProps {
  data: PassportData;
  onChange: (data: PassportData) => void;
}

const issuingStates = [
  { code: 'USA', name: 'United States' },
  { code: 'GBR', name: 'United Kingdom' },
  { code: 'AUS', name: 'Australia' },
  { code: 'DEU', name: 'Germany' },
  { code: 'FRA', name: 'France' },
  { code: 'SGP', name: 'Singapore' },
  { code: 'JPN', name: 'Japan' },
  { code: 'BRA', name: 'Brazil' },
  { code: 'IND', name: 'India' },
  { code: 'CHN', name: 'China' },
  { code: 'RUS', name: 'Russia' },
  { code: 'SAU', name: 'Saudi Arabia' },
  { code: 'ARE', name: 'UAE' },
  { code: 'LBN', name: 'Lebanon' },
  { code: 'TUR', name: 'Turkey' },
  { code: 'MEX', name: 'Mexico' },
];

export function PassportCheckForm({ data, onChange }: PassportCheckFormProps) {
  const update = (partial: Partial<PassportData>) => {
    onChange({ ...data, ...partial });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Passport Check</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Given Name(s) *</Label>
          <Input
            value={data.givenName}
            onChange={e => update({ givenName: e.target.value })}
            placeholder="Including middle names..."
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Last Name *</Label>
          <Input
            value={data.lastName}
            onChange={e => update({ lastName: e.target.value })}
            placeholder="Last name..."
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Gender *</Label>
          <Select value={data.gender} onValueChange={v => update({ gender: v })}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Unspecified">Unspecified</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Issuing State *</Label>
          <Select value={data.issuingState} onValueChange={v => update({ issuingState: v })}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {issuingStates.map(s => (
                <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Nationality *</Label>
          <Select value={data.nationality} onValueChange={v => update({ nationality: v })}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {issuingStates.map(s => (
                <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Date of Birth *</Label>
          <Input
            type="date"
            value={data.dob}
            onChange={e => update({ dob: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Identification Number *</Label>
          <Input
            value={data.identificationNumber}
            onChange={e => update({ identificationNumber: e.target.value })}
            placeholder="Passport or ID number..."
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Date of Expiry *</Label>
          <Input
            type="date"
            value={data.dateOfExpiry}
            onChange={e => update({ dateOfExpiry: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Document Type *</Label>
        <RadioGroup
          value={data.documentType}
          onValueChange={v => update({ documentType: v as DocumentType })}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="Passport" id="doc-passport" />
            <Label htmlFor="doc-passport" className="text-sm cursor-pointer">Passport</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="ID-Card Type 1" id="doc-id1" />
            <Label htmlFor="doc-id1" className="text-sm cursor-pointer">ID-Card Type 1 (3 lines)</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="ID-Card Type 2" id="doc-id2" />
            <Label htmlFor="doc-id2" className="text-sm cursor-pointer">ID-Card Type 2 (2 lines)</Label>
          </div>
        </RadioGroup>
      </div>

      <p className="text-[10px] text-muted-foreground italic">
        * All fields are mandatory. Have a clear photocopy or scan of the document to hand. 
        Special characters should be entered as displayed in the VIZ section or replaced per ICAO standards.
      </p>
    </div>
  );
}
