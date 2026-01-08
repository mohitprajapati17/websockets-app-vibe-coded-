export interface ActiveSession {
    classId: string;
    startedAt: string;
    attendance: { [studentId: string]: string }; // "present" or other status
}

export let activeSession: ActiveSession | null = null;
export const setActiveSession = (session: ActiveSession | null) => {
    activeSession = session;
};
