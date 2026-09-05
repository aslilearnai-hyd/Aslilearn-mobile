import { API_BASE_URL } from './api-config';

export type StudentNotification = {
  _id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  read?: boolean;
};

export async function fetchStudentNotifications(token: string): Promise<StudentNotification[]> {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const [diaryRes, remarksRes] = await Promise.all([
    fetch(`${API_BASE_URL}/api/student/teacher-work-diary?limit=20`, { headers }),
    fetch(`${API_BASE_URL}/api/student/remarks`, { headers }),
  ]);

  const items: StudentNotification[] = [];

  if (diaryRes.ok) {
    const diaryJson = await diaryRes.json();
    const diary = Array.isArray(diaryJson.data) ? diaryJson.data : [];
    diary.forEach((entry: any) => {
      const teacher =
        typeof entry.teacherId === 'object'
          ? entry.teacherId?.fullName || 'Teacher'
          : 'Teacher';
      items.push({
        _id: `diary-${entry._id}`,
        title: `Teachers report — ${teacher}`,
        message: entry.summary || entry.workDone || entry.notes || entry.content || 'New class update',
        type: 'diary',
        createdAt: entry.forDate || entry.createdAt || new Date().toISOString(),
        read: false,
      });
    });
  }

  if (remarksRes.ok) {
    const remarksJson = await remarksRes.json();
    const remarks = Array.isArray(remarksJson.data) ? remarksJson.data : remarksJson.remarks || [];
    remarks.forEach((r: any) => {
      items.push({
        _id: `remark-${r._id}`,
        title: r.title || 'Teacher Remark',
        message: r.message || r.remark || r.content || '',
        type: 'remark',
        createdAt: r.createdAt || new Date().toISOString(),
        read: Boolean(r.isRead || r.read),
      });
    });
  }

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
