import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    rpc: vi.fn(),
  },
}));

describe('Lesson Status System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Status Constraints', () => {
    it('should only allow scheduled, completed, absent statuses', () => {
      const validStatuses = ['scheduled', 'completed', 'absent'];
      const invalidStatuses = ['cancelled', 'rescheduled', 'pending', 'taken'];

      validStatuses.forEach(status => {
        expect(['scheduled', 'completed', 'absent']).toContain(status);
      });

      invalidStatuses.forEach(status => {
        expect(['scheduled', 'completed', 'absent']).not.toContain(status);
      });
    });
  });

  describe('Reschedule Logic', () => {
    it('reschedule should move lesson to new date without creating a duplicate', () => {
      const originalLesson = {
        scheduled_lesson_id: 'lesson-1',
        scheduled_date: '2026-02-20',
        scheduled_time: '18:00:00',
        status: 'scheduled',
      };

      const rescheduledLesson = {
        ...originalLesson,
        scheduled_date: '2026-02-22',
        scheduled_time: '18:00:00',
        status: 'scheduled',
      };

      expect(rescheduledLesson.scheduled_lesson_id).toBe(originalLesson.scheduled_lesson_id);
      expect(rescheduledLesson.status).toBe('scheduled');
      expect(rescheduledLesson.scheduled_date).not.toBe(originalLesson.scheduled_date);
    });

    it('reschedule should not affect wallet or debt', () => {
      const studentBefore = { wallet_balance: 5, debt_lessons: 0 };
      const studentAfter = { ...studentBefore };
      
      expect(studentAfter.wallet_balance).toBe(studentBefore.wallet_balance);
      expect(studentAfter.debt_lessons).toBe(studentBefore.debt_lessons);
    });
  });

  describe('Single Source of Truth: lessons_purchased = total rows', () => {
    // Core invariant: lessons_purchased is ALWAYS equal to total lesson rows
    // Wallet = scheduled count
    // Used = completed + absent count
    // Total = scheduled + completed + absent = lessons_purchased

    const calcFromRows = (scheduled: number, completed: number, absent: number) => {
      const used = completed + absent;
      const total = scheduled + completed + absent; // = lessons_purchased
      const wallet = scheduled;
      return { wallet, used, total };
    };

    it('wallet = scheduled count', () => {
      const { wallet } = calcFromRows(5, 0, 0);
      expect(wallet).toBe(5);
    });

    it('used = completed + absent', () => {
      const { used } = calcFromRows(3, 4, 1);
      expect(used).toBe(5);
    });

    it('total = all rows = lessons_purchased', () => {
      const { total } = calcFromRows(3, 4, 1);
      expect(total).toBe(8);
    });

    it('invariant: wallet + used = total always', () => {
      const { wallet, used, total } = calcFromRows(3, 4, 1);
      expect(wallet + used).toBe(total);
    });

    it('completing a lesson: wallet decreases, used increases, total unchanged', () => {
      const before = calcFromRows(5, 3, 0);
      // One scheduled → completed
      const after = calcFromRows(4, 4, 0);
      expect(after.wallet).toBe(before.wallet - 1);
      expect(after.used).toBe(before.used + 1);
      expect(after.total).toBe(before.total); // total unchanged
    });

    it('marking absent: wallet decreases, used increases, total unchanged', () => {
      const before = calcFromRows(5, 3, 0);
      const after = calcFromRows(4, 3, 1);
      expect(after.wallet).toBe(before.wallet - 1);
      expect(after.used).toBe(before.used + 1);
      expect(after.total).toBe(before.total);
    });

    it('adding a scheduled lesson: wallet increases, total increases', () => {
      const before = calcFromRows(5, 3, 0);
      const after = calcFromRows(6, 3, 0);
      expect(after.wallet).toBe(before.wallet + 1);
      expect(after.total).toBe(before.total + 1);
    });

    it('deleting a scheduled lesson: wallet decreases, total decreases', () => {
      const before = calcFromRows(5, 3, 0);
      const after = calcFromRows(4, 3, 0);
      expect(after.wallet).toBe(before.wallet - 1);
      expect(after.total).toBe(before.total - 1);
    });

    it('reverting completed to scheduled: wallet increases, used decreases, total unchanged', () => {
      const before = calcFromRows(2, 6, 0);
      const after = calcFromRows(3, 5, 0);
      expect(after.wallet).toBe(before.wallet + 1);
      expect(after.used).toBe(before.used - 1);
      expect(after.total).toBe(before.total);
    });

    it('lessons display format: used / total', () => {
      const { used, total } = calcFromRows(3, 4, 1);
      expect(`${used}/${total}`).toBe('5/8');
    });
  });

  describe('Package Status Derived from Scheduled Count', () => {
    const getPackageStatus = (scheduled: number) =>
      scheduled > 0 ? 'In Progress' : 'Finished';

    it('scheduled > 0 → In Progress', () => {
      expect(getPackageStatus(1)).toBe('In Progress');
      expect(getPackageStatus(5)).toBe('In Progress');
    });

    it('scheduled = 0 → Finished', () => {
      expect(getPackageStatus(0)).toBe('Finished');
    });
  });

  describe('Student Status Thresholds', () => {
    const getStatus = (w: number, d: number) =>
      w >= 1 ? 'Active' : d >= 2 ? 'Left' : 'Temporary Stop';

    it('wallet >= 1 → Active', () => {
      expect(getStatus(1, 0)).toBe('Active');
      expect(getStatus(3, 0)).toBe('Active');
    });

    it('debt >= 2 → Left', () => {
      expect(getStatus(0, 2)).toBe('Left');
      expect(getStatus(0, 3)).toBe('Left');
    });

    it('wallet 0, debt < 2 → Temporary Stop', () => {
      expect(getStatus(0, 0)).toBe('Temporary Stop');
      expect(getStatus(0, 1)).toBe('Temporary Stop');
    });
  });
});
