export interface QuarterStudentSnapshotInput {
  created_at: string | null;
  status: string | null;
  status_changed_at?: string | null;
}

export interface StudentStatusCounts {
  active: number;
  stopped: number;
  left: number;
  total: number;
}

function toTimestamp(value: string | null | undefined) {
  if (!value) return null;

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function countStudentsAtSnapshot(
  students: QuarterStudentSnapshotInput[],
  snapshotDateTime: string,
): StudentStatusCounts {
  const snapshotTs = toTimestamp(snapshotDateTime);

  if (snapshotTs === null) {
    return { active: 0, stopped: 0, left: 0, total: 0 };
  }

  let active = 0;
  let stopped = 0;
  let left = 0;

  students.forEach((student) => {
    const createdAtTs = toTimestamp(student.created_at);
    if (createdAtTs === null || createdAtTs > snapshotTs) return;

    const currentStatus = student.status ?? 'Active';
    const statusChangedAtTs = toTimestamp(student.status_changed_at);
    const statusIsEffective = statusChangedAtTs === null || statusChangedAtTs <= snapshotTs;

    if (currentStatus === 'Temporary Stop' && statusIsEffective) {
      stopped += 1;
      return;
    }

    if (currentStatus === 'Left' && statusIsEffective) {
      left += 1;
      return;
    }

    active += 1;
  });

  return {
    active,
    stopped,
    left,
    total: active + stopped + left,
  };
}