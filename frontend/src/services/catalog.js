import api from './api';

export const catalogService = {
  // Admin endpoints
  uploadCatalog: async (file, name) => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('name', name);

    const response = await api.post('/admin/catalogs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getCatalogs: async () => {
    const response = await api.get('/admin/catalogs');
    return response.data.catalogs;
  },

  getCatalog: async (id) => {
    const response = await api.get(`/admin/catalogs/${id}`);
    return response.data.catalog;
  },

  deleteCatalog: async (id) => {
    const response = await api.delete(`/admin/catalogs/${id}`);
    return response.data;
  },

  getPages: async (catalogId) => {
    const response = await api.get(`/admin/catalogs/${catalogId}/pages`);
    return response.data.pages;
  },

  getPage: async (catalogId, pageNum) => {
    const response = await api.get(`/admin/catalogs/${catalogId}/pages/${pageNum}`);
    return response.data.page;
  },

  getPageText: async (catalogId, pageNum) => {
    const response = await api.get(`/admin/catalogs/${catalogId}/pages/${pageNum}/text`);
    return response.data;
  },

  // Viewer endpoints (public)
  getViewerCatalog: async (slug) => {
    const response = await api.get(`/viewer/${slug}`);
    return response.data.catalog;
  },

  getViewerPages: async (slug) => {
    const response = await api.get(`/viewer/${slug}/pages`);
    return response.data.pages;
  },

  getViewerPage: async (slug, pageNum) => {
    const response = await api.get(`/viewer/${slug}/pages/${pageNum}`);
    return response.data;
  },
};

export default catalogService;
