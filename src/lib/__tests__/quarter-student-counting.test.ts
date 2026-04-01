import { describe, expect, it } from 'vitest';

import { countStudentsAtSnapshot } from '@/lib/quarter-student-counting';

describe('countStudentsAtSnapshot', () => {
  const students = [
    {
      created_at: '2026-03-10T10:00:00Z',
      status: 'Active',
      status_changed_at: '2026-03-10T10:00:00Z',
    },
    {
      created_at: '2026-03-12T10:00:00Z',
      status: 'Temporary Stop',
      status_changed_at: '2026-04-15T10:00:00Z',
    },
    {
      created_at: '2026-04-05T10:00:00Z',
      status: 'Left',
      status_changed_at: '2026-05-20T10:00:00Z',
    },
  ];

  it('rolls active students forward month to month until a status change happens', () => {
    expect(countStudentsAtSnapshot(students, '2026-03-31T23:59:59Z')).toEqual({
      active: 2,
      stopped: 0,
      left: 0,
      total: 2,
    });

    expect(countStudentsAtSnapshot(students, '2026-04-30T23:59:59Z')).toEqual({
      active: 2,
      stopped: 1,
      left: 0,
      total: 3,
    });
  });

  it('keeps stopped and left students inside the total after their status becomes effective', () => {
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
});