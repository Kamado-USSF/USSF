import React, { useState, useEffect } from 'react';
import { 
  DollarSign, CheckCircle2, Clock, AlertCircle, PlusCircle, 
  ArrowRight, Shield, Filter, FileText, CheckSquare, Square, Target, 
  Coins, Terminal, TrendingUp, BarChart3, Users, Eye, MousePointerClick, 
  Lock, ShieldCheck, Download, Sparkles, RefreshCw, KeyRound, Gift, Calendar, Hash,
  X, Award, Crown
} from 'lucide-react';
import { 
  FinancialClaim, RewardItem, REALISTIC_REWARD_CATALOG, PendingLoginRewardClaim, 
  DAILY_LOGIN_REWARDS_7, DAILY_LOGIN_REWARDS_30, AdminEvent, USSFMember,
  MilestoneRewardChoice, DEFAULT_MILESTONE_CHOICES 
} from '../data/ussfData';
import { tacticalAudio } from '../utils/audioSynth';
import { BiometricModal } from './BiometricModal';

interface USSFFinancialViewProps {
  claims: FinancialClaim[];
  rewardCatalog: RewardItem[];
  events?: AdminEvent[];
  onOpenClaimModal: (preselectedReward?: RewardItem, quantity?: number, totalAmount?: number) => void;
  onClaimDailyLoginReward?: (claim: PendingLoginRewardClaim) => void;
  currentUser?: USSFMember | null;
  onUpdateProfile?: (updated: Partial<USSFMember>) => void;
  milestoneChoices?: MilestoneRewardChoice[];
}

export const USSFFinancialView: React.FC<USSFFinancialViewProps> = ({
  claims,
  rewardCatalog,
  events = [],
  onOpenClaimModal,
  onClaimDailyLoginReward,
  currentUser,
  onUpdateProfile,
  milestoneChoices = DEFAULT_MILESTONE_CHOICES
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'multi' | 'dailyLogin' | 'analytics' | 'claims'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [taskQuantities, setTaskQuantities] = useState<Record<string, number>>({});
  const [loginMode, setLoginMode] = useState<'7days' | '30days'>('7days');
  const [e2eeEnabled, setE2eeEnabled] = useState(true);
  const [isBiometricOpen, setIsBiometricOpen] = useState(false);
  const [biometricAction, setBiometricAction] = useState<string>('');
  const [dailyClaimSuccess, setDailyClaimSuccess] = useState<string | null>(null);
  const [milestoneModal, setMilestoneModal] = useState<{ day: 7 | 30; defaultCash: number; defaultPts: number } | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string>('');

  const currentMilestoneOptions = milestoneModal
    ? milestoneChoices.filter(c => c.milestoneDay === milestoneModal.day)
    : [];

  const handleConfirmMilestoneChoice = () => {
    if (!milestoneModal) return;
    tacticalAudio.playTargetLock();

    const chosen = currentMilestoneOptions.find(c => c.id === selectedChoiceId) || currentMilestoneOptions[0];
    
    // Equip reward to user profile if applicable
    if (chosen && onUpdateProfile && currentUser) {
      if (chosen.type === 'NAMECARD') {
        onUpdateProfile({ namecard: chosen.rewardValue });
      } else if (chosen.type === 'AVATAR_FRAME') {
        onUpdateProfile({ avatarFrame: chosen.rewardValue });
      } else if (chosen.type === 'TITLE') {
        onUpdateProfile({ signature: `Official Title: "${chosen.rewardValue}"` });
      }
    }

    const cash = (chosen && chosen.cashAmount) || milestoneModal.defaultCash;
    const pts = (chosen && chosen.promotionPoints) || milestoneModal.defaultPts;

    handleClaimLoginReward(milestoneModal.day, cash, pts);
    setDailyClaimSuccess(`Milestone Day 0${milestoneModal.day} Custom Reward Claimed: "${chosen ? chosen.title : 'Milestone Pack'}" ($${cash.toLocaleString()} Cash + ${pts} Promotion Points)!`);
    setMilestoneModal(null);
  };

  // Today's Financial Points Claimed (Daily cap: 50 pts)
  const todayStr = new Date().toISOString().split('T')[0];
  const storageKey = `ussf_daily_fin_pts_${todayStr}_${currentUser?.cid || 'SF-001'}`;
  const [claimedTodayPts, setClaimedTodayPts] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(storageKey) || 0);
    } catch {
      return 0;
    }
  });

  // Active Multiplier Event Calculation (X2, X3, X4 Financial)
  const activeFinancialEvent = events.find(e => 
    e.isActive && (
      e.multiplierType === '2X Financial Payouts' || 
      e.multiplierType === '3X Financial Payouts' || 
      e.multiplierType === '4X Financial Payouts' ||
      (e.multiplierType && typeof e.multiplierType === 'string' && e.multiplierType.toLowerCase().includes('financial')) ||
      (e.title && typeof e.title === 'string' && e.title.toLowerCase().includes('financial')) ||
      (e.multiplier && e.multiplier > 1 && !e.multiplierType?.toLowerCase().includes('promotion'))
    )
  );

  const financialMultiplier = activeFinancialEvent
    ? (activeFinancialEvent.multiplier || (activeFinancialEvent.multiplierType?.includes('4X') ? 4 : activeFinancialEvent.multiplierType?.includes('3X') ? 3 : 2))
    : 1;

  // Use the realistic catalog
  const catalog = REALISTIC_REWARD_CATALOG;

  // Live ticking impressions & creator analytics
  const [liveViews, setLiveViews] = useState(16400);
  const [liveClicks, setLiveClicks] = useState(1380);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveViews(v => v + Math.floor(Math.random() * 2));
      if (Math.random() > 0.7) {
        setLiveClicks(c => c + 1);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const ctrRate = ((liveClicks / liveViews) * 100).toFixed(2);

  const categories = [
    { id: 'ALL', label: 'All Tasks (30+)', count: catalog.length },
    { id: 'Arrest Points', label: '01 Arrest Points (Daily)', count: catalog.filter(r => r.category === 'Arrest Points').length },
    { id: 'Patrol & Training', label: '02 Patrol & Training (Weekly)', count: catalog.filter(r => r.category === 'Patrol & Training').length },
    { id: 'Combat & Tactical', label: '03 Combat & Tactical (Numeric Multiplier)', count: catalog.filter(r => r.category === 'Combat & Tactical').length },
    { id: 'Daily & Specialist Tasks', label: '04 Daily & Specialist', count: catalog.filter(r => r.category === 'Daily & Specialist Tasks').length },
    { id: 'Promotions & Achievements', label: '05 Promotions & Achievements', count: catalog.filter(r => r.category === 'Promotions & Achievements').length }
  ];

  const filteredCatalog = selectedCategory === 'ALL'
    ? catalog
    : catalog.filter(r => r.category === selectedCategory);

  const toggleTaskSelection = (id: string) => {
    tacticalAudio.playTacticalClick();
    if (selectedTaskIds.includes(id)) {
      setSelectedTaskIds(selectedTaskIds.filter(t => t !== id));
    } else {
      setSelectedTaskIds([...selectedTaskIds, id]);
    }
  };

  const setQuantityForTask = (id: string, q: number) => {
    const validQ = Math.max(1, Math.min(100, q));
    setTaskQuantities({ ...taskQuantities, [id]: validQ });
  };

  const totalMultiClaim = selectedTaskIds.reduce((sum, id) => {
    const item = catalog.find(r => r.id === id);
    if (!item) return sum;
    const qty = taskQuantities[id] || 1;
    return sum + (item.payoutAmount * qty * financialMultiplier);
  }, 0);

  const totalApprovedPayout = claims
    .filter(c => c.status === 'Approved')
    .reduce((sum, c) => sum + c.amount, 0);

  const handleOpenMultiClaim = () => {
    if (selectedTaskIds.length === 0) return;
    if (!currentUser || !currentUser.isMember || currentUser.isApplicant) {
      alert('Action Restricted: Only verified active USSF members can submit financial claims.');
      return;
    }
    tacticalAudio.playTargetLock();
    const firstSelected = catalog.find(r => r.id === selectedTaskIds[0]);
    const firstQty = taskQuantities[selectedTaskIds[0]] || 1;
    onOpenClaimModal(firstSelected, firstQty, totalMultiClaim);
  };

  const handleClaimLoginReward = (day: number, cash: number, pts: number) => {
    if (!currentUser || !currentUser.isMember || currentUser.isApplicant) {
      alert('Action Restricted: Only verified active USSF members can claim daily login milestones.');
      return;
    }
    tacticalAudio.playTargetLock();
    const claim: PendingLoginRewardClaim = {
      id: `plc-${Date.now()}`,
      operatorName: currentUser.name,
      operatorCid: currentUser.cid || 'SF-REC',
      day,
      cashAmount: cash,
      promotionPoints: pts,
      claimedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      status: 'Pending Payout'
    };

    if (onClaimDailyLoginReward) {
      onClaimDailyLoginReward(claim);
    }

    setDailyClaimSuccess(`Day 0${day} Login Reward ($${cash.toLocaleString()} Cash + ${pts} Promotion Points) claimed! Transmitted to High Command Admin Queue for disbursement approval.`);
    setTimeout(() => setDailyClaimSuccess(null), 6000);
  };

  return (
    <div className="w-full bg-[#080a08] text-neutral-100 min-h-screen pb-16 font-sans">
      {/* High-Impact Hero Banner */}
      <div className="relative w-full overflow-hidden border-b border-neutral-800 bg-[#0c100d] min-h-[360px] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/rewards_night_tasks_1790347392900.jpg"
            alt="Tactical Treasury & Task Operations"
            className="h-full w-full object-cover object-center filter brightness-95 contrast-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080a08] via-[#080a08]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080a08] via-[#080a08]/75 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:py-16 sm:px-6 lg:px-8 w-full">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-data uppercase tracking-widest text-emerald-400">
                <span className="flex items-center gap-1.5 font-bold bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  SPECIAL FORCES
                </span>
                <span className="text-neutral-500">/</span>
                <span className="text-amber-400 font-semibold">FINANCIAL TASK TREASURY</span>
                <span className="text-neutral-500">/</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  <span>E2EE ACTIVE</span>
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-tactical uppercase tracking-tight text-white drop-shadow-lg">
                FINANCIAL TASKS & OPERATOR BOUNTIES
              </h1>

              <p className="text-xs sm:text-sm font-sans text-neutral-200 max-w-2xl drop-shadow">
                Official compensation payouts for criminal arrest milestones, weekly patrols, combat APB raids, specialist tasks, and rank promotions. Combat & Tactical tasks feature numeric quantity inputs to multiply your payout!
              </p>
            </div>

            {/* Quick Metrics Badges */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <div className="rounded-xl border border-emerald-500/50 bg-black/80 p-4 text-right backdrop-blur-md shadow-2xl">
                <span className="text-[10px] font-data text-emerald-400 uppercase tracking-widest block font-bold">
                  TOTAL DISBURSED
                </span>
                <div className="text-2xl sm:text-3xl font-black font-tactical text-emerald-400">
                  ${(totalApprovedPayout / 1000000).toFixed(1)}M
                </div>
                <span className="text-[10px] font-data text-neutral-400 block mt-0.5">
                  100% Verified CIT2 Law Treasury
                </span>
              </div>

              <div className="rounded-xl border border-amber-500/50 bg-black/80 p-4 text-right backdrop-blur-md shadow-2xl">
                <span className="text-[10px] font-data text-amber-400 uppercase tracking-widest block font-bold">
                  DAILY REWARDS
                </span>
                <div className="text-2xl sm:text-3xl font-black font-tactical text-amber-400">
                  UP TO $50M
                </div>
                <span className="text-[10px] font-data text-neutral-400 block mt-0.5">
                  Arrest Points & Combat Bounties
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        {/* Active Multiplier Event Notification Banner */}
        {financialMultiplier > 1 && activeFinancialEvent && (
          <div className="mb-6 p-4 rounded-xl border border-amber-500/80 bg-gradient-to-r from-amber-950/80 via-neutral-900 to-black text-amber-300 font-data text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-amber-500 text-neutral-950 font-black text-sm">
                {financialMultiplier}X
              </div>
              <div>
                <span className="font-bold text-white uppercase text-sm block">
                  {activeFinancialEvent.title}
                </span>
                <span className="text-amber-200/90 text-xs">
                  {activeFinancialEvent.announcement || `All task payouts are automatically multiplied by ${financialMultiplier}X!`}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 uppercase block font-mono">MULTIPLIER ACTIVE</span>
              <span className="text-emerald-400 font-bold">{financialMultiplier}X CASH BOOSTED</span>
            </div>
          </div>
        )}

        {dailyClaimSuccess && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/60 bg-emerald-950/60 text-emerald-300 font-data text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{dailyClaimSuccess}</span>
          </div>
        )}

        {/* Civilian Account Non-Member Restriction Banner */}
        {(!currentUser || !currentUser.isMember || currentUser.isApplicant) && (
          <div className="mb-6 p-4 rounded-xl border border-amber-500/60 bg-amber-950/40 text-amber-300 font-data text-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold uppercase text-white block">CIVILIAN ACCOUNT / RESTRICTED ACCESS</span>
                <span className="text-neutral-300 text-[11px]">Financial task bounties, daily claims, and payouts require verified USSF active membership. Please submit an enlistment application or link your in-game CIT2 account.</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                tacticalAudio.playTacticalClick();
                setActiveTab('catalog');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-tactical font-bold uppercase transition-all cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              <Target className="h-4 w-4" />
              <span>TASK CATALOG ({catalog.length})</span>
            </button>

            <button
              onClick={() => {
                tacticalAudio.playTacticalClick();
                setActiveTab('dailyLogin');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-tactical font-bold uppercase transition-all cursor-pointer ${
                activeTab === 'dailyLogin'
                  ? 'bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              <Gift className="h-4 w-4" />
              <span>7 & 30 DAY LOGIN REWARDS</span>
            </button>

            <button
              onClick={() => {
                tacticalAudio.playTacticalClick();
                setActiveTab('analytics');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-tactical font-bold uppercase transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-cyan-500 text-neutral-950 shadow-lg'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>CREATOR ANALYTICS</span>
            </button>

            <button
              onClick={() => {
                tacticalAudio.playTacticalClick();
                setActiveTab('claims');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-tactical font-bold uppercase transition-all cursor-pointer ${
                activeTab === 'claims'
                  ? 'bg-neutral-700 text-white shadow-lg'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>TREASURY AUDIT ({claims.length})</span>
            </button>
          </div>

          {/* Biometric & E2EE Quick Status */}
          <div className="flex items-center gap-2 font-data text-xs">
            <button
              onClick={() => {
                setBiometricAction('Authorize Treasury Disbursal');
                setIsBiometricOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-emerald-500 transition-colors cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              <span>BIOMETRIC VAULT</span>
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>AES-256 E2EE</span>
            </div>
          </div>
        </div>

        {/* TAB 1: TASK CATALOG (With Numeric Quantity Input for Combat & Multipliers) */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            {/* Multi-Select Action Banner if items selected */}
            {selectedTaskIds.length > 0 && (
              <div className="p-4 rounded-xl border border-amber-500/70 bg-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
                <div>
                  <span className="text-xs font-tactical font-bold uppercase text-amber-400 block">
                    {selectedTaskIds.length} TASKS MULTI-SELECTED
                  </span>
                  <span className="text-2xl font-black font-tactical text-emerald-400">
                    TOTAL ESTIMATED PAYOUT: ${totalMultiClaim.toLocaleString()}
                  </span>
                  {financialMultiplier > 1 && (
                    <span className="text-xs text-amber-400 block mt-0.5 font-data">
                      Includes {financialMultiplier}X active campaign multiplier boost!
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTaskIds([])}
                    className="px-3 py-2 rounded text-xs font-data text-neutral-400 hover:text-white"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={handleOpenMultiClaim}
                    className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-tactical font-black text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg flex items-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>CLAIM {selectedTaskIds.length} TASKS TOGETHER</span>
                  </button>
                </div>
              </div>
            )}

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    tacticalAudio.playTacticalClick();
                    setSelectedCategory(cat.id);
                  }}
                  className={`text-xs font-data px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold shadow-md'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                  }`}
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>

            {/* Tasks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCatalog.map(item => {
                const isSelected = selectedTaskIds.includes(item.id);
                const isCombat = item.category === 'Combat & Tactical' || item.allowQuantity;
                const quantity = isCombat ? (taskQuantities[item.id] || 1) : 1;
                const baseItemPayout = item.payoutAmount * quantity;
                const totalItemPayout = baseItemPayout * financialMultiplier;

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleTaskSelection(item.id)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-400 bg-amber-950/30 shadow-lg shadow-amber-500/10'
                        : 'border-neutral-800 bg-neutral-900/70 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between text-[10px] font-data text-neutral-400 uppercase mb-2">
                        <span className="text-amber-400 font-semibold">{item.category}</span>
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          item.frequency === 'DAILY' ? 'bg-amber-950 text-amber-300 border border-amber-500/40' :
                          item.frequency === 'WEEKLY' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' :
                          item.frequency === 'MULTI_DAILY' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' :
                          item.frequency === 'MONTHLY' ? 'bg-purple-950 text-purple-300 border border-purple-500/40' :
                          'bg-rose-950 text-rose-300 border border-rose-500/40'
                        }`}>
                          {item.frequency === 'MULTI_DAILY' ? 'MULTI-CLAIM (ANY TIME)' :
                           item.frequency === 'DAILY' ? 'DAILY RESET (1x/DAY)' :
                           item.frequency === 'WEEKLY' ? 'WEEKLY RESET (1x/WK)' :
                           item.frequency === 'MONTHLY' ? 'MONTHLY RESET' : 'ONCE ONLY'}
                        </span>
                      </div>

                      {/* Title & Selection indicator */}
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-amber-400 bg-amber-500 text-neutral-950' : 'border-neutral-700 bg-neutral-950'
                        }`}>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <h4 className="text-base font-tactical font-black uppercase text-white">
                            {item.title}
                          </h4>
                          <p className="text-xs text-neutral-400 font-sans mt-1.5">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Numeric Quantity Input for Combat & Tactical Tasks */}
                      {isCombat && (
                        <div 
                          className="mt-4 p-3 rounded-lg bg-neutral-950 border border-amber-500/40 flex items-center justify-between text-xs font-data"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div>
                            <span className="text-amber-400 uppercase text-[10px] block font-bold flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              <span>QUANTITY (KILLS / APB):</span>
                            </span>
                            <span className="text-[10px] text-neutral-500">
                              Base: ${item.payoutAmount.toLocaleString()} ea
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setQuantityForTask(item.id, quantity - 1)}
                              className="h-7 w-7 rounded bg-neutral-800 text-neutral-200 hover:bg-neutral-700 font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={quantity}
                              onChange={(e) => setQuantityForTask(item.id, parseInt(e.target.value) || 1)}
                              className="w-14 rounded bg-neutral-900 border border-neutral-700 px-2 py-1 text-center font-bold text-amber-400 text-xs focus:outline-none focus:border-amber-400"
                            />
                            <button
                              type="button"
                              onClick={() => setQuantityForTask(item.id, quantity + 1)}
                              className="h-7 w-7 rounded bg-neutral-800 text-neutral-200 hover:bg-neutral-700 font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Pricing & Single Submit */}
                    <div className="mt-5 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-tactical font-black text-emerald-400">
                            ${totalItemPayout.toLocaleString()}
                          </span>
                          {financialMultiplier > 1 && (
                            <span className="text-[10px] text-amber-400 font-bold uppercase">
                              ({financialMultiplier}X EVENT)
                            </span>
                          )}
                        </div>
                        {quantity > 1 && (
                          <span className="text-[10px] font-data text-neutral-500 block">
                            ${(item.payoutAmount * financialMultiplier).toLocaleString()} × {quantity}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!currentUser || !currentUser.isMember || currentUser.isApplicant) {
                            alert('Action Restricted: Only verified active USSF members can submit financial claims. Complete Enlistment or Account Linking first.');
                            return;
                          }
                          onOpenClaimModal(item, quantity, totalItemPayout);
                        }}
                        className="text-[11px] font-tactical uppercase px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 font-bold text-neutral-200 transition-colors cursor-pointer"
                      >
                        SUBMIT CLAIM
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: 7 & 30 DAY LOGIN REWARDS (CASH & PROMOTION POINTS - SUBMITTED TO ADMINS) */}
        {activeTab === 'dailyLogin' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
                <div>
                  <h3 className="text-base font-tactical font-bold uppercase text-white flex items-center gap-2">
                    <Gift className="h-5 w-5 text-emerald-400" />
                    <span>DAILY & MONTHLY LOGIN MILESTONES (CASH + PROMOTION POINTS)</span>
                  </h3>
                  <p className="text-xs text-neutral-300 font-sans mt-1">
                    When you claim your login streak milestone, the payout request is transmitted directly to the High Command Admin Queue for monetary approval. Rewards include guaranteed cash bounties AND career promotion points!
                  </p>
                </div>

                {/* Switch between 7-Day and 30-Day Monthly Mode */}
                <div className="flex items-center gap-2 p-1 rounded-lg bg-neutral-950 border border-neutral-800">
                  <button
                    onClick={() => {
                      tacticalAudio.playTacticalClick();
                      setLoginMode('7days');
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-data uppercase font-bold transition-all cursor-pointer ${
                      loginMode === '7days'
                        ? 'bg-emerald-500 text-neutral-950 shadow-md'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    7-DAY STREAK
                  </button>
                  <button
                    onClick={() => {
                      tacticalAudio.playTacticalClick();
                      setLoginMode('30days');
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-data uppercase font-bold transition-all cursor-pointer ${
                      loginMode === '30days'
                        ? 'bg-amber-500 text-neutral-950 shadow-md'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    30-DAY MONTHLY CALENDAR
                  </button>
                </div>
              </div>

              {/* 7-Day Streak Cards */}
              {loginMode === '7days' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
                  {DAILY_LOGIN_REWARDS_7.map(r => (
                    <div
                      key={r.day}
                      className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/80 text-center flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <span className="text-[10px] font-data text-neutral-500 uppercase block">DAY 0{r.day}</span>
                        <div className="mt-2 text-sm font-tactical font-black text-emerald-400">
                          ${r.cashAmount.toLocaleString()}
                        </div>
                        <span className="text-[11px] font-data text-amber-400 font-bold block mt-0.5">
                          +{r.promotionPoints} Points
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          tacticalAudio.playTargetLock();
                          if (r.day === 7) {
                            setSelectedChoiceId('choice-7-namecard');
                            setMilestoneModal({ day: 7, defaultCash: r.cashAmount, defaultPts: r.promotionPoints });
                          } else {
                            handleClaimLoginReward(r.day, r.cashAmount, r.promotionPoints);
                          }
                        }}
                        className={`w-full py-1.5 rounded text-[11px] font-data uppercase font-black tracking-wider transition-all cursor-pointer ${
                          r.day === 7
                            ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-lg shadow-amber-500/20'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950'
                        }`}
                      >
                        {r.day === 7 ? 'CHOOSE REWARD ★' : 'CLAIM REWARD'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 30-Day Monthly Calendar Grid */}
              {loginMode === '30days' && (
                <div>
                  <div className="flex items-center justify-between text-xs font-data text-neutral-400 mb-3">
                    <span>30-DAY MONTHLY ENLISTMENT TRACK</span>
                    <span className="text-amber-400 font-bold">DAY 30 GRAND BOUNTY: $25,000,000 + 1,000 POINTS</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-2.5">
                    {DAILY_LOGIN_REWARDS_30.map(r => (
                      <div
                        key={r.day}
                        className={`p-2.5 rounded-lg border text-center flex flex-col justify-between ${
                          r.day % 7 === 0 || r.day === 30
                            ? 'border-amber-500/60 bg-amber-950/30'
                            : 'border-neutral-800 bg-neutral-950'
                        }`}
                      >
                        <span className="text-[9px] font-data text-neutral-500 uppercase">DAY {r.day}</span>
                        <div className="text-xs font-tactical font-black text-emerald-400 mt-1">
                          ${(r.cashAmount / 1000000).toFixed(1)}M
                        </div>
                        <div className="text-[9px] font-data text-amber-400 font-bold">
                          +{r.promotionPoints} Pts
                        </div>
                        <button
                          onClick={() => {
                            tacticalAudio.playTargetLock();
                            if (r.day === 30 || r.day === 7 || r.day === 14 || r.day === 21 || r.day === 28) {
                              const targetDay = r.day === 30 ? 30 : 7;
                              setSelectedChoiceId(targetDay === 30 ? 'choice-30-namecard' : 'choice-7-namecard');
                              setMilestoneModal({ day: targetDay, defaultCash: r.cashAmount, defaultPts: r.promotionPoints });
                            } else {
                              handleClaimLoginReward(r.day, r.cashAmount, r.promotionPoints);
                            }
                          }}
                          className={`mt-2 w-full py-1 rounded text-[9px] font-data uppercase font-bold transition-colors cursor-pointer ${
                            r.day === 30 || r.day % 7 === 0
                              ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow'
                              : 'bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-neutral-200'
                          }`}
                        >
                          {r.day === 30 || r.day % 7 === 0 ? 'CHOOSE ★' : 'CLAIM'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: REAL-TIME CREATOR REVENUE ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/80 space-y-6">
              <div className="border-b border-neutral-800 pb-4">
                <span className="text-xs font-data text-cyan-400 uppercase tracking-widest font-bold block mb-1">
                  CONTENT CREATOR MONETIZATION & TELEMETRY
                </span>
                <h3 className="text-2xl font-tactical font-black uppercase text-white">
                  REAL-TIME ENGAGEMENT & EARNINGS DASHBOARD
                </h3>
              </div>

              {/* Live Counters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/70">
                  <span className="text-neutral-500 text-[10px] font-data uppercase block">ESTIMATED REVENUE</span>
                  <div className="text-2xl sm:text-3xl font-black font-tactical text-emerald-400 mt-1">
                    ${((liveViews * 0.05) + (liveClicks * 0.35)).toFixed(2)}
                  </div>
                  <span className="text-[10px] font-data text-emerald-500/80 mt-1 block">
                    ▲ +14.2% This Week
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/70">
                  <span className="text-neutral-500 text-[10px] font-data uppercase block">TOTAL DISPATCH VIEWS</span>
                  <div className="text-2xl sm:text-3xl font-black font-tactical text-neutral-100 mt-1 tabular-nums">
                    {liveViews.toLocaleString()}
                  </div>
                  <span className="text-[10px] font-data text-neutral-500 mt-1 block">Live Ticking Telemetry</span>
                </div>

                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/70">
                  <span className="text-neutral-500 text-[10px] font-data uppercase block">DISPATCH CLICKS</span>
                  <div className="text-2xl sm:text-3xl font-black font-tactical text-amber-400 mt-1 tabular-nums">
                    {liveClicks.toLocaleString()}
                  </div>
                  <span className="text-[10px] font-data text-neutral-500 mt-1 block">Direct Profile Link Clicks</span>
                </div>

                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/70">
                  <span className="text-neutral-500 text-[10px] font-data uppercase block">CLICK-THROUGH RATE (CTR)</span>
                  <div className="text-2xl sm:text-3xl font-black font-tactical text-cyan-400 mt-1 tabular-nums">
                    {ctrRate}%
                  </div>
                  <span className="text-[10px] font-data text-emerald-500/80 mt-1 block">Optimal Conversion</span>
                </div>
              </div>

              {/* Audience Demographics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-950/80 space-y-3">
                  <span className="text-xs font-data text-neutral-400 uppercase font-bold block border-b border-neutral-800 pb-2">
                    AUDIENCE BY SAN ANDREAS SECTORS
                  </span>
                  <div className="space-y-2 text-xs font-data">
                    <div>
                      <div className="flex justify-between text-neutral-300 mb-1">
                        <span>Los Santos Metro Core</span>
                        <span className="text-emerald-400 font-bold">48%</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[48%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-neutral-300 mb-1">
                        <span>Las Venturas High Rolling District</span>
                        <span className="text-amber-400 font-bold">32%</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 w-[32%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-neutral-300 mb-1">
                        <span>Bone County Desert Border</span>
                        <span className="text-cyan-400 font-bold">20%</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 w-[20%]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-950/80 space-y-3">
                  <span className="text-xs font-data text-neutral-400 uppercase font-bold block border-b border-neutral-800 pb-2">
                    DEVICE TELEMETRY & ACCESS PLATFORMS
                  </span>
                  <div className="space-y-2 text-xs font-data">
                    <div>
                      <div className="flex justify-between text-neutral-300 mb-1">
                        <span>Desktop Mil-Spec Terminals</span>
                        <span className="text-emerald-400 font-bold">64%</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[64%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-neutral-300 mb-1">
                        <span>Mobile Field Tablets</span>
                        <span className="text-amber-400 font-bold">28%</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 w-[28%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-neutral-300 mb-1">
                        <span>Tactical In-Car MDC Units</span>
                        <span className="text-cyan-400 font-bold">8%</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 w-[8%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TREASURY AUDIT LOG */}
        {activeTab === 'claims' && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="text-xs font-data uppercase tracking-wider text-amber-400 font-bold">
                OFFICIAL RECORD OF SUBMITTED CLAIMS ({claims.length})
              </span>
              <span className="text-xs font-data text-neutral-400">
                Total Verified: ${claims.reduce((s, c) => s + c.amount, 0).toLocaleString()}
              </span>
            </div>

            <div className="space-y-3">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-data"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold uppercase">{claim.rewardCategory}</span>
                      <span className="text-neutral-600">·</span>
                      <span className="text-neutral-400">{claim.date}</span>
                    </div>
                    <div className="text-sm font-tactical font-black text-white">{claim.rewardTitle}</div>
                    <div className="text-neutral-400 text-[11px]">
                      Claimant: <span className="text-neutral-200 font-semibold">{claim.claimantName}</span> ({claim.claimantCid})
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-tactical font-black text-emerald-400 tabular-nums">
                      ${claim.amount.toLocaleString()}
                    </div>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                      {claim.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Milestone Custom Choose Event Modal */}
      {milestoneModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-neutral-950 border-2 border-amber-500 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-data text-amber-400 font-bold uppercase tracking-widest mb-1">
                  <Crown className="h-4 w-4" />
                  <span>SPECIAL FORCES MILESTONE CHOOSE EVENT</span>
                </div>
                <h2 className="text-2xl font-black font-tactical uppercase text-white">
                  DAY 0{milestoneModal.day} CUSTOM REWARD PACKAGE
                </h2>
                <p className="text-xs text-neutral-300 font-sans mt-1">
                  Select your custom reward package. Choose between an exclusive Namecard Banner, a glowing Avatar Frame, an official Commendation Title, or an instant Treasury Cash & Points jackpot!
                </p>
              </div>
              <button
                onClick={() => setMilestoneModal(null)}
                className="text-neutral-500 hover:text-white p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {currentMilestoneOptions.map((choice) => {
                const isSelected = selectedChoiceId === choice.id;

                return (
                  <div
                    key={choice.id}
                    onClick={() => {
                      tacticalAudio.playTacticalClick();
                      setSelectedChoiceId(choice.id);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-950/40 shadow-lg shadow-amber-500/10 scale-[1.02]'
                        : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-data uppercase mb-1.5">
                        <span className="px-2 py-0.5 rounded bg-black/80 text-amber-300 font-bold border border-neutral-700">
                          {choice.type.replace('_', ' ')}
                        </span>
                        {isSelected && (
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>SELECTED</span>
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-tactical font-black uppercase text-white">
                        {choice.title}
                      </h4>
                      <p className="text-xs font-sans text-neutral-300 mt-1 leading-relaxed">
                        {choice.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs font-data">
                      <span className="text-neutral-400 text-[10px]">EQUIPS TO:</span>
                      <span className="text-emerald-400 font-bold font-mono">
                        {choice.rewardValue}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-data text-neutral-400">
                Reward automatically equips directly to your official USSF operator profile.
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setMilestoneModal(null)}
                  className="px-4 py-2 rounded-lg bg-neutral-900 text-neutral-300 hover:text-white font-data text-xs cursor-pointer flex-1 sm:flex-initial"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMilestoneChoice}
                  className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black font-tactical uppercase text-xs cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 flex-1 sm:flex-initial"
                >
                  <Award className="h-4 w-4" />
                  <span>CONFIRM & CLAIM REWARD</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Biometric Verification Modal */}
      <BiometricModal
        isOpen={isBiometricOpen}
        onClose={() => setIsBiometricOpen(false)}
        actionTitle={biometricAction || 'Treasury Vault Access'}
        onSuccess={() => {
          tacticalAudio.playRadioSquelch();
          setDailyClaimSuccess('Biometric Authentication Verified: Vault access confirmed.');
          setTimeout(() => setDailyClaimSuccess(null), 5000);
        }}
      />
    </div>
  );
};
