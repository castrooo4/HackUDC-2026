export const INBOX_FILTER_TYPES = ["ALL", "IMAGE", "YOUTUBE", "TEXT", "PDF"];

export function filterAndSortInboxItems(items, filterType, searchQuery) {
  let result = Array.isArray(items) ? [...items] : [];

  if (filterType && filterType !== "ALL") {
    result = result.filter((item) => item.item_type === filterType);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter((item) => item.title?.toLowerCase().includes(q) || item.content?.toLowerCase().includes(q));
  }

  return result.sort((a, b) => {
    // 1. Primero ordenamos por si están anclados (true va antes que false)
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;

    // 2. Si ambos están anclados o ambos no lo están, ordenamos por fecha
    return new Date(b.created_at) - new Date(a.created_at);
  });
}