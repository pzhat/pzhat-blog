// Image zoom with medium-zoom
document.addEventListener('DOMContentLoaded', function() {
  if (typeof mediumZoom !== 'undefined') {
    mediumZoom('.post-content img', {
      margin: 24,
      background: 'rgba(0, 0, 0, 0.8)',
      scrollOffset: 0,
    });
  }
});
