// components/flows/IDVerificationFlow.jsx
'use client';
// ID verification flow — calls /api/id-verify (server-side AWS Rekognition).
// AWS credentials are NEVER imported or used here.
// Tesseract OCR is also now handled server-side via DetectTextCommand.
import React, { useState, useEffect } from 'react';
import { Shield, ArrowLeft, Camera, Loader2 } from 'lucide-react';
import { getCurrentUser } from '../../lib/supabase';

const IDVerificationFlow = ({ onNavigate }) => {
  const [step, setStep] = useState(1); // 1: front, 2: back, 3: selfie
  const [photos, setPhotos] = useState({ front: null, back: null, selfie: null });
  const [verifying, setVerifying] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  const stepTitles = {
    1: 'Scan ID Front',
    2: 'Scan ID Back',
    3: 'Take Selfie',
  };

  const stepInstructions = {
    1: 'Place your ID card front side within the frame',
    2: 'Place your ID card back side within the frame',
    3: 'Position your face within the frame',
  };

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [stream]);

  // Cleanup stream when camera is deactivated
  useEffect(() => {
    if (!cameraActive && stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [cameraActive]);

  // Auto-start camera on step change
  useEffect(() => {
    if (!cameraActive && !verifying) {
      startCamera();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: step === 3 ? 'user' : 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      setStream(mediaStream);
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(err => console.error('Video play error:', err));
        }
      }, 100);
    } catch (error) {
      console.error('Camera access error:', error);
      alert('Camera access denied. Please enable camera permissions and try again.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;

    canvas.getContext('2d').drawImage(video, 0, 0);
    const photoData = canvas.toDataURL('image/jpeg', 0.95);

    // Stop camera
    if (stream) stream.getTracks().forEach(track => track.stop());
    setCameraActive(false);

    if (step === 1) {
      setPhotos(prev => ({ ...prev, front: photoData }));
      setStep(2);
    } else if (step === 2) {
      setPhotos(prev => ({ ...prev, back: photoData }));
      setStep(3);
    } else if (step === 3) {
      const allPhotos = { ...photos, selfie: photoData };
      setPhotos(allPhotos);
      handleVerification(allPhotos);
    }
  };

  // ── Send photos to server-side /api/id-verify ─────────────────────────────
  const handleVerification = async (allPhotos) => {
    setVerifying(true);

    try {
      const user = await getCurrentUser();
      if (!user) {
        setVerifying(false);
        onNavigate('auth', { mode: 'login' });
        return;
      }

      setProcessingStep('Uploading images securely…');

      const res = await fetch('/api/id-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front:   allPhotos.front,
          back:    allPhotos.back   || null,
          selfie:  allPhotos.selfie,
          user_id: user.id,
        }),
      });

      setProcessingStep('Analysing facial features…');

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const data = await res.json();

      setVerifying(false);

      if (data.result === 'verified') {
        onNavigate('id-result-verified', {
          confidence: data.confidence,
          ocrData:    data.extracted || {},
        });
      } else {
        onNavigate('id-result-caution', {
          confidence: data.confidence,
          message: data.confidence < 70
            ? `Face match confidence is ${data.confidence}% (minimum 70% required). Please try again with clear, well-lit photos.`
            : 'Verification completed — manual review may be required.',
          ocrData: data.extracted || {},
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerifying(false);
      alert(error.message || 'Verification failed. Please try again.');
      // Reset so user can retry
      setStep(1);
      setPhotos({ front: null, back: null, selfie: null });
    }
  };

  // ── Verifying loading screen ──────────────────────────────────────────────
  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <Loader2 className="w-16 h-16 text-teal-500 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Verifying Your Identity</h2>
            {processingStep && (
              <p className="text-teal-600 font-semibold text-sm animate-pulse mb-2">{processingStep}</p>
            )}
            <p className="text-xs text-gray-500 mt-4">This may take 10–30 seconds</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Camera capture screen ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black relative overflow-hidden pb-20">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm z-50">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => step === 1 ? onNavigate('homepage') : setStep(step - 1)}
                className="p-1.5 hover:bg-white/10 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-base font-bold text-white">{stepTitles[step]}</h1>
                <p className="text-xs text-teal-100">Step {step} of 3</p>
              </div>
            </div>
            <div className="bg-teal-500 rounded-lg p-1.5">
              <Shield className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute top-16 left-0 right-0 z-40">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white/20 h-1 rounded-full overflow-hidden">
            <div
              className="bg-teal-500 h-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Camera or static background */}
      {cameraActive && stream ? (
        <div className="absolute inset-0 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #ffffff 2px, #ffffff 4px)',
          }} />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Instructions */}
      <div className="absolute top-24 left-0 right-0 z-30">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-3 text-center">
            <p className="text-sm font-medium text-white">{stepInstructions[step]}</p>
          </div>
        </div>
      </div>

      {/* Capture frame overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className={`relative ${step === 3 ? 'w-48 h-64' : 'w-72 h-44'}`}>
          <div
            className="absolute inset-0 border-2 border-teal-500 rounded-2xl"
            style={{ boxShadow: '0 0 0 2px rgba(20, 184, 166, 0.3), 0 0 30px rgba(20, 184, 166, 0.4)' }}
          >
            <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-2xl" />
            <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-2xl" />
            <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-2xl" />
            <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-2xl" />
          </div>
        </div>
      </div>

      {/* Capture button */}
      <div className="absolute bottom-20 left-0 right-0 z-20">
        <div className="max-w-md mx-auto px-6 pb-4 flex items-center justify-center">
          <button
            onClick={capturePhoto}
            disabled={!cameraActive}
            className="bg-white rounded-full p-5 shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-8 h-8 text-teal-600" />
          </button>
        </div>
        {!cameraActive && (
          <p className="text-center text-white text-xs mt-2">Starting camera…</p>
        )}
      </div>

      {/* Security notice */}
      <div className="absolute bottom-4 left-0 right-0 z-20">
        <div className="max-w-md mx-auto px-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-center">
            <p className="text-xs text-white">🔒 Encrypted — processed server-side via AWS Rekognition</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IDVerificationFlow;
