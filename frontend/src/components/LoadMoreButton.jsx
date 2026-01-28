export const LoadMoreButton = ({ onClick, loading, hasMore }) => {
  if (!hasMore) {
    return (
      <div className="text-center p-4 text-gray-500">
        No more items to load
      </div>
    );
  }
  
  return (
    <div className="flex justify-center p-6">
      <button
        onClick={onClick}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Loading...
          </span>
        ) : (
          "Load More"
        )}
      </button>
    </div>
  );
};
