// components/flows/ScannerFlow.jsx - UPDATED with Real Barcode Scanning
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Shield, Camera, FileText, X, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';
import Quagga from '@ericblade/quagga2';
import { validateBarcode, calculateConfidenceScore, getMedicationInfoFromGTIN } from '../../lib/barcodeValidator';

const ScannerFlow = ({ onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detectedBarcode, setDetectedBarcode] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (scanning && scannerRef.current) {
      initializeScanner();
    }

    return () => {
      if (Quagga) {
        Quagga.stop();
      }
    };
  }, [scanning]);

  const initializeScanner = () => {
    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: scannerRef.current,
          constraints: {
            width: { min: 640 },
            height: { min: 480 },
            facingMode: 'environment',
            aspectRatio: { min: 1, max: 2 }
          }
        },
        locator: {
          patchSize: 'medium',
          halfSample: true
        },
        numOfWorkers: 4,
        decoder: {
          readers: [
            'code_128_reader',
            'ean_reader',
            'ean_8_reader',
            'code_39_reader',
            'code_39_vin_reader',
            'codabar_reader',
            'upc_reader',
            'upc_e_reader'
          ],
          debug: {
            drawBoundingBox: true,
            showFrequency: false,
            drawScanline: true,
            showPattern: false
          }
        },
        locate: true
      },
      (err) => {
        if (err) {
          console.error('QuaggaJS initialization error:', err);
          setScanning(false);
          onNavigate('result-caution', {
            scan: {
              name: 'Camera Error',
              result: 'error',
              error: 'Camera access denied or not available. Please enable camera permissions.'
            }
          });
          return;
        }
        
        Quagga.start();
        setCameraReady(true);
        
        Quagga.onDetected((result) => {
          if (result && result.codeResult && result.codeResult.code) {
            const code = result.codeResult.code;
            
            // Confidence threshold to avoid false positives
            if (result.codeResult.decodedCodes.filter(x => x.error < 0.1).length > 0) {
              setDetectedBarcode(code);
              handleBarcodeDetected(code);
              
              // Stop scanning after successful detection
              Quagga.stop();
              setScanning(false);
            }
          }
        });
      }
    );
  };

  const handleBarcodeDetected = async (barcode) => {
    setLoading(true);

    try {
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        onNavigate('auth', { mode: 'login' });
        return;
      }

      // Call the real verification API (server-side)
      // The API handles GS1 parsing, DB lookup, scoring, and scan saving internally
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:        'barcode',
          raw_barcode: barcode,
          user_id:     user.id,
        }),
      });

      if (!res.ok) throw new Error(`Verification service error (${res.status})`);
      const verification = await res.json();

      const resultScreen =
        verification.result === 'verified' ? 'result-verified' :
        verification.result === 'fake'     ? 'result-fake'     :
        'result-caution';

      if (true) {  // equivalent to data && data[0] in the original
        const scanResult = {
          id:           verification.scan_id,
          name:         verification.medication?.name || `Medication (GTIN: ${barcode})`,
          result:       verification.result,
          confidence:   verification.confidence,
          time:         'Just now',
          hasAlert:     !!verification.alert,
          alert:        verification.alert                      || null,
          batch:        verification.batch?.batch_number        || 'N/A',
          manufacturer: verification.manufacturer?.name         || 'Unknown',
          expiry:       verification.batch?.expiry_date         || null,
          gtin:         barcode,
          flags:        verification.flags                      || [],
          who_eml:      verification.medication?.who_eml        || false,
        };

        onNavigate(resultScreen, { scan: scanResult });
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      onNavigate('result-caution', {
        scan: {
          name:       'Scan Error',
          result:     'unknown',
          confidence: 0,
          flags:      ['scan_error'],
          error:      error.message || 'Failed to process barcode',
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartScan = () => {
    setScanning(true);
    setDetectedBarcode(null);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    setLoading(true);

    try {
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        onNavigate('auth', { mode: 'login' });
        return;
      }

      // Upload image to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('medication-scans')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('medication-scans')
        .getPublicUrl(fileName);

      // Process barcode from uploaded image
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          Quagga.decodeSingle(
            {
              src: e.target.result,
              numOfWorkers: 0,
              inputStream: {
                size: 800
              },
              decoder: {
                readers: ['code_128_reader', 'ean_reader', 'upc_reader']
              }
            },
            async (result) => {
              if (result && result.codeResult) {
                const barcode = result.codeResult.code;

                // Validate and parse barcode (same as camera scan)
                const validation = validateBarcode(barcode);
                const confidence = calculateConfidenceScore(
                  validation,
                  !!validation.gtin,
                  !!validation.expiry
                );

                const medicationInfo = validation.gtin
                  ? await getMedicationInfoFromGTIN(validation.gtin)
                  : null;

                let result = 'caution';
                let message = '';

                if (validation.valid && confidence >= 85) {
                  result = 'verified';
                  message = `Valid ${validation.format} barcode detected from photo`;
                } else if (validation.valid && confidence >= 60) {
                  result = 'caution';
                  message = 'Barcode validated but additional verification recommended';
                } else {
                  result = 'caution';
                  message = validation.error || 'Barcode format could not be fully validated';
                }

                if (validation.expiry) {
                  const expiryDate = new Date(validation.expiry);
                  if (expiryDate < new Date()) {
                    result = 'caution';
                    message = `EXPIRED: This medication expired on ${validation.expiry}`;
                  }
                }

                // Save scan with image
                const { data, error } = await supabase.from('scans').insert({
                  user_id: user.id,
                  medication_name: medicationInfo?.name || `Medication (${validation.format || 'Unknown'})`,
                  batch_number: validation.batch || validation.gtin || barcode,
                  expiry_date: validation.expiry || null,
                  manufacturer: medicationInfo?.manufacturer || null,
                  photo_url: publicUrl,
                  scan_type: 'photo',
                  result: result,
                  confidence: confidence,
                  has_alert: result !== 'verified',
                  barcode_data: JSON.stringify(validation)
                }).select();

                if (error) throw error;

                if (data && data[0]) {
                  const scanResult = {
                    id: data[0].id,
                    name: data[0].medication_name,
                    result: result,
                    confidence: confidence,
                    time: 'Just now',
                    hasAlert: result !== 'verified',
                    batch: data[0].batch_number,
                    manufacturer: data[0].manufacturer,
                    expiry: validation.expiry,
                    gtin: validation.gtin,
                    format: validation.format,
                    message: message
                  };

                  const destination = result === 'verified' ? 'result-verified' : 'result-caution';
                  onNavigate(destination, { scan: scanResult });
                }
              } else {
                onNavigate('result-caution', {
                  scan: {
                    name: 'No Barcode Detected',
                    result: 'error',
                    error: 'No barcode detected in image. Please try again or enter manually.'
                  }
                });
                setLoading(false);
              }
            }
          );
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      onNavigate('result-caution', {
        scan: {
          name: 'Upload Error',
          result: 'error',
          error: error.message || 'Failed to upload image'
        }
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden pb-20">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm z-50">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-teal-500 rounded-lg p-1.5">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-base font-bold text-white">SmartQure Scanner</h1>
            </div>
            <button
              onClick={() => {
                if (Quagga && scanning) Quagga.stop();
                onNavigate('homepage');
              }}
              className="p-2 hover:bg-white/10 rounded-lg"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-20 left-0 right-0 z-30">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
            <p className="text-sm font-medium text-white">
              {detectedBarcode 
                ? `Barcode Detected: ${detectedBarcode}` 
                : scanning 
                ? 'Scanning... Hold steady' 
                : 'Point camera at medication barcode'}
            </p>
          </div>
        </div>
      </div>

      {/* Camera Feed or Placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        {scanning ? (
          <div 
            ref={scannerRef} 
            className="w-full h-full"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
        ) : (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 w-full h-full">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #ffffff 2px, #ffffff 4px)',
            }}></div>
          </div>
        )}
      </div>

      {/* Scanning Frame Overlay */}
      {scanning && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="relative w-64 h-64">
            <div 
              className="absolute inset-0 border-2 border-teal-500 rounded-2xl animate-pulse"
              style={{ boxShadow: '0 0 0 2px rgba(20, 184, 166, 0.3), 0 0 30px rgba(20, 184, 166, 0.4)' }}
            >
              <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-2xl" />
              <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-2xl" />
              <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-2xl" />
              <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-2xl" />
            </div>
            
            {detectedBarcode && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-emerald-500 rounded-full p-3 animate-bounce">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-20 left-0 right-0 z-20">
        <div className="max-w-md mx-auto px-6 pb-4">
          <div className="flex items-center justify-around mb-4">
            <label className="flex flex-col items-center space-y-1 cursor-pointer">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <span className="text-white text-xs font-medium">Upload</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files[0])}
                className="hidden"
                disabled={loading || scanning}
              />
            </label>

            <button
              onClick={scanning ? () => {
                Quagga.stop();
                setScanning(false);
              } : handleStartScan}
              disabled={loading}
              className="bg-white rounded-full p-5 shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
              ) : scanning ? (
                <X className="w-8 h-8 text-rose-600" />
              ) : (
                <Camera className="w-8 h-8 text-teal-600" />
              )}
            </button>

            <button
              onClick={() => onNavigate('manual-entry')}
              className="flex flex-col items-center space-y-1"
              disabled={loading || scanning}
            >
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-white text-xs font-medium">Manual</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div className="absolute bottom-4 left-0 right-0 z-20">
        <div className="max-w-md mx-auto px-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-center">
            <p className="text-xs text-white">
              📱 QuaggaJS Detection + GS1 Validation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScannerFlow;
