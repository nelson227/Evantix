// ==================== ENUMS ====================

export enum UserRole {
  MEMBER = 'member',
  LEADER = 'leader',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

export enum PublicationType {
  PAST_OUTREACH = 'past_outreach',
  FUTURE_EVENT = 'future_event',
}

export enum PublicationStatus {
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
  EXPIRED = 'expired',
}

export enum GoalStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

export enum GoalMetricType {
  PEOPLE_MET = 'people_met',
  PEOPLE_PREACHED = 'people_preached',
  PEOPLE_PRAYED_FOR = 'people_prayed_for',
  BOOKS_DISTRIBUTED_TOTAL = 'books_distributed_total',
  TRACTS_DISTRIBUTED_TOTAL = 'tracts_distributed_total',
  OUTINGS_COMPLETED = 'outings_completed',
  EVENTS_CREATED = 'events_created',
}

export enum NotificationType {
  PUBLICATION_LIKED = 'publication_liked',
  PUBLICATION_COMMENTED = 'publication_commented',
  GOAL_MILESTONE = 'goal_milestone',
  MESSAGE_RECEIVED = 'message_received',
  EVENT_REMINDER = 'event_reminder',
  MODERATION_ACTION = 'moderation_action',
}

export enum ReportReasonCode {
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
  SPAM = 'SPAM',
  HARASSMENT = 'HARASSMENT',
  FALSE_INFORMATION = 'FALSE_INFORMATION',
  OTHER = 'OTHER',
}

export enum BackfillMode {
  NONE = 'none',
  INCLUDE_EXISTING_IN_RANGE = 'include_existing_in_range',
}

// ==================== INTERFACES ====================

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  city?: string;
  country?: string;
  ministryName?: string;
  favoriteBibleVerse?: string;
  joinedAt: string;
}

export interface PublicationStats {
  peopleMet: number;
  peoplePreached: number;
  peoplePrayedFor: number;
  booksDistributedTotal: number;
  tractsDistributedTotal: number;
  housesVisited?: number;
  neighborhoodsCovered?: number;
  teamSize?: number;
}

export interface MaterialBreakdown {
  title: string;
  quantity: number;
}

export interface PublicationMedia {
  id: string;
  url: string;
  width?: number;
  height?: number;
}

export interface Publication {
  id: string;
  type: PublicationType;
  author: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  title?: string;
  narrativeText: string;
  locationName?: string;
  outreachDate?: string;
  eventStartAt?: string;
  eventEndAt?: string;
  stats?: PublicationStats;
  media: PublicationMedia[];
  counters: {
    likesCount: number;
    commentsCount: number;
    savesCount: number;
    sharesCount: number;
  };
  viewerState?: {
    liked: boolean;
    saved: boolean;
    canEdit: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  metricType: GoalMetricType;
  targetValue: number;
  currentValue: number;
  startDate: string;
  endDate: string;
  status: GoalStatus;
  progressPercent: number;
  remainingValue: number;
  description?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participant: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  lastMessage?: {
    body: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt?: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  readAt?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
}

export interface DashboardSummary {
  publicationsCount: number;
  peopleMetTotal: number;
  peoplePrachedTotal: number;
  peoplePrayedForTotal: number;
  booksDistributedTotal: number;
  tractsDistributedTotal: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
