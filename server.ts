import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  INITIAL_MEMBERS, 
  INITIAL_FIELD_REPORTS, 
  INITIAL_CLAIMS, 
  REALISTIC_REWARD_CATALOG,
  INITIAL_SOCIAL_POSTS,
  INITIAL_DMS,
  INITIAL_ACCOUNT_LINK_REQUESTS,
  INITIAL_RECRUITMENT_APPLICATIONS,
  INITIAL_FORGOT_PW_REQUESTS,
  INITIAL_ADMIN_EVENTS,
  DAILY_LOGIN_REWARDS_7,
  INITIAL_PENDING_LOGIN_CLAIMS,
  INITIAL_BIRTHDAY_GIFTS,
  INITIAL_PROMOTION_REQUESTS,
  INITIAL_SQUAD_GROUPS,
  USSF_GROUP_INFO,
  INITIAL_ACHIEVEMENTS,
  INITIAL_SKINS_AND_SHADERS,
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
  KAMADO_ADMIN_ACCOUNT
} from './src/data/ussfData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'ussf-database.json');

// Authoritative Database Schema
interface AuthoritativeDatabase {
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

function getCleanInitialDb(): AuthoritativeDatabase {
  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    members: [KAMADO_ADMIN_ACCOUNT],
    fieldReports: [],
    claims: [],
    rewardCatalog: REALISTIC_REWARD_CATALOG,
    socialPosts: [],
    dms: [],
    linkRequests: [],
    applications: [],
    forgotPwRequests: [],
    adminEvents: INITIAL_ADMIN_EVENTS,
    loginRewards: DAILY_LOGIN_REWARDS_7,
    pendingLoginClaims: [],
    promotionRequests: [],
    groupInfo: USSF_GROUP_INFO,
    birthdayGifts: [],
    squadGroups: INITIAL_SQUAD_GROUPS,
    achievements: INITIAL_ACHIEVEMENTS.map(a => ({ ...a, progress: 0, isUnlocked: false })),
    customAssets: INITIAL_SKINS_AND_SHADERS
  };
}

function loadDatabase(): AuthoritativeDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(data) as AuthoritativeDatabase;
      // Filter out any legacy dummy names if present (preserving Kamado admin account)
      const cleanedMembers = (parsed.members || []).filter(m => {
        const lowerName = (m.name || '').toLowerCase();
        const lowerId = (m.id || '').toLowerCase();
        return !lowerName.includes('realprince') && 
               !lowerName.includes('vance') && 
               !lowerName.includes('prince') && 
               !lowerName.includes('miller') &&
               !lowerName.includes('dummy') &&
               !lowerName.includes('test') &&
               !lowerId.includes('test');
      });

      // Ensure Kamado admin account is active in members
      if (!cleanedMembers.some(m => (m.name || '').toLowerCase() === 'kamado' || m.cid === 'SF-001')) {
        cleanedMembers.unshift(KAMADO_ADMIN_ACCOUNT);
      }
      parsed.members = cleanedMembers;

      // Ensure group specs are Level 4 with authentic Founders & Leaders
      parsed.groupInfo = {
        ...USSF_GROUP_INFO,
        ...(parsed.groupInfo || {}),
        level: 'L4',
        founder: 'HCMD-OneManArmy#USSF',
        coFounder: 'HCMD-Meliodas#USSF',
        commander: 'SCMD-Caminade#USSF',
        leaders: 'SCMD-Caminade#USSF, SLT-Kamado#USSF'
      };

      // Ensure exact reward catalog
      parsed.rewardCatalog = REALISTIC_REWARD_CATALOG;
      return parsed;
    }
  } catch (err) {
    console.error('Error reading database, creating fresh one:', err);
  }
  const fresh = getCleanInitialDb();
  saveDatabase(fresh);
  return fresh;
}

function saveDatabase(db: AuthoritativeDatabase): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving database:', err);
    return false;
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  let db = loadDatabase();

  // ===================== API ROUTES =====================

  // 1. Full Authoritative System State
  app.get('/api/state', (req, res) => {
    // Re-read DB from disk to ensure freshest multi-process view
    db = loadDatabase();
    res.json({
      success: true,
      data: db
    });
  });

  // 2. Members Management
  app.post('/api/members', (req, res) => {
    try {
      const member: USSFMember = req.body;
      if (!member || !member.id || !member.name) {
        return res.status(400).json({ success: false, error: 'Invalid member data. ID and name required.' });
      }
      db = loadDatabase();
      const existingIdx = db.members.findIndex(m => m.id === member.id || m.cid === member.cid);
      if (existingIdx >= 0) {
        db.members[existingIdx] = { ...db.members[existingIdx], ...member };
      } else {
        db.members.unshift(member);
      }
      saveDatabase(db);
      res.json({ success: true, member });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Server error saving member' });
    }
  });

  app.put('/api/members/:id', (req, res) => {
    try {
      const { id } = req.params;
      const updates: Partial<USSFMember> = req.body;
      db = loadDatabase();
      const idx = db.members.findIndex(m => m.id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Member not found' });
      }
      db.members[idx] = { ...db.members[idx], ...updates };
      saveDatabase(db);
      res.json({ success: true, member: db.members[idx] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Server error updating member' });
    }
  });

  app.delete('/api/members/:id', (req, res) => {
    try {
      const { id } = req.params;
      db = loadDatabase();
      const initialCount = db.members.length;
      db.members = db.members.filter(m => m.id !== id);
      if (db.members.length === initialCount) {
        return res.status(404).json({ success: false, error: 'Member not found to delete' });
      }
      saveDatabase(db);
      res.json({ success: true, message: 'Member deleted from authoritative database' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Server error deleting member' });
    }
  });

  // Member presence update
  app.post('/api/members/:id/presence', (req, res) => {
    try {
      const { id } = req.params;
      const { presenceStatus } = req.body;
      db = loadDatabase();
      const idx = db.members.findIndex(m => m.id === id);
      if (idx !== -1) {
        db.members[idx].presenceStatus = presenceStatus;
        if (presenceStatus === 'Offline') {
          db.members[idx].isOnlineCit = false;
        } else {
          db.members[idx].isOnlineCit = true;
        }
        saveDatabase(db);
      }
      res.json({ success: true, presenceStatus });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 3. Financial Claims
  app.post('/api/claims', (req, res) => {
    try {
      const claim: FinancialClaim = req.body;
      if (!claim || !claim.id || !claim.rewardTitle || !claim.claimantName || !claim.proofUrl) {
        return res.status(400).json({ success: false, error: 'All claim fields (title, claimant, proof) are required.' });
      }
      db = loadDatabase();
      db.claims.unshift(claim);
      saveDatabase(db);
      res.json({ success: true, claim });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.put('/api/claims/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { status, note } = req.body;
      db = loadDatabase();
      const claimIdx = db.claims.findIndex(c => c.id === id);
      if (claimIdx === -1) {
        return res.status(404).json({ success: false, error: 'Claim not found' });
      }
      const prevStatus = db.claims[claimIdx].status;
      db.claims[claimIdx].status = status;
      if (note) db.claims[claimIdx].note = note;

      // If approved, disburse payout to claimant member profile and grant 25 promotion points
      if (status === 'Approved' && prevStatus !== 'Approved') {
        const claimant = db.members.find(m => m.name === db.claims[claimIdx].claimantName || m.cid === db.claims[claimIdx].claimantCid);
        if (claimant) {
          claimant.totalPayout = (claimant.totalPayout || 0) + db.claims[claimIdx].amount;
          claimant.promotionPoints = (claimant.promotionPoints || 0) + 25;
        }
      }
      saveDatabase(db);
      res.json({ success: true, claim: db.claims[claimIdx] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 4. Field Reports (Patrol / Training)
  app.post('/api/reports', (req, res) => {
    try {
      const report: FieldReport = req.body;
      if (!report || !report.id || !report.title || !report.hostName) {
        return res.status(400).json({ success: false, error: 'Title and host name required.' });
      }
      db = loadDatabase();
      db.fieldReports.unshift(report);
      saveDatabase(db);
      res.json({ success: true, report });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.put('/api/reports/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      db = loadDatabase();
      const idx = db.fieldReports.findIndex(r => r.id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }
      const prevStatus = db.fieldReports[idx].status;
      db.fieldReports[idx].status = status;

      // If newly approved, credit patrol hours to host & participants
      if (status === 'Approved' && prevStatus !== 'Approved') {
        const report = db.fieldReports[idx];
        const host = db.members.find(m => m.name === report.hostName || m.cid === report.hostCid);
        if (host) {
          host.patrolHours = (host.patrolHours || 0) + (report.durationHours || 1);
          host.promotionPoints = (host.promotionPoints || 0) + 20;
        }
        for (const pName of report.participants || []) {
          const participant = db.members.find(m => m.name === pName.trim());
          if (participant) {
            participant.patrolHours = (participant.patrolHours || 0) + (report.durationHours || 1);
            participant.promotionPoints = (participant.promotionPoints || 0) + 10;
          }
        }
      }
      saveDatabase(db);
      res.json({ success: true, report: db.fieldReports[idx] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 5. Promotion Requests
  app.post('/api/promotions', (req, res) => {
    try {
      const promo: PromotionRequest = req.body;
      if (!promo || !promo.id || !promo.operatorName) {
        return res.status(400).json({ success: false, error: 'Invalid promotion request.' });
      }
      db = loadDatabase();
      db.promotionRequests.unshift(promo);
      saveDatabase(db);
      res.json({ success: true, promo });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.put('/api/promotions/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { status, approvingOfficer, feedback } = req.body;
      db = loadDatabase();
      const idx = db.promotionRequests.findIndex(p => p.id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Promotion request not found.' });
      }
      db.promotionRequests[idx].status = status;
      if (feedback) db.promotionRequests[idx].notes = feedback;

      // If approved, update member's rank and history!
      if (status === 'Approved') {
        const reqItem = db.promotionRequests[idx];
        const member = db.members.find(m => m.cid === reqItem.operatorCid || m.name === reqItem.operatorName);
        if (member) {
          member.rank = reqItem.targetRank;
          member.rankLevel = reqItem.targetRankLevel;
          if (member.promotionPoints >= reqItem.pointsCost) {
            member.promotionPoints -= reqItem.pointsCost;
          }
          if (!member.promotionHistory) member.promotionHistory = [];
          member.promotionHistory.unshift({
            id: `hist-${Date.now()}`,
            rankTitle: reqItem.targetRank,
            rankLevel: reqItem.targetRankLevel,
            timestamp: new Date().toISOString().split('T')[0],
            pointsUsed: reqItem.pointsCost,
            approvingOfficer: approvingOfficer || 'High Command Council',
            citation: feedback || 'Promoted via verified command review.'
          });
        }
      }
      saveDatabase(db);
      res.json({ success: true, promo: db.promotionRequests[idx] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 6. Recruitment Applications
  app.post('/api/applications', (req, res) => {
    try {
      const appItem: RecruitmentApplication = req.body;
      if (!appItem || !appItem.id || !appItem.applicantName) {
        return res.status(400).json({ success: false, error: 'Applicant name required.' });
      }
      db = loadDatabase();
      db.applications.unshift(appItem);
      saveDatabase(db);
      res.json({ success: true, application: appItem });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.put('/api/applications/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { status, reviewedBy, rejectionReason, cid } = req.body;
      db = loadDatabase();
      const idx = db.applications.findIndex(a => a.id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Application not found' });
      }
      db.applications[idx].status = status;
      if (rejectionReason || reviewedBy) {
        db.applications[idx].reviewerNotes = rejectionReason || `Reviewed by ${reviewedBy}`;
      }

      // If approved/accepted, create official recruit in members roster!
      if (status === 'Accepted' || status === 'Approved') {
        const applicant = db.applications[idx];
        const newMember: USSFMember = {
          id: `member-${Date.now()}`,
          cid: cid || `SF-${Math.floor(100 + Math.random() * 899)}`,
          name: applicant.applicantName,
          accountName: applicant.applicantName,
          callsign: `Operator-${applicant.applicantName.substring(0, 4)}`,
          rank: 'Recruit',
          rankLevel: 1,
          rankCategory: 'Regular Member',
          division: 'First Infantry Regiment',
          joinedDate: new Date().toISOString().split('T')[0],
          status: 'Active Duty',
          presenceStatus: 'Online',
          promotionPoints: 0,
          totalPayout: 0,
          arrestCount: 0,
          patrolHours: 0,
          playtimeHours: applicant.playtimeHours || 0,
          country: 'International',
          age: applicant.age,
          serviceRibbons: ['Enlistment Ribbon'],
          avatarUrl: '/src/assets/images/military_leader_training_1790341999734.jpg',
          avatarFrame: 'Standard Issue Border',
          namecard: 'CIT2 Law Enforcer',
          isMember: true,
          isApplicant: false
        };
        db.members.unshift(newMember);
      }
      saveDatabase(db);
      res.json({ success: true, application: db.applications[idx] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 7. Group Info & Announcements
  app.post('/api/group-info', (req, res) => {
    try {
      const info = req.body;
      db = loadDatabase();
      db.groupInfo = { ...db.groupInfo, ...info };
      saveDatabase(db);
      res.json({ success: true, groupInfo: db.groupInfo });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 8. Admin Events
  app.post('/api/admin-events', (req, res) => {
    try {
      const event: AdminEvent = req.body;
      db = loadDatabase();
      const existing = db.adminEvents.findIndex(e => e.id === event.id);
      if (existing >= 0) {
        db.adminEvents[existing] = event;
      } else {
        db.adminEvents.unshift(event);
      }
      saveDatabase(db);
      res.json({ success: true, event });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 9. Birthday Gifts
  app.post('/api/birthdays/gift', (req, res) => {
    try {
      const gift: BirthdayGift = req.body;
      db = loadDatabase();
      db.birthdayGifts.unshift(gift);
      // Credit birthday member if monetary gift
      const target = db.members.find(m => m.cid === gift.receiverCid || m.name === gift.receiverName);
      if (target) {
        target.totalPayout = (target.totalPayout || 0) + (gift.amount || 0);
      }
      saveDatabase(db);
      res.json({ success: true, gift });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 10. Social Posts
  app.post('/api/social-posts', (req, res) => {
    try {
      const post: SocialPost = req.body;
      db = loadDatabase();
      db.socialPosts.unshift(post);
      saveDatabase(db);
      res.json({ success: true, post });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 11. Achievements update
  app.post('/api/achievements/update', (req, res) => {
    try {
      const { achievements: newAchievements } = req.body;
      if (Array.isArray(newAchievements)) {
        db = loadDatabase();
        db.achievements = newAchievements;
        saveDatabase(db);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 12. Purge & Clean Database
  app.post('/api/reset-clean', (req, res) => {
    try {
      db = getCleanInitialDb();
      saveDatabase(db);
      res.json({ success: true, message: 'Authoritative database reset to clean production baseline.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // ===================== FRONTEND SERVING =====================
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[USSF SERVER] Authoritative Full-Stack Command Network online on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[USSF SERVER CRITICAL ERROR]', err);
  process.exit(1);
});
