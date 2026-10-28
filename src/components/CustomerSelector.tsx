import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Check, 
  Flag, 
  Search, 
  Filter, 
  ShieldCheck, 
  Sparkles, 
  Plus, 
  X, 
  FolderPlus,
  Users,
  Mail,
  Phone,
  MapPin,
  Building,
  FileText,
  CheckCircle2,
  UserCheck,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { 
  ALL_RACING_CATEGORIES, 
  ALL_MOTORSPORT_TEAMS,
  RacingCategoryConfig, 
  RacingCategoryId,
  getTeamMetadata,
  TEAM_TIERS,
  TeamTier,
  saveCustomCustomer,
  deleteCustomer,
  deleteCustomCustomer,
  restoreCustomer,
  getDeletedCustomers,
  isCustomerDeleted,
  isCustomCustomer,
  clearAllCustomCustomers,
  clearDeletedCustomers,
  getAllTeamsWithCustom,
  getCustomCustomers,
  CustomCustomerRecord
} from '../constants/motorsport';

interface CustomerContactPayload {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  notes?: string;
}

interface CustomerSelectorProps {
  value: string;
  onChange: (customerName: string) => void;
  onCategorySelect?: (category: RacingCategoryConfig) => void;
  onContactDetails?: (contact: CustomerContactPayload) => void;
  label?: string;
  className?: string;
  compact?: boolean;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  value,
  onChange,
  onCategorySelect,
  onContactDetails,
  label = 'Motorsport Team / Constructor',
  className = '',
  compact = false,
}) => {
  const [customCustomersVersion, setCustomCustomersVersion] = useState<number>(0);
  const allTeams = useMemo(() => getAllTeamsWithCustom(), [customCustomersVersion]);
  const isStandard = allTeams.includes(value);

  const [activeTab, setActiveTab] = useState<'catalog' | 'new_customer' | 'manage_customers'>('catalog');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(!isStandard && value.length > 0);
  const [customInput, setCustomInput] = useState<string>(!isStandard ? value : '');
  const [customerPendingDelete, setCustomerPendingDelete] = useState<string | null>(null);
  const [confirmInlineDeleteFor, setConfirmInlineDeleteFor] = useState<string | null>(null);
  const [lastDeletedCustomer, setLastDeletedCustomer] = useState<string | null>(null);
  const [quickDeleteName, setQuickDeleteName] = useState<string>('');
  const customCustomersList = useMemo(() => getCustomCustomers(), [customCustomersVersion]);
  const deletedCustomersList = useMemo(() => getDeletedCustomers(), [customCustomersVersion]);

  const requestDeleteCustomer = (customerName: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const clean = (customerName || '').trim();
    if (!clean) return;
    executeDeleteCustomer(clean);
  };

  const executeDeleteCustomer = (customerName: string) => {
    const clean = (customerName || '').trim();
    if (!clean) return;

    deleteCustomer(clean);
    setCustomCustomersVersion((v) => v + 1);
    setLastDeletedCustomer(clean);
    setConfirmInlineDeleteFor(null);
    setCustomerPendingDelete(null);

    if (value.toLowerCase() === clean.toLowerCase()) {
      onChange('');
      setIsCustomMode(false);
      setCustomInput('');
    }

    setSaveNotice(`Customer "${clean}" successfully deleted from depot database.`);
    setTimeout(() => setSaveNotice(null), 6000);
  };

  const handleRestoreCustomer = (customerName: string) => {
    restoreCustomer(customerName);
    setCustomCustomersVersion((v) => v + 1);
    setSaveNotice(`Customer "${customerName}" restored to catalog.`);
    setTimeout(() => setSaveNotice(null), 4000);
  };

  const handleClearAllCustomCustomers = () => {
    clearAllCustomCustomers();
    setCustomCustomersVersion((v) => v + 1);
    if (isCustomCustomer(value)) {
      onChange('');
      setIsCustomMode(false);
    }
    setSaveNotice('All custom customers have been cleared.');
    setTimeout(() => setSaveNotice(null), 4000);
  };

  const handleResetDeletedCustomers = () => {
    clearDeletedCustomers();
    setCustomCustomersVersion((v) => v + 1);
    setSaveNotice('All deleted customers restored to default catalog.');
    setTimeout(() => setSaveNotice(null), 4000);
  };
  
  // New Customer Registration State with Contact Details
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustCategory, setNewCustCategory] = useState<RacingCategoryId>('formula1');
  const [newCustTier, setNewCustTier] = useState<TeamTier>('customer');
  const [newCustShortName, setNewCustShortName] = useState<string>('');
  const [newCustContactName, setNewCustContactName] = useState<string>('');
  const [newCustContactEmail, setNewCustContactEmail] = useState<string>('');
  const [newCustContactPhone, setNewCustContactPhone] = useState<string>('');
  const [newCustAddress, setNewCustAddress] = useState<string>('');
  const [newCustNotes, setNewCustNotes] = useState<string>('');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Sub-category filters for teams
  const [teamTierFilter, setTeamTierFilter] = useState<'all' | TeamTier>('all');
  const [categorySubFilter, setCategorySubFilter] = useState<'all' | RacingCategoryId>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  useEffect(() => {
    const handleStorageUpdate = () => {
      setCustomCustomersVersion((v) => v + 1);
    };
    window.addEventListener('depot_custom_customers_changed', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('depot_custom_customers_changed', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  useEffect(() => {
    const isStd = allTeams.includes(value);
    if (!isStd && value) {
      setIsCustomMode(true);
      setCustomInput(value);
    } else if (isStd) {
      setIsCustomMode(false);
    }
  }, [value, allTeams]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__NEW_CUSTOMER__') {
      setActiveTab('new_customer');
      return;
    }
    if (selected === '__CUSTOM__') {
      setIsCustomMode(true);
      if (customInput.trim()) {
        onChange(customInput.trim());
      }
    } else {
      setIsCustomMode(false);
      onChange(selected);
      // Auto-identify category
      const matchedCat = ALL_RACING_CATEGORIES.find((c) => c.teams.includes(selected)) ||
        ALL_RACING_CATEGORIES.find((c) => {
          const customs = getCustomCustomers();
          const found = customs.find(cm => cm.name.toLowerCase() === selected.toLowerCase());
          return found && found.categoryId === c.id;
        });
      if (matchedCat && onCategorySelect) {
        onCategorySelect(matchedCat);
      }
    }
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomInput(val);
    onChange(val);
  };

  const handleSaveCustomInline = () => {
    const clean = customInput.trim();
    if (!clean) return;
    const catId = categorySubFilter !== 'all' ? categorySubFilter : (newCustCategory || 'formula1');
    const newRecord: CustomCustomerRecord = {
      name: clean,
      categoryId: catId,
      tier: 'customer',
      shortName: clean.split(' ')[0] || clean,
      subCategory: 'Independent Racing Team',
      createdAt: new Date().toISOString(),
    };
    saveCustomCustomer(newRecord);
    setCustomCustomersVersion((v) => v + 1);
    setIsCustomMode(false);
    onChange(clean);
    const catConfig = ALL_RACING_CATEGORIES.find((c) => c.id === catId);
    if (catConfig && onCategorySelect) {
      onCategorySelect(catConfig);
    }
  };

  const handleSelectTeam = (cust: string) => {
    setIsCustomMode(false);
    onChange(cust);
    const matchedCat = ALL_RACING_CATEGORIES.find((c) => c.teams.includes(cust)) ||
      ALL_RACING_CATEGORIES.find((c) => {
        const customs = getCustomCustomers();
        const found = customs.find(cm => cm.name.toLowerCase() === cust.toLowerCase());
        return found && found.categoryId === c.id;
      });
    if (matchedCat && onCategorySelect) {
      onCategorySelect(matchedCat);
    }
  };

  const handleNewCustNameChange = (val: string) => {
    setNewCustName(val);
    if (!newCustShortName) {
      setNewCustShortName(val.split(' ')[0] || '');
    }
    // Synchronize customer name to parent immediately on keystroke
    onChange(val);
  };

  const handleQuickAddSearchTeam = (teamName: string) => {
    const clean = teamName.trim();
    if (!clean) return;
    const catId = categorySubFilter !== 'all' ? categorySubFilter : 'formula1';
    const newRecord: CustomCustomerRecord = {
      name: clean,
      categoryId: catId,
      tier: 'customer',
      shortName: clean.split(' ')[0] || clean,
      subCategory: 'Independent Racing Team',
      createdAt: new Date().toISOString(),
    };
    saveCustomCustomer(newRecord);
    setCustomCustomersVersion((v) => v + 1);
    setIsCustomMode(false);
    onChange(clean);
    const catConfig = ALL_RACING_CATEGORIES.find((c) => c.id === catId);
    if (catConfig && onCategorySelect) {
      onCategorySelect(catConfig);
    }
    setSearchFilter('');
    setSaveNotice(`Customer "${clean}" created and selected!`);
    setTimeout(() => setSaveNotice(null), 4000);
  };

  const handleSaveNewCustomer = (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    const cleanName = newCustName.trim() || customInput.trim() || value.trim();
    if (!cleanName) {
      setSaveNotice('Please enter a Customer / Team Name before saving.');
      return;
    }

    const short = newCustShortName.trim() || cleanName.split(' ')[0] || cleanName;
    const newRecord: CustomCustomerRecord = {
      name: cleanName,
      categoryId: newCustCategory,
      tier: newCustTier,
      shortName: short,
      subCategory: newCustTier === 'works' ? 'Factory Works Constructor' : 'Independent Racing Team',
      contactName: newCustContactName.trim() || undefined,
      contactEmail: newCustContactEmail.trim() || undefined,
      contactPhone: newCustContactPhone.trim() || undefined,
      address: newCustAddress.trim() || undefined,
      notes: newCustNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    saveCustomCustomer(newRecord);
    setCustomCustomersVersion((v) => v + 1);

    // Apply new customer immediately
    setIsCustomMode(false);
    onChange(cleanName);
    const catConfig = ALL_RACING_CATEGORIES.find((c) => c.id === newCustCategory);
    if (catConfig && onCategorySelect) {
      onCategorySelect(catConfig);
    }

    if (onContactDetails) {
      onContactDetails({
        contactName: newCustContactName.trim(),
        contactEmail: newCustContactEmail.trim(),
        contactPhone: newCustContactPhone.trim(),
        address: newCustAddress.trim(),
        notes: newCustNotes.trim(),
      });
    }

    // Switch back to catalog with notice
    setActiveTab('catalog');
    setSaveNotice(`Customer "${cleanName}" & contact details successfully registered and saved!`);
    setTimeout(() => setSaveNotice(null), 5000);

    // Reset inputs
    setNewCustName('');
    setNewCustShortName('');
    setNewCustContactName('');
    setNewCustContactEmail('');
    setNewCustContactPhone('');
    setNewCustAddress('');
    setNewCustNotes('');
  };


  // Filtered teams list based on active sub-category filters
  const filteredTeams = useMemo(() => {
    return allTeams.filter((team) => {
      const meta = getTeamMetadata(team);
      
      // Sub-category tier filter (Works vs Customer)
      if (teamTierFilter !== 'all' && meta.tier !== teamTierFilter) {
        return false;
      }
      
      // Racing category sub-filter
      if (categorySubFilter !== 'all' && meta.categoryId !== categorySubFilter) {
        return false;
      }

      // Search term
      if (searchFilter.trim()) {
        const term = searchFilter.toLowerCase();
        const matchesName = team.toLowerCase().includes(term);
        const matchesSubCat = meta.subCategory.toLowerCase().includes(term);
        const matchesShort = meta.shortName.toLowerCase().includes(term);
        if (!matchesName && !matchesSubCat && !matchesShort) return false;
      }

      return true;
    });
  }, [allTeams, teamTierFilter, categorySubFilter, searchFilter]);

  const activeMeta = value ? getTeamMetadata(value) : null;

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-neutral-300 block text-xs font-medium flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span>{label} *</span>
          </label>
          <span className="text-[10px] text-neutral-500 font-mono">
            {isCustomMode ? 'Custom Customer' : 'Homologated Catalog'}
          </span>
        </div>
      )}

      {/* Top Tab Switcher: Catalog vs New Customer Input vs Delete Wrong Customers */}
      <div className="flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-xl flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 min-w-[130px] py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-neutral-800 text-amber-300 border border-amber-500/40 shadow-xs'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Trophy className="h-3.5 w-3.5" />
          <span>Select Constructor / Team</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('new_customer')}
          className={`flex-1 min-w-[150px] py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'new_customer'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <FolderPlus className="h-3.5 w-3.5" />
          <span>+ Register New Customer</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('manage_customers')}
          className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'manage_customers'
              ? 'bg-red-500/20 text-red-300 border border-red-500/50 font-bold shadow-xs'
              : 'text-neutral-400 hover:text-red-300'
          }`}
          title="Delete wrong or misentered customers from catalog"
        >
          <Trash2 className="h-3.5 w-3.5 text-red-400" />
          <span>Delete Wrong Customer ({customCustomersList.length})</span>
        </button>
      </div>

      {/* Save Success Notice Banner */}
      {saveNotice && (
        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-semibold truncate">{saveNotice}</span>
          </div>
          {lastDeletedCustomer && (
            <button
              type="button"
              onClick={() => {
                handleRestoreCustomer(lastDeletedCustomer);
                setLastDeletedCustomer(null);
              }}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 hover:text-amber-200 text-[10px] font-mono font-bold border border-neutral-700 shrink-0 cursor-pointer"
            >
              Undo / Restore
            </button>
          )}
        </div>
      )}

      {/* Selected Team Sub-Category Display Badge with Delete Wrong Customer option */}
      {activeMeta && activeTab === 'catalog' && (
        <div className="p-2.5 bg-neutral-900/90 rounded-xl border border-neutral-800 flex items-center justify-between gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${activeMeta.badgeBg} ${activeMeta.badgeText} ${activeMeta.badgeBorder}`}>
              {activeMeta.tierLabel.toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-white block truncate">{activeMeta.name}</span>
              <span className="text-[10px] text-neutral-400 font-mono block truncate">
                Category: {ALL_RACING_CATEGORIES.find(c => c.id === activeMeta.categoryId)?.shortLabel || activeMeta.categoryId} · {activeMeta.subCategory}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {value && (
              confirmInlineDeleteFor === value ? (
                <div className="flex items-center gap-1.5 p-1 bg-red-950/80 border border-red-500 rounded-lg animate-fadeIn">
                  <span className="text-[10px] text-red-200 font-bold px-1">Delete "{value}"?</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      executeDeleteCustomer(value);
                    }}
                    className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setConfirmInlineDeleteFor(null);
                    }}
                    className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirmInlineDeleteFor(value);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 border border-red-500/40 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={`Delete wrong customer "${value}" from database`}
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete Wrong Customer</span>
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsCustomMode(false);
                setConfirmInlineDeleteFor(null);
              }}
              className="text-[10px] font-mono px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 cursor-pointer"
              title="Clear selected customer"
            >
              Clear
            </button>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-950 text-neutral-400 border border-neutral-800">
              Active
            </span>
          </div>
        </div>
      )}

      {/* TAB 2: DEDICATED NEW CUSTOMER INPUT TAB WITH CATEGORY SELECTOR & CONTACT DETAILS */}
      {activeTab === 'new_customer' && (
        <div className="p-4 bg-neutral-900 border border-amber-500/50 rounded-2xl space-y-4 animate-fadeIn shadow-lg">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase font-mono">
              <FolderPlus className="h-4 w-4 text-amber-400" />
              <span>Register New Customer · Category Selector &amp; Contact Details</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Back to Catalog</span>
            </button>
          </div>

          <div className="space-y-4">
            {/* 1. Category Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-200 block flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5 text-amber-400" />
                <span>1. Motorsport Category Selector *</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_RACING_CATEGORIES.map((cat) => {
                  const isSelected = newCustCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewCustCategory(cat.id)}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500/40 shadow-xs'
                          : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-amber-300' : 'text-neutral-400'}`}>
                          {cat.shortLabel}
                        </span>
                        {isSelected && <Check className="h-3 w-3 text-amber-400" />}
                      </div>
                      <span className="text-[9px] text-neutral-500 font-mono truncate mt-0.5">
                        {cat.governingBody}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Customer & Team Details */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-neutral-200 block flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-sky-400" />
                <span>2. Team &amp; Constructor Identification</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-neutral-300 block mb-1">
                    Customer / Team Name *
                  </label>
                  <input
                    type="text"
                    value={newCustName}
                    onChange={(e) => handleNewCustNameChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveNewCustomer(e);
                      }
                    }}
                    placeholder="e.g. Aston Martin Aramco F1 Team / Penske Porsche / Cadillac F1"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-neutral-300 block mb-1">
                    Short Acronym / Code
                  </label>
                  <input
                    type="text"
                    value={newCustShortName}
                    onChange={(e) => setNewCustShortName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveNewCustomer(e);
                      }
                    }}
                    placeholder="e.g. Aston Martin / Penske"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-300 block mb-1">
                  Team Classification / Tier
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCustTier('customer')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-colors cursor-pointer ${
                      newCustTier === 'customer'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    Customer / Privateer Team
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCustTier('works')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-colors cursor-pointer ${
                      newCustTier === 'works'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    Factory Works Constructor
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Contact Details Section */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <span className="text-xs font-bold text-neutral-200 block flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>3. Contact &amp; Shipping Details (Saved to Database)</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-neutral-300 block mb-1 flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-neutral-400" />
                    <span>Contact Person</span>
                  </label>
                  <input
                    type="text"
                    value={newCustContactName}
                    onChange={(e) => setNewCustContactName(e.target.value)}
                    placeholder="e.g. Luca Bianchi (Trackside Eng)"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-neutral-300 block mb-1 flex items-center gap-1">
                    <Mail className="h-3 w-3 text-neutral-400" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    value={newCustContactEmail}
                    onChange={(e) => setNewCustContactEmail(e.target.value)}
                    placeholder="e.g. operations@racingteam.com"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-neutral-300 block mb-1 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-neutral-400" />
                    <span>Telephone / Radio</span>
                  </label>
                  <input
                    type="tel"
                    value={newCustContactPhone}
                    onChange={(e) => setNewCustContactPhone(e.target.value)}
                    placeholder="e.g. +44 1327 850000"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-neutral-300 block mb-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-neutral-400" />
                    <span>Factory / Paddock Shipping Address</span>
                  </label>
                  <input
                    type="text"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    placeholder="e.g. Silverstone Innovation Centre, Towcester NN12 8TL, UK"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-neutral-300 block mb-1 flex items-center gap-1">
                    <FileText className="h-3 w-3 text-neutral-400" />
                    <span>Account Number / Special Instructions</span>
                  </label>
                  <input
                    type="text"
                    value={newCustNotes}
                    onChange={(e) => setNewCustNotes(e.target.value)}
                    placeholder="e.g. Priority turnaround required for flyaway rounds"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white border border-neutral-800 bg-neutral-950 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewCustomer}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm cursor-pointer transition-all hover:scale-[1.01]"
              >
                <Check className="h-4 w-4" />
                <span>Save Customer Record &amp; Select</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MANAGE & DELETE WRONG CUSTOMERS */}
      {activeTab === 'manage_customers' && (
        <div className="p-4 bg-neutral-900 border border-red-500/50 rounded-2xl space-y-4 animate-fadeIn shadow-lg">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase font-mono">
              <Trash2 className="h-4 w-4 text-red-400" />
              <span>Manage &amp; Delete Wrong Customers ({customCustomersList.length})</span>
            </div>
            <div className="flex items-center gap-2">
              {customCustomersList.length > 1 && (
                <button
                  type="button"
                  onClick={handleClearAllCustomCustomers}
                  className="text-[11px] text-red-400 hover:text-red-300 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 cursor-pointer font-medium"
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Back to Catalog</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed">
            If a customer was entered incorrectly, misspelled, or created by mistake, delete it below. You can delete the currently selected customer, any saved customer, or enter any customer name to purge it from all selectors and dropdowns.
          </p>

          {/* Quick Action: Delete Current Active Selection */}
          {value && (
            <div className="p-3 bg-red-950/40 border border-red-500/60 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] text-red-400 font-mono uppercase font-bold block">Currently Selected Customer:</span>
                <span className="text-sm font-bold text-white truncate block">{value}</span>
              </div>
              <button
                type="button"
                onClick={(e) => requestDeleteCustomer(value, e)}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-sm"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete This Customer Now</span>
              </button>
            </div>
          )}

          {/* Delete Any Customer By Name Input */}
          <div className="space-y-1.5 p-3 bg-neutral-950 rounded-xl border border-neutral-800">
            <label className="text-xs font-bold text-neutral-300 block flex items-center gap-1.5">
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
              <span>Delete Customer by Name (Typo or Unwanted Entry)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={quickDeleteName}
                onChange={(e) => setQuickDeleteName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && quickDeleteName.trim()) {
                    e.preventDefault();
                    requestDeleteCustomer(quickDeleteName.trim());
                    setQuickDeleteName('');
                  }
                }}
                placeholder="Type customer or team name to delete..."
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-red-400 font-sans"
              />
              <button
                type="button"
                onClick={() => {
                  if (quickDeleteName.trim()) {
                    requestDeleteCustomer(quickDeleteName.trim());
                    setQuickDeleteName('');
                  }
                }}
                disabled={!quickDeleteName.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {/* Registered Custom Customers Section */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold text-neutral-300 uppercase tracking-wider block">
              Registered Custom Customers ({customCustomersList.length}):
            </span>

            {customCustomersList.length === 0 ? (
              <div className="p-4 text-center bg-neutral-950/60 rounded-xl border border-neutral-800 text-neutral-400 text-xs">
                No custom customer entries currently stored.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {customCustomersList.map((cust) => {
                  const isSelected = value.toLowerCase() === cust.name.toLowerCase();
                  const cat = ALL_RACING_CATEGORIES.find((c) => c.id === cust.categoryId);
                  return (
                    <div
                      key={cust.name}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/50'
                          : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs truncate">{cust.name}</span>
                          {isSelected && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Currently Active
                            </span>
                          )}
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                            {cat?.shortLabel || cust.categoryId}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-neutral-400 font-mono mt-1 flex-wrap">
                          {cust.contactName && <span>Contact: {cust.contactName}</span>}
                          {cust.contactEmail && <span>Email: {cust.contactEmail}</span>}
                          {cust.createdAt && <span>Added: {new Date(cust.createdAt).toLocaleDateString()}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isSelected && (
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectTeam(cust.name);
                              setActiveTab('catalog');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium cursor-pointer"
                          >
                            Select
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => requestDeleteCustomer(cust.name, e)}
                          className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                          title={`Delete wrong customer "${cust.name}"`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Deleted Customers Archive / Restore Section */}
          {deletedCustomersList.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider block">
                  Deleted Customers ({deletedCustomersList.length}):
                </span>
                <button
                  type="button"
                  onClick={handleResetDeletedCustomers}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-mono cursor-pointer"
                >
                  Restore All
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {deletedCustomersList.map((delName) => (
                  <div
                    key={delName}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400"
                  >
                    <span className="line-through">{delName}</span>
                    <button
                      type="button"
                      onClick={() => handleRestoreCustomer(delName)}
                      className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 underline cursor-pointer ml-1"
                      title={`Restore "${delName}" to catalog`}
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: CATALOG CONTENT */}
      {activeTab === 'catalog' && (
        <>

      {/* Sub-Category Filters Toolbar */}
      <div className="p-2.5 bg-neutral-950 rounded-xl border border-neutral-800/90 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1">
            <Filter className="h-3 w-3 text-amber-400" />
            <span>Category Filters:</span>
          </span>
          <div className="flex items-center gap-1">
            {TEAM_TIERS.map((t) => {
              const isSelected = teamTierFilter === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTeamTierFilter(t.id as any)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer border ${
                    isSelected
                      ? t.id === 'works'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                        : t.id === 'customer'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                        : 'bg-neutral-800 text-white border-neutral-700 font-bold'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Racing Category Quick Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setCategorySubFilter('all')}
            className={`px-2 py-0.5 rounded text-[9.5px] font-mono whitespace-nowrap border shrink-0 transition-colors ${
              categorySubFilter === 'all'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
            }`}
          >
            All Categories ({allTeams.length})
          </button>
          {ALL_RACING_CATEGORIES.map((cat) => {
            const isCatActive = categorySubFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategorySubFilter(cat.id)}
                className={`px-2 py-0.5 rounded text-[9.5px] font-mono whitespace-nowrap border shrink-0 transition-colors flex items-center gap-1 ${
                  isCatActive
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                }`}
              >
                <span>{cat.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Search input inside toolbar */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search teams by name, short code, or racing division..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/60 font-sans"
          />
        </div>

        {/* Quick add custom customer directly from search filter */}
        {searchFilter.trim().length > 1 && !allTeams.some(t => t.toLowerCase() === searchFilter.trim().toLowerCase()) && (
          <button
            type="button"
            onClick={() => handleQuickAddSearchTeam(searchFilter)}
            className="w-full text-left px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[11px] font-sans border border-amber-500/40 flex items-center justify-between cursor-pointer transition-colors"
          >
            <span>+ Register &amp; Select <strong>"{searchFilter.trim()}"</strong> as New Customer</span>
            <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          </button>
        )}
      </div>

      {/* Main Select Dropdown */}
      <div className="relative">
        <select
          value={isCustomMode ? '__CUSTOM__' : value}
          onChange={handleSelectChange}
          className="w-full appearance-none bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 pr-8 cursor-pointer font-sans"
        >
          <option value="">-- Choose Homologated Team or Customer --</option>
          <option value="__NEW_CUSTOMER__">+ Register New Customer / Save by Category...</option>
          <option value="__CUSTOM__">+ Direct Custom / Privateer Team Input...</option>

          {/* Active Custom Customer option so select never reverts to blank */}
          {value && !ALL_MOTORSPORT_TEAMS.includes(value) && (
            <option value={value}>[Custom Customer] {value}</option>
          )}

          {/* Custom Customers Group */}
          {customCustomersList.length > 0 && (
            <optgroup label={`Custom / User-Added Customers (${customCustomersList.length})`}>
              {customCustomersList.map((c) => (
                <option key={c.name} value={c.name}>
                  ★ [Custom] {c.name}
                </option>
              ))}
            </optgroup>
          )}

          {/* Grouped by Racing Category */}
          {ALL_RACING_CATEGORIES.map((cat) => {
            const categoryTeams = allTeams.filter((t) => {
              const meta = getTeamMetadata(t);
              return meta.categoryId === cat.id;
            });
            if (categoryTeams.length === 0) return null;

            return (
              <optgroup key={cat.id} label={`${cat.label} (${cat.governingBody})`}>
                {categoryTeams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-neutral-400">
          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>

      {/* Custom Team Input if selected */}
      {isCustomMode && (
        <div className="space-y-2 p-2.5 bg-neutral-950/90 rounded-xl border border-amber-500/40 animate-fadeIn">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-amber-300 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>Input New / Custom Customer</span>
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">
              Auto-saved to selected category
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={handleCustomInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveCustomInline();
                }
              }}
              placeholder="Type racing team, constructor, or customer name..."
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-amber-200 placeholder:text-neutral-600 focus:outline-none focus:border-amber-400 font-sans"
              autoFocus
            />

            <button
              type="button"
              onClick={handleSaveCustomInline}
              disabled={!customInput.trim()}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Save &amp; Select</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-400">
            <span>
              Target Category: <strong className="text-neutral-200">{ALL_RACING_CATEGORIES.find(c => c.id === (categorySubFilter !== 'all' ? categorySubFilter : 'formula1'))?.shortLabel || 'F1'}</strong>
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('new_customer')}
              className="text-amber-400 hover:text-amber-300 font-medium underline"
            >
              Open Full Registration Form
            </button>
          </div>
        </div>
      )}

      {/* Filtered Team Quick Selection Chips */}
      {!compact && filteredTeams.length > 0 && (
        <div className="pt-1 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
            <span className="flex items-center gap-1">
              <Flag className="h-3 w-3 text-neutral-400" />
              <span>Available Teams ({filteredTeams.length}):</span>
            </span>
            <span>Click to assign</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {filteredTeams.map((team) => {
              const isSelected = value === team;
              const meta = getTeamMetadata(team);
              const isCustom = isCustomCustomer(team);

              return (
                <div key={team} className="inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => handleSelectTeam(team)}
                    className={`px-2 py-1 rounded-l-lg text-[10px] font-sans transition-all cursor-pointer flex items-center gap-1.5 border border-r-0 ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold shadow-xs'
                        : 'bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-800'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.tier === 'works' ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                    <span>{meta.shortName}</span>
                    <span className={`px-1 py-0.2 rounded text-[8px] font-mono uppercase ${meta.badgeBg} ${meta.badgeText}`}>
                      {meta.tier === 'works' ? 'Works' : 'Cust'}
                    </span>
                    {isSelected && <Check className="h-2.5 w-2.5 text-amber-400 ml-0.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => requestDeleteCustomer(team, e)}
                    className="px-1.5 py-1 rounded-r-lg border border-l border-neutral-800 hover:border-red-500/50 bg-neutral-900 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 text-[10px] transition-colors cursor-pointer"
                    title={`Delete wrong customer "${team}"`}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </>
      )}

      {/* IN-APP CONFIRMATION MODAL FOR DELETING CUSTOMER (NO BLOCKED WINDOW.CONFIRM) */}
      {customerPendingDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-neutral-900 border border-red-500/60 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl relative text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-white">Delete Wrong Customer</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Remove customer from depot system</p>
              </div>
              <button
                type="button"
                onClick={() => setCustomerPendingDelete(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1">
              <span className="text-[11px] text-neutral-400 block font-mono">Customer to be deleted:</span>
              <span className="text-sm font-bold text-red-300 font-mono block truncate">{customerPendingDelete}</span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Are you sure you want to delete this customer? It will be removed immediately from all dropdowns, category chips, and intake selectors.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setCustomerPendingDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteCustomer(customerPendingDelete)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
