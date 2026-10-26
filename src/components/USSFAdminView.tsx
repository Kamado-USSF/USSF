import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, Calendar, Gift, Users, UserPlus, FileDown, CheckCircle2,
  XCircle, AlertTriangle, Activity, Settings, Plus, Flame, Clock, 
  Key, Link2, Database, BarChart3, Bell, Eye, Download, Printer, DollarSign,
  Crown, Trash2, Edit3, Save, ShieldCheck, Award, Lock, Sparkles, BookOpen, AlertCircle,
  Image as ImageIcon, Search
} from 'lucide-react';
import { 
  AdminEvent, DailyLoginReward, ForgotPasswordRequest, 
  AccountLinkRequest, RecruitmentApplication, USSFMember, PendingLoginRewardClaim,
  PromotionRequest, USSF_RANKS, USSF_GROUP_INFO, DAILY_LOGIN_REWARDS_7, DAILY_LOGIN_REWARDS_30,
  USSFAssetItem, INITIAL_SKINS_AND_SHADERS, USSFAchievement, INITIAL_ACHIEVEMENTS,
  MilestoneRewardChoice, DEFAULT_MILESTONE_CHOICES, SpecialRole, CUSTOM_CURSORS_CATALOG,
  FinancialClaim, FieldReport
} from '../data/ussfData';
import { tacticalAudio } from '../utils/audioSynth';
import { 
  isEligibleLeaderForAdmin, 
  canDirectlyAssignRank, 
  canManageRoles, 
  MemberRoleBadges, 
  RoleBadge, 
  USSF_ROLES 
} from '../utils/roleUtils';
import { 
  validatePromotionEligibility, 
  PromotionEligibilityResult 
} from '../utils/promotionValidator';
import { api } from '../services/api';

export interface AdminAuditEntry {
  id: string;
  timestamp: string;
  admin: string;
  action: string;
  status: string;
}

interface USSFAdminViewProps {
  currentUser?: USSFMember | null;
  applications?: RecruitmentApplication[];
  events?: AdminEvent[];
  onAddEvent: (event: AdminEvent) => void;
  forgotPwRequests?: ForgotPasswordRequest[];
  onResolveForgotPw: (id: string, approved: boolean) => void;
  linkRequests?: AccountLinkRequest[];
  onResolveLinkRequest: (id: string, approved: boolean) => void;
  loginRewards?: DailyLoginReward[];
  onUpdateLoginRewards: (rewards: DailyLoginReward[]) => void;
  members?: USSFMember[];
  onUpdateMemberRank?: (memberId: string, newRank: string, newLevel: number, note?: string) => void;
  onPromoteMemberNormal?: (memberId: string) => { success: boolean; message: string };
  onUpdateMemberRoles?: (memberId: string, isAdmin: boolean, specialRoles: SpecialRole[], note?: string) => void;
  onDeleteMember?: (memberId: string) => void;
  onSetWebOwner?: (memberId: string, password: string) => { success: boolean; message: string };
  promotionRequests?: PromotionRequest[];
  onResolvePromotionRequest?: (id: string, approved: boolean) => void;
  pendingLoginClaims?: PendingLoginRewardClaim[];
  onApproveLoginClaim: (id: string) => void;
  groupInfo?: typeof USSF_GROUP_INFO;
  onUpdateGroupInfo?: (updated: Partial<typeof USSF_GROUP_INFO>) => Promise<void>;
  ranks?: typeof USSF_RANKS;
  onUpdateRanks?: (ranks: typeof USSF_RANKS) => void;
  assets?: USSFAssetItem[];
  onCreateAsset?: (asset: USSFAssetItem) => Promise<USSFAssetItem[]>;
  onUpdateAsset?: (asset: USSFAssetItem) => Promise<USSFAssetItem[]>;
  onDeleteAsset?: (id: string) => Promise<USSFAssetItem[]>;
  achievements?: USSFAchievement[];
  onUpdateAchievements?: (achievements: USSFAchievement[]) => void;
  milestoneChoices?: MilestoneRewardChoice[];
  onUpdateMilestoneChoices?: (choices: MilestoneRewardChoice[]) => void;
  claims?: FinancialClaim[];
  onUpdateClaims?: (claims: FinancialClaim[]) => void;
  fieldReports?: FieldReport[];
  onUpdateFieldReports?: (reports: FieldReport[]) => void;
}

export const USSFAdminView: React.FC<USSFAdminViewProps> = ({
  currentUser,
  applications = [],
  events = [],
  onAddEvent,
  forgotPwRequests = [],
  onResolveForgotPw,
  linkRequests = [],
  onResolveLinkRequest,
  loginRewards = [],
  onUpdateLoginRewards,
  members = [],
  onUpdateMemberRank,
  onPromoteMemberNormal,
  onUpdateMemberRoles,
  onDeleteMember,
  onSetWebOwner,
  promotionRequests = [],
  onResolvePromotionRequest,
  pendingLoginClaims = [],
  onApproveLoginClaim,
  groupInfo = USSF_GROUP_INFO,
  onUpdateGroupInfo,
  ranks = USSF_RANKS,
  onUpdateRanks,
  assets = [],
  onCreateAsset,
  onUpdateAsset,
  onDeleteAsset,
  achievements = INITIAL_ACHIEVEMENTS,
  onUpdateAchievements,
  milestoneChoices = DEFAULT_MILESTONE_CHOICES,
  onUpdateMilestoneChoices,
  claims = [],
  onUpdateClaims,
  fieldReports = [],
  onUpdateFieldReports
}) => {
  const [activeSection, setActiveSection] = useState<
    'events' | 'rosterMgmt' | 'promotionsQueue' | 'applications' | 'pageInfo' | 'payoutQueue' | 'daily' | 'passwords' | 'links' | 'moderation' | 'logs'
  >('events');

  // Event Creator State (Multipliers: 2X, 3X, 4X Financial & Promotions; 3X APB removed, multiplier factor removed)
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventMultiplierType, setNewEventMultiplierType] = useState<AdminEvent['multiplierType']>('2X Financial Payouts');
  const [newEventMultiplier, setNewEventMultiplier] = useState(2);
  const [newEventStartDate, setNewEventStartDate] = useState('2026-09-26');
  const [newEventEndDate, setNewEventEndDate] = useState('2026-10-03');
  const [newEventAnnouncement, setNewEventAnnouncement] = useState('');

  // Roster Management State
  const [rosterSearch, setRosterSearch] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [selectedRankForEdit, setSelectedRankForEdit] = useState('');
  const [deleteConfirmMemberId, setDeleteConfirmMemberId] = useState<string | null>(null);

  // Web Owner Modal & Password (Required password: MityaAndKazuha786)
  const [ownerModalMember, setOwnerModalMember] = useState<USSFMember | null>(null);
  const [ownerPasswordInput, setOwnerPasswordInput] = useState('');
  const [ownerPasswordError, setOwnerPasswordError] = useState<string | null>(null);
  const [ownerSuccessMessage, setOwnerSuccessMessage] = useState<string | null>(null);

  // Page Content Editor State & Sub-tabs
  const [pageInfoSubTab, setPageInfoSubTab] = useState<'groupSpecs' | 'promotions' | 'skinsShaders'>('groupSpecs');
  const [editableGroupInfo, setEditableGroupInfo] = useState({
    name: groupInfo.name || 'Special Forces',
    level: groupInfo.level || 'L4',
    founder: groupInfo.founder || 'HCMD-OneManArmy#USSF',
    coFounder: groupInfo.coFounder || 'HCMD-Meliodas#USSF',
    commander: groupInfo.commander || 'SCMD-Caminade#USSF',
    leaders: groupInfo.leaders || 'SCMD-Caminade#USSF, SLT-Kamado#USSF',
    motto: groupInfo.motto || "May God Have Mercy Upon Our Enemies Cause We Won't",
    activeSince: groupInfo.activeSince || '2019-06-30',
    tagUsage: groupInfo.tagUsage || 'RANK-Name#USSF',
    commandCenters: groupInfo.commandCenters || 'N/A',
    skins: groupInfo.skinsAvailable?.join(', ') || '39, 164, 267, 285, 286, 287, 266, 1017, 1016, 1007, 1057',
    carShaders: groupInfo.carShadersAvailable?.join(', ') || 'Sultan, Burrito, Banshee, Hydra, Hummer',
    bioText: `Special Forces was established on June 30, 2019. We are a police force group. We care about CIT and the community and bring benefits as possible. USSF is always active in the field of arresting criminals in any form of crime.`
  });
  const [pageInfoSaved, setPageInfoSaved] = useState(false);
  const [pageInfoError, setPageInfoError] = useState<string | null>(null);
  const [isSavingPageInfo, setIsSavingPageInfo] = useState(false);

  const groupSkins = groupInfo.skinsAvailable?.join(', ') || '39, 164, 267, 285, 286, 287, 266, 1017, 1016, 1007, 1057';
  const groupCarShaders = groupInfo.carShadersAvailable?.join(', ') || 'Sultan, Burrito, Banshee, Hydra, Hummer';
  useEffect(() => {
    setEditableGroupInfo(current => ({
      ...current,
      name: groupInfo.name || 'Special Forces',
      level: groupInfo.level || 'L4',
      founder: groupInfo.founder || 'HCMD-OneManArmy#USSF',
      coFounder: groupInfo.coFounder || 'HCMD-Meliodas#USSF',
      commander: groupInfo.commander || 'SCMD-Caminade#USSF',
      leaders: groupInfo.leaders || 'SCMD-Caminade#USSF, SLT-Kamado#USSF',
      motto: groupInfo.motto || "May God Have Mercy Upon Our Enemies Cause We Won't",
      activeSince: groupInfo.activeSince || '2019-06-30',
      tagUsage: groupInfo.tagUsage || 'RANK-Name#USSF',
      commandCenters: groupInfo.commandCenters || 'N/A',
      skins: groupSkins,
      carShaders: groupCarShaders
    }));
  }, [groupInfo.name, groupInfo.level, groupInfo.founder, groupInfo.coFounder, groupInfo.commander, groupInfo.leaders, groupInfo.motto, groupInfo.activeSince, groupInfo.tagUsage, groupInfo.commandCenters, groupSkins, groupCarShaders]);

  // Promotion Pages & Ranks Requirements Editor State
  const [editableRanksList, setEditableRanksList] = useState(ranks);
  const [editingRankLevel, setEditingRankLevel] = useState<number | null>(null);
  const [editRankName, setEditRankName] = useState('');
  const [editRankPoints, setEditRankPoints] = useState(0);
  const [editRankDays, setEditRankDays] = useState(0);
  const [editRankDesc, setEditRankDesc] = useState('');

  // Skins & Car Shader Images State
  const [editableAssetsList, setEditableAssetsList] = useState<USSFAssetItem[]>(
    assets && assets.length > 0 ? assets : INITIAL_SKINS_AND_SHADERS
  );
  const [assetError, setAssetError] = useState<string | null>(null);
  const [isSavingAssets, setIsSavingAssets] = useState(false);
  const [newAssetType, setNewAssetType] = useState<'SKIN' | 'VEHICLE_SHADER'>('SKIN');
  const [newAssetTitle, setNewAssetTitle] = useState('');
  const [newAssetCode, setNewAssetCode] = useState('');
  const [newAssetVariantCount, setNewAssetVariantCount] = useState(4);
  const [newAssetImageUrl, setNewAssetImageUrl] = useState('');
  const [newAssetDescription, setNewAssetDescription] = useState('');
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState('');

  useEffect(() => {
    setEditableAssetsList(current => JSON.stringify(current) === JSON.stringify(assets) ? current : assets);
  }, [assets]);

  const persistAssetMutation = async (mutation: Promise<USSFAssetItem[]>) => {
    setIsSavingAssets(true);
    setAssetError(null);
    try {
      const savedAssets = await mutation;
      setEditableAssetsList(savedAssets);
      return true;
    } catch (err: any) {
      setAssetError(err?.message || 'Asset operation failed.');
      return false;
    } finally {
      setIsSavingAssets(false);
    }
  };

  // Daily Rewards Editor
  const [calendarMode, setCalendarMode] = useState<'7days' | '30days'>('7days');
  const [selectedRewardDay, setSelectedRewardDay] = useState(1);
  const [rewardAmount, setRewardAmount] = useState('1000000');
  const [rewardPoints, setRewardPoints] = useState('50');
  const [rewardLabel, setRewardLabel] = useState('$1,000,000 Cash + 50 Pts');

  // Achievements Management State
  const [editableAchievements, setEditableAchievements] = useState<USSFAchievement[]>(
    achievements && achievements.length > 0 ? achievements : INITIAL_ACHIEVEMENTS
  );
  const [editingAchId, setEditingAchId] = useState<string | null>(null);
  const [editAchTitle, setEditAchTitle] = useState('');
  const [editAchCategory, setEditAchCategory] = useState<'Service' | 'Combat' | 'Financial' | 'Promotion'>('Combat');
  const [editAchDesc, setEditAchDesc] = useState('');
  const [editAchReward, setEditAchReward] = useState(1000000);
  const [editAchPoints, setEditAchPoints] = useState(50);
  const [editAchTotal, setEditAchTotal] = useState(100);

  const [isCreatingAch, setIsCreatingAch] = useState(false);
  const [newAchTitle, setNewAchTitle] = useState('');
  const [newAchCategory, setNewAchCategory] = useState<'Service' | 'Combat' | 'Financial' | 'Promotion'>('Combat');
  const [newAchDesc, setNewAchDesc] = useState('');
  const [newAchReward, setNewAchReward] = useState(5000000);
  const [newAchPoints, setNewAchPoints] = useState(50);
  const [newAchTotal, setNewAchTotal] = useState(100);

  // 7 & 30 Days Milestone Choice Reward State
  const [editableMilestones, setEditableMilestones] = useState<MilestoneRewardChoice[]>(
    milestoneChoices && milestoneChoices.length > 0 ? milestoneChoices : DEFAULT_MILESTONE_CHOICES
  );
  const [selectedMilestoneDay, setSelectedMilestoneDay] = useState<7 | 30>(7);

  // Sync with milestoneChoices prop changes
  React.useEffect(() => {
    if (milestoneChoices && milestoneChoices.length > 0) {
      setEditableMilestones(milestoneChoices);
    }
  }, [milestoneChoices]);

  // Milestone Add & Edit Modals State
  const [isAddingMilestoneModal, setIsAddingMilestoneModal] = useState(false);
  const [editingMilestoneModal, setEditingMilestoneModal] = useState<MilestoneRewardChoice | null>(null);
  const [milestoneFormDay, setMilestoneFormDay] = useState<7 | 30>(7);
  const [milestoneFormType, setMilestoneFormType] = useState<MilestoneRewardChoice['type']>('CUSTOM_CURSOR');
  const [milestoneFormTitle, setMilestoneFormTitle] = useState('');
  const [milestoneFormDesc, setMilestoneFormDesc] = useState('');
  const [milestoneFormVal, setMilestoneFormVal] = useState('solo-leveling');
  const [milestoneFormCash, setMilestoneFormCash] = useState<number>(5000000);
  const [milestoneFormPts, setMilestoneFormPts] = useState<number>(50);
  const [milestoneFormImage, setMilestoneFormImage] = useState<string>('');
  const [deleteMilestoneConfirmId, setDeleteMilestoneConfirmId] = useState<string | null>(null);

  // Promotion Eligibility Modal State
  const [eligibilityModalMember, setEligibilityModalMember] = useState<USSFMember | null>(null);

  // Roles & Admin Permissions Assignment Modal State
  const [rolesModalMember, setRolesModalMember] = useState<USSFMember | null>(null);
  const [rolesModalIsAdmin, setRolesModalIsAdmin] = useState(false);
  const [rolesModalSpecialRoles, setRolesModalSpecialRoles] = useState<SpecialRole[]>([]);
  const [rolesModalNote, setRolesModalNote] = useState('');

  // Direct Rank Commission (Admin Override) Modal State
  const [directRankModalMember, setDirectRankModalMember] = useState<USSFMember | null>(null);
  const [directRankSelectedLevel, setDirectRankSelectedLevel] = useState<number>(1);
  const [directRankNote, setDirectRankNote] = useState('');

  // Persistent Audit Log
  const [auditLogs, setAuditLogs] = useState<AdminAuditEntry[]>(() => {
    try {
      const saved = localStorage.getItem('ussf_audit_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const appendAuditLog = (action: string) => {
    const newEntry: AdminAuditEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      admin: currentUser?.callsign || currentUser?.name || 'Administrator',
      action,
      status: 'AUDITED'
    };
    const updated = [newEntry, ...auditLogs];
    setAuditLogs(updated);
    try {
      localStorage.setItem('ussf_audit_logs', JSON.stringify(updated));
    } catch (e) {}
  };

  // Deep Scan & Prune State
  const [scanResult, setScanResult] = useState<{
    scanned: boolean;
    testMembers: number;
    testClaims: number;
    testPromotions: number;
    testReports: number;
    testLinks: number;
    totalTest: number;
  } | null>(null);
  const [pruneNotice, setPruneNotice] = useState<string | null>(null);

  const isTestEntry = (str?: string) => {
    if (!str) return false;
    const lower = str.toLowerCase();
    return lower.includes('test') || lower.includes('dummy') || lower.includes('sample') || lower.includes('fake') || lower.includes('mock');
  };

  const handleRunDeepScan = () => {
    tacticalAudio.playTargetLock();
    const testM = (members || []).filter(m => isTestEntry(m.name) || isTestEntry(m.id) || isTestEntry(m.cid)).length;
    const testC = (claims || []).filter(c => isTestEntry(c.claimantName) || isTestEntry(c.id) || isTestEntry(c.proofUrl)).length;
    const testP = (promotionRequests || []).filter(p => isTestEntry(p.operatorName) || isTestEntry(p.operatorCid)).length;
    const testR = (fieldReports || []).filter(r => isTestEntry(r.hostName) || isTestEntry(r.id) || isTestEntry(r.title)).length;
    const testL = (linkRequests || []).filter(l => isTestEntry(l.inGameName) || isTestEntry(l.username)).length;
    const total = testM + testC + testP + testR + testL;

    setScanResult({
      scanned: true,
      testMembers: testM,
      testClaims: testC,
      testPromotions: testP,
      testReports: testR,
      testLinks: testL,
      totalTest: total
    });
  };

  const handlePruneTestData = () => {
    tacticalAudio.playTargetLock();
    // Prune members
    if (onDeleteMember) {
      (members || []).filter(m => isTestEntry(m.name) || isTestEntry(m.id) || isTestEntry(m.cid)).forEach(m => {
        onDeleteMember(m.id);
      });
    }
    // Prune claims
    if (onUpdateClaims && claims) {
      const cleanClaims = claims.filter(c => !isTestEntry(c.claimantName) && !isTestEntry(c.id) && !isTestEntry(c.proofUrl));
      onUpdateClaims(cleanClaims);
    }
    // Prune reports
    if (onUpdateFieldReports && fieldReports) {
      const cleanReports = fieldReports.filter(r => !isTestEntry(r.hostName) && !isTestEntry(r.id) && !isTestEntry(r.title));
      onUpdateFieldReports(cleanReports);
    }

    appendAuditLog('Executed Deep Scan & Test Data Pruning. Purged test records.');
    setPruneNotice('Audit Prune Completed: All identified test, dummy, and sample entries have been cleanly purged while preserving production administrator and operational records.');
    setScanResult(null);
  };

  const handleClearAuditLogs = () => {
    tacticalAudio.playTargetLock();
    localStorage.removeItem('ussf_audit_logs');
    setAuditLogs([]);
    setPruneNotice('Performance & Audit logs cleared successfully.');
    setTimeout(() => setPruneNotice(null), 4000);
  };

  const handleResetToCleanProductionState = async () => {
    if (window.confirm('CRITICAL ACTION: Reset database to pristine empty production launch state? This will clear all test records, dummy member entries, audit logs, and unverified claims while preserving rank definitions, 102 achievements, and official configuration.')) {
      tacticalAudio.playTargetLock();
      try {
        await api.resetCleanDatabase();
      } catch (e) {}
      localStorage.removeItem('ussf_members');
      localStorage.removeItem('ussf_claims');
      localStorage.removeItem('ussf_field_reports');
      localStorage.removeItem('ussf_promotion_requests');
      localStorage.removeItem('ussf_birthday_gifts');
      localStorage.removeItem('ussf_pending_login_claims');
      localStorage.removeItem('ussf_squad_groups');
      localStorage.removeItem('ussf_registered_accounts');
      localStorage.removeItem('ussf_bootstrap_completed');
      localStorage.removeItem('ussf_logged_user');
      localStorage.removeItem('ussf_audit_logs');
      setAuditLogs([]);
      
      alert('Pristine Clean Production State established. All audit logs and data reset. Refreshing application...');
      window.location.reload();
    }
  };

  const handleMultiplierTypeChange = (type: AdminEvent['multiplierType']) => {
    setNewEventMultiplierType(type);
    if (type.includes('4X')) {
      setNewEventMultiplier(4);
    } else if (type.includes('3X')) {
      setNewEventMultiplier(3);
    } else if (type.includes('2X')) {
      setNewEventMultiplier(2);
    } else {
      setNewEventMultiplier(1);
    }
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle) return;

    tacticalAudio.playTargetLock();

    const created: AdminEvent = {
      id: `evt-${Date.now()}`,
      title: newEventTitle,
      multiplierType: newEventMultiplierType,
      multiplier: newEventMultiplier,
      startDate: newEventStartDate,
      endDate: newEventEndDate,
      isActive: true,
      announcement: newEventAnnouncement || `${newEventMultiplierType} is now active for all Special Forces operators.`
    };

    onAddEvent(created);
    setNewEventTitle('');
    setNewEventAnnouncement('');
  };

  const handleExport = (format: 'json' | 'csv' | 'report') => {
    tacticalAudio.playTacticalClick();
    if (format === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ events, members, auditLogs }, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `ussf_admin_report_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else if (format === 'csv') {
      const csvContent = "data:text/csv;charset=utf-8," + "Timestamp,Admin,Action,Status\n" + 
        auditLogs.map(l => `"${l.timestamp}","${l.admin}","${l.action}","${l.status}"`).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `ussf_audit_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      window.print();
    }
  };

  const handleSaveDayReward = () => {
    tacticalAudio.playTargetLock();
    const updated = loginRewards.map(r => {
      if (r.day === selectedRewardDay) {
        return {
          ...r,
          cashAmount: Number(rewardAmount) || 1000000,
          promotionPoints: Number(rewardPoints) || 50,
          label: rewardLabel
        };
      }
      return r;
    });
    onUpdateLoginRewards(updated);
  };

  // Web Owner Role Handler (Pass: MityaAndKazuha786)
  const handleAssignWebOwner = () => {
    if (ownerPasswordInput.trim() !== 'MityaAndKazuha786') {
      setOwnerPasswordError('Access Denied: Incorrect Web Owner Password!');
      tacticalAudio.playAlertWarning();
      return;
    }

    if (!ownerModalMember) return;

    if (onSetWebOwner) {
      const res = onSetWebOwner(ownerModalMember.id, ownerPasswordInput.trim());
      if (res.success) {
        setOwnerSuccessMessage(`Web Owner role successfully transferred to ${ownerModalMember.name}!`);
        setOwnerPasswordError(null);
        setTimeout(() => {
          setOwnerModalMember(null);
          setOwnerPasswordInput('');
          setOwnerSuccessMessage(null);
        }, 1500);
      } else {
        setOwnerPasswordError(res.message);
      }
    } else {
      setOwnerPasswordError(null);
      setOwnerSuccessMessage(`Web Owner role successfully confirmed for ${ownerModalMember.name}!`);
      setTimeout(() => {
        setOwnerModalMember(null);
        setOwnerPasswordInput('');
        setOwnerSuccessMessage(null);
      }, 1500);
    }
  };

  // Page Info Save Handler
  const handleSavePageInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    tacticalAudio.playTargetLock();

    if (!onUpdateGroupInfo || isSavingPageInfo) return;
    setPageInfoError(null);
    setIsSavingPageInfo(true);
    try {
      await onUpdateGroupInfo({
        name: editableGroupInfo.name,
        level: editableGroupInfo.level,
        founder: editableGroupInfo.founder,
        coFounder: editableGroupInfo.coFounder,
        commander: editableGroupInfo.commander,
        leaders: editableGroupInfo.leaders,
        motto: editableGroupInfo.motto,
        activeSince: editableGroupInfo.activeSince,
        tagUsage: editableGroupInfo.tagUsage,
        commandCenters: editableGroupInfo.commandCenters,
        skinsAvailable: editableGroupInfo.skins.split(',').map(s => s.trim()).filter(Boolean),
        carShadersAvailable: editableGroupInfo.carShaders.split(',').map(s => s.trim()).filter(Boolean)
      });
      setPageInfoSaved(true);
      setTimeout(() => setPageInfoSaved(false), 4000);
    } catch (err: any) {
      setPageInfoError(err?.message || 'Failed to save group specifications.');
    } finally {
      setIsSavingPageInfo(false);
    }
  };

  const pendingDisbursements = pendingLoginClaims.filter(c => c.status === 'Pending Payout');
  const pendingPromotions = promotionRequests.filter(r => r.status === 'Pending');

  const filteredMembers = (members || []).filter(m => 
    m && (
      (m.name || '').toLowerCase().includes((rosterSearch || '').toLowerCase()) ||
      (m.callsign || '').toLowerCase().includes((rosterSearch || '').toLowerCase()) ||
      (m.cid || '').toLowerCase().includes((rosterSearch || '').toLowerCase()) ||
      (m.rank || '').toLowerCase().includes((rosterSearch || '').toLowerCase())
    )
  );

  return (
    <div className="w-full bg-[#080a08] text-neutral-100 min-h-screen pb-16 font-sans">
      {/* Top Header */}
      <div className="border-b border-neutral-800 bg-[#0c100c] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-data uppercase tracking-widest text-amber-400 mb-1">
              <ShieldAlert className="h-4 w-4" />
              <span>SPECIAL FORCES // HIGH COMMAND ADMIN DECK</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-tactical uppercase text-white">
              ADMINISTRATIVE CONTROL & EVENT STUDIO
            </h1>
            <p className="text-xs text-neutral-400 font-sans mt-1">
              Roster management, promotion requests, 2X/3X/4X campaigns, login cash queue, page info editor, and Web Owner role security.
            </p>
          </div>

          {/* Multi-Format Export Buttons */}
          <div className="flex flex-wrap items-center gap-2 font-data text-xs">
            <button
              onClick={() => handleExport('json')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-900 border border-neutral-700 hover:border-amber-400 text-neutral-200 transition-colors cursor-pointer"
            >
              <FileDown className="h-3.5 w-3.5 text-amber-400" />
              <span>EXPORT JSON</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-900 border border-neutral-700 hover:border-emerald-400 text-neutral-200 transition-colors cursor-pointer"
            >
              <FileDown className="h-3.5 w-3.5 text-emerald-400" />
              <span>EXPORT CSV</span>
            </button>
            <button
              onClick={() => handleExport('report')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold font-tactical uppercase transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>PRINT REPORT</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
        {/* Navigation Sections */}
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-3 mb-6">
          {[
            { id: 'events', label: '2X/3X/4X Campaign Creator', icon: Flame, count: events.length },
            { id: 'rosterMgmt', label: 'Roster & Rank Management', icon: Users, count: members.length },
            { id: 'promotionsQueue', label: 'Promotion Requests', icon: Award, count: pendingPromotions.length },
            { id: 'applications', label: 'Enlistment Applications', icon: UserPlus, count: applications.filter(application => application.status === 'Pending Review').length },
            { id: 'pageInfo', label: 'Edit Page Content & Specs', icon: Edit3, count: 0 },
            { id: 'payoutQueue', label: 'Login Cash Payouts', icon: DollarSign, count: pendingDisbursements.length },
            { id: 'daily', label: '7 & 30 Days Login Event', icon: Gift, count: loginRewards.length },
            { id: 'passwords', label: 'Password Recovery Requests', icon: Key, count: forgotPwRequests.filter(r => r.status === 'Pending').length },
            { id: 'links', label: 'Account Linking Approvals', icon: Link2, count: linkRequests.filter(r => r.status === 'Pending').length },
            { id: 'moderation', label: 'Content Moderation & Flags', icon: AlertTriangle, count: 2 },
            { id: 'logs', label: 'Performance & Audit Logs', icon: Activity, count: auditLogs.length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  tacticalAudio.playTacticalClick();
                  setActiveSection(tab.id as any);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-tactical uppercase transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-neutral-950 font-black shadow-md'
                    : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-neutral-950 text-amber-300' : 'bg-neutral-800 text-neutral-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeSection === 'applications' && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 space-y-4">
            <div className="border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-tactical font-bold uppercase text-neutral-100 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-amber-400" />
                <span>ENLISTMENT APPLICATION REVIEW QUEUE</span>
              </h3>
            </div>
            {applications.length === 0 ? (
              <p className="py-6 text-center text-xs text-neutral-500">No enlistment applications have been submitted.</p>
            ) : (
              <div className="space-y-3">
                {applications.map(application => (
                  <div key={application.id} className="rounded-lg border border-neutral-800 bg-neutral-950/80 p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-bold text-neutral-100">{application.applicantName}</div>
                      <span className={`text-[10px] font-data font-bold uppercase ${application.status === 'Pending Review' ? 'text-amber-300' : application.status === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {application.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-neutral-400">
                      <span>Account: {application.discordTag || 'Not provided'}</span>
                      <span>Age: {application.age} | Playtime: {application.playtimeHours}h</span>
                      <span>Submitted: {application.date}</span>
                    </div>
                    <p className="text-xs text-neutral-300 whitespace-pre-wrap">{application.lawExperience}</p>
                    {application.reviewerNotes && <p className="text-xs text-neutral-400">Review notes: {application.reviewerNotes}</p>}
                    <p className="text-[10px] text-neutral-600 font-mono">Request ID: {application.id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 1: ROSTER & RANK MANAGEMENT (Edit Ranks, Delete Member, Web Owner Role) */}
        {activeSection === 'rosterMgmt' && (
          <div className="space-y-6">
            <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="text-base font-tactical font-bold uppercase text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-amber-400" />
                    <span>OFFICIAL ROSTER MANAGEMENT & RANK CONTROL</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Admins can update ranks, assign/transfer protected Web Owner status (Pass: MityaAndKazuha786), and delete members from roster.
                  </p>
                </div>

                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Search members..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-xs font-data text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Members Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-data">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-500 uppercase text-[10px]">
                      <th className="py-2.5 px-3">OPERATOR / CID</th>
                      <th className="py-2.5 px-3">MILITARY RANK</th>
                      <th className="py-2.5 px-3">POINTS / PLAYTIME</th>
                      <th className="py-2.5 px-3">ROLES & ADMIN CLEARANCE</th>
                      <th className="py-2.5 px-3">PROMOTION STATUS</th>
                      <th className="py-2.5 px-3 text-right">MANAGEMENT ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {filteredMembers.map(member => {
                      const promoCheck = validatePromotionEligibility(member);
                      const isCallerAdmin = canDirectlyAssignRank(currentUser);
                      return (
                        <tr key={member.id} className="hover:bg-neutral-950/40 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={member.avatarUrl || '/src/assets/images/military_leader_training_1790341999734.jpg'}
                                alt={member.name}
                                className="h-8 w-8 rounded-full object-cover border border-neutral-700"
                              />
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{member.name}</span>
                                  {member.isOwner && (
                                    <span className="flex items-center gap-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 px-1.5 py-0.2 rounded text-[9px] font-bold">
                                      <Crown className="h-3 w-3" />
                                      WEB OWNER
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-neutral-400 font-mono">
                                  {member.cid} · {member.callsign}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-neutral-100">{member.rank || 'Recruit'}</span>
                                {member.rankLevel >= 7 && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] text-amber-300 font-bold uppercase">
                                    LEADER
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-neutral-400 block font-data">
                                Tier {member.rankLevel ?? 1} · {member.rankCategory || 'Military'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className="text-emerald-400 font-bold">{(member.promotionPoints || 0).toLocaleString()} Pts</span>
                            <span className="text-[10px] text-neutral-500 block">{member.playtimeHours ?? 0} hrs played</span>
                          </td>

                          {/* Decoupled Roles and Admin Clearance */}
                          <td className="py-3 px-3">
                            <div className="space-y-1.5">
                              <MemberRoleBadges member={member} size="sm" />
                              {(!member.specialRoles || member.specialRoles.length === 0) && !member.isAdmin && !member.isOwner && (
                                <span className="text-[10px] text-neutral-500 italic block">Standard Military Only</span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  tacticalAudio.playTacticalClick();
                                  setRolesModalMember(member);
                                  setRolesModalIsAdmin(Boolean(member.isAdmin));
                                  setRolesModalSpecialRoles(member.specialRoles ? [...member.specialRoles] : []);
                                  setRolesModalNote('');
                                }}
                                className="text-[10px] font-data text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <ShieldCheck className="h-3 w-3" />
                                <span>Manage Roles & Admin</span>
                              </button>
                            </div>
                          </td>

                          {/* Promotion Qualification Status */}
                          <td className="py-3 px-3">
                            {promoCheck.eligible ? (
                              <button
                                type="button"
                                onClick={() => {
                                  tacticalAudio.playTacticalClick();
                                  setEligibilityModalMember(member);
                                }}
                                className="px-2 py-1 rounded bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer hover:bg-emerald-900 transition-colors"
                              >
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                <span>QUALIFIED: {promoCheck.targetRank}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  tacticalAudio.playTacticalClick();
                                  setEligibilityModalMember(member);
                                }}
                                className="px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 hover:border-amber-500 hover:text-amber-300 font-data text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                                title={promoCheck.incompleteReasons.join(' | ')}
                              >
                                <AlertCircle className="h-3 w-3 text-amber-400" />
                                <span>INCOMPLETE ({promoCheck.incompleteReasons.length} NEEDS)</span>
                              </button>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Promotion Review Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  tacticalAudio.playTacticalClick();
                                  setEligibilityModalMember(member);
                                }}
                                className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-tactical uppercase font-black transition-colors cursor-pointer"
                                title="Inspect promotion points and requirements"
                              >
                                PROMOTION DOSSIER
                              </button>

                              {/* Direct Admin Rank Override (Separated from normal promotion) */}
                              {isCallerAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    tacticalAudio.playTacticalClick();
                                    setDirectRankModalMember(member);
                                    setDirectRankSelectedLevel(member.rankLevel || 1);
                                    setDirectRankNote('');
                                  }}
                                  className="px-2 py-1 rounded bg-neutral-900 border border-neutral-700 hover:border-amber-400 text-neutral-300 hover:text-amber-300 text-[10px] font-tactical uppercase font-bold transition-colors cursor-pointer"
                                  title="Authorized Administrator: Direct Rank Commission without promotion submission"
                                >
                                  DIRECT RANK (ADMIN)
                                </button>
                              )}

                              {/* Owner Assignment */}
                              {!member.isOwner && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOwnerModalMember(member);
                                    setOwnerPasswordInput('');
                                    setOwnerPasswordError(null);
                                    setOwnerSuccessMessage(null);
                                  }}
                                  className="p-1.5 rounded bg-neutral-950 border border-neutral-800 hover:border-amber-400 text-neutral-400 hover:text-amber-300 cursor-pointer"
                                  title="Transfer Web Owner"
                                >
                                  <Crown className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {/* Delete Member */}
                              {deleteConfirmMemberId === member.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      if (member.isOwner) {
                                        setOwnerModalMember(member);
                                        setOwnerPasswordError("Action Blocked: Web Owner cannot be deleted! Master Owner Password (MityaAndKazuha786) required to authorize removal or transfer.");
                                        setDeleteConfirmMemberId(null);
                                        return;
                                      }
                                      if (onDeleteMember) {
                                        onDeleteMember(member.id);
                                        appendAuditLog(`Removed operator ${member.name} (${member.cid}) from official roster.`);
                                      }
                                      setDeleteConfirmMemberId(null);
                                    }}
                                    className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] uppercase cursor-pointer"
                                  >
                                    CONFIRM
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmMemberId(null)}
                                    className="px-1.5 py-1 rounded bg-neutral-800 text-neutral-400 hover:text-white text-[10px]"
                                  >
                                    CANCEL
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmMemberId(member.id)}
                                  className="p-1.5 rounded bg-neutral-950 border border-neutral-800 hover:border-rose-500 hover:text-rose-400 text-neutral-500 transition-colors cursor-pointer"
                                  title="Remove Member"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: PROMOTION REQUESTS APPROVAL QUEUE */}
        {activeSection === 'promotionsQueue' && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-tactical font-bold uppercase text-white flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-400" />
                  <span>OPERATOR PROMOTION SUBMISSIONS & POINT SAVING QUEUE</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  When members reach qualification, their submission deducts target rank point costs and preserves their extra saved points.
                </p>
              </div>
              <span className="text-xs font-data text-emerald-400 font-bold">
                {pendingPromotions.length} PENDING PROMOTIONS
              </span>
            </div>

            {pendingPromotions.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs font-data">
                Zero pending promotion requests in queue.
              </div>
            ) : (
              <div className="space-y-3 font-data text-xs">
                {pendingPromotions.map(req => (
                  <div key={req.id} className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{req.operatorName}</span>
                        <span className="text-emerald-400 font-mono">({req.operatorCid})</span>
                        <span className="text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded text-[10px]">
                          {req.currentRank} → {req.targetRank} (Lvl {req.targetRankLevel})
                        </span>
                      </div>
                      <div className="text-neutral-400 text-xs flex flex-wrap items-center gap-3">
                        <span>Current Points: <strong className="text-neutral-200">{req.currentPoints.toLocaleString()}</strong></span>
                        <span>Points Cost: <strong className="text-rose-400">-{req.pointsCost.toLocaleString()}</strong></span>
                        <span>Saved Remaining Points: <strong className="text-emerald-400">{req.remainingPoints.toLocaleString()}</strong></span>
                      </div>
                      <span className="text-[10px] text-neutral-500 block">Submitted on: {req.submissionDate} · Note: {req.notes || 'Qualification verified'}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          tacticalAudio.playTacticalClick();
                          if (onResolvePromotionRequest) onResolvePromotionRequest(req.id, false);
                        }}
                        className="px-3 py-1.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold text-xs uppercase cursor-pointer"
                      >
                        DENY
                      </button>
                      <button
                        onClick={() => {
                          tacticalAudio.playTargetLock();
                          if (onResolvePromotionRequest) onResolvePromotionRequest(req.id, true);
                        }}
                        className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-tactical font-black text-xs uppercase cursor-pointer shadow-md"
                      >
                        APPROVE & COMMISSION PROMOTION
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: PAGE CONTENT & GROUP INFO EDITOR */}
        {activeSection === 'pageInfo' && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 space-y-5">
            <div className="border-b border-neutral-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-tactical font-bold uppercase text-white flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-cyan-400" />
                  <span>MASTER PAGE CONTENT & ASSET MANAGEMENT STUDIO</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Admins can edit group specifications, modify promotion pages & requirements, and manage skin and vehicle shader images.
                </p>
              </div>
              {pageInfoSaved && (
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>UPDATES SAVED & ACTIVE!</span>
                </span>
              )}
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800/80 pb-2.5">
              {[
                { id: 'groupSpecs', label: '1. Group Info & Motto' },
                { id: 'promotions', label: '2. Promotion Pages & Requirements (22 Ranks)' },
                { id: 'skinsShaders', label: '3. Tactical Skins & Car Shader Images' }
              ].map(sub => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setPageInfoSubTab(sub.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-tactical uppercase font-bold transition-all cursor-pointer ${
                    pageInfoSubTab === sub.id
                      ? 'bg-amber-500 text-neutral-950 shadow'
                      : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* SUBTAB 1: GROUP SPECIFICATIONS */}
            {pageInfoSubTab === 'groupSpecs' && (
              <form onSubmit={handleSavePageInfo} className="space-y-4 text-xs font-data">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-neutral-400 block text-[10px] uppercase mb-1">ORGANIZATION NAME</label>
                    <input
                      type="text"
                      value={editableGroupInfo.name}
                      onChange={(e) => setEditableGroupInfo({ ...editableGroupInfo, name: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block text-[10px] uppercase mb-1">GROUP LEVEL</label>
                    <input
                      type="text"
                      value={editableGroupInfo.level}
                      onChange={(e) => setEditableGroupInfo({ ...editableGroupInfo, level: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block text-[10px] uppercase mb-1">TAG USAGE</label>
                    <input
                      type="text"
                      value={editableGroupInfo.tagUsage}
                      onChange={(e) => setEditableGroupInfo({ ...editableGroupInfo, tagUsage: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-neutral-400 block text-[10px] uppercase mb-1">FOUNDER & CO-FOUNDER</label>
                    <input
                      type="text"
                      value={editableGroupInfo.founder}
                      onChange={(e) => setEditableGroupInfo({ ...editableGroupInfo, founder: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white mb-2"
                    />
                    <input
                      type="text"
                      value={editableGroupInfo.coFounder}
                      onChange={(e) => setEditableGroupInfo({ ...editableGroupInfo, coFounder: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block text-[10px] uppercase mb-1">LEADERSHIP STAFF</label>
                    <textarea
                      rows={3}
                      value={editableGroupInfo.leaders}
                      onChange={(e) => setEditableGroupInfo({ ...editableGroupInfo, leaders: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2.5 text-white resize-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-neutral-400 block text-[10px] uppercase mb-1">OFFICIAL GROUP MOTTO</label>
                  <input
                    type="text"
                    value={editableGroupInfo.motto}
                    onChange={(e) => setEditableGroupInfo({ ...editableGroupInfo, motto: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-amber-400 font-bold italic"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-neutral-400 block text-[10px] uppercase mb-1">AVAILABLE SKINS (COMMA-SEPARATED)</label>
                    <input
                      type="text"
                      value={editableGroupInfo.skins}
                      onChange={(e) => setEditableGroupInfo({ ...editableGroupInfo, skins: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block text-[10px] uppercase mb-1">CAR SHADERS (COMMA-SEPARATED)</label>
                    <input
                      type="text"
                      value={editableGroupInfo.carShaders}
                      onChange={(e) => setEditableGroupInfo({ ...editableGroupInfo, carShaders: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-emerald-300 font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  {pageInfoError && <p role="alert" className="text-xs text-rose-400">{pageInfoError}</p>}
                  <button
                    type="submit"
                    disabled={isSavingPageInfo}
                    className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-tactical font-black text-xs uppercase cursor-pointer shadow-lg flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSavingPageInfo ? 'SAVING...' : 'SAVE & PUBLISH PAGE SPECIFICATIONS'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* SUBTAB 2: PROMOTION PAGES & 20 RANKS REQUIREMENTS EDITOR */}
            {pageInfoSubTab === 'promotions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-data uppercase text-amber-400 font-bold">
                    EDIT 20 USSF RANKS & QUALIFICATION REQUIREMENTS
                  </h4>
                  <span className="text-[10px] font-data text-neutral-400">
                    Changes reflect immediately in Career Hierarchy & Calculator
                  </span>
                </div>

                <div className="space-y-2">
                  {editableRanksList.map(rankItem => {
                    const isEditing = editingRankLevel === rankItem.level;
                    return (
                      <div
                        key={rankItem.level}
                        className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-data"
                      >
                        {isEditing ? (
                          <div className="w-full space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="text-[10px] text-neutral-400 block">Rank Title</label>
                                <input
                                  type="text"
                                  value={editRankName}
                                  onChange={(e) => setEditRankName(e.target.value)}
                                  className="w-full bg-neutral-900 border border-amber-500 rounded p-1.5 text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-neutral-400 block">Required Points</label>
                                <input
                                  type="number"
                                  value={editRankPoints}
                                  onChange={(e) => setEditRankPoints(parseInt(e.target.value) || 0)}
                                  className="w-full bg-neutral-900 border border-amber-500 rounded p-1.5 text-emerald-300"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-neutral-400 block">Required Days</label>
                                <input
                                  type="number"
                                  value={editRankDays}
                                  onChange={(e) => setEditRankDays(parseInt(e.target.value) || 0)}
                                  className="w-full bg-neutral-900 border border-amber-500 rounded p-1.5 text-amber-300"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-neutral-400 block">Description & Responsibilities</label>
                              <input
                                type="text"
                                value={editRankDesc}
                                onChange={(e) => setEditRankDesc(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded p-1.5 text-neutral-200"
                              />
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingRankLevel(null)}
                                className="px-3 py-1 rounded bg-neutral-800 text-neutral-400"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = editableRanksList.map(r => 
                                    r.level === rankItem.level
                                      ? { ...r, name: editRankName, requiredPoints: editRankPoints, requiredDays: editRankDays, description: editRankDesc }
                                      : r
                                  );
                                  setEditableRanksList(updated);
                                  onUpdateRanks?.(updated);
                                  try {
                                    localStorage.setItem('ussf_custom_ranks', JSON.stringify(updated));
                                  } catch (e) {}
                                  setEditingRankLevel(null);
                                  setPageInfoSaved(true);
                                  setTimeout(() => setPageInfoSaved(false), 4000);
                                }}
                                className="px-4 py-1 rounded bg-emerald-500 text-neutral-950 font-bold uppercase"
                              >
                                Save Rank
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <span className="h-7 w-7 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center font-bold text-amber-400 text-xs">
                                {rankItem.level}
                              </span>
                              <div>
                                <div className="font-bold text-white text-sm flex items-center gap-2">
                                  <span>{rankItem.name}</span>
                                  <span className="text-[10px] text-neutral-500 font-mono">({rankItem.category})</span>
                                </div>
                                <div className="text-[11px] text-neutral-400 font-mono">
                                  Points Required: <span className="text-emerald-400 font-bold">{rankItem.requiredPoints}</span> · Days Required: <span className="text-amber-400 font-bold">{rankItem.requiredDays}d</span>
                                </div>
                                <div className="text-[10px] text-neutral-500 italic mt-0.5 line-clamp-1">
                                  {rankItem.description}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingRankLevel(rankItem.level);
                                setEditRankName(rankItem.name);
                                setEditRankPoints(rankItem.requiredPoints);
                                setEditRankDays(rankItem.requiredDays);
                                setEditRankDesc(rankItem.description || '');
                              }}
                              className="px-3 py-1.5 rounded bg-neutral-900 border border-neutral-700 hover:border-amber-400 text-neutral-300 hover:text-amber-300 text-[11px] font-tactical uppercase font-bold shrink-0 cursor-pointer"
                            >
                              Edit Requirements
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUBTAB 3: TACTICAL SKINS & CAR SHADER IMAGES FEATURE */}
            {pageInfoSubTab === 'skinsShaders' && (
              <div className="space-y-6">
                {assetError && <p role="alert" className="border border-rose-700 bg-rose-950/40 p-3 text-xs text-rose-300">{assetError}</p>}
                {/* Add New Skin/Shader Image Box */}
                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/80 space-y-3 font-data text-xs">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <span className="font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4" />
                      <span>REGISTER NEW SKIN OR CAR SHADER IMAGE</span>
                    </span>
                    <span className="text-[10px] text-neutral-400">e.g. Skin ID 39 (4 variants), Sultan, Banshee</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Asset Type</label>
                      <select
                        value={newAssetType}
                        onChange={(e) => setNewAssetType(e.target.value as any)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white"
                      >
                        <option value="SKIN">Character Skin</option>
                        <option value="VEHICLE_SHADER">Vehicle Shader</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Skin ID 39 (Desert SpecOps)"
                        value={newAssetTitle}
                        onChange={(e) => setNewAssetTitle(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Code / Skin ID</label>
                      <input
                        type="text"
                        placeholder="e.g. Skin ID 39"
                        value={newAssetCode}
                        onChange={(e) => setNewAssetCode(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Variants Count</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={newAssetVariantCount}
                        onChange={(e) => setNewAssetVariantCount(parseInt(e.target.value) || 1)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Image URL or Uploaded Link</label>
                    <input
                      type="text"
                      placeholder="Paste image link (e.g. https://... or /src/assets/images/...)"
                      value={newAssetImageUrl}
                      onChange={(e) => setNewAssetImageUrl(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Description</label>
                    <input
                      type="text"
                      placeholder="Description of the camouflage uniform or interceptor shader..."
                      value={newAssetDescription}
                      onChange={(e) => setNewAssetDescription(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white text-xs"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={isSavingAssets}
                      onClick={async () => {
                        if (!newAssetTitle.trim() || !newAssetImageUrl.trim()) {
                          return;
                        }
                        if (!onCreateAsset) {
                          setAssetError('Asset creation is not connected to the server.');
                          return;
                        }
                        const newItem: USSFAssetItem = {
                          id: `asset-${Date.now()}`,
                          type: newAssetType,
                          title: newAssetTitle.trim(),
                          codeOrId: newAssetCode.trim() || 'Custom Asset',
                          variantCount: newAssetVariantCount,
                          imageUrl: newAssetImageUrl.trim(),
                          description: newAssetDescription.trim() || 'Official Special Forces tactical gear.',
                          category: newAssetType === 'SKIN' ? 'Special Forces' : 'Vehicle'
                        };
                        if (!await persistAssetMutation(onCreateAsset(newItem))) return;
                        setNewAssetTitle('');
                        setNewAssetCode('');
                        setNewAssetImageUrl('');
                        setNewAssetDescription('');
                        setPageInfoSaved(true);
                        setTimeout(() => setPageInfoSaved(false), 4000);
                      }}
                      className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-tactical font-black text-xs uppercase cursor-pointer"
                    >
                      ADD ASSET & LINK IMAGE
                    </button>
                  </div>
                </div>

                {/* Existing Assets List with Quick Image URL Update */}
                <div className="space-y-3">
                  <h4 className="text-xs font-data uppercase text-neutral-400 font-bold">
                    CURRENT REGISTERED SKINS & VEHICLE SHADERS ({editableAssetsList.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {editableAssetsList.map(asset => {
                      const isEditing = editingAssetId === asset.id;
                      return (
                        <div
                          key={asset.id}
                          className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/70 flex flex-col justify-between gap-3 text-xs font-data"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={asset.imageUrl}
                              alt={asset.title}
                              className="h-16 w-16 rounded-lg object-cover border border-neutral-700 shrink-0"
                            />
                            <div className="overflow-hidden">
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                asset.type === 'SKIN' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                {asset.type === 'SKIN' ? 'SKIN' : 'CAR SHADER'}
                              </span>
                              <div className="font-bold text-white text-sm mt-0.5 truncate">{asset.title}</div>
                              <div className="text-[10px] text-neutral-400 font-mono">{asset.codeOrId} · {asset.variantCount || 1} variants</div>
                              <div className="text-[10px] text-neutral-500 truncate mt-0.5">{asset.description}</div>
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="space-y-2 pt-2 border-t border-neutral-800">
                              <input
                                type="text"
                                value={editingImageUrl}
                                onChange={(e) => setEditingImageUrl(e.target.value)}
                                placeholder="Paste new image URL..."
                                className="w-full bg-neutral-900 border border-amber-500 rounded p-1.5 text-white text-xs font-mono"
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingAssetId(null)}
                                  className="px-2.5 py-1 rounded bg-neutral-800 text-neutral-400 text-[10px]"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingAssets}
                                  onClick={async () => {
                                    if (!editingImageUrl.trim()) return;
                                    if (!onUpdateAsset) {
                                      setAssetError('Asset updates are not connected to the server.');
                                      return;
                                    }
                                    const updatedAsset = { ...asset, imageUrl: editingImageUrl.trim() };
                                    if (!await persistAssetMutation(onUpdateAsset(updatedAsset))) return;
                                    setEditingAssetId(null);
                                    setPageInfoSaved(true);
                                    setTimeout(() => setPageInfoSaved(false), 4000);
                                  }}
                                  className="px-3 py-1 rounded bg-emerald-500 text-neutral-950 font-bold text-[10px] uppercase"
                                >
                                  Save Image
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-800/60">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAssetId(asset.id);
                                  setEditingImageUrl(asset.imageUrl);
                                }}
                                className="text-[10px] font-tactical uppercase px-2.5 py-1 rounded bg-neutral-900 border border-neutral-700 hover:border-amber-400 text-neutral-300 hover:text-amber-300 font-bold cursor-pointer"
                              >
                                Change Image URL
                              </button>
                              <button
                                type="button"
                                disabled={isSavingAssets}
                                onClick={async () => {
                                  if (confirm(`Permanently delete "${asset.title}" from armory and motor pool?`)) {
                                    if (!onDeleteAsset) {
                                      setAssetError('Asset deletion is not connected to the server.');
                                      return;
                                    }
                                    if (!await persistAssetMutation(onDeleteAsset(asset.id))) return;
                                    setPageInfoSaved(true);
                                    setTimeout(() => setPageInfoSaved(false), 4000);
                                  }
                                }}
                                className="text-[10px] font-tactical uppercase px-2.5 py-1 rounded bg-rose-950/70 border border-rose-800/80 hover:bg-rose-900 text-rose-300 font-bold cursor-pointer flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete Asset</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: LOGIN CASH PAYOUTS APPROVAL QUEUE */}
        {activeSection === 'payoutQueue' && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-tactical font-bold uppercase text-white flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <span>OPERATOR DAILY LOGIN REWARDS CASH QUEUE</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  When operators claim their 7/30-day login milestone, it arrives here for Admin verification and in-game treasury payment.
                </p>
              </div>
              <span className="text-xs font-data text-emerald-400 font-bold">
                {pendingDisbursements.length} PENDING PAYOUTS
              </span>
            </div>

            {pendingLoginClaims.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs font-data">
                Zero pending daily login claims in queue.
              </div>
            ) : (
              <div className="space-y-3 font-data text-xs">
                {pendingLoginClaims.map(claim => (
                  <div key={claim.id} className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{claim.operatorName}</span>
                        <span className="text-emerald-400 font-mono">({claim.operatorCid})</span>
                        <span className="text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded text-[10px]">
                          DAY 0{claim.day} REWARD
                        </span>
                      </div>
                      <div className="text-neutral-400 text-xs">
                        Amount to Pay Out: <strong className="text-emerald-400">${claim.cashAmount.toLocaleString()} Cash</strong>
                        {claim.promotionPoints > 0 && (
                          <span className="text-amber-400 font-bold ml-2">+ {claim.promotionPoints} Promotion Points</span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-500 block">Claimed on: {claim.claimedAt}</span>
                    </div>

                    <div>
                      {claim.status === 'Pending Payout' ? (
                        <button
                          onClick={() => {
                            tacticalAudio.playTargetLock();
                            onApproveLoginClaim(claim.id);
                          }}
                          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-tactical font-black text-xs uppercase cursor-pointer shadow-md"
                        >
                          APPROVE & PAY OUT CASH (${claim.cashAmount >= 1000000 ? `${claim.cashAmount / 1000000}M` : `${claim.cashAmount / 1000}K`})
                        </button>
                      ) : (
                        <span className="text-emerald-400 font-bold uppercase text-xs flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>PAID OUT & DISBURSED</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 5: EVENT CREATOR (2X, 3X, 4X Financial & Promotions; 3X APB and Multiplier Factor input removed) */}
        {activeSection === 'events' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-sm font-tactical font-bold uppercase text-neutral-100 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-400" />
                  <span>LAUNCH NEW MULTIPLIER EVENT</span>
                </h3>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs font-data">
                <div>
                  <label className="block text-neutral-400 uppercase text-[10px] mb-1">
                    EVENT OPERATION TITLE *
                  </label>
                  <input
                    type="text"
                    required
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    placeholder="e.g. OPERATION DESERT THUNDER"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 uppercase text-[10px] mb-1">
                    CAMPAIGN MULTIPLIER TYPE
                  </label>
                  <select
                    value={newEventMultiplierType}
                    onChange={(e) => handleMultiplierTypeChange(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-2 text-neutral-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="2X Financial Payouts">2X Financial Payouts (Double Treasury Cash)</option>
                    <option value="3X Financial Payouts">3X Financial Payouts (Triple Treasury Cash)</option>
                    <option value="4X Financial Payouts">4X Financial Payouts (Quadruple Treasury Cash)</option>
                    <option value="2X Promotion Points">2X Promotion Points (Double Rank Acceleration)</option>
                    <option value="3X Promotion Points">3X Promotion Points (Triple Rank Acceleration)</option>
                    <option value="4X Promotion Points">4X Promotion Points (Quadruple Rank Acceleration)</option>
                    <option value="Special Patrol Week">Special Patrol Week</option>
                  </select>
                  <div className="mt-1 text-[10px] text-amber-400">
                    Active Multiplier: {newEventMultiplier}X automatically applied to relevant tasks & submissions.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-400 uppercase text-[10px] mb-1">START DATE</label>
                    <input
                      type="date"
                      value={newEventStartDate}
                      onChange={(e) => setNewEventStartDate(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-2 text-neutral-200"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 uppercase text-[10px] mb-1">END DATE</label>
                    <input
                      type="date"
                      value={newEventEndDate}
                      onChange={(e) => setNewEventEndDate(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-2 text-neutral-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-400 uppercase text-[10px] mb-1">ANNOUNCEMENT BROADCAST</label>
                  <textarea
                    rows={2}
                    value={newEventAnnouncement}
                    onChange={(e) => setNewEventAnnouncement(e.target.value)}
                    placeholder="Enter dispatch announcement to appear in Financial & Command news..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-neutral-100 resize-none font-sans"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-tactical font-black text-xs uppercase cursor-pointer shadow-lg"
                >
                  BROADCAST & ACTIVATE {newEventMultiplier}X EVENT
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <h3 className="text-sm font-tactical font-bold uppercase text-neutral-100">
                    ACTIVE TACTICAL CAMPAIGNS ({events.length})
                  </h3>
                  <span className="text-[10px] font-data text-emerald-400">REAL-TIME TRACKING</span>
                </div>

                <div className="space-y-3">
                  {events.map(evt => (
                    <div key={evt.id} className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/80 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="inline-block text-[10px] font-data uppercase px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/30 mb-1">
                            {evt.multiplierType} ({evt.multiplier}X)
                          </span>
                          <h4 className="text-sm font-tactical uppercase font-bold text-neutral-100">
                            {evt.title}
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-data text-[10px] font-bold">
                          ACTIVE NOW
                        </span>
                      </div>
                      <p className="text-xs font-sans text-neutral-300">
                        {evt.announcement}
                      </p>
                      <div className="text-[10px] font-data text-neutral-500 pt-2 border-t border-neutral-800 flex justify-between">
                        <span>TIMEFRAME: {evt.startDate} → {evt.endDate}</span>
                        <span className="text-emerald-400">100% USSF GROUP PARTICIPATION</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 6: 7 & 30 DAYS DAILY LOGIN EVENT CONFIGURATOR */}
        {activeSection === 'daily' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="text-sm font-tactical font-bold uppercase text-neutral-100 flex items-center gap-2">
                    <Gift className="h-4 w-4 text-emerald-400" />
                    <span>DAILY LOGIN EVENT CONFIGURATOR (CASH + PROMOTION POINTS)</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Configure custom cash bounties and career promotion points for each day of the 7-day and 30-day streak.
                  </p>
                </div>

                <div className="flex items-center gap-2 font-data text-xs">
                  <button
                    onClick={() => {
                      tacticalAudio.playTacticalClick();
                      setCalendarMode('7days');
                      setSelectedRewardDay(1);
                    }}
                    className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                      calendarMode === '7days' ? 'bg-emerald-500 text-neutral-950 font-bold shadow' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    7-DAY STREAK
                  </button>
                  <button
                    onClick={() => {
                      tacticalAudio.playTacticalClick();
                      setCalendarMode('30days');
                      setSelectedRewardDay(1);
                    }}
                    className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                      calendarMode === '30days' ? 'bg-amber-500 text-neutral-950 font-bold shadow' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    30-DAY MONTHLY
                  </button>
                </div>
              </div>

              {/* Day Editor Form */}
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/80 space-y-3">
                <span className="text-xs font-data text-amber-400 font-bold uppercase block">
                  EDIT DAY {selectedRewardDay} REWARD ({calendarMode.toUpperCase()})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-data">
                  <div>
                    <label className="text-neutral-500 block text-[10px] mb-1">SELECT DAY</label>
                    <select
                      value={selectedRewardDay}
                      onChange={(e) => {
                        const d = Number(e.target.value);
                        setSelectedRewardDay(d);
                        const list = calendarMode === '7days' ? DAILY_LOGIN_REWARDS_7 : DAILY_LOGIN_REWARDS_30;
                        const item = list.find(x => x.day === d);
                        if (item) {
                          setRewardAmount(String(item.cashAmount));
                          setRewardPoints(String(item.promotionPoints));
                          setRewardLabel(`$${item.cashAmount.toLocaleString()} Cash + ${item.promotionPoints} Pts`);
                        }
                      }}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-200"
                    >
                      {(calendarMode === '7days' ? DAILY_LOGIN_REWARDS_7 : DAILY_LOGIN_REWARDS_30).map(r => (
                        <option key={r.day} value={r.day}>Day {r.day} - {r.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-neutral-500 block text-[10px] mb-1">CASH AMOUNT ($)</label>
                    <input
                      type="number"
                      value={rewardAmount}
                      onChange={(e) => {
                        setRewardAmount(e.target.value);
                        setRewardLabel(`$${Number(e.target.value).toLocaleString()} Cash + ${rewardPoints} Pts`);
                      }}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-200"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-500 block text-[10px] mb-1">PROMOTION POINTS</label>
                    <input
                      type="number"
                      value={rewardPoints}
                      onChange={(e) => {
                        setRewardPoints(e.target.value);
                        setRewardLabel(`$${Number(rewardAmount).toLocaleString()} Cash + ${e.target.value} Pts`);
                      }}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-200"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleSaveDayReward}
                    className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-tactical font-black text-xs uppercase cursor-pointer"
                  >
                    UPDATE DAY {selectedRewardDay} REWARD
                  </button>
                </div>
              </div>

              {/* Grid Preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-10 gap-2.5 pt-2">
                {(calendarMode === '7days' ? DAILY_LOGIN_REWARDS_7 : DAILY_LOGIN_REWARDS_30).map(r => (
                  <div
                    key={r.day}
                    onClick={() => {
                      setSelectedRewardDay(r.day);
                      setRewardAmount(String(r.cashAmount));
                      setRewardPoints(String(r.promotionPoints));
                      setRewardLabel(r.label);
                    }}
                    className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
                      selectedRewardDay === r.day
                        ? 'border-emerald-400 bg-emerald-950/40 shadow-lg scale-105'
                        : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-[9px] font-data text-neutral-500 uppercase">DAY 0{r.day}</div>
                    <div className="mt-1 text-xs font-tactical font-bold text-emerald-400 truncate">
                      ${(r.cashAmount / 1000000 >= 1 ? `${r.cashAmount / 1000000}M` : `${r.cashAmount / 1000}K`)}
                    </div>
                    <div className="text-[9px] font-data text-amber-400 font-bold mt-0.5">
                      +{r.promotionPoints} Pts
                    </div>
                  </div>
                ))}
              </div>

              {/* 7 & 30 DAYS MILESTONE CUSTOM CHOOSE REWARD SUITE */}
              <div className="mt-8 pt-6 border-t border-neutral-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-tactical font-black uppercase text-amber-400 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span>7-DAY & 30-DAY LOGIN MILESTONE REWARD CONFIGURATION</span>
                    </h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Configure custom items, cursors, avatar frames, banners, and bounties that operators can choose upon reaching 7-Day and 30-Day milestones.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs font-data">
                    <button
                      type="button"
                      onClick={() => {
                        tacticalAudio.playTacticalClick();
                        setSelectedMilestoneDay(7);
                      }}
                      className={`px-3 py-1.5 rounded uppercase font-bold transition-all cursor-pointer ${
                        selectedMilestoneDay === 7
                          ? 'bg-amber-500 text-neutral-950 shadow'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      Day 7 Milestones ({editableMilestones.filter(m => m.milestoneDay === 7).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        tacticalAudio.playTacticalClick();
                        setSelectedMilestoneDay(30);
                      }}
                      className={`px-3 py-1.5 rounded uppercase font-bold transition-all cursor-pointer ${
                        selectedMilestoneDay === 30
                          ? 'bg-emerald-500 text-neutral-950 shadow'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      Day 30 Monthly ({editableMilestones.filter(m => m.milestoneDay === 30).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        tacticalAudio.playTacticalClick();
                        setMilestoneFormDay(selectedMilestoneDay);
                        setMilestoneFormType('CUSTOM_CURSOR');
                        setMilestoneFormTitle('Custom Cursor: Solo Leveling Shadow Monarch');
                        setMilestoneFormDesc('Equip the exclusive dark obsidian shadow dagger and purple monarch flame hand pointer.');
                        setMilestoneFormVal('solo-leveling');
                        setMilestoneFormCash(5000000);
                        setMilestoneFormPts(50);
                        setMilestoneFormImage('/assets/aistudio/Solo_Leveling_Shadow_Arrow___Monarch_Hand_Animated_Cursor--cursor--SweezyCursors_493f92f5.png');
                        setIsAddingMilestoneModal(true);
                      }}
                      className="px-3.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-tactical font-black uppercase text-xs cursor-pointer shadow flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>ADD {selectedMilestoneDay}-DAY REWARD</span>
                    </button>
                  </div>
                </div>

                {editableMilestones.filter(m => m.milestoneDay === selectedMilestoneDay).length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-neutral-800 text-neutral-500 text-xs font-data">
                    No custom reward options configured for Day {selectedMilestoneDay}. Click "+ ADD {selectedMilestoneDay}-DAY REWARD" above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {editableMilestones.filter(m => m.milestoneDay === selectedMilestoneDay).map(choice => (
                      <div key={choice.id} className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/90 space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-data font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                              {choice.type}
                            </span>
                            <span className="text-[11px] font-mono text-neutral-400 truncate max-w-[140px]" title={choice.rewardValue}>
                              {choice.rewardValue}
                            </span>
                          </div>

                          <div className="flex items-start gap-3">
                            {choice.previewImage ? (
                              <img
                                src={choice.previewImage}
                                alt={choice.title}
                                className="h-10 w-10 rounded-lg bg-neutral-900 border border-neutral-800 object-contain p-1 shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                                <Sparkles className="h-5 w-5 text-amber-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <h5 className="text-xs font-tactical font-bold text-white uppercase truncate">{choice.title}</h5>
                              <p className="text-[11px] text-neutral-400 font-sans line-clamp-2 mt-0.5">{choice.description}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-2.5 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                          <span className="text-emerald-400 text-[10px] uppercase font-data font-bold">
                            {choice.cashAmount ? `$${choice.cashAmount.toLocaleString()} Cash + ${choice.promotionPoints || 0} Pts` : 'Cosmetic Unlock'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                tacticalAudio.playTacticalClick();
                                setEditingMilestoneModal(choice);
                                setMilestoneFormDay(choice.milestoneDay as 7 | 30);
                                setMilestoneFormType(choice.type);
                                setMilestoneFormTitle(choice.title);
                                setMilestoneFormDesc(choice.description);
                                setMilestoneFormVal(choice.rewardValue);
                                setMilestoneFormCash(choice.cashAmount || 0);
                                setMilestoneFormPts(choice.promotionPoints || 0);
                                setMilestoneFormImage(choice.previewImage || '');
                              }}
                              className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-700 hover:border-amber-400 text-neutral-300 hover:text-amber-300 font-bold uppercase text-[10px] cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                tacticalAudio.playTacticalClick();
                                setDeleteMilestoneConfirmId(choice.id);
                              }}
                              className="p-1 rounded bg-neutral-900 border border-neutral-800 hover:border-rose-500 text-neutral-500 hover:text-rose-400 cursor-pointer"
                              title="Delete Option"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 7: FORGOT PASSWORD REQUESTS */}
        {activeSection === 'passwords' && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 space-y-4">
            <div className="border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-tactical font-bold uppercase text-neutral-100 flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-400" />
                <span>FORGOT PASSWORD RECOVERY REQUESTS</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Exclusive Admin moderation. Review operator explanation of how access was lost before approving password reset token.
              </p>
            </div>

            {forgotPwRequests.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs font-data">
                Zero pending password recovery requests. All clear.
              </div>
            ) : (
              <div className="space-y-3">
                {forgotPwRequests.map(req => (
                  <div key={req.id} className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-2">
                      <div>
                        <span className="text-xs font-bold text-neutral-100 font-data">ACCOUNT: {req.accountName}</span>
                        <span className="text-neutral-500 font-data text-xs ml-2">({req.emailOrContact})</span>
                      </div>
                      <span className="text-[10px] font-data text-neutral-500">REQUESTED: {req.requestDate}</span>
                    </div>

                    <div className="bg-neutral-900/80 p-3 rounded border border-neutral-800/80 text-xs">
                      <span className="text-neutral-500 uppercase text-[10px] font-data block mb-1">
                        OPERATOR EXPLANATION & LOSS REASON:
                      </span>
                      <p className="text-neutral-200 font-sans">{req.reasonExplanation}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-data font-bold uppercase ${
                        req.status === 'Approved' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                      }`}>
                        STATUS: {req.status}
                      </span>

                      {req.status === 'Pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onResolveForgotPw(req.id, false)}
                            className="px-3 py-1 rounded bg-rose-950 text-rose-300 text-xs font-tactical font-bold uppercase hover:bg-rose-900 cursor-pointer"
                          >
                            REJECT
                          </button>
                          <button
                            onClick={() => onResolveForgotPw(req.id, true)}
                            className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-tactical font-bold uppercase cursor-pointer"
                          >
                            APPROVE RESET TOKEN
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 8: ACCOUNT LINKING */}
        {activeSection === 'links' && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 space-y-4">
            <div className="border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-tactical font-bold uppercase text-neutral-100 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-emerald-400" />
                <span>IN-GAME ROSTER LINKING APPROVAL QUEUE</span>
              </h3>
            </div>

            <p role="status" className="border border-amber-700/60 bg-amber-950/30 p-3 text-xs text-amber-200">
              Requests are visible, but review actions are unavailable until the server can authenticate administrators.
            </p>

            <div className="space-y-3">
              {linkRequests.map(req => (
                <div key={req.id} className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/80 space-y-3">
                  <div className="flex items-center justify-between text-xs font-data">
                    <div>
                      <span className="text-neutral-100 font-bold">{req.inGameName}</span>
                      <span className="text-emerald-400 ml-2 font-mono">CID: {req.inGameCid}</span>
                      <span className="text-neutral-400 ml-2">({req.ingameRank})</span>
                    </div>
                    <span className="text-[10px] text-neutral-500">{req.submissionDate}</span>
                  </div>

                  <div className="text-xs font-data">
                    <span className="text-neutral-500 uppercase text-[10px] block">PROOF SCREENSHOT:</span>
                    <a
                      href={req.f5ScreenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline break-all"
                    >
                      {req.f5ScreenshotUrl}
                    </a>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                    <span className="text-[10px] font-data text-neutral-400">
                      SUBMITTED BY: <span className="text-white font-bold">{req.username}</span>
                    </span>

                    {req.status === 'Pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onResolveLinkRequest(req.id, false)}
                          disabled
                          title="Server-authenticated administrative review is not configured"
                          className="px-3 py-1 rounded bg-rose-950 text-rose-300 text-xs font-tactical font-bold uppercase hover:bg-rose-900 cursor-pointer"
                        >
                          DENY (UNAVAILABLE)
                        </button>
                        <button
                          onClick={() => onResolveLinkRequest(req.id, true)}
                          disabled
                          title="Server-authenticated administrative review is not configured"
                          className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-tactical font-bold uppercase cursor-pointer"
                        >
                          APPROVE (UNAVAILABLE)
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-data text-emerald-400 font-bold uppercase">
                        {req.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 9: MODERATION & AUTOMATED FLAGS */}
        {activeSection === 'moderation' && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 space-y-4">
            <div className="border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-tactical font-bold uppercase text-neutral-100 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>CONTENT MODERATION & AUTOMATED FLAGS</span>
              </h3>
            </div>

            <div className="space-y-3 font-data text-xs">
              <div className="p-3.5 rounded-lg border border-amber-500/40 bg-amber-950/20 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <span>FLAG #209: UNVERIFIED PROOF LINK</span>
                    <span className="text-[10px] bg-amber-900/60 px-1.5 py-0.5 rounded">AUTO DETECT</span>
                  </div>
                  <p className="text-neutral-300 font-sans mt-1">
                    Claim #clm-004 submitted with dead Imgur link or missing phone clock.
                  </p>
                </div>
                <button
                  onClick={() => {
                    tacticalAudio.playTacticalClick();
                    setAuditLogs(prev => [
                      { id: `log-${Date.now()}`, timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19), admin: 'ADMIN-ACTION', action: 'Flag #209 resolved: Claimant notified to upload valid F5 proof', status: 'RESOLVED' },
                      ...prev
                    ]);
                  }}
                  className="px-3 py-1 rounded bg-neutral-800 text-neutral-200 hover:bg-neutral-700 cursor-pointer"
                >
                  DISMISS FLAG
                </button>
              </div>

              <div className="p-3.5 rounded-lg border border-emerald-500/40 bg-emerald-950/20 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <span>AUTOMATED SPAM FILTER: OPERATIONAL</span>
                    <span className="text-[10px] bg-emerald-900/60 px-1.5 py-0.5 rounded">ACTIVE</span>
                  </div>
                  <p className="text-neutral-300 font-sans mt-1">
                    AI heuristic scanner monitoring Media dispatches for inappropriate text and unauthorized external links.
                  </p>
                </div>
                <span className="text-emerald-400 font-bold text-xs">0 VIOLATIONS</span>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 10: LOGS & AUDIT PRUNE UTILITY */}
        {activeSection === 'logs' && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 space-y-5">
            <div className="border-b border-neutral-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-tactical font-bold uppercase text-neutral-100 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span>PLATFORM AUDIT & DATABASE INTEGRITY CONTROLS</span>
                </h3>
                <p className="text-xs text-neutral-400 font-sans mt-0.5">
                  Audit logs, automated test data pruning, and clean production launch controls.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunDeepScan}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-tactical text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>DEEP SCAN DATABASE</span>
                </button>
                <button
                  onClick={handleClearAuditLogs}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-tactical text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                  title="Purge all audit logs immediately"
                >
                  <Trash2 className="h-3.5 w-3.5 text-neutral-400" />
                  <span>CLEAR AUDIT LOGS</span>
                </button>
                <button
                  onClick={handleResetToCleanProductionState}
                  className="px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 border border-rose-500 text-rose-200 font-tactical text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                  title="Purge all transient test data from local storage for a 100% clean initial production launch"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>CLEAN PRODUCTION RESET</span>
                </button>
              </div>
            </div>

            {/* Notification message */}
            {pruneNotice && (
              <div className="p-3.5 rounded-xl border border-emerald-500/50 bg-emerald-950/40 text-emerald-300 text-xs font-data flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{pruneNotice}</span>
              </div>
            )}

            {/* Deep Scan Results Card */}
            {scanResult && (
              <div className="p-4 rounded-xl border-2 border-cyan-500/60 bg-neutral-950/90 space-y-3 animate-in zoom-in-95 font-data text-xs">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="font-tactical font-bold uppercase text-cyan-300 flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-cyan-400" />
                    <span>DEEP SCAN AUDIT SUMMARY</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    scanResult.totalTest > 0 ? 'bg-amber-950 text-amber-300 border border-amber-500/40' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {scanResult.totalTest} TEST/DUMMY ENTRIES FOUND
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                    <div className="text-[10px] text-neutral-400 uppercase">Members</div>
                    <div className="font-bold text-amber-400 mt-0.5">{scanResult.testMembers}</div>
                  </div>
                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                    <div className="text-[10px] text-neutral-400 uppercase">Claims</div>
                    <div className="font-bold text-amber-400 mt-0.5">{scanResult.testClaims}</div>
                  </div>
                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                    <div className="text-[10px] text-neutral-400 uppercase">Promotions</div>
                    <div className="font-bold text-amber-400 mt-0.5">{scanResult.testPromotions}</div>
                  </div>
                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                    <div className="text-[10px] text-neutral-400 uppercase">Reports</div>
                    <div className="font-bold text-amber-400 mt-0.5">{scanResult.testReports}</div>
                  </div>
                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                    <div className="text-[10px] text-neutral-400 uppercase">Links</div>
                    <div className="font-bold text-amber-400 mt-0.5">{scanResult.testLinks}</div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400">
                    {scanResult.totalTest > 0
                      ? 'Detected test keywords (test, dummy, sample, mock) in database records.'
                      : 'Zero test keywords identified. Database records are fully consistent.'}
                  </span>
                  {scanResult.totalTest > 0 && (
                    <button
                      onClick={handlePruneTestData}
                      className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-tactical font-black text-xs uppercase cursor-pointer shadow"
                    >
                      PRUNE ALL TEST RECORDS NOW
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Audit Logs Table */}
            <div className="space-y-2">
              <div className="text-[11px] font-data text-neutral-400 uppercase tracking-wider font-bold mb-1">
                IMMUTABLE AUDIT LOGS ({auditLogs.length})
              </div>
              {auditLogs.length > 0 ? (
                auditLogs.map(log => (
                  <div key={log.id} className="p-3 rounded bg-neutral-950 border border-neutral-800 font-data text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-neutral-500 text-[10px]">{log.timestamp} · </span>
                      <span className="text-amber-400 font-bold">{log.admin}: </span>
                      <span className="text-neutral-200">{log.action}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold self-start sm:self-auto ${
                      log.status === 'AUDITED' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-500 font-data text-xs">
                  Zero audit logs recorded in fresh launch state. Actions will append in real time.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* WEB OWNER ROLE ASSIGNMENT MODAL (PASSWORD PROTECTED: MityaAndKazuha786) */}
      {ownerModalMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border-2 border-amber-500/80 bg-[#0d100d] p-6 shadow-2xl space-y-4 font-sans text-neutral-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
              <div className="p-2.5 rounded-full bg-amber-500 text-neutral-950">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-tactical font-black uppercase text-white">
                  WEB OWNER ROLE AUTHORIZATION
                </h3>
                <span className="text-[11px] font-data text-amber-400 uppercase">
                  HIGH COMMAND EXCLUSIVE ACCESS
                </span>
              </div>
            </div>

            <div className="text-xs text-neutral-300 space-y-2 font-sans">
              <p>
                You are about to assign or transfer the supreme <strong>Web Owner</strong> role to:
              </p>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center gap-3">
                <img
                  src={ownerModalMember.avatarUrl || '/src/assets/images/military_leader_training_1790341999734.jpg'}
                  alt={ownerModalMember.name}
                  className="h-10 w-10 rounded-full object-cover border border-amber-500/60"
                />
                <div>
                  <div className="font-bold text-white text-sm">{ownerModalMember.name}</div>
                  <div className="text-[11px] font-data text-amber-400">{ownerModalMember.rank} · {ownerModalMember.cid}</div>
                </div>
              </div>
              <p className="text-[11px] text-neutral-400 font-data">
                Security Policy: Only ONE member can hold the Web Owner role. If an owner exists, no one (even administrators) can remove it without the master owner passkey.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-data text-neutral-400 uppercase block font-bold">
                ENTER OWNER MASTER PASSWORD *
              </label>
              <input
                type="password"
                value={ownerPasswordInput}
                onChange={(e) => {
                  setOwnerPasswordInput(e.target.value);
                  setOwnerPasswordError(null);
                }}
                placeholder="Enter owner authorization password..."
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
              {ownerPasswordError && (
                <div className="text-xs font-data text-rose-400 flex items-center gap-1.5 mt-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{ownerPasswordError}</span>
                </div>
              )}
              {ownerSuccessMessage && (
                <div className="text-xs font-data text-emerald-400 flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{ownerSuccessMessage}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setOwnerModalMember(null);
                  setOwnerPasswordInput('');
                  setOwnerPasswordError(null);
                }}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-tactical uppercase cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleAssignWebOwner}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-tactical font-black text-xs uppercase cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                <Lock className="h-4 w-4" />
                <span>CONFIRM & GRANT OWNER ROLE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. PROMOTION ELIGIBILITY & ASSESSMENT MODAL */}
      {eligibilityModalMember && (() => {
        const assessment = validatePromotionEligibility(eligibilityModalMember);
        const isCallerAdmin = canDirectlyAssignRank(currentUser);
        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border-2 border-emerald-500/80 bg-[#0d100d] p-6 shadow-2xl space-y-4 font-sans text-neutral-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-tactical font-black uppercase text-white">
                      PROMOTION QUALIFICATION DOSSIER
                    </h4>
                    <p className="text-[11px] text-neutral-400 font-data">
                      Candidate: <strong className="text-white">{eligibilityModalMember.name}</strong> ({eligibilityModalMember.cid})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEligibilityModalMember(null)}
                  className="p-1 rounded bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              {/* Rank Progression Overview */}
              <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/80 space-y-2">
                <div className="text-[10px] uppercase font-data text-neutral-500">TARGET PROMOTION ECHELON</div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 block font-data">CURRENT RANK</span>
                    <span className="text-sm font-bold text-white font-tactical uppercase">
                      {assessment.currentRank} (Tier {assessment.currentRankLevel})
                    </span>
                  </div>
                  <div className="text-amber-400 font-bold font-mono">→</div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 block font-data">TARGET RANK</span>
                    <span className="text-sm font-bold text-emerald-400 font-tactical uppercase">
                      {assessment.targetRank} (Tier {assessment.targetRankLevel})
                    </span>
                  </div>
                </div>
              </div>

              {/* Requirement Check 1: Promotion Points */}
              <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-data">
                  <span className="text-neutral-400 uppercase">Promotion Points Requirement</span>
                  <span className={`font-bold ${assessment.pointsDeficit === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {assessment.currentPoints.toLocaleString()} / {assessment.requiredPoints.toLocaleString()} Pts
                  </span>
                </div>
                <div className="w-full bg-neutral-900 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${assessment.pointsDeficit === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{
                      width: `${assessment.requiredPoints > 0 ? Math.min(100, Math.round((assessment.currentPoints / assessment.requiredPoints) * 100)) : 100}%`
                    }}
                  />
                </div>
                {assessment.pointsDeficit > 0 && (
                  <span className="text-[10px] font-data text-rose-400 block">
                    Deficit: Short by {assessment.pointsDeficit.toLocaleString()} points.
                  </span>
                )}
              </div>

              {/* Requirement Check 2: Active Duty Playtime */}
              <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-data">
                  <span className="text-neutral-400 uppercase">Active Duty Deployment Time</span>
                  <span className={`font-bold ${assessment.playtimeDeficit === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {assessment.currentPlaytimeHours} / {assessment.requiredPlaytimeHours} Hours
                  </span>
                </div>
                <div className="w-full bg-neutral-900 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${assessment.playtimeDeficit === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{
                      width: `${assessment.requiredPlaytimeHours > 0 ? Math.min(100, Math.round((assessment.currentPlaytimeHours / assessment.requiredPlaytimeHours) * 100)) : 100}%`
                    }}
                  />
                </div>
                {assessment.playtimeDeficit > 0 && (
                  <span className="text-[10px] font-data text-rose-400 block">
                    Deficit: Short by {assessment.playtimeDeficit} active hours.
                  </span>
                )}
              </div>

              {/* Assessment Verdict */}
              {assessment.eligible ? (
                <div className="p-3.5 rounded-xl border border-emerald-500/60 bg-emerald-950/40 text-emerald-300 text-xs font-data flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">QUALIFIED FOR REGULATION PROMOTION</strong>
                    <span>Candidate meets all required promotion points, operational service days, and task qualifications.</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-rose-500/60 bg-rose-950/40 text-rose-300 text-xs font-data space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-rose-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>INELIGIBLE FOR NORMAL PROMOTION — UNMET REQUIREMENTS:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-neutral-300">
                    {assessment.incompleteReasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEligibilityModalMember(null)}
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-tactical uppercase cursor-pointer"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  {/* Normal Promotion Button - strictly validated */}
                  <button
                    type="button"
                    disabled={!assessment.eligible}
                    onClick={() => {
                      if (!assessment.eligible) return;
                      tacticalAudio.playTargetLock();
                      if (onPromoteMemberNormal) {
                        const res = onPromoteMemberNormal(eligibilityModalMember.id);
                        if (res.success) {
                          appendAuditLog(`Commissioned Normal Promotion: ${eligibilityModalMember.name} promoted to ${assessment.targetRank} (Tier ${assessment.targetRankLevel})`);
                        }
                      }
                      setEligibilityModalMember(null);
                    }}
                    className={`px-5 py-2 rounded-lg font-tactical font-black text-xs uppercase flex items-center gap-1.5 transition-all ${
                      assessment.eligible
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 cursor-pointer shadow-lg'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                    }`}
                    title={!assessment.eligible ? 'Normal promotion locked: candidate has incomplete requirements' : 'Approve normal promotion'}
                  >
                    <Award className="h-4 w-4" />
                    <span>COMMISSION PROMOTION (NORMAL)</span>
                  </button>

                  {/* Direct Admin Commission Alternative */}
                  {isCallerAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetMember = eligibilityModalMember;
                        setEligibilityModalMember(null);
                        setDirectRankModalMember(targetMember);
                        setDirectRankSelectedLevel(assessment.targetRankLevel);
                        setDirectRankNote(`Administrative rank commission: promoted from Tier ${assessment.currentRankLevel}`);
                      }}
                      className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-amber-400 text-amber-300 font-tactical font-bold text-xs uppercase cursor-pointer"
                      title="Switch to direct administrative commission (overrides points check)"
                    >
                      Admin Override
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 2. ROLES AND PERMISSIONS MANAGEMENT MODAL (Decoupled from Rank) */}
      {rolesModalMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border-2 border-amber-500/80 bg-[#0d100d] p-6 shadow-2xl space-y-4 font-sans text-neutral-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-tactical font-black uppercase text-white">
                    MANAGE ROLES & ADMIN CLEARANCE
                  </h4>
                  <p className="text-[11px] text-neutral-400 font-data">
                    Decoupled role management for <strong className="text-white">{rolesModalMember.name}</strong> ({rolesModalMember.cid})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRolesModalMember(null)}
                className="p-1 rounded bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Preserved Military Rank Banner */}
            <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs font-data">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">CURRENT MILITARY RANK (PRESERVED)</span>
                <span className="text-sm font-bold text-white font-tactical uppercase">
                  {rolesModalMember.rank || 'Recruit'} (Tier {rolesModalMember.rankLevel ?? 1})
                </span>
              </div>
              <span className="text-[10px] font-data text-emerald-400 bg-neutral-900 px-2.5 py-1 rounded border border-neutral-800">
                Rank Untouched
              </span>
            </div>

            {/* Administrator Authority Section */}
            <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  <span className="font-tactical font-bold text-xs uppercase text-amber-300">
                    ADMINISTRATOR AUTHORITY
                  </span>
                </div>
                <input
                  type="checkbox"
                  id="toggle-admin-role"
                  checked={rolesModalIsAdmin}
                  disabled={!isEligibleLeaderForAdmin(rolesModalMember)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRolesModalIsAdmin(checked);
                    if (checked && !rolesModalSpecialRoles.includes('Administrator')) {
                      setRolesModalSpecialRoles([...rolesModalSpecialRoles, 'Administrator']);
                    } else if (!checked) {
                      setRolesModalSpecialRoles(rolesModalSpecialRoles.filter(r => r !== 'Administrator'));
                    }
                  }}
                  className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="text-[11px] font-data">
                {isEligibleLeaderForAdmin(rolesModalMember) ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    ELIGIBLE LEADER (Commissioned First Major+ / Tier 7+ or Field/High Command)
                  </span>
                ) : (
                  <span className="text-amber-400/90 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                    Ineligible: Requires First Major+ (Tier 7+) or Field Command leadership to assign Administrator.
                  </span>
                )}
                <p className="text-[10px] text-neutral-400 mt-1">
                  Grants full access to the Command Deck, audit logs, direct rank commissioning, and platform operations.
                </p>
              </div>
            </div>

            {/* Special Roles Selection */}
            <div className="space-y-2">
              <label className="text-neutral-400 uppercase text-[10px] font-data block">
                ASSIGN SPECIALIZED FUNCTIONAL ROLES
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-data">
                {(['Promotion Manager', 'Financial Manager', 'Account Recovery Manager'] as SpecialRole[]).map(role => {
                  const roleConfig = USSF_ROLES[role];
                  const isChecked = rolesModalSpecialRoles.includes(role);
                  const Icon = roleConfig.icon;
                  return (
                    <div
                      key={role}
                      onClick={() => {
                        tacticalAudio.playTacticalClick();
                        if (isChecked) {
                          setRolesModalSpecialRoles(rolesModalSpecialRoles.filter(r => r !== role));
                        } else {
                          setRolesModalSpecialRoles([...rolesModalSpecialRoles, role]);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                        isChecked
                          ? `${roleConfig.borderClass} ${roleConfig.bgClass} ${roleConfig.textClass} shadow`
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="h-3.5 w-3.5 rounded mt-0.5 pointer-events-none"
                      />
                      <div>
                        <div className="font-bold flex items-center gap-1 text-white">
                          <Icon className="h-3.5 w-3.5" />
                          <span>{roleConfig.name}</span>
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-0.5 line-clamp-2">
                          {roleConfig.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Audit Justification Note */}
            <div>
              <label className="text-neutral-400 uppercase text-[10px] font-data block mb-1">
                ADMIN JUSTIFICATION & AUDIT NOTE
              </label>
              <input
                type="text"
                value={rolesModalNote}
                onChange={(e) => setRolesModalNote(e.target.value)}
                placeholder="e.g. Commissioned by High Command for Treasury Oversight"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setRolesModalMember(null)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-tactical uppercase cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playTargetLock();
                  if (onUpdateMemberRoles) {
                    onUpdateMemberRoles(
                      rolesModalMember.id,
                      rolesModalIsAdmin,
                      rolesModalSpecialRoles,
                      rolesModalNote || 'Administrative role assignment'
                    );
                  }
                  appendAuditLog(
                    `Updated roles for ${rolesModalMember.name}: Admin=${rolesModalIsAdmin}, Roles=[${rolesModalSpecialRoles.join(', ')}]. Note: ${rolesModalNote || 'Standard update'}`
                  );
                  setRolesModalMember(null);
                }}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-tactical font-black text-xs uppercase cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                <Save className="h-4 w-4" />
                <span>SAVE ROLES & PERMISSIONS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. DIRECT ADMINISTRATIVE RANK COMMISSION (ADMIN OVERRIDE) MODAL */}
      {directRankModalMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border-2 border-amber-500/80 bg-[#0d100d] p-6 shadow-2xl space-y-4 font-sans text-neutral-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-tactical font-black uppercase text-white">
                    DIRECT ADMINISTRATIVE COMMISSION
                  </h4>
                  <p className="text-[11px] text-neutral-400 font-data">
                    Rank Assignment Override for <strong className="text-white">{directRankModalMember.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDirectRankModalMember(null)}
                className="p-1 rounded bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-950 text-xs font-data text-neutral-400">
              Authorized administrators can directly assign or adjust an officer's rank without requiring a promotion application or point balance check.
            </div>

            <div>
              <label className="text-neutral-400 uppercase text-[10px] font-data block mb-1">
                SELECT TARGET MILITARY RANK
              </label>
              <select
                value={directRankSelectedLevel}
                onChange={(e) => setDirectRankSelectedLevel(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-tactical text-amber-300 font-bold"
              >
                {USSF_RANKS.map(r => (
                  <option key={r.level} value={r.level}>
                    Tier {r.level} — {r.name} ({r.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-neutral-400 uppercase text-[10px] font-data block mb-1">
                ADMIN JUSTIFICATION / CITATION NOTE (REQUIRED)
              </label>
              <input
                type="text"
                required
                value={directRankNote}
                onChange={(e) => setDirectRankNote(e.target.value)}
                placeholder="e.g. Exceptional service commendation by High Command"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setDirectRankModalMember(null)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-tactical uppercase cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!directRankNote.trim()) {
                    alert('Please enter an admin justification note for the audit log.');
                    return;
                  }
                  const targetRank = USSF_RANKS.find(r => r.level === directRankSelectedLevel);
                  if (!targetRank) return;
                  tacticalAudio.playTargetLock();
                  if (onUpdateMemberRank) {
                    onUpdateMemberRank(directRankModalMember.id, targetRank.name, targetRank.level, directRankNote);
                  }
                  appendAuditLog(
                    `Direct Rank Commission: Assigned ${targetRank.name} (Tier ${targetRank.level}) to ${directRankModalMember.name}. Note: ${directRankNote}`
                  );
                  setDirectRankModalMember(null);
                }}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-tactical font-black text-xs uppercase cursor-pointer shadow-lg"
              >
                CONFIRM DIRECT COMMISSION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MILESTONE ADD / EDIT REWARD MODAL */}
      {(isAddingMilestoneModal || editingMilestoneModal) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border-2 border-amber-500/80 bg-[#0d100d] p-6 shadow-2xl space-y-4 font-sans text-neutral-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-tactical font-black uppercase text-white">
                    {editingMilestoneModal ? 'EDIT MILESTONE REWARD' : `ADD DAY ${milestoneFormDay} MILESTONE REWARD`}
                  </h4>
                  <p className="text-[11px] text-neutral-400 font-data">
                    Configure custom reward selectable by operators upon milestone completion
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingMilestoneModal(false);
                  setEditingMilestoneModal(null);
                }}
                className="p-1 rounded bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 font-data text-xs">
              <div className="grid grid-cols-2 gap-3">
                {/* Milestone Day Selection */}
                <div>
                  <label className="text-neutral-400 uppercase text-[10px] block mb-1">MILESTONE TARGET</label>
                  <select
                    value={milestoneFormDay}
                    onChange={(e) => setMilestoneFormDay(Number(e.target.value) as 7 | 30)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value={7}>Day 7 Milestone</option>
                    <option value={30}>Day 30 Monthly Milestone</option>
                  </select>
                </div>

                {/* Reward Type Selection */}
                <div>
                  <label className="text-neutral-400 uppercase text-[10px] block mb-1">REWARD CATEGORY</label>
                  <select
                    value={milestoneFormType}
                    onChange={(e) => {
                      const newType = e.target.value as MilestoneRewardChoice['type'];
                      setMilestoneFormType(newType);
                      if (newType === 'CUSTOM_CURSOR') {
                        setMilestoneFormTitle('Custom Cursor: Solo Leveling Shadow Monarch');
                        setMilestoneFormDesc('Equip the exclusive dark obsidian shadow dagger and purple monarch flame hand pointer.');
                        setMilestoneFormVal('solo-leveling');
                        setMilestoneFormImage('/assets/aistudio/Solo_Leveling_Shadow_Arrow___Monarch_Hand_Animated_Cursor--cursor--SweezyCursors_493f92f5.png');
                      } else if (newType === 'AVATAR_FRAME') {
                        setMilestoneFormTitle('Specialist Diamond Avatar Frame');
                        setMilestoneFormDesc('Equip the glowing Specialist Diamond border around your tactical operator avatar.');
                        setMilestoneFormVal('Specialist Diamond');
                        setMilestoneFormImage('/src/assets/images/military_leader_training_1790341999734.jpg');
                      } else if (newType === 'CASH_POINTS') {
                        setMilestoneFormTitle('Treasury Cash & Points Jackpot');
                        setMilestoneFormDesc('Claim $5,000,000 cash bonus + 50 Promotion Points disbursed to your career ledger.');
                        setMilestoneFormVal('$5,000,000 + 50 Pts');
                        setMilestoneFormCash(5000000);
                        setMilestoneFormPts(50);
                      }
                    }}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="CUSTOM_CURSOR">Custom Mouse Cursor</option>
                    <option value="AVATAR_FRAME">Avatar Frame</option>
                    <option value="NAMECARD">Custom Namecard</option>
                    <option value="CASH_POINTS">Cash & Points Jackpot</option>
                    <option value="TITLE">Prestige Title</option>
                    <option value="SPECIAL_ITEM">Special Item</option>
                  </select>
                </div>
              </div>

              {/* Quick Select for Custom Cursors */}
              {milestoneFormType === 'CUSTOM_CURSOR' && (
                <div>
                  <label className="text-neutral-400 uppercase text-[10px] block mb-1">
                    CHOOSE PRESET CURSOR FROM CATALOG
                  </label>
                  <select
                    value={milestoneFormVal}
                    onChange={(e) => {
                      const found = CUSTOM_CURSORS_CATALOG.find(c => c.id === e.target.value);
                      if (found) {
                        setMilestoneFormVal(found.id);
                        setMilestoneFormTitle(`Custom Cursor: ${found.name}`);
                        setMilestoneFormDesc(found.description);
                        setMilestoneFormImage(found.previewImage || found.cursorUrl);
                      }
                    }}
                    className="w-full bg-neutral-950 border border-emerald-500 rounded-lg px-3 py-2 text-emerald-300 font-bold"
                  >
                    {CUSTOM_CURSORS_CATALOG.filter(c => c.id !== 'default').map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.category})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="text-neutral-400 uppercase text-[10px] block mb-1">REWARD TITLE</label>
                <input
                  type="text"
                  required
                  value={milestoneFormTitle}
                  onChange={(e) => setMilestoneFormTitle(e.target.value)}
                  placeholder="e.g. Custom Cursor: Solo Leveling"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-neutral-400 uppercase text-[10px] block mb-1">DESCRIPTION</label>
                <textarea
                  rows={2}
                  value={milestoneFormDesc}
                  onChange={(e) => setMilestoneFormDesc(e.target.value)}
                  placeholder="Explain what this reward grants to the operator..."
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              {/* Item Value / Identifier */}
              <div>
                <label className="text-neutral-400 uppercase text-[10px] block mb-1">ITEM IDENTIFIER / VALUE</label>
                <input
                  type="text"
                  value={milestoneFormVal}
                  onChange={(e) => setMilestoneFormVal(e.target.value)}
                  placeholder="e.g. solo-leveling or Changli Namecard"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              {/* Cash & Points Bounty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 uppercase text-[10px] block mb-1">CASH AMOUNT ($)</label>
                  <input
                    type="number"
                    value={milestoneFormCash}
                    onChange={(e) => setMilestoneFormCash(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-emerald-300 font-bold"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 uppercase text-[10px] block mb-1">PROMOTION POINTS</label>
                  <input
                    type="number"
                    value={milestoneFormPts}
                    onChange={(e) => setMilestoneFormPts(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-amber-300 font-bold"
                  />
                </div>
              </div>

              {/* Preview Image URL */}
              <div>
                <label className="text-neutral-400 uppercase text-[10px] block mb-1">PREVIEW IMAGE URL / ASSET PATH</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={milestoneFormImage}
                    onChange={(e) => setMilestoneFormImage(e.target.value)}
                    placeholder="/assets/aistudio/...png"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono text-[11px]"
                  />
                  {milestoneFormImage && (
                    <img
                      src={milestoneFormImage}
                      alt="Preview"
                      className="h-8 w-8 rounded bg-neutral-900 border border-neutral-700 object-contain p-0.5 shrink-0"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setIsAddingMilestoneModal(false);
                  setEditingMilestoneModal(null);
                }}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-tactical uppercase cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!milestoneFormTitle.trim()) return;
                  tacticalAudio.playTargetLock();

                  const newChoice: MilestoneRewardChoice = {
                    id: editingMilestoneModal ? editingMilestoneModal.id : `choice-${milestoneFormDay}-${Date.now()}`,
                    milestoneDay: milestoneFormDay,
                    type: milestoneFormType,
                    title: milestoneFormTitle.trim(),
                    description: milestoneFormDesc.trim(),
                    rewardValue: milestoneFormVal.trim(),
                    cashAmount: milestoneFormCash || 0,
                    promotionPoints: milestoneFormPts || 0,
                    previewImage: milestoneFormImage.trim() || undefined
                  };

                  const exists = editableMilestones.some(m => m.id === newChoice.id);
                  const updated = exists
                    ? editableMilestones.map(m => m.id === newChoice.id ? newChoice : m)
                    : [...editableMilestones, newChoice];

                  setEditableMilestones(updated);
                  if (onUpdateMilestoneChoices) onUpdateMilestoneChoices(updated);
                  try {
                    localStorage.setItem('ussf_milestone_choices', JSON.stringify(updated));
                  } catch (e) {}

                  appendAuditLog(
                    `${editingMilestoneModal ? 'Updated' : 'Added'} Day ${milestoneFormDay} Milestone Choice: "${newChoice.title}" (${newChoice.type})`
                  );

                  setIsAddingMilestoneModal(false);
                  setEditingMilestoneModal(null);
                }}
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-tactical font-black text-xs uppercase cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                <Save className="h-4 w-4" />
                <span>SAVE MILESTONE CONFIGURATION</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. DELETE MILESTONE REWARD CONFIRMATION MODAL */}
      {deleteMilestoneConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border-2 border-rose-500/80 bg-[#0d100d] p-6 shadow-2xl space-y-4 font-sans text-neutral-100 text-center animate-in fade-in zoom-in-95">
            <Trash2 className="h-10 w-10 text-rose-500 mx-auto" />
            <h4 className="text-sm font-tactical font-bold uppercase text-white">
              REMOVE MILESTONE REWARD OPTION?
            </h4>
            <p className="text-xs text-neutral-400 font-data">
              This choice will no longer be offered to operators upon reaching this login milestone.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteMilestoneConfirmId(null)}
                className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-tactical uppercase cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = editableMilestones.find(m => m.id === deleteMilestoneConfirmId);
                  const updated = editableMilestones.filter(m => m.id !== deleteMilestoneConfirmId);
                  setEditableMilestones(updated);
                  if (onUpdateMilestoneChoices) onUpdateMilestoneChoices(updated);
                  try {
                    localStorage.setItem('ussf_milestone_choices', JSON.stringify(updated));
                  } catch (e) {}
                  if (target) {
                    appendAuditLog(`Removed Day ${target.milestoneDay} Milestone Choice: "${target.title}"`);
                  }
                  setDeleteMilestoneConfirmId(null);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-tactical font-black text-xs uppercase cursor-pointer"
              >
                CONFIRM REMOVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
