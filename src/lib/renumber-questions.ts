/** Assign 1..n display numbers within a question list (ignores broken stored numbers). */
export function renumberQuestionList<T extends { questionNumber?: number }>(questions: T[]): T[] {
  return questions.map((q, i) => ({ ...q, questionNumber: i + 1 }));
}

/** Per-section 1..n renumbering for worksheet / practice / exam section lists. */
export function renumberSectionQuestionLists<T extends { questions: Array<{ questionNumber?: number }> }>(
  sections: T[],
): T[] {
  return sections.map((sec) => ({
    ...sec,
    questions: renumberQuestionList(sec.questions || []),
  }));
}

/** Display serial for UI: always use list position, not stored question_number. */
export function displayQuestionSerial(index: number): number {
  return index + 1;
}
