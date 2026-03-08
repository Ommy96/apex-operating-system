import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '@/hooks/usePagination';

function makeItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
}

describe('usePagination', () => {
  describe('basic pagination', () => {
    it('returns first page of items by default', () => {
      const items = makeItems(50);
      const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }));

      expect(result.current.currentPage).toBe(1);
      expect(result.current.pageSize).toBe(10);
      expect(result.current.totalPages).toBe(5);
      expect(result.current.totalItems).toBe(50);
      expect(result.current.paginatedItems).toHaveLength(10);
      expect(result.current.paginatedItems[0]).toEqual({ id: 1, name: 'Item 1' });
      expect(result.current.paginatedItems[9]).toEqual({ id: 10, name: 'Item 10' });
    });

    it('calculates correct start/end indices', () => {
      const items = makeItems(50);
      const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }));

      expect(result.current.startIndex).toBe(0);
      expect(result.current.endIndex).toBe(10);
    });

    it('handles empty items', () => {
      const { result } = renderHook(() => usePagination([], { initialPageSize: 10 }));

      expect(result.current.currentPage).toBe(1);
      expect(result.current.totalPages).toBe(1);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.paginatedItems).toHaveLength(0);
    });

    it('handles items less than page size', () => {
      const items = makeItems(5);
      const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }));

      expect(result.current.totalPages).toBe(1);
      expect(result.current.paginatedItems).toHaveLength(5);
      expect(result.current.canGoNext).toBe(false);
      expect(result.current.canGoPrevious).toBe(false);
    });
  });

  describe('navigation', () => {
    it('goToNextPage advances to next page', () => {
      const items = makeItems(30);
      const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }));

      act(() => result.current.goToNextPage());

      expect(result.current.currentPage).toBe(2);
      expect(result.current.paginatedItems[0]).toEqual({ id: 11, name: 'Item 11' });
    });

    it('goToPreviousPage goes back', () => {
      const items = makeItems(30);
      const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }));

      act(() => result.current.setCurrentPage(3));
      act(() => result.current.goToPreviousPage());

      expect(result.current.currentPage).toBe(2);
    });

    it('goToFirstPage resets to page 1', () => {
      const items = makeItems(30);
      const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }));

      act(() => result.current.setCurrentPage(3));
      act(() => result.current.goToFirstPage());

      expect(result.current.currentPage).toBe(1);
    });

    it('goToLastPage jumps to last page', () => {
      const items = makeItems(30);
      const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }));

      act(() => result.current.goToLastPage());

      expect(result.current.currentPage).toBe(3);
      expect(result.current.paginatedItems).toHaveLength(10);
    });

    it('does not go past last page', () => {
      const items = makeItems(30);
      const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }));

      act(() => result.current.setCurrentPage(3));
      act(() => result.current.goToNextPage());

      expect(result.current.currentPage).toBe(3);
    });

    it('does not go below page 1', () => {
      const items = makeItems(30);
      const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }));

      act(() => result.current.goToPreviousPage());

      expect(result.current.currentPage).toBe(1);
    });
  });

  describe('canGoNext / canGoPrevious', () => {
    it('canGoNext is true when not on last page', () => {
      const items = makeItems(30);
      const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }));

      expect(result.current.canGoNext).toBe(true);
      expect(result.current.canGoPrevious).toBe(false);
    });

    it('canGoPrevious is true when not on first page', () => {
      const items = makeItems(30);
      const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }));

      act(() => result.current.setCurrentPage(2));

      expect(result.current.canGoNext).toBe(true);
      expect(result.current.canGoPrevious).toBe(true);
    });

    it('canGoNext is false on last page', () => {
      const items = makeItems(30);
      const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }));

      act(() => result.current.setCurrentPage(3));

      expect(result.current.canGoNext).toBe(false);
      expect(result.current.canGoPrevious).toBe(true);
    });
  });

  describe('page size changes', () => {
    it('setPageSize resets to page 1', () => {
      const items = makeItems(100);
      const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }));

      act(() => result.current.setCurrentPage(5));
      act(() => result.current.setPageSize(25));

      expect(result.current.currentPage).toBe(1);
      expect(result.current.pageSize).toBe(25);
      expect(result.current.totalPages).toBe(4);
      expect(result.current.paginatedItems).toHaveLength(25);
    });
  });

  describe('edge cases', () => {
    it('clamps page when items shrink', () => {
      const items50 = makeItems(50);
      const items5 = makeItems(5);
      const { result, rerender } = renderHook(
        ({ items }) => usePagination(items, { initialPageSize: 10 }),
        { initialProps: { items: items50 } }
      );

      act(() => result.current.setCurrentPage(5));
      expect(result.current.currentPage).toBe(5);

      rerender({ items: items5 });
      // safePage should clamp to 1
      expect(result.current.currentPage).toBe(1);
      expect(result.current.paginatedItems).toHaveLength(5);
    });

    it('handles last page with partial items', () => {
      const items = makeItems(23);
      const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }));

      act(() => result.current.setCurrentPage(3));

      expect(result.current.paginatedItems).toHaveLength(3);
      expect(result.current.startIndex).toBe(20);
      expect(result.current.endIndex).toBe(23);
    });

    it('exposes pageSizeOptions from config', () => {
      const items = makeItems(10);
      const { result } = renderHook(() =>
        usePagination(items, { pageSizeOptions: [5, 15, 30] })
      );

      expect(result.current.pageSizeOptions).toEqual([5, 15, 30]);
    });
  });
});
