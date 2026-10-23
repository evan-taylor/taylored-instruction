export const DEFAULT_CONFIRMATION = {
  subject: "Registration confirmed: {{courseTitle}}",
  body: "Hi {{attendeeName}}, your place is confirmed. Your class details are below. Please review your materials before class.",
};

export function defaultConfirmation(selfPaced: boolean) {
  return {
    ...DEFAULT_CONFIRMATION,
    body: selfPaced
      ? "Hi {{attendeeName}}, your place is confirmed. This is a self-paced course. Open your registration to access the available course materials."
      : DEFAULT_CONFIRMATION.body,
  };
}
