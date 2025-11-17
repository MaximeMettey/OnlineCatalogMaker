# OnlineCatalogMaker

A web-based SaaS platform for creating interactive PDF catalogs with clickable areas, multimedia content, and text extraction capabilities.

## Features

- **PDF Upload & Processing**: Upload PDF files and automatically split into individual pages
- **Image Generation**: Generate PNG, JPG, and SVG versions of each page
- **Text Extraction**: Extract text with precise positioning (words and paragraphs) into separate SQLite databases
- **Interactive Editor**: Live visual editor for creating clickable areas on pages
- **Clickable Areas**: Support for multiple interaction types:
  - External links (open in new tab or iframe)
  - Internal links (navigate to specific pages)
  - JavaScript execution
  - Audio playback
  - Video embedding (MP4, YouTube, Dailymotion, Vimeo)
- **Public Viewer**: Clean, responsive viewer for displaying catalogs with clickable areas
- **Admin Panel**: Private dashboard for managing catalogs and editing pages
- **Database**: SQLite (with PostgreSQL migration support via Knex.js)

## Tech Stack

### Backend
- Node.js + Express
- SQLite3 with Knex.js ORM
- JWT authentication
- PDF processing libraries (pdf-lib, pdfjs-dist, pdf-to-img)
- File upload handling with Multer

### Frontend
- React 18 + Vite
- React Router for navigation
- Konva.js for interactive canvas editing
- Tailwind CSS for styling
- Axios for API calls

## Project Structure

```
OnlineCatalogMaker/
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Express middleware (auth)
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic (PDF processing)
│   │   ├── utils/           # Utilities (JWT, hashing)
│   │   └── server.js        # Entry point
│   ├── uploads/             # Uploaded files
│   ├── data/                # SQLite databases
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   └── App.jsx          # Root component
│   └── package.json
└── ARCHITECTURE.md          # Detailed architecture documentation
```

## Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd OnlineCatalogMaker
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Configure Environment Variables**

   Copy the example environment file:
   ```bash
   cd ../backend
   cp .env.example .env
   ```

   Edit `.env` and update the values as needed:
   - `JWT_SECRET`: Change to a secure random string
   - `PORT`: Backend server port (default: 3000)
   - Other settings as needed

## Running the Application

### Development Mode

1. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   The backend will run on http://localhost:3000

2. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on http://localhost:5173

3. **Access the Application**
   - Admin Panel: http://localhost:5173/admin
   - First, register an admin account at http://localhost:5173/register

### Production Build

1. **Build the Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start the Backend**
   ```bash
   cd backend
   NODE_ENV=production npm start
   ```

## Usage Guide

### 1. Register Admin Account
- Navigate to `/register`
- Create your admin account with email and password (min 8 characters)

### 2. Upload a PDF Catalog
- Login to the admin panel
- Click "Upload New Catalog"
- Enter a catalog name and select a PDF file
- The system will automatically:
  - Split the PDF into individual pages
  - Generate PNG and JPG images
  - Extract text with positioning
  - Create a unique URL slug for the catalog

### 3. Edit Pages with Clickable Areas
- Once processing is complete (status: "ready"), click the Edit icon
- Use the page navigation to select a page
- Click "Draw New Area" to enter drawing mode
- Click and drag on the page to create a clickable area
- Configure the area type and settings:
  - **External Link**: URL and target (new tab or iframe)
  - **Internal Link**: Target page number
  - **JavaScript**: Custom JavaScript code
  - **Audio**: Audio file URL with autoplay option
  - **Video**: Video URL, provider, and display mode

### 4. View the Public Catalog
- Click the "View" icon to open the public viewer
- The catalog URL will be: `/viewer/{slug}`
- Share this URL with your audience
- Viewers can navigate pages and interact with clickable areas

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register admin user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires auth)

### Admin Endpoints (require authentication)
- `POST /api/admin/catalogs` - Upload catalog
- `GET /api/admin/catalogs` - List all catalogs
- `GET /api/admin/catalogs/:id` - Get catalog details
- `DELETE /api/admin/catalogs/:id` - Delete catalog
- `GET /api/admin/catalogs/:id/pages` - Get all pages
- `GET /api/admin/catalogs/:id/pages/:pageNum` - Get page details
- `GET /api/admin/catalogs/:id/pages/:pageNum/text` - Get extracted text
- `POST /api/admin/pages/:pageId/areas` - Create clickable area
- `PUT /api/admin/areas/:id` - Update clickable area
- `DELETE /api/admin/areas/:id` - Delete clickable area
- `GET /api/admin/pages/:pageId/areas` - Get page areas

### Public Viewer Endpoints
- `GET /api/viewer/:slug` - Get catalog by slug
- `GET /api/viewer/:slug/pages` - Get all pages
- `GET /api/viewer/:slug/pages/:pageNum` - Get page with areas

## Database Schema

### Main Database (catalogs.db)
- **catalogs**: Catalog metadata
- **pages**: Individual page information
- **clickable_areas**: Interactive area definitions
- **users**: Admin user accounts

### Text Databases (per page)
- **paragraphs**: Extracted paragraph text with positions
- **words**: Individual word positions and metadata

See `ARCHITECTURE.md` for detailed schema information.

## Migration to PostgreSQL

The application uses Knex.js ORM which supports both SQLite and PostgreSQL. To migrate:

1. Install PostgreSQL
2. Create a new database
3. Update `.env`:
   ```env
   DB_CLIENT=pg
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_NAME=catalog_maker
   ```
4. Restart the backend - tables will be created automatically

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation with Joi
- File type validation (PDF only)
- File size limits
- SQL injection prevention (parameterized queries)
- CORS configuration
- Rate limiting
- Helmet security headers

## Troubleshooting

### PDF Processing Fails
- Check file size (default max: 50MB)
- Ensure PDF is not corrupted
- Check backend logs for specific errors

### Images Not Displaying
- Verify uploads directory has correct permissions
- Check that files were generated in `/uploads/catalogs/{id}/pages/`
- Ensure backend is serving static files correctly

### Authentication Issues
- Check JWT_SECRET is set in .env
- Verify token is being stored in localStorage
- Check browser console for errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For issues and questions, please open an issue on the GitHub repository.
