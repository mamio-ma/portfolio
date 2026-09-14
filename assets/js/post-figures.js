// Equal-height image rows for blog posts (pairs with _plugins/post-figures.rb).
//
// A `.post-figure-row` starts out as equal-width columns (CSS `flex: 1 1 0`).
// Once an image is loaded we know its aspect ratio, so we set that ratio as the
// figure's flex-grow. With every figure at flex-basis 0, widths become
// proportional to the ratios, which makes all images in the row the same
// height without cropping (a 3:2 landscape gets 2x the width of a 3:4 portrait).
(function () {
  function applyRatio(img) {
    if (!img.naturalWidth || !img.naturalHeight) return; // broken or not loaded yet
    var figure = img.closest("figure.post-figure");
    if (!figure) return;
    figure.style.flexGrow = String(img.naturalWidth / img.naturalHeight);
  }

  function init() {
    var imgs = document.querySelectorAll(".post-figure-row figure.post-figure img");
    imgs.forEach(function (img) {
      if (img.complete) {
        applyRatio(img);
      } else {
        img.addEventListener("load", function () { applyRatio(img); }, { once: true });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
