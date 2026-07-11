const multer = require('multer');
const path = require('path');

// Sanitize filename to remove special characters and spaces
const sanitizeFilename = (filename) => {
  // Remove or replace problematic characters
  return filename
    .replace(/[^\w\s.-]/g, '') // Remove special chars except word chars, spaces, dots, hyphens
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^[._-]+|[._-]+$/g, ''); // Remove leading/trailing dots, underscores, hyphens
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const sanitizedBasename = sanitizeFilename(basename);
    
    // Use sanitized name or fallback to 'file' if empty
    const finalBasename = sanitizedBasename || 'file';
    cb(null, finalBasename + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.pdf', '.txt', '.doc', '.docx', '.csv', '.apkg'];
  const allowedMimeTypes = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'application/zip',
    'application/x-zip-compressed'
  ];
  
  // Check if extension is allowed
  const extname = allowedExtensions.includes(ext);
  
  // Check if MIME type is allowed, or if it's an .apkg file (which might have zip MIME type)
  const mimetype = allowedMimeTypes.includes(file.mimetype) || 
                   (ext === '.apkg' && (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed'));

  if (extname || mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, text, CSV, and Anki (.apkg) files are allowed!'));
  }
};

// Image file filter
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype.startsWith('image/');

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed!'));
  }
};

// Audio file filter
const audioFilter = (req, file, cb) => {
  const allowedTypes = /mp3|wav|ogg|m4a|aac|flac/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype.startsWith('audio/');

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only audio files (MP3, WAV, OGG, M4A, AAC, FLAC) are allowed!'));
  }
};

// No strict file size limits - allow large files
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max limit
});

const imageUpload = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for images
});

const audioUpload = multer({
  storage: storage,
  fileFilter: audioFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for audio
});

module.exports = upload;
module.exports.imageUpload = imageUpload;
module.exports.audioUpload = audioUpload;

