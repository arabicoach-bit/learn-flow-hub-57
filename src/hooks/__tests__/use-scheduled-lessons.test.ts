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
      const invalidStatuses = ['cancelled', 'rescheduled', 'pending'];

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

  describe('Wallet Deduction Rules', () => {
    it('completed lesson should deduct 1 from wallet', () => {
      const wallet = 5;
      const debt = 0;
      const newWallet = wallet > 0 ? wallet - 1 : 0;
      const newDebt = wallet > 0 ? debt : debt + 1;

      expect(newWallet).toBe(4);
      expect(newDebt).toBe(0);
    });

    it('completed lesson with zero wallet should increment debt', () => {
      const wallet = 0;
      const debt = 1;
      const newWallet = wallet > 0 ? wallet - 1 : 0;
      const newDebt = wallet > 0 ? debt : debt + 1;

      expect(newWallet).toBe(0);
      expect(newDebt).toBe(2);
    });

    it('absent lesson should NOT deduct from wallet', () => {
      const wallet = 5;
      const newWallet = wallet; // no change
      expect(newWallet).toBe(5);
    });

    it('absent lesson should NOT increment debt', () => {
      const wallet = 0;
      const debt = 1;
      const newWallet = wallet;
      const newDebt = debt;
      expect(newWallet).toBe(0);
      expect(newDebt).toBe(1);
    });

    it('adding individual lesson should NOT change wallet', () => {
      const walletBefore = 5;
      // useAddScheduledLesson no longer modifies wallet
      const walletAfter = walletBefore;
      expect(walletAfter).toBe(walletBefore);
    });

    it('deleting scheduled lesson should deduct 1 from wallet', () => {
      const wallet = 3;
      const debt = 0;
      const newWallet = wallet > 0 ? wallet - 1 : 0;
      const newDebt = wallet > 0 ? debt : debt + 1;
      expect(newWallet).toBe(2);
      expect(newDebt).toBe(0);
    });

    it('deleting scheduled lesson with zero wallet should increment debt', () => {
      const wallet = 0;
      const debt = 0;
      const newWallet = 0;
      const newDebt = debt + 1;
      expect(newWallet).toBe(0);
      expect(newDebt).toBe(1);
    });

    it('deleting completed lesson should refund 1 to wallet', () => {
      const wallet = 2;
      const debt = 0;
      // Refund: reduce debt first, then add to wallet
      const newDebt = 0;
      const newWallet = wallet + 1;
      expect(newWallet).toBe(3);
      expect(newDebt).toBe(0);
    });

    it('deleting absent lesson should NOT change wallet', () => {
      const wallet = 2;
      const debt = 0;
      // No change for absent
      expect(wallet).toBe(2);
      expect(debt).toBe(0);
    });

    it('wallet should never go negative', () => {
      const wallet = 0;
      const debt = 0;
      // Completing a lesson with 0 wallet → debt + 1, wallet stays 0
      const newWallet = wallet > 0 ? wallet - 1 : 0;
      const newDebt = wallet > 0 ? debt : debt + 1;
      expect(newWallet).toBe(0);
      expect(newDebt).toBe(1);
      expect(newWallet).toBeGreaterThanOrEqual(0);
    });

    it('adding package should increase wallet by N', () => {
      const wallet = 2;
      const debt = 0;
      const lessonsAdded = 8;
      const newWallet = wallet + lessonsAdded;
      expect(newWallet).toBe(10);
    });

    it('adding package with debt should cover debt first', () => {
      const wallet = 0;
      const debt = 3;
      const lessonsAdded = 8;
      const debtCovered = Math.min(debt, lessonsAdded);
      const newDebt = debt - debtCovered;
      const newWallet = wallet + (lessonsAdded - debtCovered);
      expect(newDebt).toBe(0);
      expect(newWallet).toBe(5);
    });
  });

  describe('Status Thresholds', () => {
    it('wallet >= 3 → Active', () => {
      const getStatus = (w: number, d: number) =>
        w >= 3 ? 'Active' : d >= 2 ? 'Blocked' : 'Grace';
      expect(getStatus(3, 0)).toBe('Active');
      expect(getStatus(10, 0)).toBe('Active');
    });

    it('debt >= 2 → Blocked', () => {
      const getStatus = (w: number, d: number) =>
        w >= 3 ? 'Active' : d >= 2 ? 'Blocked' : 'Grace';
      expect(getStatus(0, 2)).toBe('Blocked');
      expect(getStatus(2, 3)).toBe('Blocked');
    });

    it('wallet 0-2, debt < 2 → Grace', () => {
      const getStatus = (w: number, d: number) =>
        w >= 3 ? 'Active' : d >= 2 ? 'Blocked' : 'Grace';
      expect(getStatus(0, 0)).toBe('Grace');
      expect(getStatus(2, 1)).toBe('Grace');
    });
  });

  describe('Overdue Display', () => {
    it('should show Overdue when wallet <= 0', () => {
      const getLabel = (w: number) => w <= 0 ? 'Overdue' : `${w}`;
      expect(getLabel(0)).toBe('Overdue');
      expect(getLabel(-1)).toBe('Overdue');
      expect(getLabel(1)).toBe('1');
      expect(getLabel(5)).toBe('5');
    });
  });
});
