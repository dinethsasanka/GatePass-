export const LoadMoreButton = ({ onClick, loading, hasMore, currentCount, total }) => {
  if (!hasMore && currentCount >= total) {
    return (
      <div className="text-center p-4 space-y-2">
        <p className="text-gray-500">No more items to load</p>
        <p className="text-sm text-gray-400">Showing all {total} items</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-3">
      {total > 0 && (
        <p className="text-sm text-gray-600">
          Showing {currentCount} of {total} items
        </p>
      )}
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

export default LoadMoreButton;
