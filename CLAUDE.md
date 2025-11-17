# CLAUDE.md - AI Assistant Guide

This document provides comprehensive guidance for AI assistants (like Claude) working on the OnlineCatalogMaker project. It explains the codebase structure, development workflows, conventions, and best practices to follow.

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Directory Structure](#directory-structure)
4. [Development Environment](#development-environment)
5. [Architecture Patterns](#architecture-patterns)
6. [Coding Conventions](#coding-conventions)
7. [Common Tasks](#common-tasks)
8. [Testing & Debugging](#testing--debugging)
9. [Git Workflow](#git-workflow)
10. [Important Gotchas](#important-gotchas)

---

## 📖 Project Overview

**OnlineCatalogMaker** is a SaaS platform for creating interactive PDF catalogs with clickable areas and multimedia content.

### Core Features
- PDF upload and automatic page extraction with double-page detection
- Interactive editor for creating clickable areas (links, videos, audio, JavaScript)
- Public viewer with flipbook-style page navigation
- Text extraction with precise positioning (words and paragraphs)
- Page management (reorder, delete, insert, replace)
- Admin authentication with JWT

### Key Business Logic
- **Double-Page Detection**: Landscape pages are automatically detected and split into two portrait pages
- **Hybrid Processing**: Node.js orchestrates while Python (PyMuPDF) handles PDF processing for robustness and speed
- **Background Processing**: PDF processing happens asynchronously after upload
- **Slug-based URLs**: Each catalog has a unique, SEO-friendly URL (`/viewer/{slug}`)

---

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js 18+ with ES Modules (`"type": "module"` in package.json)
- **Framework**: Express.js
- **Database**: SQLite3 with Knex.js ORM (PostgreSQL-ready)
- **Authentication**: JWT tokens with bcrypt password hashing
- **PDF Processing**: Python 3.8+ with PyMuPDF (called via `child_process.spawn`)
- **File Uploads**: Multer with file size limits (50MB default)
- **Validation**: Joi for request validation
- **Security**: Helmet, CORS, rate limiting (express-rate-limit)

### Frontend
- **Framework**: React 18 with hooks (no TypeScript currently)
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand (lightweight)
- **Styling**: Tailwind CSS
- **Canvas Editing**: Konva.js + react-konva for clickable area editor
- **PDF Viewer**: react-pageflip for flipbook effect
- **Icons**: lucide-react
- **HTTP Client**: Axios with interceptors

### Python Services
- **PyMuPDF (fitz)**: PDF manipulation, page splitting, image generation
- **Pillow**: Image processing
- Communication: JSON over stdout/stderr with Node.js

---

## 📁 Directory Structure

```
OnlineCatalogMaker/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # Knex config, DB initialization
│   │   ├── controllers/             # Request handlers (business logic)
│   │   │   ├── authController.js
│   │   │   ├── catalogController.js
│   │   │   ├── clickableAreaController.js
│   │   │   ├── pageManagementController.js
│   │   │   └── viewerController.js
│   │   ├── middleware/
│   │   │   └── auth.js              # JWT authentication middleware
│   │   ├── routes/                  # Express route definitions
│   │   │   ├── authRoutes.js
│   │   │   ├── catalogRoutes.js
│   │   │   ├── clickableAreaRoutes.js
│   │   │   ├── pageManagementRoutes.js
│   │   │   └── viewerRoutes.js
│   │   ├── services/
│   │   │   └── pdf/
│   │   │       └── pythonProcessor.js  # Python bridge for PDF processing
│   │   ├── utils/
│   │   │   ├── hash.js              # bcrypt password hashing
│   │   │   └── jwt.js               # JWT token utilities
│   │   └── server.js                # Express app entry point
│   ├── python/
│   │   ├── pdf_processor.py         # Python script for PDF operations
│   │   └── requirements.txt         # Python dependencies
│   ├── data/                        # SQLite database files
│   │   └── catalogs.db              # Main database
│   ├── uploads/                     # User-uploaded files
│   │   ├── originals/               # Original PDF files
│   │   └── catalogs/{id}/pages/     # Processed pages (PDF, PNG, JPG, SVG)
│   ├── .env                         # Environment variables (gitignored)
│   ├── .env.example                 # Example environment file
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   └── PageManagement.jsx  # Page reordering, deletion
│   │   │   ├── editor/
│   │   │   │   ├── ClickableAreaEditor.jsx  # Konva canvas editor
│   │   │   │   └── AreaConfigModal.jsx      # Area configuration UI
│   │   │   └── viewer/
│   │   │       └── FlipBook.jsx             # react-pageflip viewer
│   │   ├── pages/                   # Top-level page components
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── AdminDashboard.jsx   # Catalog list
│   │   │   ├── CatalogEditor.jsx    # Edit clickable areas
│   │   │   └── CatalogViewer.jsx    # Public viewer
│   │   ├── hooks/
│   │   │   └── use-image.js         # Konva image loading hook
│   │   ├── services/                # API client services
│   │   │   ├── api.js               # Axios instance with interceptors
│   │   │   ├── auth.js              # Auth API calls
│   │   │   ├── catalog.js           # Catalog API calls
│   │   │   └── clickableArea.js     # Clickable area API calls
│   │   ├── App.jsx                  # Root component with routing
│   │   └── main.jsx                 # React entry point
│   ├── public/                      # Static assets
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── ARCHITECTURE.md                  # Detailed architecture docs
├── README.md                        # User-facing documentation
├── SETUP.md                         # Installation guide (French)
├── CLAUDE.md                        # This file
└── .gitignore
```

### Important Paths
- **Main database**: `backend/data/catalogs.db`
- **Text databases**: `backend/data/text_catalog_{id}.db` (one per catalog)
- **Uploaded PDFs**: `backend/uploads/originals/`
- **Processed pages**: `backend/uploads/catalogs/{catalogId}/pages/`
- **Python script**: `backend/python/pdf_processor.py`

---

## 💻 Development Environment

### Prerequisites
- Node.js 18+
- Python 3.8+
- npm or yarn

### Setup Commands
```bash
# Backend
cd backend
npm install
python3 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r python/requirements.txt
cp .env.example .env  # Edit JWT_SECRET and other values
npm run dev  # Starts on http://localhost:3000

# Frontend (in separate terminal)
cd frontend
npm install
npm run dev  # Starts on http://localhost:5173
```

### Environment Variables
See `backend/.env.example` for all configuration options. Key variables:
- `JWT_SECRET`: **MUST** be changed in production
- `PORT`: Backend port (default: 3000)
- `DB_CLIENT`: `sqlite3` or `pg` (PostgreSQL)
- `CORS_ORIGIN`: Frontend URL for CORS
- `MAX_FILE_SIZE`: Upload limit in bytes (default: 50MB)

---

## 🏗 Architecture Patterns

### 1. Backend Pattern: MVC with Services

**Controllers** handle HTTP requests/responses:
```javascript
// backend/src/controllers/catalogController.js
export const getCatalog = async (req, res) => {
  try {
    const catalog = await db('catalogs').where({ id: req.params.id }).first();
    if (!catalog) {
      return res.status(404).json({ error: 'Catalog not found' });
    }
    res.json(catalog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

**Services** contain business logic (especially `pythonProcessor.js`):
```javascript
// backend/src/services/pdf/pythonProcessor.js
export class PythonPDFProcessor {
  async process() {
    // Calls Python script via spawn()
    // Handles page splitting, image generation, text extraction
    // Updates database after each page
  }
}
```

**Routes** define endpoints:
```javascript
// backend/src/routes/catalogRoutes.js
router.get('/:id', authenticate, getCatalog);
router.post('/', authenticate, upload.single('file'), uploadCatalog);
```

### 2. Frontend Pattern: Component-Service Architecture

**Pages** are top-level route components:
- Located in `frontend/src/pages/`
- Handle routing, layout, and orchestration
- Fetch data on mount, manage loading states

**Components** are reusable UI pieces:
- Located in `frontend/src/components/`
- Organized by domain (`admin/`, `editor/`, `viewer/`)
- Receive props, emit events via callbacks

**Services** handle API calls:
- Located in `frontend/src/services/`
- Export functions that return promises
- Example: `catalogService.getCatalog(id)`

### 3. Database Access with Knex

Always use Knex query builder (parameterized queries for security):
```javascript
import db from '../config/database.js';

// Good: Parameterized
const catalog = await db('catalogs').where({ id }).first();
const pages = await db('pages').where({ catalog_id: id }).orderBy('page_number');

// Bad: String interpolation (vulnerable to SQL injection)
const catalog = await db.raw(`SELECT * FROM catalogs WHERE id = ${id}`);
```

### 4. Python-Node Communication

Node calls Python via `spawn()`:
```javascript
const python = spawn('python3', [script, command, ...args]);
// Python returns JSON on stdout
const result = JSON.parse(stdout);
```

Python script structure:
```python
# backend/python/pdf_processor.py
def main():
    command = sys.argv[1]
    if command == 'process':
        result = process_pdf(...)
        print(json.dumps({"success": True, "data": result}))
```

---

## 📝 Coding Conventions

### JavaScript/React Style

1. **ES Modules**: Always use `import/export`, not `require()`
2. **Async/Await**: Prefer over `.then()` chains
3. **Arrow Functions**: Use for most cases, especially callbacks
4. **Destructuring**: Extract props and params
   ```javascript
   const { name, slug } = req.body;
   const { id } = req.params;
   ```
5. **Null Checks**: Always check for null/undefined before accessing nested properties
   ```javascript
   if (!catalog) {
     return res.status(404).json({ error: 'Not found' });
   }
   ```

### React Conventions

1. **Functional Components**: No class components
2. **Hooks**: Use `useState`, `useEffect`, `useCallback`, `useMemo` appropriately
3. **Component Naming**: PascalCase for components, camelCase for functions
4. **File Extensions**: `.jsx` for React components, `.js` for utilities
5. **Props Destructuring**: Destructure props in function signature
   ```javascript
   function MyComponent({ title, onClick }) { ... }
   ```

### Backend API Conventions

1. **REST Naming**: Use plural nouns (`/catalogs`, not `/catalog`)
2. **Protected Routes**: Admin routes under `/api/admin/*`
3. **Public Routes**: Viewer routes under `/api/viewer/*`
4. **Status Codes**:
   - `200`: Success
   - `201`: Created (POST)
   - `400`: Bad request (validation error)
   - `401`: Unauthorized (missing/invalid token)
   - `404`: Not found
   - `500`: Server error
5. **Error Response Format**: `{ error: "message" }`
6. **Success Response**: `{ data: {...} }` or direct object

### Database Conventions

1. **Table Names**: Lowercase, plural (`catalogs`, `pages`, `clickable_areas`)
2. **Column Names**: snake_case (`created_at`, `page_number`, `catalog_id`)
3. **Primary Keys**: Always `id` (integer, auto-increment)
4. **Foreign Keys**: `{table}_id` (e.g., `catalog_id`)
5. **Timestamps**: `created_at`, `updated_at` (DATETIME)
6. **JSON Columns**: Use TEXT with JSON.stringify/parse (SQLite limitation)

### File Naming

- **Backend**: camelCase for files (`catalogController.js`)
- **Frontend**: PascalCase for components (`CatalogEditor.jsx`), camelCase for utilities
- **Config Files**: kebab-case (`vite.config.js`, `tailwind.config.js`)

---

## 🔧 Common Tasks

### Adding a New API Endpoint

1. **Create controller function** in `backend/src/controllers/{domain}Controller.js`:
   ```javascript
   export const myNewEndpoint = async (req, res) => {
     try {
       // Business logic
       res.json({ success: true });
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   };
   ```

2. **Add route** in `backend/src/routes/{domain}Routes.js`:
   ```javascript
   import { myNewEndpoint } from '../controllers/{domain}Controller.js';
   router.get('/my-endpoint', authenticate, myNewEndpoint);
   ```

3. **Register route** in `backend/src/server.js` (if new route file):
   ```javascript
   import myRoutes from './routes/myRoutes.js';
   app.use('/api/admin/my-domain', myRoutes);
   ```

4. **Add frontend service** in `frontend/src/services/{domain}.js`:
   ```javascript
   export const callMyEndpoint = async () => {
     const response = await api.get('/api/admin/my-domain/my-endpoint');
     return response.data;
   };
   ```

### Adding a New React Component

1. **Create component file** in `frontend/src/components/{domain}/MyComponent.jsx`:
   ```javascript
   import React from 'react';

   function MyComponent({ prop1, prop2 }) {
     return (
       <div className="container mx-auto">
         {/* Component content */}
       </div>
     );
   }

   export default MyComponent;
   ```

2. **Import and use** in parent component:
   ```javascript
   import MyComponent from '../components/domain/MyComponent';
   ```

### Modifying PDF Processing

1. **Edit Python script**: `backend/python/pdf_processor.py`
2. **Test standalone**:
   ```bash
   cd backend
   source venv/bin/activate
   python3 python/pdf_processor.py process path/to/test.pdf /tmp/output catalog_id
   ```
3. **Update Node.js bridge** if needed: `backend/src/services/pdf/pythonProcessor.js`

### Adding Database Fields

1. **Add column in Knex** (manual migration):
   ```javascript
   // In database.js or create migration file
   await knex.schema.table('catalogs', (table) => {
     table.string('new_field');
   });
   ```

2. **Update queries** in controllers to include new field

3. **Update frontend** to display/edit new field

### Debugging PDF Processing Issues

1. **Check backend logs**: Look for Python stderr output
2. **Test Python directly**: Run `pdf_processor.py` standalone
3. **Check file permissions**: Ensure uploads directory is writable
4. **Verify Python env**: Make sure `venv` is activated and PyMuPDF is installed
5. **Check file paths**: Ensure paths are absolute, not relative

---

## 🧪 Testing & Debugging

### Backend Debugging

1. **Enable verbose logging**: Add `console.log()` in controllers/services
2. **Test API with curl**:
   ```bash
   # Health check
   curl http://localhost:3000/health

   # Login
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@test.com","password":"password"}'

   # Get catalogs (with token)
   curl http://localhost:3000/api/admin/catalogs \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Inspect database**:
   ```bash
   cd backend
   sqlite3 data/catalogs.db
   .tables
   SELECT * FROM catalogs;
   SELECT * FROM pages WHERE catalog_id = 1;
   .quit
   ```

4. **Python debugging**:
   - Add `print()` statements (goes to stderr, visible in Node logs)
   - Test script directly: `python3 python/pdf_processor.py --help`

### Frontend Debugging

1. **Browser DevTools**: Use React DevTools extension
2. **Network Tab**: Inspect API requests/responses
3. **Console Errors**: Check for runtime errors
4. **Component State**: Use React DevTools to inspect state/props

### Common Issues

**Issue**: "Invalid or expired token"
- **Solution**: Clear localStorage and re-login
- **Code**: `localStorage.clear()` in browser console

**Issue**: PDF processing stuck on "processing" status
- **Solution**: Check backend logs for Python errors
- **Check**: File permissions, Python dependencies, disk space

**Issue**: Images not displaying in viewer
- **Solution**: Verify files exist in `uploads/catalogs/{id}/pages/`
- **Check**: Backend static file serving is enabled (`app.use('/uploads', ...)`)

**Issue**: CORS errors
- **Solution**: Check `CORS_ORIGIN` in `.env` matches frontend URL
- **Dev**: Should be `http://localhost:5173`

---

## 🔀 Git Workflow

### Branch Naming

Follow the pattern: `claude/description-sessionId`

Example: `claude/add-search-feature-017yoSoFDVgoeKWV23EmQzty`

### Commit Messages

Use conventional commits style:
- `feat: Add search functionality to viewer`
- `fix: Correct flipbook page sizing issue`
- `refactor: Simplify PDF processing logic`
- `docs: Update CLAUDE.md with new conventions`
- `chore: Update dependencies`

### Development Flow

1. **Create feature branch**:
   ```bash
   git checkout -b claude/feature-name-sessionId
   ```

2. **Make changes and commit**:
   ```bash
   git add .
   git commit -m "feat: Description of changes"
   ```

3. **Push to origin**:
   ```bash
   git push -u origin claude/feature-name-sessionId
   ```

4. **Create Pull Request** (via GitHub UI or `gh` CLI if available)

### Recent Work Context

Recent commits show focus on:
- Flipbook viewer improvements (react-pageflip integration)
- Search functionality in viewer
- Double-page detection and layout
- Text extraction refactoring (single DB per catalog)

---

## ⚠️ Important Gotchas

### 1. ES Modules Everywhere
- Both frontend and backend use `"type": "module"`
- Always use `.js` extension in imports: `import db from './config/database.js'`
- Use `import.meta.url` instead of `__dirname`:
  ```javascript
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  ```

### 2. Python Environment
- **Always activate venv** before starting backend: `source venv/bin/activate`
- Python script must return JSON on stdout (not stderr)
- Error messages should be JSON: `{"success": false, "error": "message"}`

### 3. File Paths
- Use `path.resolve()` or `path.join()` for cross-platform compatibility
- Backend paths are relative to `backend/` directory
- Frontend Vite serves from `frontend/` directory

### 4. Database Transactions
- SQLite doesn't handle concurrent writes well
- Use `.serialize()` for sequential operations if needed
- Consider PostgreSQL for production (Knex already supports it)

### 5. Authentication
- JWT tokens stored in `localStorage` on frontend
- Axios interceptor adds `Authorization: Bearer {token}` header automatically
- Middleware `authenticate` checks token on protected routes

### 6. Async Processing
- PDF processing is **asynchronous** (doesn't block upload response)
- Frontend should poll `/api/admin/catalogs/:id` to check `status` field
- Possible statuses: `processing`, `ready`, `error`

### 7. Clickable Area Config
- `config` column is JSON stored as TEXT
- Always `JSON.parse()` when reading, `JSON.stringify()` when writing
- Schema varies by `type`:
  - `link_external`: `{url: string, target: 'iframe'|'_blank'}`
  - `link_internal`: `{page_number: number}`
  - `javascript`: `{code: string}`
  - `audio`: `{url: string, autoplay: boolean}`
  - `video`: `{url: string, provider: 'mp4'|'youtube'|'dailymotion'|'vimeo', display: 'inline'|'popup'}`

### 8. Konva Canvas Coordinates
- Konva uses image dimensions as canvas size
- Coordinates are relative to image, not viewport
- Scale factor must be applied when saving: `x = stageX / scale`

### 9. React State Updates
- State updates are asynchronous in React
- Use functional updates when new state depends on old: `setState(prev => prev + 1)`
- Don't mutate state directly: always create new objects/arrays

### 10. Frontend Build for Production
- Run `npm run build` in `frontend/` to create `dist/` folder
- Backend should serve `dist/` as static files in production
- Remember to set `NODE_ENV=production` and update `CORS_ORIGIN`

---

## 🎯 Best Practices for AI Assistants

### When Making Changes

1. **Read existing code first**: Understand the pattern before adding new code
2. **Maintain consistency**: Match existing style, naming, and structure
3. **Check dependencies**: Ensure new code doesn't break existing functionality
4. **Test thoroughly**: Manually test changes in both frontend and backend
5. **Update documentation**: Modify this file if you introduce new patterns

### When Debugging

1. **Check logs**: Backend console and browser console are your friends
2. **Verify assumptions**: Don't assume the database is up to date
3. **Trace the flow**: Follow request from frontend → route → controller → service → database
4. **Isolate the issue**: Test components individually (API endpoint, Python script, etc.)

### When Adding Features

1. **Plan first**: Consider impact on existing architecture
2. **Start small**: Get a minimal version working before adding complexity
3. **Follow patterns**: Use existing code as a template
4. **Consider edge cases**: Null checks, error handling, validation
5. **Document your work**: Add comments for complex logic

### Communication

- Be explicit about file locations when discussing changes
- Use line numbers when referencing specific code: `catalogController.js:45`
- Explain **why** a change is needed, not just **what** changed
- Mention any assumptions or uncertainties

---

## 📚 Additional Resources

- **Architecture Details**: See `ARCHITECTURE.md`
- **Installation Guide**: See `SETUP.md` (French)
- **User Documentation**: See `README.md`
- **API Endpoints**: Listed in `ARCHITECTURE.md` and `README.md`
- **Database Schema**: Defined in `backend/src/config/database.js`

---

## 🔄 Keeping This Document Updated

This file should be updated whenever:
- New architectural patterns are introduced
- Significant features are added
- Development workflow changes
- New conventions are established
- Important gotchas are discovered

**Last Updated**: 2025-01-17
**Current State**: Hybrid Node.js + Python architecture with React frontend, focus on flipbook viewer and search functionality.
