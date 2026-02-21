import type { PassportData, PassportCheckResult } from '@/types';

const issuingStates = [
  { code: 'USA', name: 'United States' },
  { code: 'GBR', name: 'United Kingdom' },
  { code: 'AUS', name: 'Australia' },
  { code: 'DEU', name: 'Germany' },
  { code: 'FRA', name: 'France' },
  { code: 'SGP', name: 'Singapore' },
  { code: 'JPN', name: 'Japan' },
  { code: 'BRA', name: 'Brazil' },
];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function generateMRZ(data: PassportData): { line1: string; line2: string } {
  const lastName = data.lastName.toUpperCase().replace(/[^A-Z]/g, '');
  const givenName = data.givenName.toUpperCase().replace(/[^A-Z]/g, '');
  const stateCode = data.issuingState.substring(0, 3).toUpperCase();
  
  // Line 1: P<STATE<LASTNAME<<GIVENNAME<<<...
  let line1 = `P<${stateCode}${lastName}<<${givenName}`;
  line1 = line1.padEnd(44, '<');
  line1 = line1.substring(0, 44);
  
  // Line 2: ID_NUMBER<CHECK<NATIONALITY<DOB<CHECK<GENDER<EXPIRY<CHECK<...
  const idNum = data.identificationNumber.padEnd(9, '<').substring(0, 9);
  const dob = data.dob.replace(/-/g, '').substring(2); // YYMMDD
  const expiry = data.dateOfExpiry.replace(/-/g, '').substring(2);
  const gender = data.gender === 'Male' ? 'M' : data.gender === 'Female' ? 'F' : '<';
  const checkDigit = String(Math.floor(Math.random() * 10));
  
  let line2 = `${idNum}${checkDigit}${stateCode}${dob}${checkDigit}${gender}${expiry}${checkDigit}`;
  line2 = line2.padEnd(44, '<');
  line2 = line2.substring(0, 44);
  
  return { line1, line2 };
}

export function generatePassportCheckResult(
  caseId: string,
  passportData: PassportData
): PassportCheckResult {
  const { line1, line2 } = generateMRZ(passportData);
  const isValid = Math.random() > 0.2; // 80% valid
  
  const fieldVerifications = [
    { field: 'Given Name', entered: passportData.givenName, computed: passportData.givenName.toUpperCase(), matches: true },
    { field: 'Last Name', entered: passportData.lastName, computed: passportData.lastName.toUpperCase(), matches: true },
    { field: 'Gender', entered: passportData.gender, computed: passportData.gender === 'Male' ? 'M' : 'F', matches: true },
    { field: 'Issuing State', entered: passportData.issuingState, computed: passportData.issuingState.substring(0, 3).toUpperCase(), matches: true },
    { field: 'Nationality', entered: passportData.nationality, computed: passportData.nationality.substring(0, 3).toUpperCase(), matches: true },
    { field: 'Date of Birth', entered: passportData.dob, computed: passportData.dob, matches: isValid },
    { field: 'ID Number', entered: passportData.identificationNumber, computed: passportData.identificationNumber, matches: isValid },
    { field: 'Date of Expiry', entered: passportData.dateOfExpiry, computed: passportData.dateOfExpiry, matches: true },
  ];

  return {
    caseId,
    passportData,
    mrzLine1: line1,
    mrzLine2: line2,
    mrzMatch: isValid ? 'yes' : 'no',
    verificationStatus: isValid ? 'verified' : 'invalid',
    controlDigitsValid: isValid,
    fieldVerifications,
  };
}

export function getDefaultPassportData(): PassportData {
  const state = rand(issuingStates);
  return {
    givenName: '',
    lastName: '',
    gender: '',
    issuingState: '',
    nationality: '',
    dob: '',
    documentType: 'Passport',
    identificationNumber: '',
    dateOfExpiry: '',
  };
}
