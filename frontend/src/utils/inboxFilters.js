export const INBOX_FILTER_TYPES = ["ALL", "IMAGE", "YOUTUBE", "TEXT", "PDF"];

export function filterAndSortInboxItems(items, filterType, searchQuery) {
  let result = Array.isArray(items) ? [...items] : [];

  if (filterType && filterType !== "ALL") {
    result = result.filter((item) => item.item_type === filterType);
  }

  if (searchQuery) {
    const normalizedQuery = searchQuery.toLowerCase();
    result = result.filter(
      (item) => item.title?.toLowerCase().includes(normalizedQuery) || item.content?.toLowerCase().includes(normalizedQuery)
    );
  }

  return result.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}
