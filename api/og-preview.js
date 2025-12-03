const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nhtaqudkeotjtyeactzc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odGFxdWRrZW90anR5ZWFjdHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2OTc4NTgsImV4cCI6MjA3MDI3Mzg1OH0.a48ZPYIJtdgsa-TnZgpVXG-QDFJtYTI94hzeFn5btVg'
);

const BASE_URL = 'https://blackceldom.com';
const LOGO_URL = 'https://blackceldom.com/bcd-logo.png';
const THEME_COLOR = '#D97706'; // Gold/brown theme color

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function createOGHtml({ title, description, image, url, type = 'website', siteName = 'BlackCeldom' }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:type" content="${type}" />
  <meta property="og:site_name" content="${siteName}" />
  <meta name="theme-color" content="${THEME_COLOR}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta name="twitter:site" content="@BlackCeldom" />
  <link rel="icon" href="${LOGO_URL}" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="background:#0a0a0a;color:#FACC15;font-family:system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center;">
  <img src="${LOGO_URL}" alt="BlackCeldom" style="width:64px;height:64px;margin-bottom:20px;border-radius:12px;" />
  <h1 style="margin:0 0 10px;font-size:24px;">${escapeHtml(title)}</h1>
  <p style="margin:0;color:#a3a3a3;max-width:500px;">${escapeHtml(description)}</p>
  <a href="${escapeHtml(url)}" style="margin-top:20px;color:${THEME_COLOR};text-decoration:none;">View on BlackCeldom →</a>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  const { path } = req.query;
  
  if (!path) {
    return res.redirect(302, BASE_URL);
  }

  const userAgent = req.headers['user-agent'] || '';
  const isBot = /Discordbot|Twitterbot|facebookexternalhit|LinkedInBot|Slackbot|TelegramBot|WhatsApp|Googlebot|bingbot|yandex|baidu|duckduckbot|Embedly|Quora|outbrain|pinterest|vkShare|W3C_Validator/i.test(userAgent);

  if (!isBot) {
    return res.redirect(302, `${BASE_URL}${path}`);
  }

  try {
    // ===== POST PREVIEW =====
    if (path.startsWith('/post/')) {
      const postId = path.replace('/post/', '');
      const { data: post } = await supabase
        .from('posts')
        .select('title, content, image_url, image_urls, user_id, primary_category')
        .eq('id', postId)
        .maybeSingle();

      if (!post) {
        return res.redirect(302, `${BASE_URL}${path}`);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('user_id', post.user_id)
        .maybeSingle();

      const title = post.title || `Post by ${profile?.username || 'User'}`;
      const description = stripHtml(post.content)?.substring(0, 200) || 'Check out this post on BlackCeldom';
      const image = post.image_url || post.image_urls?.[0] || profile?.avatar_url || LOGO_URL;

      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title,
        description: description + (post.primary_category ? ` • ${post.primary_category}` : ''),
        image,
        url: `${BASE_URL}${path}`,
        type: 'article'
      }));
    }

    // ===== PROFILE PREVIEW =====
    if (path.startsWith('/profile/')) {
      const userId = path.replace('/profile/', '');
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, bio, avatar_url, total_posts, total_likes_received')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile) {
        return res.redirect(302, `${BASE_URL}${path}`);
      }

      const title = `${profile.username} on BlackCeldom`;
      const description = profile.bio?.substring(0, 200) || `${profile.username} • ${profile.total_posts || 0} posts • ${profile.total_likes_received || 0} likes`;
      const image = profile.avatar_url || LOGO_URL;

      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title,
        description,
        image,
        url: `${BASE_URL}${path}`,
        type: 'profile'
      }));
    }

    // ===== CATEGORY PREVIEW =====
    if (path.startsWith('/category/')) {
      const categorySlug = path.replace('/category/', '');
      const { data: category } = await supabase
        .from('categories')
        .select('name, description, profile_picture_url, post_count, follower_count')
        .eq('slug', categorySlug)
        .maybeSingle();

      if (!category) {
        return res.redirect(302, `${BASE_URL}${path}`);
      }

      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title: `${category.name} - BlackCeldom`,
        description: category.description || `${category.post_count || 0} posts • ${category.follower_count || 0} followers`,
        image: category.profile_picture_url || LOGO_URL,
        url: `${BASE_URL}${path}`
      }));
    }

    // ===== WIKI PREVIEW =====
    if (path.startsWith('/wiki')) {
      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title: 'The Book of Unity - BlackCeldom Wiki',
        description: 'Explore the comprehensive knowledge base and history of the BlackCeldom community.',
        image: LOGO_URL,
        url: `${BASE_URL}${path}`
      }));
    }

    // ===== CHAT PREVIEW =====
    if (path.startsWith('/chat')) {
      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title: 'Chat Hub - BlackCeldom',
        description: 'Join real-time conversations with the BlackCeldom community.',
        image: LOGO_URL,
        url: `${BASE_URL}${path}`
      }));
    }

    // ===== PROMO PREVIEW =====
    if (path === '/promo' || path === '/promo-tiktok') {
      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title: 'Join BlackCeldom - The First Safe Space for Black Voices',
        description: 'Unite. Share. Grow. Join 50,000+ members in the first truly safe space for Black voices. Zero tolerance for racism.',
        image: LOGO_URL,
        url: `${BASE_URL}${path}`
      }));
    }

    // ===== SUBSCRIPTION PREVIEW =====
    if (path === '/subscription') {
      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title: 'Premium Membership - BlackCeldom',
        description: 'Unlock exclusive features: custom badges, priority support, advanced posting tools, and more.',
        image: LOGO_URL,
        url: `${BASE_URL}${path}`
      }));
    }

    // ===== LOGIN PREVIEW =====
    if (path === '/login') {
      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title: 'Login - BlackCeldom',
        description: 'Sign in to your BlackCeldom account and connect with the community.',
        image: LOGO_URL,
        url: `${BASE_URL}${path}`
      }));
    }

    // ===== SIGNUP PREVIEW =====
    if (path === '/signup') {
      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title: 'Join BlackCeldom',
        description: 'Create your account and join the first truly safe space for Black voices. Unite. Share. Grow.',
        image: LOGO_URL,
        url: `${BASE_URL}${path}`
      }));
    }

    // ===== GUIDELINES PREVIEW =====
    if (path === '/guidelines') {
      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title: 'Community Guidelines - BlackCeldom',
        description: 'The BlackCeldom Code of Respect and Discourse. Where Darkness Makes Us Equal, Conversation Makes Us Whole.',
        image: LOGO_URL,
        url: `${BASE_URL}${path}`
      }));
    }

    // ===== FAQ PREVIEW =====
    if (path === '/faq') {
      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title: 'FAQ - BlackCeldom',
        description: 'Frequently asked questions about BlackCeldom. Learn how to use the platform and get the most out of your experience.',
        image: LOGO_URL,
        url: `${BASE_URL}${path}`
      }));
    }

    // ===== TERMS PREVIEW =====
    if (path === '/terms') {
      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title: 'Terms of Service - BlackCeldom',
        description: 'Read our terms of service and understand your rights and responsibilities on BlackCeldom.',
        image: LOGO_URL,
        url: `${BASE_URL}${path}`
      }));
    }

    // ===== PRIVACY PREVIEW =====
    if (path === '/privacy') {
      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title: 'Privacy Policy - BlackCeldom',
        description: 'Learn how we protect your data and privacy on BlackCeldom.',
        image: LOGO_URL,
        url: `${BASE_URL}${path}`
      }));
    }

    // ===== FOLLOWING PREVIEW =====
    if (path === '/following') {
      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title: 'Following Feed - BlackCeldom',
        description: 'See posts from people and categories you follow.',
        image: LOGO_URL,
        url: `${BASE_URL}${path}`
      }));
    }

    // ===== MESSAGES PREVIEW =====
    if (path.startsWith('/messages')) {
      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title: 'Direct Messages - BlackCeldom',
        description: 'Private conversations with your BlackCeldom connections.',
        image: LOGO_URL,
        url: `${BASE_URL}${path}`
      }));
    }

    // ===== NOTIFICATIONS PREVIEW =====
    if (path === '/notifications') {
      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title: 'Notifications - BlackCeldom',
        description: 'Stay updated with your latest notifications on BlackCeldom.',
        image: LOGO_URL,
        url: `${BASE_URL}${path}`
      }));
    }

    // ===== BOOKMARKS PREVIEW =====
    if (path === '/bookmarks') {
      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title: 'Bookmarks - BlackCeldom',
        description: 'Your saved posts and content on BlackCeldom.',
        image: LOGO_URL,
        url: `${BASE_URL}${path}`
      }));
    }

    // ===== SEARCH PREVIEW =====
    if (path.startsWith('/search')) {
      return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
        title: 'Search - BlackCeldom',
        description: 'Search for posts, users, and categories on BlackCeldom.',
        image: LOGO_URL,
        url: `${BASE_URL}${path}`
      }));
    }

    // ===== DEFAULT / HOME PREVIEW =====
    return res.setHeader('Content-Type', 'text/html').send(createOGHtml({
      title: 'BlackCeldom - Unite. Share. Grow.',
      description: 'The first truly safe space for Black voices. Join our community of 50,000+ members. Zero tolerance for racism.',
      image: LOGO_URL,
      url: `${BASE_URL}${path}`
    }));

  } catch (error) {
    console.error('OG Preview Error:', error);
    return res.redirect(302, `${BASE_URL}${path}`);
  }
};
