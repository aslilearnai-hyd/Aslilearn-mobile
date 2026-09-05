/** Whether the Vidya AI chatbot is enabled for the current user (student/teacher). AI tools may still be available when this is false. */
export function isVidyaEnabledForUser(user: { vidyaEnabled?: boolean } | null | undefined): boolean {
  return user?.vidyaEnabled !== false;
}
