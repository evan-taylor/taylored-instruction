export type ProfileWithUser = {
  id: string;
  isInstructor: boolean;
  lastLogin: string | null;
  shortId?: string;
  updatedAt: string | null;
  userEmail: string | null;
  userId: string;
};

export type LastLoginDisplay = {
  className: string;
  text: string;
};
