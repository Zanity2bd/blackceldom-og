import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nhtaqudkeotjtyeactzc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odGFxdWRrZW90anR5ZWFjdHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2OTc4NTgsImV4cCI6MjA3MDI3Mzg1OH0.a48ZPYIJtdgsa-TnZgpVXG-QDFJtYTI94hzeFn5btVg'
);

export default async function handler(req, res) {
  const { path } = req.query;
  
  if (!path) {
    return res.redirect(302, 'https://blackceldom.com');
  }

  const userAgent = req.headers['user-agent'] || '';
  const isBot = /Discordbot|Twitterbot|facebookexternalhit|LinkedInBot|Slackbot|TelegramBot|WhatsApp/i.test(userAgent);

  if (!isBot) {
    return res.redirect(302, `https://blackceldom.com${path}`);
  }

  // Post preview
  if (path.startsWith('/post/')) {
    const postId = path.replace('/post/', '');
    const { data: post } = await supabase
      .from('posts')
      .select('title, content, image_urls, user_id')
      .eq('id', postId)
      .maybeSingle();

    if (!post) {
      return res.redirect(302, `https://blackceldom.com${path}`);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', post.user_id)
      .maybeSingle();

    const title = post.title || 'Post on BlackCeldom';
    const description = post.content?.substring(0, 200) || 'Check out this post';
    const image = post.image_urls?.[0] || 'https://blackceldom.com/bcd-logo.png';
    const author = profile?.username || 'BlackCeldom User';

    return res.setHeader('Content-Type', 'text/html').send(`
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="https://blackceldom.com${path}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="BlackCeldom" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${image}" />
  <meta name="author" content="${escapeHtml(author)}" />
  <title>${escapeHtml(title)}</title>
</head>
<body></body>
</html>`);
  }

  // Profile preview
  if (path.startsWith('/profile/')) {
    const userId = path.replace('/profile/', '');
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, bio, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();

    if (!profile) {
      return res.redirect(302, `https://blackceldom.com${path}`);
    }

    const title = `${profile.username} on BlackCeldom`;
    const description = profile.bio || `Check out ${profile.username}'s profile`;
    const image = profile.avatar_url || 'https://blackceldom.com/bcd-logo.png';

    return res.setHeader('Content-Type', 'text/html').send(`
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="https://blackceldom.com${path}" />
  <meta property="og:type" content="profile" />
  <meta property="og:site_name" content="BlackCeldom" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${image}" />
  <title>${escapeHtml(title)}</title>
</head>
<body></body>
</html>`);
  }

  return res.redirect(302, `https://blackceldom.com${path}`);
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
