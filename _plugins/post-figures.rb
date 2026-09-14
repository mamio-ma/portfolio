# Turn standalone Markdown images in blog posts into captioned figures.
#
#   ![](/img/a.png "Example workflow")   -> <figure class="post-figure"><img ...><figcaption>Example workflow</figcaption></figure>
#   ![Alt text](/img/a.png)              -> caption falls back to the alt text
#
# Several images in the same paragraph (what the editor writes when you upload
# more than one file at once, i.e. consecutive image lines with no blank line
# between them) become one row of equal-width figures:
#
#   ![](/img/a.png "Before")
#   ![](/img/b.png "After")
#     -> <div class="post-figure-row" data-count="2">
#          <figure class="post-figure"><img ...><figcaption>Before</figcaption></figure>
#          <figure class="post-figure"><img ...><figcaption>After</figcaption></figure>
#        </div>
#
# Images are never resized individually: a lone image spans the text column and
# images in a row share it equally. The sizing lives in _sass/_custom.scss.
#
# Only paragraphs that contain nothing but <img> tags are rewritten, so inline
# images and linked images are left untouched. Runs after Markdown rendering.

module PostFigures
  # A <p> whose only content is one or more <img> tags (whitespace allowed between them)
  IMG_PARAGRAPH = %r{<p>\s*((?:<img\b[^>]*?/?>\s*)+)</p>}m
  IMG_TAG = %r{<img\b[^>]*?/?>}
  ATTR = ->(html, name) { html[/\s#{name}="([^"]*)"/, 1] }

  def self.rewrite(html)
    html.gsub(IMG_PARAGRAPH) do
      figures = Regexp.last_match(1).scan(IMG_TAG).map { |img| figure_for(img) }
      if figures.length == 1
        figures.first
      else
        %(<div class="post-figure-row" data-count="#{figures.length}">#{figures.join}</div>)
      end
    end
  end

  # One <img> -> <figure class="post-figure"> with the title (or alt) as caption.
  def self.figure_for(img)
    title = ATTR.call(img, "title")
    alt = ATTR.call(img, "alt")
    caption = title.to_s.strip
    caption = alt.to_s.strip if caption.empty?

    # The title is shown as the caption, so drop it from the <img> to avoid a duplicate tooltip
    img_clean = img.sub(/\stitle="[^"]*"/, "")
    figcaption = caption.empty? ? "" : "<figcaption>#{caption}</figcaption>"
    %(<figure class="post-figure">#{img_clean}#{figcaption}</figure>)
  end
end

Jekyll::Hooks.register :posts, :post_render do |post|
  post.output = PostFigures.rewrite(post.output) if post.output_ext == ".html"
end
