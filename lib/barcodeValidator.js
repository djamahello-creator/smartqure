// lib/barcodeValidator.js - Barcode Validation and Parsing Utilities

/**
 * Validate and parse GS1 barcode data
 * GS1 barcodes use Application Identifiers (AI) to encode data
 */

// Common GS1 Application Identifiers
const GS1_AI = {
  GTIN: '01',           // Global Trade Item Number (14 digits)
  BATCH: '10',          // Batch/Lot Number
  EXPIRY: '17',         // Expiry Date (YYMMDD)
  SERIAL: '21',         // Serial Number
  PRODUCTION_DATE: '11' // Production Date (YYMMDD)
};

/**
 * Calculate check digit for GTIN (UPC/EAN)
 */
function calculateGTINCheckDigit(gtin) {
  const digits = gtin.slice(0, -1).split('').map(Number);
  let sum = 0;

  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 0 ? 3 : 1);
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit;
}

/**
 * Validate GTIN (UPC/EAN) barcode
 */
export function validateGTIN(barcode) {
  // Remove any spaces or dashes
  const cleaned = barcode.replace(/[\s-]/g, '');

  // GTIN can be 8, 12, 13, or 14 digits
  const validLengths = [8, 12, 13, 14];

  if (!validLengths.includes(cleaned.length)) {
    return {
      valid: false,
      error: 'Invalid GTIN length. Must be 8, 12, 13, or 14 digits.'
    };
  }

  if (!/^\d+$/.test(cleaned)) {
    return {
      valid: false,
      error: 'GTIN must contain only digits.'
    };
  }

  // Validate check digit
  const providedCheckDigit = parseInt(cleaned[cleaned.length - 1]);
  const calculatedCheckDigit = calculateGTINCheckDigit(cleaned);

  if (providedCheckDigit !== calculatedCheckDigit) {
    return {
      valid: false,
      error: 'Invalid check digit.',
      confidence: 30
    };
  }

  return {
    valid: true,
    gtin: cleaned,
    type: getGTINType(cleaned.length),
    confidence: 95
  };
}

/**
 * Get GTIN type based on length
 */
function getGTINType(length) {
  switch(length) {
    case 8: return 'GTIN-8 (EAN-8)';
    case 12: return 'GTIN-12 (UPC-A)';
    case 13: return 'GTIN-13 (EAN-13)';
    case 14: return 'GTIN-14';
    default: return 'Unknown';
  }
}

/**
 * Parse GS1-128 barcode (complex format with AIs)
 */
export function parseGS1Barcode(barcode) {
  const data = {
    gtin: null,
    batch: null,
    expiry: null,
    serial: null,
    productionDate: null,
    raw: barcode
  };

  // GS1-128 barcodes start with special characters and use AIs
  let remaining = barcode;

  // Try to extract GTIN (01)
  const gtinMatch = remaining.match(/01(\d{14})/);
  if (gtinMatch) {
    data.gtin = gtinMatch[1];
    remaining = remaining.replace(gtinMatch[0], '');
  }

  // Try to extract Batch (10)
  const batchMatch = remaining.match(/10([A-Z0-9]+?)(?=\d{2}|$)/);
  if (batchMatch) {
    data.batch = batchMatch[1];
  }

  // Try to extract Expiry Date (17)
  const expiryMatch = remaining.match(/17(\d{6})/);
  if (expiryMatch) {
    const yymmdd = expiryMatch[1];
    data.expiry = parseGS1Date(yymmdd);
  }

  // Try to extract Serial (21)
  const serialMatch = remaining.match(/21([A-Z0-9]+?)(?=\d{2}|$)/);
  if (serialMatch) {
    data.serial = serialMatch[1];
  }

  return data;
}

/**
 * Parse GS1 date format (YYMMDD) to readable date
 */
function parseGS1Date(yymmdd) {
  if (yymmdd.length !== 6) return null;

  const yy = parseInt(yymmdd.substring(0, 2));
  const mm = parseInt(yymmdd.substring(2, 4));
  const dd = parseInt(yymmdd.substring(4, 6));

  // Assume dates 00-30 are 2000-2030, 31-99 are 1931-1999
  const year = yy <= 30 ? 2000 + yy : 1900 + yy;

  // Create date object and format
  try {
    const date = new Date(year, mm - 1, dd);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch {
    return null;
  }
}

/**
 * Main validation function for any barcode
 */
export function validateBarcode(barcode) {
  const cleaned = barcode.replace(/[\s-]/g, '');

  // Try GTIN validation first (most common for medications)
  const gtinResult = validateGTIN(cleaned);

  if (gtinResult.valid) {
    return {
      ...gtinResult,
      format: 'GTIN',
      medicationData: null
    };
  }

  // Try GS1-128 parsing
  if (cleaned.length > 14) {
    const gs1Data = parseGS1Barcode(cleaned);

    if (gs1Data.gtin) {
      const gtinValidation = validateGTIN(gs1Data.gtin);

      return {
        valid: gtinValidation.valid,
        format: 'GS1-128',
        confidence: gtinValidation.valid ? 92 : 50,
        gtin: gs1Data.gtin,
        batch: gs1Data.batch,
        expiry: gs1Data.expiry,
        serial: gs1Data.serial,
        medicationData: gs1Data
      };
    }
  }

  // If nothing worked, it's still a barcode but we can't validate it
  return {
    valid: false,
    format: 'Unknown',
    confidence: 0,
    error: 'Unable to validate barcode format. May not be a GS1-compliant pharmaceutical barcode.',
    barcode: cleaned
  };
}

/**
 * Get medication info from barcode (placeholder for future API integration)
 * In production, this would call a GS1 Global Registry API or similar
 */
export async function getMedicationInfoFromGTIN(gtin) {
  // Placeholder - in production, integrate with:
  // - GS1 Global Registry (https://www.gs1.org/services/verified-by-gs1)
  // - FDA National Drug Code Directory
  // - WHO International Medical Products Database

  // For now, return basic structure
  return {
    gtin,
    name: `Medication (GTIN: ${gtin})`,
    manufacturer: null,
    verified: false,
    needsManualReview: true,
    source: 'Barcode scan - pending verification'
  };
}

/**
 * Calculate overall confidence score
 */
export function calculateConfidenceScore(validationResult, hasGTIN, hasExpiryData) {
  let confidence = validationResult.confidence || 0;

  // Boost confidence if we have additional data
  if (hasGTIN) confidence = Math.min(100, confidence + 5);
  if (hasExpiryData) confidence = Math.min(100, confidence + 3);

  // Check if expiry date is in the future
  if (validationResult.expiry) {
    const expiryDate = new Date(validationResult.expiry);
    const now = new Date();

    if (expiryDate < now) {
      // Expired medication
      confidence = Math.max(0, confidence - 20);
    }
  }

  return Math.round(confidence);
}
