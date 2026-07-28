import { gqlClient } from './client';
import { 
  CREATE_NOTIFICACION_MUTATION, 
  TODAS_NOTIFICACIONES_QUERY, 
  DELETE_NOTIFICACION_MUTATION 
} from './anuncios.queries';

/**
 * Obtiene todas las notificaciones paginadas
 * @param {number} limit 
 * @param {number} offset 
 * @returns {Promise<Array>} Lista de notificaciones
 */
export const obtenerTodasNotificaciones = async (limit = 50, offset = 0) => {
  try {
    const res = await gqlClient.request(TODAS_NOTIFICACIONES_QUERY, { limit, offset });
    return res.todasNotificaciones || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Crea una nueva notificación
 * @param {Object} data Datos de la notificación
 * @param {string} data.titulo
 * @param {string} data.mensaje
 * @param {string} data.tipo_audiencia
 * @param {string|null} data.id_audiencia
 * @returns {Promise<Object>} Notificación creada
 */
export const crearNotificacion = async (data) => {
  try {
    const res = await gqlClient.request(CREATE_NOTIFICACION_MUTATION, data);
    return res.createNotificacion;
  } catch (error) {
    throw error;
  }
};

/**
 * Elimina una notificación existente
 * @param {number} id_notificacion 
 * @returns {Promise<boolean>} true si se eliminó
 */
export const eliminarNotificacion = async (id_notificacion) => {
  try {
    const res = await gqlClient.request(DELETE_NOTIFICACION_MUTATION, { id_notificacion });
    return res.deleteNotificacion;
  } catch (error) {
    throw error;
  }
};
