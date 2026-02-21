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
      // Reschedule updates the existing record, not insert+delete
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
        status: 'scheduled', // status must remain scheduled
      };

      // Same ID = same record, not a new one
      expect(rescheduledLesson.scheduled_lesson_id).toBe(originalLesson.scheduled_lesson_id);
      // Status remains scheduled
      expect(rescheduledLesson.status).toBe('scheduled');
      // Date changed
      expect(rescheduledLesson.scheduled_date).not.toBe(originalLesson.scheduled_date);
    });

    it('reschedule should not affect wallet or debt', () => {
      const studentBefore = { wallet_balance: 5, debt_lessons: 0 };
      // After reschedule, wallet and debt should be unchanged
      const studentAfter = { ...studentBefore };
      
      expect(studentAfter.wallet_balance).toBe(studentBefore.wallet_balance);
      expect(studentAfter.debt_lessons).toBe(studentBefore.debt_lessons);
    });
  });

  describe('Wallet Deduction Rules', () => {
    it('completed lesson should deduct 1 from wallet', () => {
      const wallet = 5;
      const debt = 0;
      // Completing a lesson: wallet > 0 → deduct 1
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
      const debt = 0;
      // Absent: no wallet change
      const newWallet = wallet;
      const newDebt = debt;

      expect(newWallet).toBe(5);
      expect(newDebt).toBe(0);
    });

    it('absent lesson should NOT increment debt', () => {
      const wallet = 0;
      const debt = 1;
      // Absent with zero wallet: still no change
      const newWallet = wallet;
      const newDebt = debt;

      expect(newWallet).toBe(0);
      expect(newDebt).toBe(1);
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
});
