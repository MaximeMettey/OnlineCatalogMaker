# OnlineCatalogMaker - Architecture Documentation

## Overview
A web-based SaaS platform for creating interactive PDF catalogs with clickable areas, multimedia content, and text extraction capabilities.

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: SQLite3 (with migration path to PostgreSQL)
- **ORM**: Knex.js (supports both SQLite and PostgreSQL)
- **Authentication**: JWT (jsonwebtoken)
- **PDF Processing**:
  - `pdf-lib`: PDF manipulation and page splitting
  - `pdfjs-dist`: Text extraction with coordinates
  - `pdf-poppler` or `pdf2pic`: PNG/JPG generation
  - `pdf2svg`: SVG generation
- **File Upload**: Multer
- **Validation**: Joi or Zod

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **State Management**: React Context / Zustand
- **Routing**: React Router
- **UI Components**: Tailwind CSS + shadcn/ui
- **Editor**: Fabric.js or Konva.js for live clickable area editor
- **PDF Viewer**: PDF.js or react-pdf

### Storage
- **Files**: Local filesystem (`/uploads` directory)
- **Database**: SQLite files in `/data` directory

## Architecture

### Directory Structure
```
OnlineCatalogMaker/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   │   ├── pdf/         # PDF processing
│   │   │   ├── auth/        # Authentication
│   │   │   └── storage/     # File storage
│   │   ├── utils/           # Utilities
│   │   └── server.js        # Entry point
│   ├── migrations/          # Database migrations
│   ├── uploads/             # Uploaded files
│   ├── data/                # SQLite databases
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── admin/       # Admin panel components
│   │   │   ├── viewer/      # Public viewer components
│   │   │   └── editor/      # Clickable area editor
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API services
│   │   ├── utils/           # Utilities
│   │   └── App.tsx          # Root component
│   └── package.json
└── README.md
```

## Database Schema

### Main Database (catalogs.db)

#### catalogs
- id (PRIMARY KEY)
- name (TEXT)
- original_filename (TEXT)
- slug (TEXT UNIQUE) - for public URL
- upload_date (DATETIME)
- processed (BOOLEAN)
- total_pages (INTEGER)
- status (TEXT) - processing, ready, error
- created_at (DATETIME)
- updated_at (DATETIME)

#### pages
- id (PRIMARY KEY)
- catalog_id (FOREIGN KEY)
- page_number (INTEGER)
- pdf_path (TEXT) - path to single-page PDF
- png_path (TEXT)
- jpg_path (TEXT)
- svg_path (TEXT)
- text_db_path (TEXT) - path to page-specific text database
- width (INTEGER)
- height (INTEGER)
- created_at (DATETIME)

#### clickable_areas
- id (PRIMARY KEY)
- page_id (FOREIGN KEY)
- type (TEXT) - link_external, link_internal, javascript, audio, video
- x (INTEGER) - position
- y (INTEGER)
- width (INTEGER)
- height (INTEGER)
- config (JSON) - type-specific configuration
  - For external links: {url, target: 'iframe'|'_blank'}
  - For internal links: {page_id}
  - For javascript: {code}
  - For audio: {url, autoplay}
  - For video: {url, provider: 'mp4'|'youtube'|'dailymotion'|'vimeo', display: 'inline'|'popup'}
- created_at (DATETIME)
- updated_at (DATETIME)

#### users
- id (PRIMARY KEY)
- email (TEXT UNIQUE)
- password_hash (TEXT)
- role (TEXT) - admin, user
- created_at (DATETIME)
- last_login (DATETIME)

### Text Database per Page (page_{catalog_id}_{page_number}.db)

#### words
- id (PRIMARY KEY)
- text (TEXT)
- x (REAL)
- y (REAL)
- width (REAL)
- height (REAL)
- font_name (TEXT)
- font_size (REAL)
- paragraph_id (INTEGER)

#### paragraphs
- id (PRIMARY KEY)
- text (TEXT)
- x (REAL)
- y (REAL)
- width (REAL)
- height (REAL)
- word_count (INTEGER)

## API Endpoints

### Authentication
- POST `/api/auth/login` - Admin login
- POST `/api/auth/register` - Register admin (first user only)
- GET `/api/auth/me` - Get current user

### Catalogs (Admin - Protected)
- GET `/api/admin/catalogs` - List all catalogs
- POST `/api/admin/catalogs` - Upload new PDF
- GET `/api/admin/catalogs/:id` - Get catalog details
- DELETE `/api/admin/catalogs/:id` - Delete catalog
- GET `/api/admin/catalogs/:id/pages` - Get all pages
- GET `/api/admin/catalogs/:id/pages/:pageNum` - Get page details
- GET `/api/admin/catalogs/:id/pages/:pageNum/text` - Get extracted text

### Clickable Areas (Admin - Protected)
- POST `/api/admin/pages/:pageId/areas` - Create clickable area
- PUT `/api/admin/areas/:id` - Update clickable area
- DELETE `/api/admin/areas/:id` - Delete clickable area
- GET `/api/admin/pages/:pageId/areas` - Get all areas for page

### Public Viewer
- GET `/api/viewer/:slug` - Get catalog by slug
- GET `/api/viewer/:slug/pages` - Get all pages
- GET `/api/viewer/:slug/pages/:pageNum` - Get page with areas

## PDF Processing Workflow

1. **Upload**: PDF file uploaded to `/uploads/originals/`
2. **Create Record**: Create catalog entry in database
3. **Process** (async):
   a. Get page count
   b. For each page:
      - Extract single page → `/uploads/catalogs/{id}/pages/page_{n}.pdf`
      - Generate PNG → `/uploads/catalogs/{id}/pages/page_{n}.png`
      - Generate JPG → `/uploads/catalogs/{id}/pages/page_{n}.jpg`
      - Generate SVG → `/uploads/catalogs/{id}/pages/page_{n}.svg`
      - Extract text with coordinates → separate SQLite DB
      - Create page record in database
   c. Update catalog status to 'ready'

## Security Considerations

- JWT tokens for admin authentication
- Password hashing with bcrypt
- Input validation on all endpoints
- File type validation (PDF only)
- File size limits
- SQL injection prevention (parameterized queries)
- XSS prevention in clickable area configs
- CORS configuration
- Rate limiting

## Future Enhancements

- PostgreSQL migration
- Multi-tenancy support
- CDN integration for assets
- S3/cloud storage for files
- Advanced analytics
- Collaborative editing
- Template system for clickable areas
- Batch operations
- API key authentication for headless access
