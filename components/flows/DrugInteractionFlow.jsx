// components/flows/DrugInteractionFlow.jsx
'use client';
import React, { useState } from 'react';
import { Search, X, AlertTriangle, CheckCircle, Info, Pill, Loader2, ArrowLeft } from 'lucide-react';

const DrugInteractionFlow = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery]     = useState('');
  const [selectedDrugs, setSelectedDrugs] = useState([]);
  const [showResults, setShowResults]     = useState(false);
  const [isSearching, setIsSearching]     = useState(false);
  const [filteredDrugs, setFilteredDrugs] = useState([]);

  // Drug database
  const drugDatabase = [
    'Metformin', 'Lisinopril', 'Atorvastatin', 'Levothyroxine', 'Amlodipine',
    'Metoprolol', 'Omeprazole', 'Losartan', 'Gabapentin', 'Hydrochlorothiazide',
    'Sertraline', 'Simvastatin', 'Montelukast', 'Furosemide', 'Aspirin',
    'Warfarin', 'Clopidogrel', 'Prednisone', 'Albuterol', 'Insulin',
    'Amoxicillin', 'Ciprofloxacin', 'Doxycycline', 'Ibuprofen', 'Paracetamol',
    'Diclofenac', 'Prednisolone', 'Fluconazole', 'Metronidazole', 'Co-trimoxazole',
  ];

  const mockInteractions = {
    'Warfarin-Aspirin': {
      severity: 'severe',
      description: 'Increased risk of bleeding when taken together. Both drugs affect blood clotting.',
      recommendation: 'Avoid this combination unless specifically directed by your doctor. If prescribed together, close monitoring is required.',
      symptoms: 'Unusual bruising, bleeding gums, blood in urine or stool, severe headache',
    },
    'Metformin-Lisinopril': {
      severity: 'moderate',
      description: 'May increase risk of lactic acidosis in patients with kidney problems.',
      recommendation: 'Monitor kidney function regularly. Inform your doctor if you experience muscle pain or breathing difficulty.',
      symptoms: 'Muscle pain, unusual tiredness, difficulty breathing, stomach pain',
    },
    'Sertraline-Aspirin': {
      severity: 'moderate',
      description: 'May increase risk of bleeding, especially gastrointestinal bleeding.',
      recommendation: 'Use together only if benefits outweigh risks. Monitor for signs of bleeding.',
      symptoms: 'Black/tarry stools, vomiting blood, severe stomach pain',
    },
    'Warfarin-Ibuprofen': {
      severity: 'severe',
      description: 'Ibuprofen can increase anticoagulant effect of warfarin, significantly raising bleeding risk.',
      recommendation: 'Avoid combination. Use paracetamol for pain relief instead. If necessary, monitor INR closely.',
      symptoms: 'Unusual bruising, prolonged bleeding from cuts, blood in urine',
    },
    'Ciprofloxacin-Warfarin': {
      severity: 'severe',
      description: 'Ciprofloxacin inhibits metabolism of warfarin, leading to elevated drug levels and bleeding risk.',
      recommendation: 'Monitor INR closely during and after antibiotic course. Consider dose adjustment.',
      symptoms: 'Easy bruising, prolonged bleeding, blood in stool or urine',
    },
    'Metformin-Furosemide': {
      severity: 'moderate',
      description: 'Furosemide may increase metformin levels; dehydration from furosemide can impair kidney function.',
      recommendation: 'Monitor renal function and ensure adequate hydration. Adjust doses as needed.',
      symptoms: 'Nausea, vomiting, muscle cramps, reduced urine output',
    },
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    if (value.trim().length > 0) {
      const filtered = drugDatabase.filter(drug =>
        drug.toLowerCase().includes(value.toLowerCase()) &&
        !selectedDrugs.includes(drug)
      );
      setFilteredDrugs(filtered.slice(0, 5));
    } else {
      setFilteredDrugs([]);
    }
  };

  const selectDrug = (drug) => {
    if (selectedDrugs.length < 4 && !selectedDrugs.includes(drug)) {
      setSelectedDrugs([...selectedDrugs, drug]);
      setSearchQuery('');
      setFilteredDrugs([]);
    }
  };

  const removeDrug = (drug) => {
    setSelectedDrugs(selectedDrugs.filter(d => d !== drug));
    setShowResults(false);
  };

  const checkInteractions = () => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      setShowResults(true);
    }, 1200);
  };

  const getInteractions = () => {
    const interactions = [];
    for (let i = 0; i < selectedDrugs.length; i++) {
      for (let j = i + 1; j < selectedDrugs.length; j++) {
        const key1 = `${selectedDrugs[i]}-${selectedDrugs[j]}`;
        const key2 = `${selectedDrugs[j]}-${selectedDrugs[i]}`;
        if (mockInteractions[key1]) {
          interactions.push({ drugs: [selectedDrugs[i], selectedDrugs[j]], ...mockInteractions[key1] });
        } else if (mockInteractions[key2]) {
          interactions.push({ drugs: [selectedDrugs[j], selectedDrugs[i]], ...mockInteractions[key2] });
        }
      }
    }
    return interactions;
  };

  const severityConfig = {
    severe:   { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   label: 'SEVERE'   },
    moderate: { color: '#FCA311', bg: 'rgba(252,163,17,0.1)',  border: 'rgba(252,163,17,0.25)',  label: 'MODERATE' },
    minor:    { color: '#10B981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)',  label: 'MINOR'    },
  };

  const pageStyle = {
    minHeight: '100vh',
    background: '#0A1628',
    color: '#E8F0F8',
    fontFamily: "'Inter', system-ui, sans-serif",
    paddingBottom: 100,
  };

  const headerStyle = {
    background: 'rgba(10,22,40,0.95)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    position: 'sticky',
    top: 0,
    zIndex: 50,
  };

  const cardStyle = {
    background: '#111D33',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 16,
  };

  const interactions = getInteractions();

  return (
    <div style={pageStyle}>

      {/* Header */}
      <div style={headerStyle}>
        <button
          onClick={() => onNavigate('prescriptions')}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.07)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #0D7377, #14A085)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Pill size={18} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#FFFFFF', fontFamily: "'Space Grotesk', sans-serif" }}>
            Drug Interaction Checker
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Check up to 4 medications</div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>

        {/* Search Box */}
        <div style={{ ...cardStyle, marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 10, letterSpacing: '0.06em' }}>
            SEARCH MEDICATIONS ({selectedDrugs.length}/4 ADDED)
          </p>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Type a drug name…"
              disabled={selectedDrugs.length >= 4}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '10px 12px 10px 36px',
                color: '#E8F0F8', fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          {filteredDrugs.length > 0 && (
            <div style={{
              marginTop: 6, background: '#0F1A2E',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, overflow: 'hidden',
            }}>
              {filteredDrugs.map(drug => (
                <button
                  key={drug}
                  onClick={() => selectDrug(drug)}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'transparent', border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', color: '#E8F0F8', fontSize: 13,
                    textAlign: 'left',
                  }}
                >
                  <Pill size={14} style={{ color: '#14A085', flexShrink: 0 }} />
                  {drug}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Drugs */}
        {selectedDrugs.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 10, letterSpacing: '0.06em' }}>
              SELECTED DRUGS
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedDrugs.map((drug, idx) => (
                <div key={drug} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'rgba(13,115,119,0.1)',
                  border: '1px solid rgba(13,115,119,0.2)',
                  borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0D7377, #14A085)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>{idx + 1}</div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>{drug}</span>
                  </div>
                  <button
                    onClick={() => removeDrug(drug)}
                    style={{
                      background: 'transparent', border: 'none',
                      cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.4)',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {showResults && (
          <div style={{ marginBottom: 14 }}>
            {interactions.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: 32 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(16,185,129,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <CheckCircle size={28} style={{ color: '#10B981' }} />
                </div>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#10B981', marginBottom: 6 }}>
                  No Known Interactions Found
                </p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                  Based on our database, no significant interactions were detected between these medications.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {interactions.map((interaction, idx) => {
                  const cfg = severityConfig[interaction.severity] || severityConfig.minor;
                  return (
                    <div key={idx} style={{
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      borderRadius: 16, padding: 16,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <AlertTriangle size={18} style={{ color: cfg.color }} />
                          <span style={{ fontWeight: 700, fontSize: 13, color: cfg.color, letterSpacing: '0.06em' }}>
                            {cfg.label}
                          </span>
                        </div>
                        <span style={{
                          fontSize: 12, fontWeight: 700, color: '#FFFFFF',
                          background: 'rgba(255,255,255,0.1)',
                          padding: '2px 10px', borderRadius: 99,
                        }}>
                          {interaction.drugs[0]} + {interaction.drugs[1]}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginBottom: 8 }}>
                        {interaction.description}
                      </p>
                      <div style={{
                        background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 12px',
                        marginBottom: 8,
                      }}>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 3, letterSpacing: '0.06em' }}>
                          RECOMMENDATION
                        </p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                          {interaction.recommendation}
                        </p>
                      </div>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                        Watch for: {interaction.symptoms}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{
          background: 'rgba(252,163,17,0.08)',
          border: '1px solid rgba(252,163,17,0.2)',
          borderRadius: 12, padding: '12px 14px',
          display: 'flex', gap: 10, marginBottom: 14,
        }}>
          <Info size={16} style={{ color: '#FCA311', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#FCA311', marginBottom: 3 }}>
              Important Notice
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              This tool provides general guidance only. Always consult your doctor or pharmacist before making
              changes to your medications.
            </p>
          </div>
        </div>

        {/* Check Button */}
        {selectedDrugs.length >= 2 && !showResults && (
          <button
            onClick={checkInteractions}
            disabled={isSearching}
            style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg, #0D7377, #14A085)',
              border: 'none', borderRadius: 14,
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: isSearching ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: isSearching ? 0.7 : 1,
            }}
          >
            {isSearching ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Checking interactions…
              </>
            ) : (
              `Check Interactions (${selectedDrugs.length} drugs)`
            )}
          </button>
        )}

        {showResults && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setShowResults(false); setSelectedDrugs([]); setSearchQuery(''); }}
              style={{
                flex: 1, padding: '12px',
                background: 'linear-gradient(135deg, #0D7377, #14A085)',
                border: 'none', borderRadius: 12,
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Check Different Drugs
            </button>
            <button
              onClick={() => onNavigate('triage')}
              style={{
                flex: 1, padding: '12px',
                background: '#111D33',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Talk to Care Navigator
            </button>
          </div>
        )}

        {selectedDrugs.length < 2 && !showResults && selectedDrugs.length > 0 && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>
            Add at least 2 medications to check for interactions
          </p>
        )}

        {selectedDrugs.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>
            Search and add medications above to get started
          </p>
        )}

      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DrugInteractionFlow;
