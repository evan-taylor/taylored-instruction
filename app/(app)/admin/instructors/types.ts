export type Alignment = {
  since: number;
};

export type ProfileWithUser = {
  id: string;
  userId: string;
  /** Teaches for us: assignable to our sessions. */
  isInstructor: boolean;
  /** Aligned with our Training Site; null when not. */
  alignment: Alignment | null;
  updatedAt: string | null;
  lastLogin: string | null;
  userEmail: string | null;
  userName?: string | null;
  shortId?: string;
};

export type LastLoginDisplay = {
  text: string;
  className: string;
};
