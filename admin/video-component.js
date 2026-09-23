// Sveltia CMS editor component: insert a self-hosted video into a blog post.
//
// Loaded by admin/index.html (as a module script, after the Sveltia bundle).
// Writes plain HTML into the Markdown body so Jekyll passes it through
// unchanged and the browser plays it directly; the pattern below recognises
// that HTML again when a post is reopened so the block stays editable.
// Styling: _sass/_custom.scss (figure.video). User docs: EDITING.md.

const MAX_FILE_SIZE = 50 * 1024 * 1024; // GitHub rejects blobs over 100 MB; stay well under
const AUTOPLAY_ATTRS = 'autoplay muted loop playsinline'; // browsers only autoplay muted video

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"]/g, (c) => ESCAPES[c]);
const unescapeHtml = (value) =>
  String(value ?? '')
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');

const videoHtml = ({ src, caption, autoplay }) => {
  const attrs = ['controls'];
  if (autoplay) attrs.push(AUTOPLAY_ATTRS);
  attrs.push('preload="metadata"', `src="${escapeHtml(src)}"`);
  const figcaption = caption ? `\n  <figcaption>${escapeHtml(caption)}</figcaption>` : '';
  return `<figure class="video">\n  <video ${attrs.join(' ')}></video>${figcaption}\n</figure>`;
};

const videoComponent = {
  id: 'video',
  label: 'Video',
  icon: 'videocam',
  fields: [
    {
      name: 'src',
      label: 'Video file (mp4 or webm, up to 50 MB)',
      widget: 'file',
      accept: 'video/mp4,video/webm',
      media_folder: 'assets/video/uploads',
      public_folder: '/portfolio/assets/video/uploads',
      media_libraries: { default: { config: { max_file_size: MAX_FILE_SIZE } } },
    },
    { name: 'caption', label: 'Caption', widget: 'string', required: false },
    {
      name: 'autoplay',
      label: 'Autoplay (silent, looping)',
      widget: 'boolean',
      default: false,
      required: false,
    },
  ],
  pattern:
    /<figure class="video">\s*<video controls(?<autoplay> autoplay muted loop playsinline)? preload="metadata" src="(?<src>[^"]*)"><\/video>\s*(?:<figcaption>(?<caption>[\s\S]*?)<\/figcaption>\s*)?<\/figure>/,
  fromBlock: ({ groups = {} }) => ({
    src: unescapeHtml(groups.src),
    caption: unescapeHtml(groups.caption ?? ''),
    autoplay: Boolean(groups.autoplay),
  }),
  toBlock: videoHtml,
  toPreview: videoHtml,
};

globalThis.videoEditorComponent = videoComponent;

if (globalThis.CMS?.registerEditorComponent) {
  globalThis.CMS.registerEditorComponent(videoComponent);
}
