import { 
  USSFMember, 
  FieldReport, 
  FinancialClaim, 
  RewardItem, 
  SocialPost, 
  DirectMessage, 
  AccountLinkRequest, 
  RecruitmentApplication, 
  ForgotPasswordRequest, 
  AdminEvent, 
  DailyLoginReward, 
  PendingLoginRewardClaim, 
  PromotionRequest, 
  BirthdayGift, 
  SquadGroupChat, 
  USSFAchievement, 
  USSFAssetItem,
  DiscordPresenceStatus,
  USSF_GROUP_INFO
} from '../data/ussfData';

export interface AuthoritativeSystemState {
  version: number;
  lastUpdated: string;
  members: USSFMember[];
  fieldReports: FieldReport[];
  claims: FinancialClaim[];
  rewardCatalog: RewardItem[];
  socialPosts: SocialPost[];
  dms: DirectMessage[];
  linkRequests: AccountLinkRequest[];
  applications: RecruitmentApplication[];
  forgotPwRequests: ForgotPasswordRequest[];
  adminEvents: AdminEvent[];
  loginRewards: DailyLoginReward[];
  pendingLoginClaims: PendingLoginRewardClaim[];
  promotionRequests: PromotionRequest[];
  groupInfo: typeof USSF_GROUP_INFO;
  birthdayGifts: BirthdayGift[];
  squadGroups: SquadGroupChat[];
  achievements: USSFAchievement[];
  customAssets: USSFAssetItem[];
}

export const api = {
  // 1. Fetch entire authoritative database state
  async getState(): Promise<AuthoritativeSystemState> {
    const res = await fetch('/api/state');
    if (!res.ok) {
      throw new Error(`Failed to fetch state: HTTP ${res.status}`);
    }
    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Invalid response from server');
    }
    return json.data;
  },

  // 2. Members Management
  async saveMember(member: USSFMember): Promise<USSFMember> {
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to save member to server');
    }
    return json.member;
  },

  async updateMember(id: string, updates: Partial<USSFMember>): Promise<USSFMember> {
    const res = await fetch(`/api/members/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update member');
    }
    return json.member;
  },

  async deleteMember(id: string): Promise<boolean> {
    const res = await fetch(`/api/members/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete member');
    }
    return true;
  },

  async updatePresence(id: string, presenceStatus: DiscordPresenceStatus): Promise<boolean> {
    const res = await fetch(`/api/members/${encodeURIComponent(id)}/presence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presenceStatus })
    });
    const json = await res.json();
    return Boolean(json.success);
  },

  // 3. Financial Claims
  async submitClaim(claim: FinancialClaim): Promise<FinancialClaim> {
    const res = await fetch('/api/claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(claim)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to record financial claim');
    }
    return json.claim;
  },

  async reviewClaim(id: string, status: string, note?: string): Promise<FinancialClaim> {
    const res = await fetch(`/api/claims/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update claim status');
    }
    return json.claim;
  },

  // 4. Field Reports
  async submitReport(report: FieldReport): Promise<FieldReport> {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to submit report');
    }
    return json.report;
  },

  async reviewReport(id: string, status: string): Promise<FieldReport> {
    const res = await fetch(`/api/reports/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update report status');
    }
    return json.report;
  },

  // 5. Promotions
  async submitPromotion(promo: PromotionRequest): Promise<PromotionRequest> {
    const res = await fetch('/api/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promo)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to submit promotion request');
    }
    return json.promo;
  },

  async reviewPromotion(id: string, status: string, approvingOfficer?: string, feedback?: string): Promise<PromotionRequest> {
    const res = await fetch(`/api/promotions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, approvingOfficer, feedback })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to review promotion request');
    }
    return json.promo;
  },

  // 6. Recruitment Applications
  async submitApplication(application: RecruitmentApplication): Promise<RecruitmentApplication> {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(application)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to submit enlistment application');
    }
    return json.application;
  },

  async reviewApplication(id: string, status: string, reviewedBy?: string, rejectionReason?: string): Promise<RecruitmentApplication> {
    const res = await fetch(`/api/applications/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewedBy, rejectionReason })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to review application');
    }
    return json.application;
  },

  // 7. Group Info
  async updateGroupInfo(info: any): Promise<any> {
    const res = await fetch('/api/group-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(info)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update group settings');
    }
    return json.groupInfo;
  },

  // 8. Admin Events
  async saveAdminEvent(event: AdminEvent): Promise<AdminEvent> {
    const res = await fetch('/api/admin-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to save admin event');
    }
    return json.event;
  },

  // 9. Birthday Gifts
  async sendBirthdayGift(gift: BirthdayGift): Promise<BirthdayGift> {
    const res = await fetch('/api/birthdays/gift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gift)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to send birthday gift');
    }
    return json.gift;
  },

  // 10. Social Posts
  async submitSocialPost(post: SocialPost): Promise<SocialPost> {
    const res = await fetch('/api/social-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to publish social post');
    }
    return json.post;
  },

  // 11. Reset Clean DB
  async resetCleanDatabase(): Promise<void> {
    const res = await fetch('/api/reset-clean', { method: 'POST' });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to reset database');
    }
  }
};
