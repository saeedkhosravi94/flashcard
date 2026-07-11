import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

function SEOHead({ title, description, keywords, image, type = 'website' }) {
  const location = useLocation();
  const baseUrl = 'https://activerecaller.com';
  const currentUrl = `${baseUrl}${location.pathname}`;
  
  // Default values
  const defaultTitle = 'Active Recall Flashcards - AI-Powered Learning & Study Tool | ActiveRecaller';
  const defaultDescription = 'Master active recall learning with AI-powered flashcards. Create, study, and review flashcards for efficient learning. Perfect for students, professionals, and lifelong learners.';
  const defaultKeywords = 'flashcards, active recall, learning, study tool, spaced repetition, AI flashcards, flashcard maker, study cards, memory training, learning technique, educational app, study app, flashcard app, active recall method, learning platform, study platform, online flashcards, digital flashcards, flashcard generator, study aid';
  const defaultImage = `${baseUrl}/AR_white.png`;

  const pageTitle = title || defaultTitle;
  const pageDescription = description || defaultDescription;
  const pageKeywords = keywords || defaultKeywords;
  const pageImage = image || defaultImage;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="title" content={pageTitle} />
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={pageImage} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={currentUrl} />
      <meta property="twitter:title" content={pageTitle} />
      <meta property="twitter:description" content={pageDescription} />
      <meta property="twitter:image" content={pageImage} />
    </Helmet>
  );
}

export default SEOHead;

