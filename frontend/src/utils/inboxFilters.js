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

  return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}
