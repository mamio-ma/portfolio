# Turn standalone Markdown images in blog posts into captioned figures.
#
#   ![](/img/a.png "Example workflow")        -> <figure class="post-figure"><img ...><figcaption>Example workflow</figcaption></figure>
#   ![](/img/a.png "Example workflow @60%")   -> same, but the figure is 60% wide and centered
#   ![Alt text](/img/a.png)                   -> caption falls back to the alt text
#
# Only paragraphs that contain nothing but one <img> are rewritten, so inline
# images and linked images are left untouched. Runs after Markdown rendering.

module PostFigures
  IMG_PARAGRAPH = %r{<p>\s*(<img\b[^>]*?/?>)\s*</p>}m
  ATTR = ->(html, name) { html[/\s#{name}="([^"]*)"/, 1] }
  SIZE_HINT = /\s*@\s*(\d{2,3})%\s*\z/

  def self.rewrite(html)
    html.gsub(IMG_PARAGRAPH) do
      img = Regexp.last_match(1)
      title = ATTR.call(img, "title")
      alt = ATTR.call(img, "alt")
      caption = title.to_s.strip
      caption = alt.to_s.strip if caption.empty?

      width = nil
      if (m = caption.match(SIZE_HINT))
        pct = m[1].to_i
        if pct.between?(10, 100)
          width = pct
          caption = caption.sub(SIZE_HINT, "").strip
        end
      end

      img_clean = img.sub(/\stitle="[^"]*"/, "")
      style = width ? %( style="width:#{width}%") : ""
      figcaption = caption.empty? ? "" : "<figcaption>#{caption}</figcaption>"
      %(<figure class="post-figure"#{style}>#{img_clean}#{figcaption}</figure>)
    end
  end
end

Jekyll::Hooks.register :posts, :post_render do |post|
  post.output = PostFigures.rewrite(post.output) if post.output_ext == ".html"
end
