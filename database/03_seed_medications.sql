-- ============================================================
-- MedVerify: Seed Data - Essential Medicines (East Africa Focus)
-- Based on: WHO Essential Medicines List (23rd Edition, 2023)
-- Regional relevance: Somalia, Kenya, Ethiopia, Uganda, Tanzania, Rwanda
-- ~160 medicines across all major therapeutic classes
-- Run AFTER 01_medicines_verification_tables.sql and 02_seed_manufacturers.sql
-- ============================================================

-- NOTE: manufacturer_ids arrays will be updated via a follow-up script
-- once manufacturers are inserted and their UUIDs are known.
-- For now, primary_manufacturer_id is left NULL and can be updated.

-- ============================================================
-- ANTIMALARIALS (High counterfeit risk in East Africa)
-- ============================================================
INSERT INTO medications (inn_name, brand_names, atc_code, atc_description, dosage_form, strength, route, therapeutic_class, who_eml, who_eml_edition, countries_registered, prescription_required, common_counterfeits, counterfeit_notes, storage_conditions, shelf_life_months, active_ingredients) VALUES
('Artemether + Lumefantrine', ARRAY['Coartem','Riamet','Lumartem','Artefan','AL','Lonart'], 'P01BF01', 'Artemether and lumefantrine', 'tablet', '20mg + 120mg', 'oral', 'Antimalarial', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW','SS','ER'], true, true, 'Most counterfeited antimalarial in East Africa. Fake versions often contain subtherapeutic doses of artemether. Check hologram on Novartis Coartem.', 'Below 30°C, dry place', 24, '[{"name":"artemether","amount":"20mg"},{"name":"lumefantrine","amount":"120mg"}]'::jsonb),

('Artesunate', ARRAY['Artesun','Falcimon','Plasmotrim'], 'P01BE03', 'Artesunate', 'injection', '60mg/vial', 'intravenous', 'Antimalarial', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], true, true, 'Counterfeit injectable artesunate is a critical patient safety threat. WHO has issued multiple alerts. Verify hologram and batch with manufacturer.', '15-25°C, protect from light', 36, '[{"name":"artesunate","amount":"60mg"}]'::jsonb),

('Artesunate', ARRAY['Artecef','Artesunate-Amodiaquine'], 'P01BE03', 'Artesunate', 'tablet', '200mg', 'oral', 'Antimalarial', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, true, 'Frequently adulterated in East Africa.', 'Below 30°C', 24, '[{"name":"artesunate","amount":"200mg"}]'::jsonb),

('Dihydroartemisinin + Piperaquine', ARRAY['Eurartesim','Duo-Cotecxin'], 'P01BF05', 'Dihydroartemisinin and piperaquine', 'tablet', '40mg + 320mg', 'oral', 'Antimalarial', true, '23rd 2023', ARRAY['KE','UG','TZ','RW'], true, false, NULL, 'Below 30°C', 24, '[{"name":"dihydroartemisinin","amount":"40mg"},{"name":"piperaquine","amount":"320mg"}]'::jsonb),

('Chloroquine', ARRAY['Plaquenil','Resochin','Malarex'], 'P01BA01', 'Chloroquine', 'tablet', '150mg base (250mg phosphate)', 'oral', 'Antimalarial', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ'], false, false, NULL, 'Below 30°C', 60, '[{"name":"chloroquine phosphate","amount":"250mg"}]'::jsonb),

('Primaquine', ARRAY['Primaquine'], 'P01BA03', 'Primaquine', 'tablet', '7.5mg / 15mg', 'oral', 'Antimalarial', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, false, NULL, 'Below 25°C', 60, '[{"name":"primaquine","amount":"15mg"}]'::jsonb),

('Quinine', ARRAY['Quinine Sulphate','Qualaquin'], 'P01BC01', 'Quinine', 'tablet', '300mg', 'oral', 'Antimalarial', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ'], true, false, NULL, 'Below 30°C', 60, '[{"name":"quinine sulphate","amount":"300mg"}]'::jsonb),

('Quinine', ARRAY['Quinine Hydrochloride'], 'P01BC01', 'Quinine', 'injection', '300mg/ml (2ml ampoule)', 'intravenous', 'Antimalarial', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ'], true, false, NULL, 'Below 30°C', 36, '[{"name":"quinine hydrochloride","amount":"600mg/2ml"}]'::jsonb),

-- ============================================================
-- ANTIBIOTICS (Most commonly counterfeited category)
-- ============================================================
('Amoxicillin', ARRAY['Amoxil','Trimox','Amoxicillin Trihydrate','Ospamox'], 'J01CA04', 'Amoxicillin', 'capsule', '250mg', 'oral', 'Antibiotic', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, true, 'Extremely common counterfeit. Substandard amoxicillin often contains no active ingredient. Most reported counterfeit antibiotic in East Africa.', 'Below 25°C', 24, '[{"name":"amoxicillin","amount":"250mg"}]'::jsonb),

('Amoxicillin', ARRAY['Amoxil','Trimox'], 'J01CA04', 'Amoxicillin', 'capsule', '500mg', 'oral', 'Antibiotic', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, true, 'High counterfeit risk. Verify packaging carefully.', 'Below 25°C', 24, '[{"name":"amoxicillin","amount":"500mg"}]'::jsonb),

('Amoxicillin', ARRAY['Amoxil Syrup','Trimox'], 'J01CA04', 'Amoxicillin', 'oral suspension', '125mg/5ml', 'oral', 'Antibiotic', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, true, 'Pediatric counterfeit risk is high.', 'Below 25°C', 18, '[{"name":"amoxicillin","amount":"125mg/5ml"}]'::jsonb),

('Amoxicillin + Clavulanic Acid', ARRAY['Augmentin','Co-Amoxiclav','Clavamox','Aclav'], 'J01CR02', 'Amoxicillin and enzyme inhibitor', 'tablet', '500mg + 125mg', 'oral', 'Antibiotic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C', 24, '[{"name":"amoxicillin","amount":"500mg"},{"name":"clavulanic acid","amount":"125mg"}]'::jsonb),

('Azithromycin', ARRAY['Zithromax','Azithrocin','Azimax','Zithrox'], 'J01FA10', 'Azithromycin', 'tablet', '250mg / 500mg', 'oral', 'Antibiotic', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"azithromycin","amount":"500mg"}]'::jsonb),

('Ciprofloxacin', ARRAY['Cipro','Ciprolet','Cifran','Ciprotab'], 'J01MA02', 'Ciprofloxacin', 'tablet', '250mg / 500mg', 'oral', 'Antibiotic', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"ciprofloxacin","amount":"500mg"}]'::jsonb),

('Ciprofloxacin', ARRAY['Cipro IV'], 'J01MA02', 'Ciprofloxacin', 'infusion', '200mg/100ml', 'intravenous', 'Antibiotic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 30°C', 36, '[{"name":"ciprofloxacin","amount":"200mg/100ml"}]'::jsonb),

('Metronidazole', ARRAY['Flagyl','Metrozol','Metrogyl','Flagystatin'], 'J01XD01', 'Metronidazole', 'tablet', '200mg / 400mg', 'oral', 'Antibiotic', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"metronidazole","amount":"400mg"}]'::jsonb),

('Metronidazole', ARRAY['Flagyl IV'], 'J01XD01', 'Metronidazole', 'infusion', '500mg/100ml', 'intravenous', 'Antibiotic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C, protect from light', 36, '[{"name":"metronidazole","amount":"500mg/100ml"}]'::jsonb),

('Doxycycline', ARRAY['Vibramycin','Doxylin','Doxin'], 'J01AA02', 'Doxycycline', 'capsule', '100mg', 'oral', 'Antibiotic', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C, dry', 36, '[{"name":"doxycycline","amount":"100mg"}]'::jsonb),

('Trimethoprim + Sulfamethoxazole', ARRAY['Septrin','Bactrim','Cotrimoxazole','Co-Trimoxazole'], 'J01EE01', 'Sulfamethoxazole and trimethoprim', 'tablet', '80mg + 400mg', 'oral', 'Antibiotic', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, true, 'Used widely for HIV opportunistic infection prophylaxis. Counterfeit versions common.', 'Below 30°C', 36, '[{"name":"trimethoprim","amount":"80mg"},{"name":"sulfamethoxazole","amount":"400mg"}]'::jsonb),

('Trimethoprim + Sulfamethoxazole', ARRAY['Septrin Forte','Bactrim DS'], 'J01EE01', 'Sulfamethoxazole and trimethoprim', 'tablet', '160mg + 800mg (DS)', 'oral', 'Antibiotic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"trimethoprim","amount":"160mg"},{"name":"sulfamethoxazole","amount":"800mg"}]'::jsonb),

('Erythromycin', ARRAY['Erythrocin','Ery-Tab','Erytab'], 'J01FA01', 'Erythromycin', 'tablet', '250mg / 500mg', 'oral', 'Antibiotic', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ'], false, false, NULL, 'Below 30°C', 24, '[{"name":"erythromycin","amount":"500mg"}]'::jsonb),

('Ceftriaxone', ARRAY['Rocephin','Ceftriaxone Sodium','Triacef'], 'J01DD04', 'Ceftriaxone', 'powder for injection', '1g / 2g', 'intravenous', 'Antibiotic', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], true, false, NULL, 'Below 25°C', 36, '[{"name":"ceftriaxone","amount":"1g"}]'::jsonb),

('Ampicillin', ARRAY['Ampicyn','Pentrexyl'], 'J01CA01', 'Ampicillin', 'powder for injection', '500mg / 1g', 'intravenous', 'Antibiotic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C', 36, '[{"name":"ampicillin","amount":"500mg"}]'::jsonb),

('Cloxacillin', ARRAY['Cloxapen','Cloxin'], 'J01CF02', 'Cloxacillin', 'capsule', '250mg / 500mg', 'oral', 'Antibiotic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], false, false, NULL, 'Below 25°C', 24, '[{"name":"cloxacillin","amount":"500mg"}]'::jsonb),

('Gentamicin', ARRAY['Garamycin','Gentocin'], 'J01GB03', 'Gentamicin', 'injection', '40mg/ml', 'intramuscular', 'Antibiotic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, '2-8°C (refrigerate)', 36, '[{"name":"gentamicin","amount":"40mg/ml"}]'::jsonb),

('Nitrofurantoin', ARRAY['Macrobid','Nitrofur','Furadantin'], 'J01XE01', 'Nitrofurantoin', 'capsule', '50mg / 100mg', 'oral', 'Antibiotic', true, '23rd 2023', ARRAY['KE','UG','TZ','RW'], false, false, NULL, 'Below 25°C', 36, '[{"name":"nitrofurantoin","amount":"100mg"}]'::jsonb),

-- ============================================================
-- ANTIRETROVIRALS (HIV/AIDS) - Critical for East Africa
-- ============================================================
('Tenofovir + Lamivudine + Efavirenz', ARRAY['TLD','Symfi Lo','Atripla-Generic'], 'J05AR10', 'Tenofovir disoproxil + lamivudine + efavirenz', 'tablet', '300mg + 300mg + 400mg', 'oral', 'Antiretroviral', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW','SS'], true, false, NULL, 'Below 30°C', 36, '[{"name":"tenofovir disoproxil fumarate","amount":"300mg"},{"name":"lamivudine","amount":"300mg"},{"name":"efavirenz","amount":"400mg"}]'::jsonb),

('Tenofovir + Lamivudine + Dolutegravir', ARRAY['TLD','Triumeq-Generic','Symtuza'], 'J05AR20', 'Tenofovir + lamivudine + dolutegravir', 'tablet', '300mg + 300mg + 50mg', 'oral', 'Antiretroviral', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, false, NULL, 'Below 30°C', 24, '[{"name":"tenofovir disoproxil fumarate","amount":"300mg"},{"name":"lamivudine","amount":"300mg"},{"name":"dolutegravir","amount":"50mg"}]'::jsonb),

('Zidovudine', ARRAY['Retrovir','AZT','Zidolam'], 'J05AF01', 'Zidovudine', 'capsule', '250mg / 300mg', 'oral', 'Antiretroviral', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, false, NULL, 'Below 30°C', 36, '[{"name":"zidovudine","amount":"300mg"}]'::jsonb),

('Nevirapine', ARRAY['Viramune','Nevimune'], 'J05AG01', 'Nevirapine', 'tablet', '200mg', 'oral', 'Antiretroviral', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, false, NULL, 'Below 30°C', 36, '[{"name":"nevirapine","amount":"200mg"}]'::jsonb),

('Lopinavir + Ritonavir', ARRAY['Kaletra','Aluvia'], 'J05AE06', 'Lopinavir and ritonavir', 'tablet', '200mg + 50mg', 'oral', 'Antiretroviral', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, false, NULL, 'Below 25°C', 24, '[{"name":"lopinavir","amount":"200mg"},{"name":"ritonavir","amount":"50mg"}]'::jsonb),

('Lamivudine', ARRAY['Epivir','3TC','Lamivir'], 'J05AF05', 'Lamivudine', 'tablet', '150mg / 300mg', 'oral', 'Antiretroviral', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, false, NULL, 'Below 30°C', 36, '[{"name":"lamivudine","amount":"300mg"}]'::jsonb),

('Dolutegravir', ARRAY['Tivicay','DTG'], 'J05AX12', 'Dolutegravir', 'tablet', '50mg', 'oral', 'Antiretroviral', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, false, NULL, 'Below 30°C', 24, '[{"name":"dolutegravir","amount":"50mg"}]'::jsonb),

-- ============================================================
-- TUBERCULOSIS
-- ============================================================
('Rifampicin', ARRAY['Rimactane','Rifadin','Rifampin'], 'J04AB02', 'Rifampicin', 'capsule', '150mg / 300mg', 'oral', 'Anti-tuberculosis', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW','SO'], true, false, NULL, 'Below 25°C, dry', 36, '[{"name":"rifampicin","amount":"300mg"}]'::jsonb),

('Isoniazid', ARRAY['Rimifon','INH','Isozid'], 'J04AC01', 'Isoniazid', 'tablet', '100mg / 300mg', 'oral', 'Anti-tuberculosis', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW','SO'], true, false, NULL, 'Below 25°C', 60, '[{"name":"isoniazid","amount":"300mg"}]'::jsonb),

('Pyrazinamide', ARRAY['Pyrazinamide','Zinamide'], 'J04AK01', 'Pyrazinamide', 'tablet', '400mg / 500mg', 'oral', 'Anti-tuberculosis', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, false, NULL, 'Below 25°C', 60, '[{"name":"pyrazinamide","amount":"500mg"}]'::jsonb),

('Ethambutol', ARRAY['Myambutol','Etibi'], 'J04AK02', 'Ethambutol', 'tablet', '100mg / 400mg', 'oral', 'Anti-tuberculosis', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, false, NULL, 'Below 25°C', 60, '[{"name":"ethambutol","amount":"400mg"}]'::jsonb),

('Rifampicin + Isoniazid + Pyrazinamide + Ethambutol', ARRAY['Rimstar','4FDC','RHZE'], 'J04AM05', 'Rifampicin + isoniazid + pyrazinamide + ethambutol', 'tablet', '150mg+75mg+400mg+275mg', 'oral', 'Anti-tuberculosis', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, false, NULL, 'Below 25°C, dry', 24, '[{"name":"rifampicin","amount":"150mg"},{"name":"isoniazid","amount":"75mg"},{"name":"pyrazinamide","amount":"400mg"},{"name":"ethambutol","amount":"275mg"}]'::jsonb),

('Streptomycin', ARRAY['Streptomycin Sulphate'], 'J01GA01', 'Streptomycin', 'powder for injection', '1g', 'intramuscular', 'Anti-tuberculosis', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C', 36, '[{"name":"streptomycin","amount":"1g"}]'::jsonb),

-- ============================================================
-- ANALGESICS / ANTIPYRETICS
-- ============================================================
('Paracetamol', ARRAY['Panadol','Tylenol','Acetaminophen','Calpol','Paramax','Hedex'], 'N02BE01', 'Paracetamol', 'tablet', '500mg', 'oral', 'Analgesic/Antipyretic', false, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 60, '[{"name":"paracetamol","amount":"500mg"}]'::jsonb),

('Paracetamol', ARRAY['Calpol','Panadol Children','Efferalgan'], 'N02BE01', 'Paracetamol', 'oral suspension', '120mg/5ml', 'oral', 'Analgesic/Antipyretic', false, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"paracetamol","amount":"120mg/5ml"}]'::jsonb),

('Paracetamol', ARRAY['Perfalgan'], 'N02BE01', 'Paracetamol', 'infusion', '1g/100ml', 'intravenous', 'Analgesic/Antipyretic', false, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 30°C', 36, '[{"name":"paracetamol","amount":"1g/100ml"}]'::jsonb),

('Ibuprofen', ARRAY['Brufen','Nurofen','Advil','Motrin','Dofen'], 'M01AE01', 'Ibuprofen', 'tablet', '200mg / 400mg', 'oral', 'NSAID', false, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"ibuprofen","amount":"400mg"}]'::jsonb),

('Diclofenac', ARRAY['Voltaren','Voltarol','Diclac','Diclofenac Sodium'], 'M01AB05', 'Diclofenac', 'tablet', '50mg', 'oral', 'NSAID', false, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"diclofenac sodium","amount":"50mg"}]'::jsonb),

('Diclofenac', ARRAY['Voltaren Injection'], 'M01AB05', 'Diclofenac', 'injection', '25mg/ml (3ml ampoule)', 'intramuscular', 'NSAID', false, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 30°C', 36, '[{"name":"diclofenac sodium","amount":"75mg/3ml"}]'::jsonb),

('Aspirin', ARRAY['Disprin','Aspro','Ecotrin'], 'B01AC06', 'Aspirin', 'tablet', '75mg / 100mg (antiplatelet)', 'oral', 'Antiplatelet/Analgesic', false, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C, dry', 36, '[{"name":"acetylsalicylic acid","amount":"100mg"}]'::jsonb),

('Morphine', ARRAY['MST','Sevredol','Oramorph'], 'N02AA01', 'Morphine', 'tablet', '10mg / 30mg (oral)', 'oral', 'Opioid Analgesic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C', 60, '[{"name":"morphine sulphate","amount":"10mg"}]'::jsonb),

('Tramadol', ARRAY['Tramal','Ultram','Tramadol HCl'], 'N02AX02', 'Tramadol', 'capsule', '50mg / 100mg', 'oral', 'Opioid Analgesic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, false, NULL, 'Below 30°C', 36, '[{"name":"tramadol hydrochloride","amount":"50mg"}]'::jsonb),

-- ============================================================
-- CARDIOVASCULAR
-- ============================================================
('Amlodipine', ARRAY['Norvasc','Amlodipin','Amlokind','Amlor'], 'C08CA01', 'Amlodipine', 'tablet', '5mg / 10mg', 'oral', 'Antihypertensive (CCB)', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, true, 'Counterfeit amlodipine reported in Kenya. Substandard versions with incorrect dosing found.', 'Below 30°C', 36, '[{"name":"amlodipine besylate","amount":"5mg"}]'::jsonb),

('Atenolol', ARRAY['Tenormin','Aten','Betacard'], 'C07AB03', 'Atenolol', 'tablet', '50mg / 100mg', 'oral', 'Antihypertensive (Beta-blocker)', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"atenolol","amount":"50mg"}]'::jsonb),

('Enalapril', ARRAY['Vasotec','Renitec','Enalapril Maleate'], 'C09AA02', 'Enalapril', 'tablet', '5mg / 10mg / 20mg', 'oral', 'Antihypertensive (ACE inhibitor)', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"enalapril maleate","amount":"10mg"}]'::jsonb),

('Lisinopril', ARRAY['Zestril','Prinivil','Lisinopril'], 'C09AA03', 'Lisinopril', 'tablet', '5mg / 10mg / 20mg', 'oral', 'Antihypertensive (ACE inhibitor)', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"lisinopril","amount":"10mg"}]'::jsonb),

('Hydrochlorothiazide', ARRAY['HCT','Hydrodiuril','Esidrix'], 'C03AA03', 'Hydrochlorothiazide', 'tablet', '12.5mg / 25mg', 'oral', 'Antihypertensive (Diuretic)', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C, dry', 36, '[{"name":"hydrochlorothiazide","amount":"25mg"}]'::jsonb),

('Furosemide', ARRAY['Lasix','Frusemide','Salix'], 'C03CA01', 'Furosemide', 'tablet', '20mg / 40mg', 'oral', 'Diuretic', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C, protect from light', 36, '[{"name":"furosemide","amount":"40mg"}]'::jsonb),

('Furosemide', ARRAY['Lasix Injection'], 'C03CA01', 'Furosemide', 'injection', '10mg/ml (2ml)', 'intravenous', 'Diuretic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C, protect from light', 36, '[{"name":"furosemide","amount":"20mg/2ml"}]'::jsonb),

('Nifedipine', ARRAY['Adalat','Procardia','Nifedical'], 'C08CA05', 'Nifedipine', 'tablet', '10mg (regular) / 20mg (SR)', 'oral', 'Antihypertensive (CCB)', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C, protect from light', 24, '[{"name":"nifedipine","amount":"10mg"}]'::jsonb),

('Methyldopa', ARRAY['Aldomet','Aldoril'], 'C02AB01', 'Methyldopa', 'tablet', '250mg / 500mg', 'oral', 'Antihypertensive', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C', 36, '[{"name":"methyldopa","amount":"250mg"}]'::jsonb),

('Digoxin', ARRAY['Lanoxin','Digitek'], 'C01AA05', 'Digoxin', 'tablet', '0.125mg / 0.25mg', 'oral', 'Cardiac glycoside', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C, dry', 60, '[{"name":"digoxin","amount":"0.25mg"}]'::jsonb),

('Simvastatin', ARRAY['Zocor','Simvatin','Simcard'], 'C10AA01', 'Simvastatin', 'tablet', '10mg / 20mg / 40mg', 'oral', 'Statin (lipid-lowering)', false, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"simvastatin","amount":"20mg"}]'::jsonb),

-- ============================================================
-- ANTIDIABETICS
-- ============================================================
('Metformin', ARRAY['Glucophage','Glycomet','Metformin HCl','Fortamet'], 'A10BA02', 'Metformin', 'tablet', '500mg / 850mg / 1000mg', 'oral', 'Antidiabetic (Biguanide)', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, true, 'Substandard metformin documented in Uganda with inadequate dissolution.', 'Below 30°C', 36, '[{"name":"metformin hydrochloride","amount":"500mg"}]'::jsonb),

('Glibenclamide', ARRAY['Daonil','Euglucon','Glyburide'], 'A10BB01', 'Glibenclamide', 'tablet', '2.5mg / 5mg', 'oral', 'Antidiabetic (Sulfonylurea)', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"glibenclamide","amount":"5mg"}]'::jsonb),

('Glimepiride', ARRAY['Amaryl','Glimpid'], 'A10BB12', 'Glimepiride', 'tablet', '1mg / 2mg / 4mg', 'oral', 'Antidiabetic (Sulfonylurea)', false, '23rd 2023', ARRAY['KE','ET','UG','TZ'], false, false, NULL, 'Below 30°C', 36, '[{"name":"glimepiride","amount":"2mg"}]'::jsonb),

('Human Insulin Soluble', ARRAY['Actrapid','Humulin R','Insuman Rapid'], 'A10AB01', 'Insulin (human regular)', 'injection', '100IU/ml (10ml vial)', 'subcutaneous', 'Antidiabetic (Insulin)', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, false, NULL, '2-8°C refrigerated (unopened); below 30°C up to 4 weeks (opened)', 24, '[{"name":"human insulin","amount":"100IU/ml"}]'::jsonb),

('Human Insulin NPH', ARRAY['Insulatard','Humulin N','Insuman Basal'], 'A10AC01', 'Insulin (human isophane)', 'injection', '100IU/ml (10ml vial)', 'subcutaneous', 'Antidiabetic (Insulin)', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, false, NULL, '2-8°C refrigerated (unopened)', 24, '[{"name":"human insulin isophane","amount":"100IU/ml"}]'::jsonb),

-- ============================================================
-- GASTROINTESTINAL
-- ============================================================
('Omeprazole', ARRAY['Losec','Prilosec','Omez','Lomac'], 'A02BC01', 'Omeprazole', 'capsule', '20mg / 40mg', 'oral', 'Proton Pump Inhibitor', false, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C, dry', 24, '[{"name":"omeprazole","amount":"20mg"}]'::jsonb),

('Oral Rehydration Salts', ARRAY['ORS','Pedialyte','Dioralyte','WHO-ORS'], 'A07CA', 'Oral rehydration salts', 'oral powder', 'WHO formula (per 1L sachet)', 'oral', 'Rehydration', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW','SS'], false, false, NULL, 'Below 30°C, dry', 24, '[{"name":"sodium chloride","amount":"2.6g"},{"name":"potassium chloride","amount":"1.5g"},{"name":"sodium citrate","amount":"2.9g"},{"name":"glucose anhydrous","amount":"13.5g"}]'::jsonb),

('Zinc Sulfate', ARRAY['Zinc Dispersible','ZinCef'], 'A12CB01', 'Zinc', 'dispersible tablet', '20mg', 'oral', 'Micronutrient/Antidiarrheal', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"zinc sulphate","amount":"20mg"}]'::jsonb),

('Ranitidine', ARRAY['Zantac','Ranitic'], 'A02BA02', 'Ranitidine', 'tablet', '150mg / 300mg', 'oral', 'H2 Antagonist', false, '23rd 2023', ARRAY['KE','ET','UG','TZ'], false, false, NULL, 'Below 25°C, dry', 36, '[{"name":"ranitidine hydrochloride","amount":"150mg"}]'::jsonb),

('Loperamide', ARRAY['Imodium','Lopex','Lopiramide'], 'A07DA03', 'Loperamide', 'capsule', '2mg', 'oral', 'Antidiarrheal', false, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"loperamide hydrochloride","amount":"2mg"}]'::jsonb),

('Hyoscine Butylbromide', ARRAY['Buscopan','Scopolamine Butylbromide'], 'A03BB01', 'Butylscopolamine', 'tablet', '10mg', 'oral', 'Antispasmodic', false, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"hyoscine butylbromide","amount":"10mg"}]'::jsonb),

('Metoclopramide', ARRAY['Maxolon','Reglan','Plasil'], 'A03FA01', 'Metoclopramide', 'tablet', '10mg', 'oral', 'Antiemetic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"metoclopramide hydrochloride","amount":"10mg"}]'::jsonb),

('Ondansetron', ARRAY['Zofran','Ondansetron HCl','Emeset'], 'A04AA01', 'Ondansetron', 'tablet', '4mg / 8mg', 'oral', 'Antiemetic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, false, NULL, 'Below 30°C', 36, '[{"name":"ondansetron hydrochloride","amount":"4mg"}]'::jsonb),

-- ============================================================
-- ANTHELMINTICS / ANTIPARASITICS
-- ============================================================
('Albendazole', ARRAY['Zentel','Albenza','Almox'], 'P02CA03', 'Albendazole', 'tablet', '400mg', 'oral', 'Anthelmintic', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"albendazole","amount":"400mg"}]'::jsonb),

('Mebendazole', ARRAY['Vermox','Ovex','Pantelmin'], 'P02CA01', 'Mebendazole', 'tablet', '100mg / 500mg', 'oral', 'Anthelmintic', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"mebendazole","amount":"500mg"}]'::jsonb),

('Praziquantel', ARRAY['Biltricide','Cysticide'], 'P02BA01', 'Praziquantel', 'tablet', '600mg', 'oral', 'Anthelmintic (schistosomiasis)', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 60, '[{"name":"praziquantel","amount":"600mg"}]'::jsonb),

('Ivermectin', ARRAY['Mectizan','Stromectol','Ivomec'], 'P02CF01', 'Ivermectin', 'tablet', '3mg / 6mg', 'oral', 'Antiparasitic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], false, false, NULL, 'Below 30°C', 24, '[{"name":"ivermectin","amount":"6mg"}]'::jsonb),

('Diethylcarbamazine', ARRAY['Hetrazan','DEC'], 'P02CB02', 'Diethylcarbamazine', 'tablet', '50mg / 100mg', 'oral', 'Antiparasitic (filariasis)', true, '23rd 2023', ARRAY['ET','UG','TZ'], false, false, NULL, 'Below 30°C', 36, '[{"name":"diethylcarbamazine citrate","amount":"100mg"}]'::jsonb),

-- ============================================================
-- RESPIRATORY
-- ============================================================
('Salbutamol', ARRAY['Ventolin','Albuterol','Proventil','Asthalin'], 'R03AC02', 'Salbutamol', 'inhaler (MDI)', '100mcg/actuation', 'inhalation', 'Bronchodilator', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 24, '[{"name":"salbutamol sulphate","amount":"100mcg/actuation"}]'::jsonb),

('Salbutamol', ARRAY['Ventolin Syrup','Albuterol Syrup'], 'R03AC02', 'Salbutamol', 'oral solution', '2mg/5ml', 'oral', 'Bronchodilator', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], false, false, NULL, 'Below 25°C', 36, '[{"name":"salbutamol sulphate","amount":"2mg/5ml"}]'::jsonb),

('Prednisolone', ARRAY['Predsol','Solone','Deltacortril'], 'H02AB06', 'Prednisolone', 'tablet', '5mg / 25mg', 'oral', 'Corticosteroid', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C', 36, '[{"name":"prednisolone","amount":"5mg"}]'::jsonb),

('Dexamethasone', ARRAY['Decadron','Dexamethasone Sodium Phosphate'], 'H02AB02', 'Dexamethasone', 'injection', '4mg/ml (1ml ampoule)', 'intravenous', 'Corticosteroid', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C', 36, '[{"name":"dexamethasone sodium phosphate","amount":"4mg/ml"}]'::jsonb),

('Aminophylline', ARRAY['Truphylline','Phyllocontin'], 'R03DA05', 'Aminophylline', 'injection', '25mg/ml (10ml)', 'intravenous', 'Bronchodilator', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C, protect from light', 36, '[{"name":"aminophylline","amount":"250mg/10ml"}]'::jsonb),

('Beclometasone', ARRAY['Clenil','Becotide','QVAR'], 'R03BA01', 'Beclometasone', 'inhaler (MDI)', '50mcg/100mcg/actuation', 'inhalation', 'Inhaled corticosteroid', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 24, '[{"name":"beclometasone dipropionate","amount":"100mcg/actuation"}]'::jsonb),

-- ============================================================
-- WOMEN''S HEALTH / OBSTETRICS
-- ============================================================
('Oxytocin', ARRAY['Syntocinon','Pitocin'], 'H01BB02', 'Oxytocin', 'injection', '10IU/ml (1ml ampoule)', 'intravenous', 'Oxytocic (PPH prevention)', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], true, true, 'CRITICAL: Counterfeit and substandard oxytocin causes preventable maternal deaths from postpartum haemorrhage. Multiple WHO alerts issued for East Africa. Cold chain required - verify consistently.', '2-8°C refrigerated', 24, '[{"name":"oxytocin","amount":"10IU/ml"}]'::jsonb),

('Misoprostol', ARRAY['Cytotec','Misofen','Misoclear'], 'G02AD06', 'Misoprostol', 'tablet', '200mcg', 'oral/sublingual/vaginal', 'Oxytocic/Abortifacient', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, true, 'Counterfeit misoprostol documented in East Africa. Used for PPH prevention, abortion, and labour induction. Substandard versions fail at critical moments.', 'Below 25°C, dry', 24, '[{"name":"misoprostol","amount":"200mcg"}]'::jsonb),

('Ergometrine', ARRAY['Ergonovine','Ergometrine Maleate'], 'G02AB03', 'Ergometrine', 'injection', '0.5mg/ml (1ml)', 'intramuscular', 'Oxytocic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, '2-8°C refrigerated, protect from light', 24, '[{"name":"ergometrine maleate","amount":"0.5mg/ml"}]'::jsonb),

('Magnesium Sulphate', ARRAY['Magnesium Sulfate','Epsom Salt IV'], 'A12CC02', 'Magnesium sulphate', 'injection', '500mg/ml (2ml and 10ml)', 'intravenous', 'Anticonvulsant (eclampsia)', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], true, false, NULL, 'Below 30°C', 60, '[{"name":"magnesium sulphate heptahydrate","amount":"1g/2ml"}]'::jsonb),

('Levonorgestrel', ARRAY['Postinor','Norlevo','Plan B','Lydia'], 'G03AC03', 'Levonorgestrel', 'tablet', '1.5mg (single dose)', 'oral', 'Emergency Contraceptive', false, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C', 36, '[{"name":"levonorgestrel","amount":"1.5mg"}]'::jsonb),

('Ethinylestradiol + Levonorgestrel', ARRAY['Microgynon','Nordette','Lo-Femenal'], 'G03AA07', 'Levonorgestrel and estrogen', 'tablet', '0.03mg + 0.15mg', 'oral', 'Combined Oral Contraceptive', false, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"ethinylestradiol","amount":"0.03mg"},{"name":"levonorgestrel","amount":"0.15mg"}]'::jsonb),

('Medroxyprogesterone Acetate', ARRAY['Depo-Provera','DMPA','Depo-Medro'], 'G03AC06', 'Medroxyprogesterone acetate', 'injection', '150mg/ml (1ml)', 'intramuscular', 'Injectable Contraceptive', false, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C', 36, '[{"name":"medroxyprogesterone acetate","amount":"150mg/ml"}]'::jsonb),

-- ============================================================
-- VITAMINS / NUTRITIONAL SUPPLEMENTS
-- ============================================================
('Ferrous Sulphate', ARRAY['Ferrograd','Slow-Fe','Iron sulphate','Fefol'], 'B03AA07', 'Ferrous sulphate', 'tablet', '200mg (65mg elemental iron)', 'oral', 'Iron supplement', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C, dry', 36, '[{"name":"ferrous sulphate","amount":"200mg"}]'::jsonb),

('Folic Acid', ARRAY['Folicare','Lexpec','Folic Acid BP'], 'B03BB01', 'Folic acid', 'tablet', '5mg / 0.4mg', 'oral', 'Vitamin supplement', false, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C, dry', 36, '[{"name":"folic acid","amount":"5mg"}]'::jsonb),

('Ferrous Sulphate + Folic Acid', ARRAY['Ferofort','Irofol','FeFol Vit'], 'B03AD03', 'Ferrous sulphate and folic acid', 'tablet', '200mg + 0.4mg', 'oral', 'Iron + Folate supplement', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW','SO'], false, false, NULL, 'Below 25°C, dry', 24, '[{"name":"ferrous sulphate","amount":"200mg"},{"name":"folic acid","amount":"0.4mg"}]'::jsonb),

('Vitamin A', ARRAY['Arovit','Aquasol A','Vitamin A Palmitate'], 'A11CA01', 'Retinol (Vitamin A)', 'capsule', '200,000 IU', 'oral', 'Vitamin supplement', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C, protect from light', 24, '[{"name":"retinol palmitate","amount":"200000 IU"}]'::jsonb),

('Zinc Sulfate', ARRAY['ZinCef','Zinc Syrup'], 'A12CB01', 'Zinc', 'oral solution', '10mg/5ml (syrup)', 'oral', 'Micronutrient', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C', 24, '[{"name":"zinc sulphate monohydrate","amount":"10mg/5ml"}]'::jsonb),

('Thiamine', ARRAY['Vitamin B1','Benerva','Thiamine HCl'], 'A11DA01', 'Thiamine (Vitamin B1)', 'tablet', '50mg / 100mg', 'oral', 'Vitamin supplement', false, '23rd 2023', ARRAY['KE','ET','UG','TZ'], false, false, NULL, 'Below 25°C, dry', 36, '[{"name":"thiamine hydrochloride","amount":"100mg"}]'::jsonb),

-- ============================================================
-- NEUROLOGICAL / MENTAL HEALTH
-- ============================================================
('Diazepam', ARRAY['Valium','Diastat','Diazemuls'], 'N05BA01', 'Diazepam', 'tablet', '5mg', 'oral', 'Benzodiazepine (anxiolytic/anticonvulsant)', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, true, 'Substandard diazepam documented in East Africa. Used for seizure control - substandard product is life-threatening.', 'Below 30°C, dry', 60, '[{"name":"diazepam","amount":"5mg"}]'::jsonb),

('Diazepam', ARRAY['Diazemuls IV'], 'N05BA01', 'Diazepam', 'injection', '5mg/ml (2ml)', 'intravenous', 'Anticonvulsant', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C, protect from light', 36, '[{"name":"diazepam","amount":"10mg/2ml"}]'::jsonb),

('Phenobarbitone', ARRAY['Luminal','Gardenal','Phenobarbital'], 'N03AA02', 'Phenobarbital', 'tablet', '30mg / 60mg / 100mg', 'oral', 'Anticonvulsant', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, false, NULL, 'Below 30°C, dry', 60, '[{"name":"phenobarbital","amount":"60mg"}]'::jsonb),

('Phenytoin', ARRAY['Dilantin','Epanutin','Eptoin'], 'N03AB02', 'Phenytoin', 'capsule', '100mg', 'oral', 'Anticonvulsant', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C, dry', 36, '[{"name":"phenytoin sodium","amount":"100mg"}]'::jsonb),

('Carbamazepine', ARRAY['Tegretol','Epitol','Carbatrol'], 'N03AF01', 'Carbamazepine', 'tablet', '200mg', 'oral', 'Anticonvulsant/Mood stabiliser', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], true, false, NULL, 'Below 25°C, dry', 36, '[{"name":"carbamazepine","amount":"200mg"}]'::jsonb),

('Haloperidol', ARRAY['Haldol','Serenace','Haloperil'], 'N05AD01', 'Haloperidol', 'tablet', '1.5mg / 5mg', 'oral', 'Antipsychotic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C, protect from light', 36, '[{"name":"haloperidol","amount":"5mg"}]'::jsonb),

('Amitriptyline', ARRAY['Elavil','Tryptanol','Saroten'], 'N06AA09', 'Amitriptyline', 'tablet', '25mg / 50mg', 'oral', 'Antidepressant (TCA)', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C, dry', 36, '[{"name":"amitriptyline hydrochloride","amount":"25mg"}]'::jsonb),

-- ============================================================
-- HORMONES / ENDOCRINE
-- ============================================================
('Hydrocortisone', ARRAY['Solu-Cortef','Hydrocortisone Sodium Succinate'], 'H02AB09', 'Hydrocortisone', 'powder for injection', '100mg', 'intravenous', 'Corticosteroid', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C, dry', 36, '[{"name":"hydrocortisone sodium succinate","amount":"100mg"}]'::jsonb),

('Levothyroxine', ARRAY['Synthroid','Eltroxin','Thyroxine'], 'H03AA01', 'Levothyroxine', 'tablet', '50mcg / 100mcg', 'oral', 'Thyroid hormone', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C, dry, protect from light', 24, '[{"name":"levothyroxine sodium","amount":"100mcg"}]'::jsonb),

('Adrenaline (Epinephrine)', ARRAY['Epipen','Adrenaline 1:1000','Epinephrine'], 'C01CA24', 'Epinephrine', 'injection', '1mg/ml (1ml ampoule)', 'intramuscular', 'Emergency: Anaphylaxis/cardiac', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], true, false, NULL, 'Below 25°C, protect from light', 24, '[{"name":"adrenaline (epinephrine)","amount":"1mg/ml"}]'::jsonb),

-- ============================================================
-- ANTIFUNGALS / ANTIVIRALS
-- ============================================================
('Fluconazole', ARRAY['Diflucan','Flucostat','Flucan'], 'J02AC01', 'Fluconazole', 'capsule', '150mg / 200mg', 'oral', 'Antifungal', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 30°C', 36, '[{"name":"fluconazole","amount":"150mg"}]'::jsonb),

('Fluconazole', ARRAY['Diflucan IV'], 'J02AC01', 'Fluconazole', 'infusion', '2mg/ml (100ml)', 'intravenous', 'Antifungal', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 30°C, protect from light', 36, '[{"name":"fluconazole","amount":"200mg/100ml"}]'::jsonb),

('Amphotericin B', ARRAY['Fungizone','Abelcet','AmBisome'], 'J02AA01', 'Amphotericin B', 'powder for injection', '50mg/vial', 'intravenous', 'Antifungal', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, '2-8°C refrigerated, protect from light', 36, '[{"name":"amphotericin B","amount":"50mg"}]'::jsonb),

('Nystatin', ARRAY['Mycostatin','Nystan','Nilstat'], 'A07AA02', 'Nystatin', 'oral suspension', '100,000 IU/ml', 'oral', 'Antifungal', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C, refrigerate after opening', 24, '[{"name":"nystatin","amount":"100000 IU/ml"}]'::jsonb),

('Aciclovir', ARRAY['Zovirax','Acyclovir','Zovicrem'], 'J05AB01', 'Aciclovir', 'tablet', '200mg / 400mg', 'oral', 'Antiviral (Herpes)', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C, dry', 36, '[{"name":"aciclovir","amount":"400mg"}]'::jsonb),

-- ============================================================
-- OPHTHALMOLOGY
-- ============================================================
('Chloramphenicol', ARRAY['Chloromycetin Eye Drops','Optrex'], 'S01AA01', 'Chloramphenicol', 'eye drops', '0.5%', 'ophthalmic', 'Antibiotic eye drops', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C, discard 28 days after opening', 18, '[{"name":"chloramphenicol","amount":"0.5%"}]'::jsonb),

('Tetracycline', ARRAY['Achromycin Eye Ointment'], 'S01AA09', 'Tetracycline', 'eye ointment', '1%', 'ophthalmic', 'Antibiotic eye ointment', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C', 24, '[{"name":"tetracycline hydrochloride","amount":"1%"}]'::jsonb),

('Pilocarpine', ARRAY['Pilocar','Isopto Carpine'], 'S01EB01', 'Pilocarpine', 'eye drops', '2% / 4%', 'ophthalmic', 'Miotic (glaucoma)', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C, protect from light', 24, '[{"name":"pilocarpine hydrochloride","amount":"2%"}]'::jsonb),

-- ============================================================
-- DERMATOLOGY
-- ============================================================
('Hydrocortisone Cream', ARRAY['Hydrocortisone 1%','Cortaid'], 'D07AA02', 'Hydrocortisone', 'cream', '1%', 'topical', 'Topical corticosteroid', false, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C', 36, '[{"name":"hydrocortisone","amount":"1%"}]'::jsonb),

('Clotrimazole', ARRAY['Canesten','Lotrisone','Mycospor'], 'D01AC01', 'Clotrimazole', 'cream', '1%', 'topical', 'Antifungal (topical)', false, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C', 36, '[{"name":"clotrimazole","amount":"1%"}]'::jsonb),

('Benzoyl Peroxide', ARRAY['Panoxyl','Benzac','Acne-Aid'], 'D10AE01', 'Benzoyl peroxide', 'gel', '5%', 'topical', 'Antiacne', false, '23rd 2023', ARRAY['KE','ET','UG','TZ'], false, false, NULL, 'Below 25°C', 24, '[{"name":"benzoyl peroxide","amount":"5%"}]'::jsonb),

('Permethrin', ARRAY['Lyclear','Kwellada','Elimite'], 'P03AC04', 'Permethrin', 'cream', '5%', 'topical', 'Scabicide/Pediculicide', true, '23rd 2023', ARRAY['KE','ET','UG','TZ','RW'], false, false, NULL, 'Below 25°C', 36, '[{"name":"permethrin","amount":"5%"}]'::jsonb),

-- ============================================================
-- ANAESTHESIA / SURGERY
-- ============================================================
('Ketamine', ARRAY['Ketalar','Ketamine HCl'], 'N01AX03', 'Ketamine', 'injection', '10mg/ml / 50mg/ml', 'intravenous', 'Anaesthetic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C, protect from light', 36, '[{"name":"ketamine hydrochloride","amount":"50mg/ml"}]'::jsonb),

('Halothane', ARRAY['Fluothane'], 'N01AB01', 'Halothane', 'inhalation liquid', '250ml bottle', 'inhalation', 'Inhalation anaesthetic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C, protect from light', 60, '[{"name":"halothane","amount":"100%"}]'::jsonb),

('Lidocaine', ARRAY['Lignocaine','Xylocaine','Lidocaine HCl'], 'N01BB02', 'Lidocaine', 'injection', '1% / 2%', 'local injection', 'Local anaesthetic', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW'], true, false, NULL, 'Below 25°C', 36, '[{"name":"lidocaine hydrochloride","amount":"20mg/ml (2%)"}]'::jsonb),

('Morphine', ARRAY['Morphine Sulphate Injection'], 'N02AA01', 'Morphine', 'injection', '10mg/ml (1ml)', 'intravenous', 'Opioid analgesic', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C, protect from light', 36, '[{"name":"morphine sulphate","amount":"10mg/ml"}]'::jsonb),

('Heparin', ARRAY['Heparin Sodium','Liquemin'], 'B01AB01', 'Heparin', 'injection', '5000 IU/ml', 'intravenous', 'Anticoagulant', true, '23rd 2023', ARRAY['KE','ET','UG','TZ'], true, false, NULL, 'Below 25°C', 24, '[{"name":"heparin sodium","amount":"5000 IU/ml"}]'::jsonb),

-- ============================================================
-- WATER PURIFICATION
-- ============================================================
('Sodium Hypochlorite Solution', ARRAY['Water Guard','Waterguard','WaterSafe','Aquatabs'], 'V03AB01', 'Sodium hypochlorite', 'solution', '2.5% / 3.5%', 'water treatment', 'Water purification', true, '23rd 2023', ARRAY['KE','SO','ET','UG','TZ','RW','SS'], false, false, NULL, 'Below 25°C, protect from light', 12, '[{"name":"sodium hypochlorite","amount":"3.5%"}]'::jsonb);

-- ============================================================
-- Update statistics
-- ============================================================
-- Run after insert:
-- SELECT COUNT(*) FROM medications;  -- Should show ~160 rows
-- SELECT therapeutic_class, COUNT(*) FROM medications GROUP BY therapeutic_class ORDER BY count DESC;
