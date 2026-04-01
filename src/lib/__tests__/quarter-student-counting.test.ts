import { describe, expect, it } from 'vitest';

import {
  countActiveStudentsAtSnapshot,
  countStudentsForPeriod,
} from '@/lib/quarter-student-counting';

describe('quarter student counting', () => {
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

  it('rolls only active students forward month to month', () => {
    expect(countStudentsForPeriod(students, '2026-03-01T00:00:00Z', '2026-03-31T23:59:59Z')).toEqual({
      active: 2,
      stopped: 0,
      left: 0,
      total: 2,
    });

    expect(countStudentsForPeriod(students, '2026-04-01T00:00:00Z', '2026-04-30T23:59:59Z')).toEqual({
      active: 2,
      stopped: 1,
      left: 0,
      total: 3,
    });

    expect(countStudentsForPeriod(students, '2026-05-01T00:00:00Z', '2026-05-31T23:59:59Z')).toEqual({
      active: 1,
      stopped: 0,
      left: 1,
      total: 2,
    });

    expect(countStudentsForPeriod(students, '2026-06-01T00:00:00Z', '2026-06-30T23:59:59Z')).toEqual({
      active: 1,
      stopped: 0,
      left: 0,
      total: 1,
    });
  });

  it('counts stop and left only once inside the quarter where they happened', () => {
    expect(countStudentsForPeriod(students, '2026-04-01T00:00:00Z', '2026-06-30T23:59:59Z')).toEqual({
      active: 1,
      stopped: 1,
      left: 1,
      total: 3,
    });

    expect(countStudentsForPeriod(students, '2026-07-01T00:00:00Z', '2026-09-30T23:59:59Z')).toEqual({
      active: 1,
      stopped: 0,
      left: 0,
      total: 1,
    });
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

    expect(countStudentsForPeriod(legacy, '2026-03-01T00:00:00Z', '2026-03-31T23:59:59Z')).toEqual({
      active: 1,
      stopped: 0,
      left: 0,
      total: 1,
    });

    expect(countStudentsForPeriod(legacy, '2026-04-01T00:00:00Z', '2026-04-30T23:59:59Z')).toEqual({
      active: 0,
      stopped: 1,
      left: 0,
      total: 1,
    });
  });

  it('treats legacy inactive rows with no change date as active until we know the event month', () => {
    const noDate = [
      {
        created_at: '2026-01-01T10:00:00Z',
        status: 'Left',
        status_changed_at: null,
        updated_at: null,
      },
    ];

    expect(countActiveStudentsAtSnapshot(noDate, '2026-03-31T23:59:59Z')).toBe(1);
    expect(countStudentsForPeriod(noDate, '2026-03-01T00:00:00Z', '2026-03-31T23:59:59Z')).toEqual({
      active: 1,
      stopped: 0,
      left: 0,
      total: 1,
    });
  });
});
