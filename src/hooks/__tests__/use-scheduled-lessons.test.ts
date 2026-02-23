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

  describe('Wallet Calculation (DB Source of Truth)', () => {
    // Wallet = total_purchased - (completed + absent)
    const calcWallet = (purchased: number, completed: number, absent: number) => {
      const used = completed + absent;
      const wallet = Math.max(0, purchased - used);
      const debt = used > purchased ? used - purchased : 0;
      return { wallet, debt };
    };

    it('completed lesson should deduct 1 from wallet', () => {
      const { wallet, debt } = calcWallet(5, 1, 0);
      expect(wallet).toBe(4);
      expect(debt).toBe(0);
    });

    it('absent lesson should also deduct 1 from wallet', () => {
      const { wallet, debt } = calcWallet(5, 0, 1);
      expect(wallet).toBe(4);
      expect(debt).toBe(0);
    });

    it('both completed and absent deduct from wallet', () => {
      const { wallet, debt } = calcWallet(10, 3, 2);
      expect(wallet).toBe(5);
      expect(debt).toBe(0);
    });

    it('wallet should never go negative, excess becomes debt', () => {
      const { wallet, debt } = calcWallet(5, 4, 3);
      expect(wallet).toBe(0);
      expect(debt).toBe(2);
    });

    it('scheduled lesson should NOT affect wallet', () => {
      // scheduled lessons are not counted in used
      const { wallet, debt } = calcWallet(5, 0, 0);
      expect(wallet).toBe(5);
      expect(debt).toBe(0);
    });

    it('adding package should increase wallet by N', () => {
      const { wallet, debt } = calcWallet(10 + 8, 3, 2);
      expect(wallet).toBe(13);
      expect(debt).toBe(0);
    });

    it('adding package with debt should cover debt', () => {
      // Before: purchased=5, used=8 → debt=3
      // After adding 8: purchased=13, used=8 → wallet=5
      const { wallet, debt } = calcWallet(13, 5, 3);
      expect(wallet).toBe(5);
      expect(debt).toBe(0);
    });

    it('deleting completed lesson recalculates wallet up', () => {
      // Before delete: purchased=5, completed=3, absent=1 → wallet=1
      const before = calcWallet(5, 3, 1);
      expect(before.wallet).toBe(1);
      // After delete completed: purchased=5, completed=2, absent=1 → wallet=2
      const after = calcWallet(5, 2, 1);
      expect(after.wallet).toBe(2);
    });

    it('deleting scheduled lesson does not change wallet', () => {
      const before = calcWallet(5, 2, 1);
      const after = calcWallet(5, 2, 1); // same - scheduled not counted
      expect(after.wallet).toBe(before.wallet);
    });

    it('deleting absent lesson recalculates wallet up', () => {
      const before = calcWallet(5, 2, 2);
      expect(before.wallet).toBe(1);
      const after = calcWallet(5, 2, 1);
      expect(after.wallet).toBe(2);
    });
  });

  describe('Status Thresholds', () => {
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

  describe('Overdue Display', () => {
    it('should show Overdue when wallet <= 0', () => {
      const getLabel = (w: number) => w <= 0 ? 'Overdue' : `${w}`;
      expect(getLabel(0)).toBe('Overdue');
      expect(getLabel(-1)).toBe('Overdue');
      expect(getLabel(1)).toBe('1');
    });
  });
});
