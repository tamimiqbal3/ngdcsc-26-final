import { SubmissionRecord } from '../types';

export const TARGET_SPREADSHEET_ID = '1JosD8r405qliGPxw9q46MTv76Fvm9Kz9XTGraoE1TT8';
export const TARGET_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1JosD8r405qliGPxw9q46MTv76Fvm9Kz9XTGraoE1TT8/edit';

export interface DriveSheetFile {
  id: string;
  name: string;
  webViewLink?: string;
  modifiedTime?: string;
}

export interface SheetMetadata {
  id: string;
  name: string;
  url: string;
  firstSheetTitle?: string;
}

const DEFAULT_HEADERS = [
  'Submission Time',
  'Full Name',
  'Student ID / Roll',
  'Phone Number',
  'WhatsApp Number',
  'Email Address',
  'Batch',
  'Section',
  'Date of Birth',
  'Interested Segments',
  'Agreed to Constitution & Rules',
  'Has Photo'
];

/**
 * List existing spreadsheets from the user's Google Drive
 */
export async function listUserSpreadsheets(accessToken: string): Promise<DriveSheetFile[]> {
  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink,modifiedTime)&orderBy=modifiedTime desc&pageSize=15`;
  
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch Google Spreadsheets (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Create a new dedicated Google Spreadsheet for NGDC Science Club registrations
 */
export async function createClubSpreadsheet(
  accessToken: string, 
  title: string = 'NGDC Science Club Registrations 2026'
): Promise<SheetMetadata> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const body = {
    properties: {
      title
    },
    sheets: [
      {
        properties: {
          title: 'Registrations',
          gridProperties: {
            frozenRowCount: 1
          }
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: DEFAULT_HEADERS.map(header => ({
                  userEnteredValue: { stringValue: header },
                  userEnteredFormat: {
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                    backgroundColor: { red: 0.05, green: 0.58, blue: 0.4 }, // Emerald green brand color
                    horizontalAlignment: 'CENTER'
                  }
                }))
              }
            ]
          }
        ]
      }
    ]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create Google Spreadsheet (${res.status})`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const sheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    id: spreadsheetId,
    name: data.properties?.title || title,
    url: sheetUrl,
    firstSheetTitle: 'Registrations'
  };
}

/**
 * Fetch spreadsheet metadata to verify existence and get the first sheet name
 */
export async function getSpreadsheetDetails(accessToken: string, spreadsheetId: string): Promise<SheetMetadata> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,spreadsheetUrl,sheets.properties(title,sheetId)`;
  
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Spreadsheet not found or inaccessible (${res.status})`);
  }

  const data = await res.json();
  const firstSheetTitle = data.sheets?.[0]?.properties?.title || 'Sheet1';

  return {
    id: spreadsheetId,
    name: data.properties?.title || 'Spreadsheet',
    url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    firstSheetTitle
  };
}

/**
 * Append a single registration record to the connected Google Spreadsheet
 */
export async function appendRegistrationRow(
  accessToken: string,
  spreadsheetId: string,
  record: SubmissionRecord,
  sheetTitle: string = 'Registrations'
): Promise<void> {
  const range = encodeURIComponent(`${sheetTitle}!A1`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const rowData = [
    record.submittedAt,
    record.name,
    record.studentId || '',
    record.phone,
    record.whatsapp,
    record.email,
    record.batch,
    record.section,
    record.dob,
    (record.interestedSegments || []).join(', '),
    record.agreedToRules ? 'Yes' : 'No',
    record.photo ? 'Yes (Uploaded)' : 'No'
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [rowData]
    })
  });

  if (!res.ok) {
    // If appending with explicit sheetTitle failed, try fallback without sheetTitle
    if (sheetTitle !== 'Sheet1') {
      return appendRegistrationRow(accessToken, spreadsheetId, record, 'Sheet1');
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to append data to Google Sheet (${res.status})`);
  }
}

/**
 * Read current rows from the spreadsheet for preview
 */
export async function readSpreadsheetRows(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string = 'Registrations'
): Promise<string[][]> {
  const range = encodeURIComponent(`${sheetTitle}!A1:L50`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    if (sheetTitle !== 'Sheet1') {
      return readSpreadsheetRows(accessToken, spreadsheetId, 'Sheet1');
    }
    return [];
  }

  const data = await res.json();
  return data.values || [];
}

export const PRIMARY_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbx7VHpP91EYt1o0OCYqs00RSn1exWb39KDThdrS9E9Ok-SA6CnKe0p59K4mEr-oHMFm/exec';

/**
 * Automatically send submission to the designated Google Sheet
 */
export async function submitToTargetSheet(
  record: SubmissionRecord,
  accessToken?: string | null
): Promise<{ success: boolean; method: string }> {
  // 1. Try Google Apps Script Webhook URL (user provided primary script)
  const webhookUrl = 
    (import.meta.env.VITE_SHEETS_WEBHOOK_URL as string) ||
    PRIMARY_WEBHOOK_URL ||
    localStorage.getItem('ngdc_sheets_webhook');

  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(record)
      });
      return { success: true, method: 'webhook' };
    } catch (e) {
      console.warn('Google Apps Script Webhook submission error:', e);
    }
  }

  // 2. Try Google Sheets API with accessToken if available
  if (accessToken) {
    try {
      await appendRegistrationRow(accessToken, TARGET_SPREADSHEET_ID, record, 'Registrations');
      return { success: true, method: 'oauth_api' };
    } catch (e) {
      console.warn('Direct Google Sheets API append error:', e);
    }
  }

  return { success: false, method: 'none' };
}
