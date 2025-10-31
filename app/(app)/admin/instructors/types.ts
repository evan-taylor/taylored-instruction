export type ProfileWithUser = {
  id: string;
  userId: string;
  isInstructor: boolean;
  updatedAt: string | null;
  lastLogin: string | null;
  userEmail: string | null;
  shortId?: string;
};

export type LastLoginDisplay = {
  text: string;
  className: string;
};
