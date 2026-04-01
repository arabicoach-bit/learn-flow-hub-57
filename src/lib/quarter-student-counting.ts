export interface QuarterStudentSnapshotInput {
  created_at: string | null;
  status: string | null;
  status_changed_at?: string | null;
  updated_at?: string | null;
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

function getStatusChangedTimestamp(student: QuarterStudentSnapshotInput) {
  return toTimestamp(student.status_changed_at) ?? toTimestamp(student.updated_at);
}

function wasCreatedBySnapshot(student: QuarterStudentSnapshotInput, snapshotTs: number) {
  const createdAtTs = toTimestamp(student.created_at);
  return createdAtTs !== null && createdAtTs <= snapshotTs;
}

export function countActiveStudentsAtSnapshot(
  students: QuarterStudentSnapshotInput[],
  snapshotDateTime: string,
) {
  const snapshotTs = toTimestamp(snapshotDateTime);

  if (snapshotTs === null) {
    return 0;
  }

  let active = 0;

  students.forEach((student) => {
    if (!wasCreatedBySnapshot(student, snapshotTs)) return;

    const currentStatus = student.status ?? 'Active';

    if (currentStatus === 'Temporary Stop' || currentStatus === 'Left') {
      const statusChangedAtTs = getStatusChangedTimestamp(student);

      if (statusChangedAtTs !== null && statusChangedAtTs <= snapshotTs) {
        return;
      }
    }

    active += 1;
  });

  return active;
}

export function countStudentStatusEventsInRange(
  students: QuarterStudentSnapshotInput[],
  rangeStartDateTime: string,
  rangeEndDateTime: string,
) {
  const startTs = toTimestamp(rangeStartDateTime);
  const endTs = toTimestamp(rangeEndDateTime);

  if (startTs === null || endTs === null) {
    return { stopped: 0, left: 0 };
  }

  let stopped = 0;
  let left = 0;

  students.forEach((student) => {
    if (!wasCreatedBySnapshot(student, endTs)) return;

    const statusChangedAtTs = getStatusChangedTimestamp(student);
    if (statusChangedAtTs === null || statusChangedAtTs < startTs || statusChangedAtTs > endTs) {
      return;
    }

    const currentStatus = student.status ?? 'Active';

    if (currentStatus === 'Temporary Stop') {
      stopped += 1;
      return;
    }

    if (currentStatus === 'Left') {
      left += 1;
    }
  });

  return { stopped, left };
}

export function countStudentsForPeriod(
  students: QuarterStudentSnapshotInput[],
  rangeStartDateTime: string,
  rangeEndDateTime: string,
): StudentStatusCounts {
  const active = countActiveStudentsAtSnapshot(students, rangeEndDateTime);
  const { stopped, left } = countStudentStatusEventsInRange(
    students,
    rangeStartDateTime,
    rangeEndDateTime,
  );

  return {
    active,
    stopped,
    left,
    total: active + stopped + left,
  };
}
