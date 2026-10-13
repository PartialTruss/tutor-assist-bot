export const messages = {
  homeworkCollect: "Time to collect students' homework!",
  homeworkFollowUp: "Did you collect the homework?",
  homeworkUrgent: "URGENT: You still need to collect today's homework!",
  availability: "Check who is and isn't available for next week.",
  booking: "Check who hasn't booked their classes yet and reach out to them.",
  platformConfirm: "Inform students to confirm their classes on the platform.",
} as const;

export function homeworkFollowUpAck(date: string, collected: boolean): string {
  const verdict = collected
    ? `✅ Yes — homework for ${date} is marked as collected.`
    : `❌ No — homework for ${date} is still not collected.`;

  return `${messages.homeworkFollowUp}\n\n${verdict}`;
}
