import db from '../config/database.js';

export const getCatalogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const catalog = await db('catalogs')
      .where({ slug, status: 'ready' })
      .select('id', 'name', 'slug', 'total_pages', 'created_at')
      .first();

    if (!catalog) {
      return res.status(404).json({ error: 'Catalog not found' });
    }

    res.json({ catalog });
  } catch (error) {
    console.error('Get catalog by slug error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getViewerPages = async (req, res) => {
  try {
    const { slug } = req.params;

    const catalog = await db('catalogs').where({ slug, status: 'ready' }).first();
    if (!catalog) {
      return res.status(404).json({ error: 'Catalog not found' });
    }

    const pages = await db('pages')
      .where({ catalog_id: catalog.id })
      .select('id', 'page_number', 'png_path', 'jpg_path', 'width', 'height')
      .orderBy('page_number');

    res.json({ pages });
  } catch (error) {
    console.error('Get viewer pages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getViewerPage = async (req, res) => {
  try {
    const { slug, pageNum } = req.params;

    const catalog = await db('catalogs').where({ slug, status: 'ready' }).first();
    if (!catalog) {
      return res.status(404).json({ error: 'Catalog not found' });
    }

    const page = await db('pages')
      .where({ catalog_id: catalog.id, page_number: pageNum })
      .select('id', 'page_number', 'png_path', 'jpg_path', 'width', 'height')
      .first();

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Get clickable areas for this page
    const areas = await db('clickable_areas')
      .where({ page_id: page.id })
      .select('id', 'type', 'x', 'y', 'width', 'height', 'config');

    // Parse JSON config
    const areasWithConfig = areas.map((area) => ({
      ...area,
      config: JSON.parse(area.config),
    }));

    res.json({
      page,
      areas: areasWithConfig,
    });
  } catch (error) {
    console.error('Get viewer page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default { getCatalogBySlug, getViewerPages, getViewerPage };
