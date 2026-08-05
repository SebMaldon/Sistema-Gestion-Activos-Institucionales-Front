import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gqlClient } from '../client';
import { obtenerTodasNotificaciones, crearNotificacion, eliminarNotificacion } from '../anuncios.service';
import { TODAS_NOTIFICACIONES_QUERY, CREATE_NOTIFICACION_MUTATION, DELETE_NOTIFICACION_MUTATION } from '../anuncios.queries';

// Mock del cliente GraphQL
vi.mock('../client', () => ({
  gqlClient: {
    request: vi.fn(),
  },
}));

describe('Anuncios Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('obtenerTodasNotificaciones', () => {
    it('debe devolver la lista de notificaciones', async () => {
      const mockResponse = {
        todasNotificaciones: [
          { id_notificacion: 1, titulo: 'Test', mensaje: 'Mensaje test' }
        ]
      };
      gqlClient.request.mockResolvedValueOnce(mockResponse);

      const result = await obtenerTodasNotificaciones(10, 0);
      
      expect(gqlClient.request).toHaveBeenCalledWith(TODAS_NOTIFICACIONES_QUERY, { limit: 10, offset: 0 });
      expect(result).toEqual(mockResponse.todasNotificaciones);
    });

    it('debe devolver un array vacío si no hay notificaciones', async () => {
      gqlClient.request.mockResolvedValueOnce({});

      const result = await obtenerTodasNotificaciones(10, 0);
      
      expect(result).toEqual([]);
    });

    it('debe propagar errores', async () => {
      const mockError = new Error('Network error');
      gqlClient.request.mockRejectedValueOnce(mockError);

      await expect(obtenerTodasNotificaciones()).rejects.toThrow('Network error');
    });
  });

  describe('crearNotificacion', () => {
    it('debe crear una notificación', async () => {
      const mockData = { titulo: 'Nuevo', mensaje: 'Hola', tipo_audiencia: 'GLOBAL', id_audiencia: null };
      const mockResponse = {
        createNotificacion: { id_notificacion: 2, ...mockData }
      };
      gqlClient.request.mockResolvedValueOnce(mockResponse);

      const result = await crearNotificacion(mockData);

      expect(gqlClient.request).toHaveBeenCalledWith(CREATE_NOTIFICACION_MUTATION, mockData);
      expect(result).toEqual(mockResponse.createNotificacion);
    });
  });

  describe('eliminarNotificacion', () => {
    it('debe eliminar una notificación devolviendo true', async () => {
      gqlClient.request.mockResolvedValueOnce({ deleteNotificacion: true });

      const result = await eliminarNotificacion(5);

      expect(gqlClient.request).toHaveBeenCalledWith(DELETE_NOTIFICACION_MUTATION, { id_notificacion: 5 });
      expect(result).toBe(true);
    });
  });
});
