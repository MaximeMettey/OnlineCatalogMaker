import knex from 'knex';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbConfig = {
  client: process.env.DB_CLIENT || 'sqlite3',
  connection:
    process.env.DB_CLIENT === 'pg'
      ? {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
        }
      : {
          filename: join(__dirname, '../../', process.env.DB_FILENAME || './data/catalogs.db'),
        },
  useNullAsDefault: true,
  pool: {
    min: 2,
    max: 10,
  },
};

// Main database instance
export const db = knex(dbConfig);

// Function to create a connection to a specific text database
export const getTextDb = (catalogId, pageNumber) => {
  const textDbPath = join(
    __dirname,
    '../../data',
    `page_${catalogId}_${pageNumber}.db`
  );

  return knex({
    client: 'sqlite3',
    connection: {
      filename: textDbPath,
    },
    useNullAsDefault: true,
  });
};

// Initialize main database tables
export const initDatabase = async () => {
  try {
    // Users table
    if (!(await db.schema.hasTable('users'))) {
      await db.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('email').unique().notNullable();
        table.string('password_hash').notNullable();
        table.string('role').defaultTo('admin');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('last_login');
      });
      console.log('Created users table');
    }

    // Catalogs table
    if (!(await db.schema.hasTable('catalogs'))) {
      await db.schema.createTable('catalogs', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('original_filename').notNullable();
        table.string('slug').unique().notNullable();
        table.timestamp('upload_date').defaultTo(db.fn.now());
        table.boolean('processed').defaultTo(false);
        table.integer('total_pages').defaultTo(0);
        table.string('status').defaultTo('processing'); // processing, ready, error
        table.text('error_message');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created catalogs table');
    }

    // Pages table
    if (!(await db.schema.hasTable('pages'))) {
      await db.schema.createTable('pages', (table) => {
        table.increments('id').primary();
        table.integer('catalog_id').unsigned().notNullable();
        table.integer('page_number').notNullable();
        table.string('pdf_path');
        table.string('png_path');
        table.string('jpg_path');
        table.string('svg_path');
        table.string('text_db_path');
        table.integer('width');
        table.integer('height');
        table.timestamp('created_at').defaultTo(db.fn.now());

        table.foreign('catalog_id').references('catalogs.id').onDelete('CASCADE');
        table.unique(['catalog_id', 'page_number']);
      });
      console.log('Created pages table');
    }

    // Clickable areas table
    if (!(await db.schema.hasTable('clickable_areas'))) {
      await db.schema.createTable('clickable_areas', (table) => {
        table.increments('id').primary();
        table.integer('page_id').unsigned().notNullable();
        table.string('type').notNullable(); // link_external, link_internal, javascript, audio, video
        table.float('x').notNullable();
        table.float('y').notNullable();
        table.float('width').notNullable();
        table.float('height').notNullable();
        table.json('config').notNullable(); // Type-specific configuration
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());

        table.foreign('page_id').references('pages.id').onDelete('CASCADE');
      });
      console.log('Created clickable_areas table');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Initialize text database for a specific page
export const initTextDb = async (catalogId, pageNumber) => {
  const textDb = getTextDb(catalogId, pageNumber);

  try {
    // Paragraphs table
    if (!(await textDb.schema.hasTable('paragraphs'))) {
      await textDb.schema.createTable('paragraphs', (table) => {
        table.increments('id').primary();
        table.text('text').notNullable();
        table.float('x').notNullable();
        table.float('y').notNullable();
        table.float('width').notNullable();
        table.float('height').notNullable();
        table.integer('word_count').defaultTo(0);
      });
    }

    // Words table
    if (!(await textDb.schema.hasTable('words'))) {
      await textDb.schema.createTable('words', (table) => {
        table.increments('id').primary();
        table.text('text').notNullable();
        table.float('x').notNullable();
        table.float('y').notNullable();
        table.float('width').notNullable();
        table.float('height').notNullable();
        table.string('font_name');
        table.float('font_size');
        table.integer('paragraph_id').unsigned();

        table.foreign('paragraph_id').references('paragraphs.id').onDelete('CASCADE');
      });
    }

    console.log(`Text database initialized for catalog ${catalogId}, page ${pageNumber}`);
  } catch (error) {
    console.error('Error initializing text database:', error);
    throw error;
  } finally {
    await textDb.destroy();
  }
};

export default db;
