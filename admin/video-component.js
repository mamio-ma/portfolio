// Sveltia CMS editor component: insert a self-hosted video into a blog post.
//
// Loaded by admin/index.html (plain script, right after the Sveltia bundle).
// Writes plain HTML into the Markdown body so Jekyll passes it through
// unchanged and the browser plays it directly; the pattern below recognises
// that HTML again when a post is reopened so the block stays editable.
// Styling: _sass/_custom.scss (figure.video). User docs: EDITING.md.
//
// Storage and size limit are NOT configured here: Sveltia ignores per-field
// media_folder / media_libraries inside editor components (verified 2026-09-23),
// so uploads land in the global media_folder (assets/img/uploads) and the
// 30 MB cap lives in admin/config.yml. 30 MB is the practical ceiling because
// GitHub's GraphQL API refuses request payloads over 45 MB and the file is
// base64-encoded (x1.37) into that payload.

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
      label: 'Video file (mp4 or webm, up to 30 MB)',
      widget: 'file',
      accept: 'video/mp4,video/webm',
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
