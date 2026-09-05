export interface ProfileWithUser {
  id: string;
  isInstructor: boolean;
  lastLogin: string | null;
  shortId?: string;
  updatedAt: string | null;
  userEmail: string | null;
  userId: string;
}

export interface LastLoginDisplay {
  className: string;
  text: string;
}
