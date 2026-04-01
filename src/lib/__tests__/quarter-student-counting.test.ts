import { describe, expect, it } from 'vitest';

import { countStudentsAtSnapshot } from '@/lib/quarter-student-counting';

describe('countStudentsAtSnapshot', () => {
  const students = [
    {
      created_at: '2026-03-10T10:00:00Z',
      status: 'Active',
      status_changed_at: '2026-03-10T10:00:00Z',
      updated_at: '2026-03-10T10:00:00Z',
    },
    {
      created_at: '2026-03-12T10:00:00Z',
      status: 'Temporary Stop',
      status_changed_at: '2026-04-15T10:00:00Z',
      updated_at: '2026-04-15T10:00:00Z',
    },
    {
      created_at: '2026-04-05T10:00:00Z',
      status: 'Left',
      status_changed_at: '2026-05-20T10:00:00Z',
      updated_at: '2026-05-20T10:00:00Z',
    },
  ];

  it('rolls active students forward month to month until a status change happens', () => {
    // March: student 1 active, student 2 created but stop not effective yet → active
    expect(countStudentsAtSnapshot(students, '2026-03-31T23:59:59Z')).toEqual({
      active: 2,
      stopped: 0,
      left: 0,
      total: 2,
    });

    // April: student 2 stopped on Apr 15, student 3 joined but left not effective yet → active
    expect(countStudentsAtSnapshot(students, '2026-04-30T23:59:59Z')).toEqual({
      active: 2,
      stopped: 1,
      left: 0,
      total: 3,
    });
  });

  it('keeps stopped and left students inside the total after their status becomes effective', () => {
    // May: student 3 left on May 20
    expect(countStudentsAtSnapshot(students, '2026-05-31T23:59:59Z')).toEqual({
      active: 1,
      stopped: 1,
      left: 1,
      total: 3,
    });
  });

  it('always keeps total equal to active plus stopped plus left', () => {
    const result = countStudentsAtSnapshot(students, '2026-06-30T23:59:59Z');
    expect(result.total).toBe(result.active + result.stopped + result.left);
  });

  it('uses updated_at as fallback when status_changed_at is null', () => {
    const legacy = [
      {
        created_at: '2026-01-01T10:00:00Z',
        status: 'Temporary Stop',
        status_changed_at: null,
        updated_at: '2026-04-10T10:00:00Z',
      },
    ];
    // March snapshot: stop happened in April via updated_at → still Active
    expect(countStudentsAtSnapshot(legacy, '2026-03-31T23:59:59Z')).toEqual({
      active: 1, stopped: 0, left: 0, total: 1,
    });
    // April snapshot: stop is now effective
    expect(countStudentsAtSnapshot(legacy, '2026-04-30T23:59:59Z')).toEqual({
      active: 0, stopped: 1, left: 0, total: 1,
    });
  });

  it('treats student with no dates as active (cannot determine when status changed)', () => {
    const noDate = [
      {
        created_at: '2026-01-01T10:00:00Z',
        status: 'Left',
        status_changed_at: null,
        updated_at: null,
      },
    ];
    // No status_changed_at or updated_at → we can't pin when they left, count as active
    expect(countStudentsAtSnapshot(noDate, '2026-03-31T23:59:59Z')).toEqual({
      active: 1, stopped: 0, left: 0, total: 1,
    });
  });
});
