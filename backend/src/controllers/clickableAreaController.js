import db from '../config/database.js';
import Joi from 'joi';

// Validation schema
const areaSchema = Joi.object({
  type: Joi.string()
    .valid('link_external', 'link_internal', 'javascript', 'audio', 'video')
    .required(),
  x: Joi.number().required(),
  y: Joi.number().required(),
  width: Joi.number().required(),
  height: Joi.number().required(),
  config: Joi.object().required(),
});

export const createArea = async (req, res) => {
  try {
    const { pageId } = req.params;

    // Validate input
    const { error, value } = areaSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if page exists
    const page = await db('pages').where({ id: pageId }).first();
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Validate config based on type
    const configError = validateConfig(value.type, value.config);
    if (configError) {
      return res.status(400).json({ error: configError });
    }

    // Create clickable area
    const [areaId] = await db('clickable_areas').insert({
      page_id: pageId,
      type: value.type,
      x: value.x,
      y: value.y,
      width: value.width,
      height: value.height,
      config: JSON.stringify(value.config),
    });

    const area = await db('clickable_areas').where({ id: areaId }).first();

    res.status(201).json({
      message: 'Clickable area created',
      area: {
        ...area,
        config: JSON.parse(area.config),
      },
    });
  } catch (error) {
    console.error('Create area error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateArea = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if area exists
    const existingArea = await db('clickable_areas').where({ id }).first();
    if (!existingArea) {
      return res.status(404).json({ error: 'Clickable area not found' });
    }

    // Validate input
    const { error, value } = areaSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Validate config based on type
    const configError = validateConfig(value.type, value.config);
    if (configError) {
      return res.status(400).json({ error: configError });
    }

    // Update area
    await db('clickable_areas')
      .where({ id })
      .update({
        type: value.type,
        x: value.x,
        y: value.y,
        width: value.width,
        height: value.height,
        config: JSON.stringify(value.config),
        updated_at: db.fn.now(),
      });

    const area = await db('clickable_areas').where({ id }).first();

    res.json({
      message: 'Clickable area updated',
      area: {
        ...area,
        config: JSON.parse(area.config),
      },
    });
  } catch (error) {
    console.error('Update area error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteArea = async (req, res) => {
  try {
    const { id } = req.params;

    const area = await db('clickable_areas').where({ id }).first();
    if (!area) {
      return res.status(404).json({ error: 'Clickable area not found' });
    }

    await db('clickable_areas').where({ id }).delete();

    res.json({ message: 'Clickable area deleted' });
  } catch (error) {
    console.error('Delete area error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPageAreas = async (req, res) => {
  try {
    const { pageId } = req.params;

    // Check if page exists
    const page = await db('pages').where({ id: pageId }).first();
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const areas = await db('clickable_areas')
      .where({ page_id: pageId })
      .select('*')
      .orderBy('created_at');

    // Parse JSON config
    const areasWithConfig = areas.map((area) => ({
      ...area,
      config: JSON.parse(area.config),
    }));

    res.json({ areas: areasWithConfig });
  } catch (error) {
    console.error('Get page areas error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to validate config based on type
function validateConfig(type, config) {
  switch (type) {
    case 'link_external':
      if (!config.url || typeof config.url !== 'string') {
        return 'External link requires url in config';
      }
      if (config.target && !['iframe', '_blank'].includes(config.target)) {
        return 'Target must be "iframe" or "_blank"';
      }
      break;

    case 'link_internal':
      if (!config.page_id || typeof config.page_id !== 'number') {
        return 'Internal link requires page_id in config';
      }
      break;

    case 'javascript':
      if (!config.code || typeof config.code !== 'string') {
        return 'JavaScript requires code in config';
      }
      break;

    case 'audio':
      if (!config.url || typeof config.url !== 'string') {
        return 'Audio requires url in config';
      }
      break;

    case 'video':
      if (!config.url || typeof config.url !== 'string') {
        return 'Video requires url in config';
      }
      if (
        config.provider &&
        !['mp4', 'youtube', 'dailymotion', 'vimeo'].includes(config.provider)
      ) {
        return 'Video provider must be mp4, youtube, dailymotion, or vimeo';
      }
      if (config.display && !['inline', 'popup'].includes(config.display)) {
        return 'Video display must be "inline" or "popup"';
      }
      break;

    default:
      return 'Invalid area type';
  }

  return null;
}

export default { createArea, updateArea, deleteArea, getPageAreas };
