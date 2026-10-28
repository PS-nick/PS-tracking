import React, { useState, useEffect } from 'react';
import { X, Plus, Layers, Sparkles, QrCode, Printer, Download, CheckCircle2, ArrowRight, ShieldCheck, CheckSquare, Square, Cpu, AlertTriangle, Lock } from 'lucide-react';
import { createNewUnit, createDefaultCombiConfig } from '../utils/storage';
import { ServiceUnit, ScannedUnitPayload, UnitPriority, ComponentType, HeatExchangerMedium } from '../types/process';
import { downloadQrCodeImage } from '../utils/qrCode';
import { getPriorityConfig, PRIORITY_CONFIGS } from '../utils/priority';
import { MOTORSPORT_CATEGORIES, ALL_RACING_CATEGORIES, RacingCategoryId, saveCustomCustomer, ALL_MOTORSPORT_TEAMS, isCustomerDeleted, getAllTeamsWithCustom } from '../constants/motorsport';
import { BICESTER_COMPONENT_TYPES, WORKBENCH_DOC_INFO, getAllComponentTypes } from '../constants/workbench';
import { CustomCoolerModal } from './CustomCoolerModal';

interface NewUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUnit: (newUnit: ServiceUnit) => void;
  onOpenScanner?: () => void;
  initialData?: ScannedUnitPayload | null;
}

export const NewUnitModal: React.FC<NewUnitModalProps> = ({
  isOpen,
  onClose,
  onCreateUnit,
  onOpenScanner,
  initialData,
}) => {
  const [serialNumber, setSerialNumber] = useState('');
  const [partNumber, setPartNumber] = useState('F1-PAS-940');
  const [customerName, setCustomerName] = useState(() => {
    const teams = getAllTeamsWithCustom();
    return teams.includes('Scuderia Ferrari HP') ? 'Scuderia Ferrari HP' : (teams[0] || '');
  });
  const [componentType, setComponentType] = useState<ComponentType>('heat_exchanger');
  const [heatExchangerMedium, setHeatExchangerMedium] = useState<HeatExchangerMedium>('water_to_oil');
  const [supplierCompanyName, setSupplierCompanyName] = useState(() => {
    const teams = getAllTeamsWithCustom();
    return teams.includes('Scuderia Ferrari HP') ? 'Scuderia Ferrari HP' : (teams[0] || '');
  });
  const [supplierContactName, setSupplierContactName] = useState('Marco Rossi (Chief Mech)');
  const [jobOrderNumber, setJobOrderNumber] = useState(`JB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [inhousePartNo, setInhousePartNo] = useState('PS-HEX-940');
  const [drawingNumber, setDrawingNumber] = useState('DWG-2026-F1-08');
  const [racingCategory, setRacingCategory] = useState<RacingCategoryId>('formula1');
  const [workOrderNumber, setWorkOrderNumber] = useState(`WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [technician, setTechnician] = useState('Nicola Malgarotti');
  const [isFirstService, setIsFirstService] = useState<boolean>(true);
  const [lifeNumber, setLifeNumber] = useState<number>(1);
  const [priority, setPriority] = useState<UnitPriority>('high');
  const [combiUnitCount, setCombiUnitCount] = useState<2 | 3>(componentType === 'combi_3_unit' ? 3 : 2);
  const [combiCore1Type, setCombiCore1Type] = useState<ComponentType>('water_radiator');
  const [combiCore2Type, setCombiCore2Type] = useState<ComponentType>('oil_cooler');
  const [combiCore3Type, setCombiCore3Type] = useState<ComponentType>('intercooler');

  // Delivery SLA Target
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().slice(0, 10);
  });

  // Packaging & Intake Protection
  const [boxType, setBoxType] = useState<'cardboard' | 'bubble_wrap' | 'hard_case' | 'soft_case'>('cardboard');
  const [boxMoisture, setBoxMoisture] = useState<'dry' | 'wet'>('dry');
  const [protectionCovers, setProtectionCovers] = useState<'cardboard' | 'metal' | 'plastic' | 'none'>('metal');
  const [bungsCapsStatus, setBungsCapsStatus] = useState<'yes' | 'no' | 'partial'>('yes');

  // Custom Cooler Type creation modal
  const [isCustomCoolerModalOpen, setIsCustomCoolerModalOpen] = useState<boolean>(false);
  const [coolerTypesVersion, setCoolerTypesVersion] = useState<number>(0);

  // Success view with auto-generated QR code preview
  const [createdUnit, setCreatedUnit] = useState<ServiceUnit | null>(null);

  // Sync with initialData if provided from QR scan
  useEffect(() => {
    if (initialData) {
      if (initialData.serialNumber) setSerialNumber(initialData.serialNumber);
      if (initialData.partNumber) setPartNumber(initialData.partNumber);
      if (initialData.customerName) {
        setCustomerName(initialData.customerName);
        setSupplierCompanyName(initialData.customerName);
      }
      if (initialData.componentType) {
        setComponentType(initialData.componentType);
        if (initialData.componentType === 'combi_3_unit') {
          setCombiUnitCount(3);
        } else if (initialData.componentType === 'combi_2_unit') {
          setCombiUnitCount(2);
        }
      }
      if (initialData.supplierCompanyName) setSupplierCompanyName(initialData.supplierCompanyName);
      if (initialData.supplierContactName) setSupplierContactName(initialData.supplierContactName);
      if (initialData.jobOrderNumber) setJobOrderNumber(initialData.jobOrderNumber);
      if (initialData.inhousePartNo) setInhousePartNo(initialData.inhousePartNo);
      if (initialData.drawingNumber) setDrawingNumber(initialData.drawingNumber);
      if (initialData.workOrderNumber) {
        setWorkOrderNumber(initialData.workOrderNumber);
      } else {
        setWorkOrderNumber(`WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      }
      if (initialData.lifeNumber !== undefined) {
        setLifeNumber(Number(initialData.lifeNumber));
      } else if (initialData.isFirstService === false) {
        setLifeNumber(2);
      }
      if (initialData.isFirstService !== undefined && initialData.isFirstService !== null) {
        setIsFirstService(initialData.isFirstService);
      }
    } else {
      setSerialNumber('');
      setLifeNumber(1);
      setPriority('medium');
      setCreatedUnit(null);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const isCombi = componentType === 'combi_2_unit' || componentType === 'combi_3_unit';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSn = serialNumber.trim() || `SN-${Math.floor(1000 + Math.random() * 9000)}-REV`;
    const catCfg = MOTORSPORT_CATEGORIES[racingCategory];
    const finalComponentType: ComponentType = isCombi 
      ? (combiUnitCount === 3 ? 'combi_3_unit' : 'combi_2_unit')
      : componentType;

    const combiConfig = isCombi 
      ? createDefaultCombiConfig(combiUnitCount, finalSn, workOrderNumber.trim(), [combiCore1Type, combiCore2Type, combiCore3Type])
      : undefined;

    const finalCustomer = customerName.trim();
    if (finalCustomer && !ALL_MOTORSPORT_TEAMS.includes(finalCustomer) && !isCustomerDeleted(finalCustomer)) {
      saveCustomCustomer({
        name: finalCustomer,
        categoryId: racingCategory,
        tier: 'customer',
        shortName: finalCustomer.split(' ')[0] || finalCustomer,
        subCategory: 'Independent Racing Team',
        createdAt: new Date().toISOString(),
      });
    }

    const newUnit = createNewUnit({
      serialNumber: finalSn,
      lifeNumber,
      partNumber: partNumber.trim(),
      modelName: partNumber.trim() || `${catCfg?.badge || 'Motorsport'} Hydraulic Assembly`,
      customerName: finalCustomer,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      componentType: finalComponentType,
      heatExchangerMedium: finalComponentType === 'heat_exchanger' ? heatExchangerMedium : undefined,
      supplierCompanyName: supplierCompanyName.trim() || customerName.trim(),
      supplierContactName: supplierContactName.trim(),
      jobOrderNumber: jobOrderNumber.trim() || workOrderNumber.trim(),
      inhousePartNo: inhousePartNo.trim() || `PS-${finalComponentType.toUpperCase().slice(0, 3)}-${partNumber.trim()}`,
      drawingNumber: drawingNumber.trim() || 'DWG-2026-F1-08',
      racingCategory,
      workOrderNumber: workOrderNumber.trim(),
      technician: technician.trim(),
      isFirstService: isFirstService,
      priority,
      combiConfig,
      protectionCovers,
      bungsCapsStatus,
      boxType,
      boxMoisture,
    });

    // Immediately persist and register the unit into storage
    onCreateUnit(newUnit);

    // Show generated QR code confirmation
    setCreatedUnit(newUnit);
  };

  const handleFinishAndOpen = () => {
    onClose();
  };

  const handlePreFill = (preset: 'f1' | 'wec' | 'thor' | 'indy' | 'wrc') => {
    if (preset === 'f1') {
      setSerialNumber(`SN-F1-${Math.floor(100 + Math.random() * 900)}`);
      setPartNumber('F1-PAS-940');
      setCustomerName('Scuderia Ferrari HP');
      setRacingCategory('formula1');
      setPriority('emergency');
    } else if (preset === 'thor') {
      setSerialNumber(`SN-THOR-${Math.floor(100 + Math.random() * 900)}`);
      setPartNumber('THOR-HEX-01');
      setCustomerName('THOR Racing / WEC Team');
      setRacingCategory('wec_hypercar');
      setBoxType('hard_case');
      setPriority('high');
    } else if (preset === 'wec') {
      setSerialNumber(`SN-WEC-${Math.floor(100 + Math.random() * 900)}`);
      setPartNumber('WEC-ASV-24');
      setCustomerName('Porsche Penske Motorsport (963)');
      setRacingCategory('wec_hypercar');
      setPriority('high');
    } else if (preset === 'indy') {
      setSerialNumber(`SN-INDY-${Math.floor(100 + Math.random() * 900)}`);
      setPartNumber('IC-TWA-10');
      setCustomerName('Team Penske IndyCar');
      setRacingCategory('indycar');
      setPriority('high');
    } else {
      setSerialNumber(`SN-WRC-${Math.floor(100 + Math.random() * 900)}`);
      setPartNumber('WRC-CDV-01');
      setCustomerName('Toyota Gazoo Racing WRT (Yaris Rally1)');
      setRacingCategory('wrc_rally');
      setPriority('medium');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-2 sm:p-3 md:p-4 flex items-center justify-center animate-fadeIn no-print">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-[96vw] xl:max-w-7xl 2xl:max-w-[1520px] max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col min-h-0 shadow-2xl overflow-hidden relative my-auto">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-neutral-800 bg-neutral-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-neutral-100 uppercase tracking-wider">
                  New Unit Intake Registration
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  PS-QA-2026
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Register component into Bicester depot workflow and generate encrypted asset QR tag
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Close Modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* If unit was just created: show Auto-Generated QR Code Confirmation view */}
        {createdUnit ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-8 space-y-5 animate-fadeIn">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-300">
                  Unit Registered &amp; Synced to Cloud Firestore!
                </h4>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  Tracking QR tag generated for {createdUnit.serialNumber}. Intake record is saved locally and synchronized to the cloud.
                </p>
              </div>
            </div>

            {/* QR Card Preview */}
            <div className="bg-white text-slate-900 rounded-xl p-5 border border-slate-300 shadow-lg flex flex-col sm:flex-row items-center gap-5 max-w-xl mx-auto">
              <div className="p-2 bg-white border border-slate-300 rounded-lg shrink-0 shadow-inner">
                {createdUnit.qrCode?.dataUrl && (
                  <img
                    src={createdUnit.qrCode.dataUrl}
                    alt="Auto QR"
                    className="w-28 h-28 object-contain block"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1 text-center sm:text-left">
                <span className="text-[10px] font-mono uppercase text-slate-800 block font-bold">
                  PARTICLE SCIENCE TRACKING SYSTEM
                </span>
                <div className="text-base font-black font-mono text-slate-950 truncate flex items-center justify-center sm:justify-start gap-2">
                  <span>{createdUnit.serialNumber}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold font-mono">
                    LIFE #{createdUnit.lifeNumber ?? 1}
                  </span>
                  {(() => {
                    const p = getPriorityConfig(createdUnit.priority);
                    return (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-mono border flex items-center gap-1 ${p.badgeBg} ${p.badgeText} ${p.badgeBorder}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${p.dotColor}`} />
                        <span>{p.label}</span>
                      </span>
                    );
                  })()}
                </div>
                <div className="text-xs text-slate-700 font-mono truncate">
                  WO: #{createdUnit.workOrderNumber} · P/N: {createdUnit.partNumber}
                </div>
                <div className="text-[11px] text-slate-600 truncate font-semibold">
                  {createdUnit.customerName}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  QR: unit={createdUnit.serialNumber}, lifeNumber={createdUnit.lifeNumber ?? 1}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4 text-amber-400" />
                <span>Print Asset Tag</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (createdUnit.qrCode?.dataUrl) {
                    downloadQrCodeImage(createdUnit.qrCode.dataUrl, createdUnit.serialNumber);
                  }
                }}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4 text-sky-400" />
                <span>Download QR (JPG)</span>
              </button>
            </div>

            {/* Proceed to workflow */}
            <div className="pt-3 border-t border-neutral-800 max-w-xl mx-auto">
              <button
                type="button"
                onClick={handleFinishAndOpen}
                className="w-full px-5 py-3.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer hover:scale-[1.01]"
              >
                <span>Enter Unit Intake &amp; Inspection Workflow</span>
                <ArrowRight className="h-4 w-4 stroke-[3]" />
              </button>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-neutral-700">
              {/* Top Row: QR Scanner shortcut + Motorsport Class Presets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                {/* Physical Tag Scan shortcut */}
                {onOpenScanner ? (
                  <div className="p-2.5 bg-neutral-950/80 border border-neutral-800 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shrink-0">
                        <QrCode className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-neutral-200 block truncate">
                          Have a Physical Unit QR Tag?
                        </span>
                        <span className="text-[10.5px] text-neutral-400 block truncate">
                          Scan to auto-populate specifications.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenScanner();
                      }}
                      className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-lg transition-colors border border-neutral-700 flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <QrCode className="h-3.5 w-3.5 text-amber-400" />
                      <span>Scan QR</span>
                    </button>
                  </div>
                ) : <div />}

                {/* Quick Presets */}
                <div className="p-2.5 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">
                    Quick Motorsport Class Presets:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePreFill('f1')}
                      className="px-2 py-0.5 text-xs rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-mono transition-colors cursor-pointer"
                    >
                      F1 PAS · Ferrari
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreFill('wec')}
                      className="px-2 py-0.5 text-xs rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono transition-colors cursor-pointer"
                    >
                      WEC 24h · Penske 963
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreFill('thor')}
                      className="px-2 py-0.5 text-xs rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3 text-emerald-400" />
                      <span>THOR · WEC Hypercar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreFill('indy')}
                      className="px-2 py-0.5 text-xs rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono transition-colors cursor-pointer"
                    >
                      Indy 500 · Penske
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreFill('wrc')}
                      className="px-2 py-0.5 text-xs rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono transition-colors cursor-pointer"
                    >
                      WRC Diff · Toyota
                    </button>
                  </div>
                </div>
              </div>

              {/* 2-Column Responsive Layout - Expanded for wide displays */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 xl:gap-6 items-start">
                {/* Column 1: Classification, Architecture, Motorsport Class & Priority */}
                <div className="space-y-4">
                  {/* Bicester Cleanliness Classification */}
                  <div className="space-y-1.5 p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800">
                    <div className="flex items-center justify-between">
                      <label className="text-neutral-200 block text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                        <span>Component Cleanliness Classification *</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCustomCoolerModalOpen(true)}
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Add a custom cooler specification and save for future use"
                        >
                          <Plus className="h-3 w-3" />
                          <span>+ Custom Cooler Option</span>
                        </button>
                        <span className="text-[10px] font-mono text-amber-400/80">
                          PS-WORKBENCH-QA-2026
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                      {getAllComponentTypes().map((ct) => {
                        const isSelected = componentType === ct.id;
                        return (
                          <button
                            key={ct.id}
                            type="button"
                            onClick={() => {
                              setComponentType(ct.id);
                              setInhousePartNo(`PS-${ct.code}-${partNumber.trim() || '940'}`);
                            }}
                            className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            {isSelected ? (
                              <CheckSquare className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            ) : (
                              <Square className="h-3.5 w-3.5 text-neutral-600 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-[11px] block leading-tight truncate">
                                {ct.label}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-neutral-500 font-mono block">
                                  {ct.code}
                                </span>
                                {ct.isCustom && (
                                  <span className="text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    CUSTOM
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Heat Exchanger Medium Configuration */}
                    {componentType === 'heat_exchanger' && (
                      <div className="mt-3 p-3 bg-cyan-950/30 border border-cyan-800/50 rounded-xl space-y-2 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-cyan-200 uppercase font-mono tracking-wider flex items-center gap-1.5">
                            Heat Exchanger Medium Type:
                          </span>
                          <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-900/50 px-2 py-0.5 rounded border border-cyan-700/60">
                            {heatExchangerMedium.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-300">
                          Select the fluid exchange medium pairing for this matrix:
                        </p>
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          {[
                            { id: 'water_to_oil', label: 'Water to Oil', desc: 'Liquid / Liquid' },
                            { id: 'oil_to_oil', label: 'Oil to Oil', desc: 'Dual-Oil Matrix' },
                            { id: 'water_to_air', label: 'Water to Air', desc: 'Liquid / Gas' },
                          ].map((med) => {
                            const isMedSelected = heatExchangerMedium === med.id;
                            return (
                              <button
                                key={med.id}
                                type="button"
                                onClick={() => setHeatExchangerMedium(med.id as any)}
                                className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                                  isMedSelected
                                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 ring-1 ring-cyan-400/50'
                                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                                }`}
                              >
                                <span className={`text-xs font-bold block ${isMedSelected ? 'text-cyan-200' : 'text-neutral-300'}`}>
                                  {med.label}
                                </span>
                                <span className="text-[9.5px] text-neutral-400 block mt-0.5">
                                  {med.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Comby Unit 2 or 3 Core Architecture Selector */}
                    {isCombi && (
                      <div className="mt-3 p-3 bg-purple-950/30 border border-purple-800/50 rounded-xl space-y-2.5 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Cpu className="h-4 w-4 text-purple-400" />
                            <span className="text-xs font-bold text-purple-200 uppercase font-mono tracking-wider">
                              Comby Multi-Core Architecture
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-purple-300 font-bold bg-purple-900/50 px-2 py-0.5 rounded border border-purple-700/60">
                            {combiUnitCount} SUB-UNITS
                          </span>
                        </div>

                        <p className="text-[11px] text-purple-200/80 leading-relaxed">
                          Select how many heat exchanger cores comprise this Comby assembly. Each sub-unit will undergo independent flow and hydrostatic pressure testing.
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCombiUnitCount(2);
                              setComponentType('combi_2_unit');
                              setInhousePartNo(`PS-CM2-${partNumber.trim() || '940'}`);
                            }}
                            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-2 ${
                              combiUnitCount === 2
                                ? 'bg-purple-600/30 border-purple-400 text-purple-100 ring-1 ring-purple-400/50'
                                : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:text-white'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-xs flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-purple-400" />
                                <span>Comby 2-Unit Setup</span>
                              </div>
                              <div className="text-[10px] text-neutral-300 mt-1 space-y-0.5">
                                <div>• Unit 1: Water Radiator Core</div>
                                <div>• Unit 2: Engine Oil Cooler Core</div>
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCombiUnitCount(3);
                              setComponentType('combi_3_unit');
                              setInhousePartNo(`PS-CM3-${partNumber.trim() || '940'}`);
                            }}
                            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-2 ${
                              combiUnitCount === 3
                                ? 'bg-purple-600/30 border-purple-400 text-purple-100 ring-1 ring-purple-400/50'
                                : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:text-white'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-xs flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-purple-400" />
                                <span>Comby 3-Unit Setup</span>
                              </div>
                              <div className="text-[10px] text-neutral-300 mt-1 space-y-0.5">
                                <div>• Unit 1: Water Radiator Core</div>
                                <div>• Unit 2: Engine Oil Cooler Core</div>
                                <div>• Unit 3: Gearbox / Intercooler</div>
                              </div>
                            </div>
                          </button>
                        </div>

                        {/* Interactive Combi Core Type Selectors */}
                        <div className="p-3 bg-neutral-900/90 rounded-xl border border-purple-800/50 space-y-2.5 mt-2">
                          <span className="text-[10px] font-mono font-bold text-purple-300 uppercase tracking-wider block">
                            Select What Type of Unit is in Each Combi Circuit:
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {/* Core 1 */}
                            <div className="p-2 rounded bg-neutral-950/80 border border-neutral-800 space-y-1">
                              <label className="text-[10px] font-mono font-bold text-neutral-400 block">
                                Circuit 1 Unit Type:
                              </label>
                              <select
                                value={combiCore1Type}
                                onChange={(e) => setCombiCore1Type(e.target.value as ComponentType)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 font-mono focus:border-purple-400"
                              >
                                <option value="water_radiator">Water Radiator (~4.0 Bar)</option>
                                <option value="oil_cooler">Engine Oil Cooler (~16.0 Bar)</option>
                                <option value="intercooler">Intercooler / Charge Air (~8.0 Bar)</option>
                                <option value="heat_exchanger">Auxiliary Heat Exchanger (~6.0 Bar)</option>
                              </select>
                            </div>

                            {/* Core 2 */}
                            <div className="p-2 rounded bg-neutral-950/80 border border-neutral-800 space-y-1">
                              <label className="text-[10px] font-mono font-bold text-neutral-400 block">
                                Circuit 2 Unit Type:
                              </label>
                              <select
                                value={combiCore2Type}
                                onChange={(e) => setCombiCore2Type(e.target.value as ComponentType)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 font-mono focus:border-purple-400"
                              >
                                <option value="oil_cooler">Engine Oil Cooler (~16.0 Bar)</option>
                                <option value="water_radiator">Water Radiator (~4.0 Bar)</option>
                                <option value="intercooler">Intercooler / Charge Air (~8.0 Bar)</option>
                                <option value="heat_exchanger">Auxiliary Heat Exchanger (~6.0 Bar)</option>
                              </select>
                            </div>

                            {/* Core 3 (if 3-unit) */}
                            {combiUnitCount === 3 && (
                              <div className="p-2 rounded bg-neutral-950/80 border border-neutral-800 space-y-1 sm:col-span-2">
                                <label className="text-[10px] font-mono font-bold text-neutral-400 block">
                                  Circuit 3 Unit Type:
                                </label>
                                <select
                                  value={combiCore3Type}
                                  onChange={(e) => setCombiCore3Type(e.target.value as ComponentType)}
                                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 font-mono focus:border-purple-400"
                                >
                                  <option value="intercooler">Intercooler / Charge Air (~8.0 Bar)</option>
                                  <option value="oil_cooler">Gearbox / Engine Oil Cooler (~16.0 Bar)</option>
                                  <option value="water_radiator">Secondary Water Radiator (~4.0 Bar)</option>
                                  <option value="heat_exchanger">Auxiliary Heat Exchanger (~6.0 Bar)</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Racing Category Selection */}
                  <div className="space-y-1.5 p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800">
                    <label className="text-neutral-200 block text-xs font-bold uppercase tracking-wider">
                      Motorsport Racing Category *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                      {ALL_RACING_CATEGORIES.map((cat) => {
                        const isSelected = racingCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setRacingCategory(cat.id);
                            }}
                            className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? `${cat.badgeBg} ${cat.badgeBorder} ${cat.badgeText} ring-1 ${cat.badgeBorder}`
                                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            <span className="font-bold text-[10px] font-mono block">
                              {cat.badge}
                            </span>
                            <span className="text-[9px] text-neutral-400 block truncate mt-0.5">
                              {cat.shortLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Unit Operational Priority Status */}
                  <div className="text-xs space-y-1.5 p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800">
                    <label className="text-neutral-200 block font-bold uppercase tracking-wider text-xs">
                      Operational Priority Status:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {(['emergency', 'high', 'medium', 'low'] as UnitPriority[]).map((pKey) => {
                        const cfg = PRIORITY_CONFIGS[pKey];
                        const isSelected = priority === pKey;
                        return (
                          <button
                            key={pKey}
                            type="button"
                            onClick={() => setPriority(pKey)}
                            className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? `${cfg.badgeBg} ${cfg.badgeBorder} ${cfg.badgeText} ring-1 ${cfg.badgeBorder}`
                                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-[10px]">
                                {cfg.label}
                              </span>
                              <span className={`h-2 w-2 rounded-full ${cfg.dotColor} ${cfg.pulse && isSelected ? 'animate-ping' : ''}`} />
                            </div>
                            <span className="text-[9px] text-neutral-400 mt-1 line-clamp-1">
                              {pKey === 'emergency' ? 'AOG Critical' : pKey === 'high' ? 'Accelerated' : pKey === 'medium' ? 'Standard' : 'Routine'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Column 2: Identification, Customer, Drawings, Service Life, Technician */}
                <div className="space-y-4">
                  {/* Serial Number & Work Order Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800">
                    <div>
                      <label className="text-neutral-200 block mb-1 font-bold text-xs">
                        Unit Serial Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        placeholder="e.g. SN-F1-940"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 font-mono text-neutral-100 focus:outline-none focus:border-amber-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-neutral-200 block mb-1 font-bold text-xs">
                        Work Order Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={workOrderNumber}
                        onChange={(e) => setWorkOrderNumber(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 font-mono text-neutral-100 focus:outline-none focus:border-amber-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* Part Number / Model */}
                  <div className="text-xs p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800">
                    <label className="text-neutral-200 block mb-1 font-bold text-xs">
                      Part Number / Component Model *
                    </label>
                    <input
                      type="text"
                      required
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      placeholder="e.g. F1-PAS-940 (Power Steering Actuator)"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 font-mono text-neutral-100 focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>

                  {/* Customer Selection - Asked ONLY on Intake per workflow specification */}
                  <div className="p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-neutral-200 block">Customer Assignment</span>
                      <span className="text-[11px] text-neutral-400">
                        Motorsport customer / constructor is selected strictly during <strong className="text-amber-300">Stage 01: In-Sheet Intake</strong> and permanently locked once accepted.
                      </span>
                    </div>
                  </div>

                  {/* Expected Delivery Date (SLA Target) */}
                  <div className="text-xs p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800">
                    <label className="text-neutral-200 block mb-1 font-bold text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>Expected Delivery Date *</span>
                        <span className="text-[10px] font-normal text-sky-400 font-mono">(SLA Target)</span>
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">Workshop SLA</span>
                    </label>
                    <input
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 font-mono text-neutral-100 focus:outline-none focus:border-amber-500 text-xs cursor-pointer"
                    />
                  </div>

                  {/* Intake Packaging & Box Reception Inspection */}
                  <div className="p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-neutral-200 block text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span>Packaging &amp; Box Intake Reception</span>
                      </label>
                      <span className="text-[10px] font-mono text-amber-400">Box Inspection</span>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-neutral-400 block text-[11px]">Type of Box Received:</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[
                          { id: 'cardboard', label: 'Cardboard' },
                          { id: 'aluminium_case', label: 'Aluminium Case' },
                          { id: 'flight_case', label: 'Flight Case' },
                          { id: 'hard_case', label: 'Hard Case' },
                          { id: 'soft_case', label: 'Soft Case' },
                          { id: 'bubble_wrap', label: 'Bubble Wrap' },
                          { id: 'dry_box', label: 'Dry Box' },
                          { id: 'wet_box', label: 'Wet Box' },
                        ].map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setBoxType(b.id as any);
                              if (b.id === 'wet_box') setBoxMoisture('wet');
                              if (b.id === 'dry_box') setBoxMoisture('dry');
                            }}
                            className={`py-1.5 px-2 rounded-lg border text-xs font-mono font-bold transition-colors cursor-pointer ${
                              boxType === b.id
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Wet or Dry Box Moisture Condition */}
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400 block text-[11px]">Box Moisture Condition:</span>
                        <span className={`text-[10px] font-mono font-bold ${boxMoisture === 'wet' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {boxMoisture === 'wet' ? '⚠ WET BOX (MOISTURE DETECTED)' : '✓ DRY BOX (CLEAN)'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setBoxMoisture('dry')}
                          className={`py-1.5 px-3 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            boxMoisture === 'dry'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40 shadow-xs'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Dry Box (Standard)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBoxMoisture('wet')}
                          className={`py-1.5 px-3 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            boxMoisture === 'wet'
                              ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-1 ring-rose-500/40 shadow-xs'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-rose-300'
                          }`}
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                          <span>Wet Box (Moisture Ingress)</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                      {/* Core Covers */}
                      <div>
                        <span className="text-neutral-400 block text-[11px] mb-1">Core Protection Covers:</span>
                        <div className="grid grid-cols-4 gap-1">
                          {(['cardboard', 'metal', 'plastic', 'none'] as const).map((cov) => (
                            <button
                              key={cov}
                              type="button"
                              onClick={() => setProtectionCovers(cov)}
                              className={`py-1 px-1 rounded border text-center font-mono text-[10px] capitalize cursor-pointer transition-colors ${
                                protectionCovers === cov
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              {cov}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Port Bungs */}
                      <div>
                        <span className="text-neutral-400 block text-[11px] mb-1">Port Bungs Supplied:</span>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { id: 'yes', label: 'Full' },
                            { id: 'partial', label: 'Partial' },
                            { id: 'no', label: 'None' },
                          ].map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setBungsCapsStatus(b.id as any)}
                              className={`py-1 px-1 rounded border text-center font-mono text-[10px] cursor-pointer transition-colors ${
                                bungsCapsStatus === b.id
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bicester Supplier & Blueprint Drawing fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800">
                    <div>
                      <label className="text-neutral-200 block mb-1 font-bold text-xs">
                        Supplier Contact Name
                      </label>
                      <input
                        type="text"
                        value={supplierContactName}
                        onChange={(e) => setSupplierContactName(e.target.value)}
                        placeholder="e.g. Marco Rossi (Chief Mech)"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-neutral-200 block mb-1 font-bold text-xs">
                        Blueprint Drawing No
                      </label>
                      <input
                        type="text"
                        value={drawingNumber}
                        onChange={(e) => setDrawingNumber(e.target.value)}
                        placeholder="e.g. DWG-2026-F1-08"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 font-mono text-neutral-100 focus:outline-none focus:border-amber-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* Service Cycle & Life Number */}
                  <div className="text-xs space-y-2 p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800">
                    <label className="text-neutral-200 block font-bold uppercase tracking-wider text-xs">
                      Service Cycle Assessment:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsFirstService(true);
                          setLifeNumber(1);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isFirstService
                            ? 'bg-sky-500/10 border-sky-500/40 text-sky-300 font-bold'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <span className="block text-xs">First Service (Life #1)</span>
                        <span className="block text-[10px] text-neutral-400 font-normal mt-0.5">
                          Establishes baseline flow curve
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsFirstService(false);
                          if (lifeNumber <= 1) setLifeNumber(2);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          !isFirstService
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-bold'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <span className="block text-xs">Repeat Overhaul (Life #2+)</span>
                        <span className="block text-[10px] text-neutral-400 font-normal mt-0.5">
                          Evaluated against ±15% baseline bracket
                        </span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-neutral-300 block font-medium mb-1">
                          Life Number
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={lifeNumber}
                            onChange={(e) => setLifeNumber(Math.max(1, Number(e.target.value) || 1))}
                            className="w-20 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 font-mono text-neutral-100 text-xs focus:outline-none focus:border-amber-500"
                          />
                          <span className="text-[10px] text-amber-300 font-mono font-bold">
                            Life #{lifeNumber}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-neutral-300 block font-medium mb-1">
                          Intake Technician
                        </label>
                        <input
                          type="text"
                          value={technician}
                          onChange={(e) => setTechnician(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-100 text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="px-5 py-3.5 border-t border-neutral-800 bg-neutral-950 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
                <QrCode className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Encrypted tracking QR tag will be generated automatically on intake</span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer rounded-lg hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Plus className="h-4 w-4 stroke-[3]" />
                  <span>Generate QR &amp; Intake Unit</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Custom Cooler Specification Modal */}
      <CustomCoolerModal
        isOpen={isCustomCoolerModalOpen}
        onClose={() => setIsCustomCoolerModalOpen(false)}
        onSave={(newCooler) => {
          setCoolerTypesVersion((v) => v + 1);
          setComponentType(newCooler.id as any);
          setInhousePartNo(`PS-${newCooler.code}-${partNumber.trim() || '940'}`);
        }}
      />
    </div>
  );
};
