import api from './api';

export const clickableAreaService = {
  createArea: async (pageId, areaData) => {
    const response = await api.post(`/admin/pages/${pageId}/areas`, areaData);
    return response.data.area;
  },

  updateArea: async (areaId, areaData) => {
    const response = await api.put(`/admin/areas/${areaId}`, areaData);
    return response.data.area;
  },

  deleteArea: async (areaId) => {
    const response = await api.delete(`/admin/areas/${areaId}`);
    return response.data;
  },

  getPageAreas: async (pageId) => {
    const response = await api.get(`/admin/pages/${pageId}/areas`);
    return response.data.areas;
  },
};

export default clickableAreaService;
