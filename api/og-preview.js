// api/og-preview.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nhtaqudkeotjtyeactzc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odGFxdWRrZW90anR5ZWFjdHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2OTc4NTgsImV4cCI6MjA3MDI3Mzg1OH0.a48ZPYIJtdgsa-TnZgpVXG-QDFJtYTI94hzeFn5btVg'
);

const BOT_USER_AGENTS = [
  'discordbot', 'twitterbot', 'facebookexternalhit', 'linkedinbot',
  'slackbot', 'telegrambot', 'whatsapp', 'googlebot', 'bingbot',
  'yandexbot', 'duckduckbot', 'baiduspider', 'sogou', 'exabot',
  'facebot', 'ia_archiver', 'mj12bot', 'pinterest', 'redditbot',
  'rogerbot', 'showyoubot', 'embedly', 'quora', 'outbrain',
  'vkshare', 'w3c_validator', 'applebot', 'petalbot', 'semrushbot'
];

function isBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some(bot => ua.includes(bot));
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

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function getYouTubeVideoId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function getTikTokVideoId(url) {
  if (!url) return null;
  const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  return match ? match[1] : null;
}

function formatCount(count) {
  if (!count || count === 0) return '0';
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
  return count.toString();
}

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
  if (seconds < 2592000) return Math.floor(seconds / 604800) + 'w ago';
  return Math.floor(seconds / 2592000) + 'mo ago';
}

function formatTags(tags) {
  if (!tags || !Array.isArray(tags) || tags.length === 0) return '';
  return tags.slice(0, 3).map(t => `#${t.replace(/\s+/g, '')}`).join(' ');
}

export default async function handler(req, res) {
  const userAgent = req.headers['user-agent'] || '';
  const { path } = req.query;
  const canonicalUrl = `https://blackceldom.com${path || '/'}`;

  if (!isBot(userAgent)) {
    return res.redirect(302, canonicalUrl);
  }

  let ogData = {
    title: 'BlackCeldom - Unite. Share. Grow.',
    description: 'The first truly safe space for Black voices. Join 50,000+ members in our community.',
    image: 'https://blackceldom.com/bcd-logo.png',
    url: canonicalUrl,
    type: 'website',
    videoUrl: null,
    videoType: null,
    author: null,
    siteName: 'BlackCeldom'
  };

  try {
    // Handle post pages
    if (path && path.startsWith('/post/')) {
      const postId = path.replace('/post/', '').split('?')[0];
      
      const { data: post } = await supabase
        .from('posts')
        .select('id, title, content, image_url, image_urls, video_url, enhancements, views_count, user_id, created_at, primary_category, tags, is_event, is_official')
        .eq('id', postId)
        .single();

      if (post) {
        // Fetch author info
        const { data: author } = await supabase
          .from('profiles')
          .select('username, avatar_url, is_admin, is_moderator')
          .eq('user_id', post.user_id)
          .single();

        // Fetch like count
        const { count: likeCount } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)
          .eq('type', 'like');

        // Fetch comment count
        const { count: commentCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId);

        const title = post.title || 'Post on BlackCeldom';
        const content = stripHtml(post.content || '').substring(0, 120);
        const authorName = author?.username || 'Anonymous';
        const likes = formatCount(likeCount || 0);
        const views = formatCount(post.views_count || 0);
        const comments = formatCount(commentCount || 0);
        const posted = timeAgo(post.created_at);
        const tags = formatTags(post.tags);
        const category = post.primary_category || '';
        const isVerified = author?.is_admin || author?.is_moderator;

        // Build rich description
        let description = content ? `"${content}..."` : '';
        description += `\n\n`;
        description += `👤 @${authorName}${isVerified ? ' ✓' : ''} • ⏰ ${posted}`;
        description += `\n❤️ ${likes} • 💬 ${comments} • 👁️ ${views}`;
        if (category) description += `\n📁 ${category}`;
        if (tags) description += `\n${tags}`;

        // Post type badges
        let titlePrefix = '';
        if (post.is_official) titlePrefix = '📢 ';
        else if (post.is_event) titlePrefix = '🗓️ ';

        ogData.title = `${titlePrefix}${escapeHtml(title)} | BlackCeldom`;
        ogData.description = escapeHtml(description);
        ogData.type = 'article';
        ogData.author = authorName;

        // Check for video content
        let videoUrl = null;
        let videoType = null;
        let videoThumbnail = null;

        if (post.video_url) {
          const ytId = getYouTubeVideoId(post.video_url);
          const ttId = getTikTokVideoId(post.video_url);
          
          if (ytId) {
            videoUrl = `https://www.youtube.com/embed/${ytId}`;
            videoType = 'text/html';
            videoThumbnail = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
          } else if (ttId) {
            videoThumbnail = post.image_url || post.image_urls?.[0];
          }
        }

        // Check enhancements for embeds
        if (!videoUrl && post.enhancements) {
          const enhancements = typeof post.enhancements === 'string' 
            ? JSON.parse(post.enhancements) 
            : post.enhancements;
          
          const embeds = enhancements?.embeds || [];
          for (const embed of embeds) {
            if (embed.type === 'youtube' && embed.url) {
              const ytId = getYouTubeVideoId(embed.url);
              if (ytId) {
                videoUrl = `https://www.youtube.com/embed/${ytId}`;
                videoType = 'text/html';
                videoThumbnail = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
                break;
              }
            } else if (embed.type === 'tiktok' && embed.url) {
              videoThumbnail = embed.thumbnail || post.image_url;
            }
          }
        }

        if (videoUrl) {
          ogData.videoUrl = videoUrl;
          ogData.videoType = videoType;
        }

        if (videoThumbnail) {
          ogData.image = videoThumbnail;
        } else if (post.image_urls?.length > 0) {
          ogData.image = post.image_urls[0];
        } else if (post.image_url) {
          ogData.image = post.image_url;
        }
      }
    }

    // Handle profile pages
    else if (path && path.startsWith('/profile/')) {
      const userId = path.replace('/profile/', '').split('?')[0];
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, bio, avatar_url, is_admin, is_moderator, total_posts, total_likes_received')
        .eq('user_id', userId)
        .single();

      // Get follower count
      const { count: followerCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      if (profile) {
        const isVerified = profile.is_admin || profile.is_moderator;
        const badge = profile.is_admin ? '👑 Admin' : profile.is_moderator ? '🛡️ Mod' : '';
        
        let description = profile.bio ? `"${escapeHtml(profile.bio.substring(0, 100))}"` : '';
        description += `\n\n👥 ${formatCount(followerCount || 0)} followers`;
        description += ` • 📝 ${formatCount(profile.total_posts || 0)} posts`;
        description += ` • ❤️ ${formatCount(profile.total_likes_received || 0)} likes`;
        if (badge) description += `\n${badge}`;

        ogData.title = `@${escapeHtml(profile.username)}${isVerified ? ' ✓' : ''} | BlackCeldom`;
        ogData.description = description;
        if (profile.avatar_url) ogData.image = profile.avatar_url;
        ogData.type = 'profile';
      }
    }

    // Handle category pages
    else if (path && path.startsWith('/category/')) {
      const categorySlug = path.replace('/category/', '').split('?')[0];
      
      const { data: category } = await supabase
        .from('categories')
        .select('name, description, icon, post_count, follower_count')
        .eq('slug', categorySlug)
        .single();

      if (category) {
        ogData.title = `${category.icon || '📁'} ${category.name} | BlackCeldom`;
        ogData.description = `${category.description || 'Explore posts in ' + category.name}\n\n📝 ${formatCount(category.post_count || 0)} posts • 👥 ${formatCount(category.follower_count || 0)} followers`;
      }
    }

    // Handle wiki pages
    else if (path && path.startsWith('/wiki')) {
      ogData.title = '📚 Wiki | BlackCeldom';
      ogData.description = 'Explore the BlackCeldom Wiki - Your guide to the community, culture, and everything BlackCeldom.';
    }

    // Handle subscription page
    else if (path && path.startsWith('/subscription')) {
      ogData.title = '👑 Premium Membership | BlackCeldom';
      ogData.description = 'Unlock exclusive features with BlackCeldom Premium!\n\n✨ Custom badges & colors\n🎨 Advanced post styling\n📊 Analytics dashboard\n🔒 Premium-only features';
    }

    // Handle chat page
    else if (path && path.startsWith('/chat')) {
      ogData.title = '💬 Chat | BlackCeldom';
      ogData.description = 'Join real-time conversations with the BlackCeldom community. Connect, discuss, and build relationships.';
    }

  } catch (error) {
    console.error('OG Preview error:', error);
  }

  // Generate HTML with OG meta tags
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${ogData.title}</title>
  
  <!-- Open Graph -->
  <meta property="og:site_name" content="${ogData.siteName}">
  <meta property="og:title" content="${ogData.title}">
  <meta property="og:description" content="${ogData.description}">
  <meta property="og:image" content="${ogData.image}">
  <meta property="og:url" content="${ogData.url}">
  <meta property="og:type" content="${ogData.type}">
  ${ogData.videoUrl ? `
  <meta property="og:video" content="${ogData.videoUrl}">
  <meta property="og:video:secure_url" content="${ogData.videoUrl}">
  <meta property="og:video:type" content="${ogData.videoType}">
  <meta property="og:video:width" content="1280">
  <meta property="og:video:height" content="720">
  ` : ''}
  ${ogData.author ? `<meta property="article:author" content="${ogData.author}">` : ''}
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="${ogData.videoUrl ? 'player' : 'summary_large_image'}">
  <meta name="twitter:site" content="@blackceldom">
  <meta name="twitter:title" content="${ogData.title}">
  <meta name="twitter:description" content="${ogData.description}">
  <meta name="twitter:image" content="${ogData.image}">
  ${ogData.videoUrl ? `
  <meta name="twitter:player" content="${ogData.videoUrl}">
  <meta name="twitter:player:width" content="1280">
  <meta name="twitter:player:height" content="720">
  ` : ''}
  
  <!-- Additional Meta -->
  <meta name="theme-color" content="#FACC15">
  <link rel="icon" href="https://blackceldom.com/bcd-logo.png">
</head>
<body>
  <h1>${ogData.title}</h1>
  <p>${ogData.description}</p>
  <p>🔗 <a href="${ogData.url}">View on BlackCeldom</a></p>
  <footer>© BlackCeldom - Unite. Share. Grow.</footer>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(html);
}
