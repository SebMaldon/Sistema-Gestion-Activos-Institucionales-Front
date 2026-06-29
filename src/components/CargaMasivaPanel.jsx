import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_CATALOGOS_BIENES_QUERY, CREATE_BIENES_BULK_MUTATION, CHECK_BIENES_EXIST_QUERY } from '../api/inventario.queries';
import { Upload, Download, Trash2, Edit2, Loader2, Save, FileSpreadsheet } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CargaMasivaRowModal } from './CargaMasivaRowModal';

export default function CargaMasivaPanel() {
 const { showToast } = useApp();
 const queryClient = useQueryClient();
 const fileInputRef = useRef(null);
 
 const [rows, setRows] = useState([]);
 const [editingRowIndex, setEditingRowIndex] = useState(null);

 // Cargar catálogos para mapear nombres a IDs si el usuario ingresa texto en Excel
 const { data: catalogs, isLoading: catalogsLoading } = useQuery({
 queryKey: ['catalogos-bienes-bulk'],
 queryFn: () => gqlClient.request(GET_CATALOGOS_BIENES_QUERY),
 staleTime: 60000,
 });

 const { mutate: createBienesBulk, isPending: isSaving } = useMutation({
 mutationFn: (bienes) => gqlClient.request(CREATE_BIENES_BULK_MUTATION, { bienes }),
 onSuccess: () => {
 showToast('Todos los bienes fueron registrados correctamente', 'success');
 setRows([]);
 if (fileInputRef.current) fileInputRef.current.value = '';
 queryClient.invalidateQueries({ queryKey: ['bienes'] });
 queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
 },
 onError: (e) => {
 showToast(e?.response?.errors?.[0]?.message || 'Error al guardar los bienes', 'error');
 }
 });

 const handleDownloadTemplate = (type) => {
 let headers = [
 "Num. Serie (Texto)", "Num. Inventario (Texto)", "Cantidad (Número)", "Categoria (Nombre o ID - Texto/Num)", 
 "Modelo (Texto)", "Marca (Nombre o ID - Texto/Num)", "Tipo Dispositivo (Nombre o ID - Texto/Num)", "Descripción Modelo (Texto)",
 "Estatus Operativo (Texto)", "Unidad Medida (Nombre o ID - Texto/Num)", 
 "Unidad Base (Clave - Texto)", "Ubicacion (Nombre o ID - Texto/Num)", 
 "Usuario Resguardo (Matricula o Nombre - Texto)", "Fecha Adquisicion (YYYY-MM-DD - Fecha)"
 ];

 let exampleData = [
 "SERIE123", "INV-001", 1, "Equipo de Computo", 
 "LATITUDE-5420", "Dell", "Laptop", "Laptop 14 pulgadas",
 "ACTIVO", "Pieza", 
 "UMF-1", "Sistemas", "12345678", "2024-01-01"
 ];

 if (type === 'computo') {
 headers = headers.concat([
 "Sistema Operativo (Texto)", "CPU (Texto)", "RAM (GB - Número)", "Almacenamiento (GB - Número)", 
 "Direccion IP (Texto)", "MAC Address (Texto)", "Switch (Texto)", "Puerto Red (Texto)", "Serie Monitor Asignado (Texto)"
 ]);
 exampleData = exampleData.concat([
 "Windows 11", "Intel Core i5", 16, 512, 
 "192.168.1.100", "00:1B:44:11:3A:B7", "SW-Core", "FastEthernet0/1", "MON-SERIE-999"
 ]);
 }

 const ws = XLSX.utils.aoa_to_sheet([headers, exampleData]);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, "Plantilla Carga Masiva");
 XLSX.writeFile(wb, type === 'computo' ? "Plantilla_Bienes_Computo.xlsx" : "Plantilla_Bienes_General.xlsx");
 };

 const handleFileUpload = (e) => {
 const file = e.target.files[0];
 if (!file) return;

 const reader = new FileReader();
 reader.onload = async (evt) => {
 try {
 const bstr = evt.target.result;
 const wb = XLSX.read(bstr, { type: 'binary' });
 const wsname = wb.SheetNames[0];
 const ws = wb.Sheets[wsname];
 const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

 const normalizeText = (text) => text ? String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

 const mappedRows = data.map((row, index) => {
 // Intentar mapear Categoría
 let id_categoria = null;
 const catStr = String(row["Categoria (Nombre o ID - Texto/Num)"] || row["Categoria (Nombre o ID)"] || "").trim();
 if (catStr) {
 if (!isNaN(parseInt(catStr))) id_categoria = parseInt(catStr);
 else {
 const match = catalogs?.catCategoriasActivo?.find(c => normalizeText(c.nombre_categoria) === normalizeText(catStr));
 if (match) id_categoria = match.id_categoria;
 }
 }

 // Intentar mapear Unidad Medida
 let id_unidad_medida = null;
 const umStr = String(row["Unidad Medida (Nombre o ID - Texto/Num)"] || row["Unidad Medida (Nombre o ID)"] || "").trim();
 if (umStr) {
 if (!isNaN(parseInt(umStr))) id_unidad_medida = parseInt(umStr);
 else {
 const match = catalogs?.catUnidadesMedida?.find(u => normalizeText(u.nombre_unidad) === normalizeText(umStr) || normalizeText(u.abreviatura) === normalizeText(umStr));
 if (match) id_unidad_medida = parseInt(match.id_unidad_medida);
 }
 }

 let clave_modelo = String(row["Modelo (Texto)"] || row["Modelo"] || "").trim() || null;
 let invalidModelo = false;
 if (clave_modelo) {
 const match = catalogs?.catModelos?.find(m => m.clave_modelo.toUpperCase() === clave_modelo.toUpperCase());
 if (match) {
 clave_modelo = match.clave_modelo;
 } else {
 invalidModelo = true;
 }
 }

 // Intentar mapear Marca
 let id_marca = null;
 const marcaStr = String(row["Marca (Nombre o ID - Texto/Num)"] || row["Marca"] || "").trim();
 if (marcaStr) {
 if (!isNaN(parseInt(marcaStr))) id_marca = parseInt(marcaStr);
 else {
 const match = catalogs?.marcas?.find(m => normalizeText(m.marca) === normalizeText(marcaStr));
 if (match) id_marca = parseInt(match.clave_marca);
 }
 }

 // Intentar mapear Tipo Dispositivo
 let id_tipo_disp = null;
 const tipoStr = String(row["Tipo Dispositivo (Nombre o ID - Texto/Num)"] || row["Tipo Dispositivo"] || "").trim();
 if (tipoStr) {
 if (!isNaN(parseInt(tipoStr))) id_tipo_disp = parseInt(tipoStr);
 else {
 const match = catalogs?.tiposDispositivo?.find(t => normalizeText(t.nombre_tipo) === normalizeText(tipoStr));
 if (match) id_tipo_disp = parseInt(match.tipo_disp);
 }
 }

 const descrip_modelo = String(row["Descripción Modelo (Texto)"] || row["Descripción Modelo"] || "").trim();

 let clave_unidad_ref = null;
 const unidadStr = String(row["Unidad Base (Clave - Texto)"] || row["Unidad Base (Clave)"] || "").trim();
 if (unidadStr) {
 const match = catalogs?.unidades?.find(u => 
 normalizeText(u.clave) === normalizeText(unidadStr) || 
 normalizeText(u.descripcion) === normalizeText(unidadStr) || 
 normalizeText(u.desc_corta) === normalizeText(unidadStr)
 );
 if (match) {
 clave_unidad_ref = match.clave;
 } else {
 clave_unidad_ref = unidadStr;
 }
 }

 // Intentar mapear Ubicación
 let id_ubicacion = null;
 const ubiStr = String(row["Ubicacion (Nombre o ID - Texto/Num)"] || row["Ubicacion (Nombre o ID)"] || "").trim();
 if (ubiStr && clave_unidad_ref) {
 if (!isNaN(parseInt(ubiStr))) id_ubicacion = parseInt(ubiStr);
 else {
 const match = catalogs?.ubicaciones?.find(u => String(u.id_unidad) === clave_unidad_ref && u.nombre_ubicacion.toLowerCase() === ubiStr.toLowerCase());
 if (match) id_ubicacion = parseInt(match.id_ubicacion);
 }
 }

 // Intentar mapear Usuario Resguardo
 let id_usuario_resguardo = null;
 const usrStr = String(row["Usuario Resguardo (Matricula o Nombre - Texto)"] || row["Usuario Resguardo (Matricula o Nombre)"] || "").trim();
 if (usrStr) {
 const match = catalogs?.usuarios?.edges?.find(e => e.node.matricula === usrStr || e.node.nombre_completo.toLowerCase() === usrStr.toLowerCase());
 if (match) id_usuario_resguardo = parseInt(match.node.id_usuario);
 }

 let fecha_adquisicion = String(row["Fecha Adquisicion (YYYY-MM-DD - Fecha)"] || row["Fecha Adquisicion (YYYY-MM-DD)"] || "").trim() || null;
 
 let estatus_operativo = String(row["Estatus Operativo (Texto)"] || row["Estatus Operativo"] || "ACTIVO").toUpperCase().trim();
 const validStatuses = ['ACTIVO', 'INACTIVO', 'DAÑADO', 'DEVOLUCIÓN', 'OTRO', 'BAJA', 'P_BAJA', 'PRESTAMO', 'SINIESTRADO', 'SUSTITUIDO', 'TRASPASO OOAD', 'TRASPASO_FORANEO'];
 if(!validStatuses.includes(estatus_operativo)) estatus_operativo = 'ACTIVO';

 const especificacionTI = {
 modelo_so: String(row["Sistema Operativo (Texto)"] || row["Sistema Operativo"] || "").trim(),
 cpu_info: String(row["CPU (Texto)"] || row["CPU"] || "").trim(),
 ram_gb: (row["RAM (GB - Número)"] || row["RAM (GB)"]) ? parseInt(row["RAM (GB - Número)"] || row["RAM (GB)"]) : null,
 almacenamiento_gb: (row["Almacenamiento (GB - Número)"] || row["Almacenamiento (GB)"]) ? parseInt(row["Almacenamiento (GB - Número)"] || row["Almacenamiento (GB)"]) : null,
 dir_ip: String(row["Direccion IP (Texto)"] || row["Direccion IP"] || "").trim(),
 mac_address: String(row["MAC Address (Texto)"] || row["MAC Address"] || "").trim(),
 switch_red: String(row["Switch (Texto)"] || row["Switch"] || "").trim(),
 puerto_red: String(row["Puerto Red (Texto)"] || row["Puerto Red"] || "").trim(),
 };

 const hasSpecs = Object.values(especificacionTI).some(v => v !== "" && v !== null);

 const serie_monitor_asignado = String(row["Serie Monitor Asignado (Texto)"] || row["Serie Monitor Asignado"] || "").trim() || null;

 return {
 _tmpId: Date.now() + index, // Para key de React
 num_serie: String(row["Num. Serie (Texto)"] || row["Num Serie"] || "").trim(),
 num_inv: String(row["Num. Inventario (Texto)"] || row["Num Inventario"] || "").trim(),
 cantidad: (row["Cantidad (Número)"] || row["Cantidad"]) ? parseFloat(row["Cantidad (Número)"] || row["Cantidad"]) : 1,
 estatus_operativo,
 id_categoria,
 id_unidad_medida,
 clave_modelo,
 invalidModelo,
 tmp_marca: id_marca,
 tmp_tipo: id_tipo_disp,
 tmp_descrip: descrip_modelo,
 clave_unidad_ref,
 id_ubicacion,
 id_usuario_resguardo,
 fecha_adquisicion,
 serie_monitor_asignado,
 especificacionTI: hasSpecs ? especificacionTI : null
 };
 });

 // Determinar qué registros son actualizaciones y cuáles son nuevos
 const numSeries = mappedRows.map(r => r.num_serie).filter(s => s && s.trim() !== '');
 let existingSeries = [];
 if (numSeries.length > 0) {
 try {
 const res = await gqlClient.request(CHECK_BIENES_EXIST_QUERY, { series: numSeries });
 existingSeries = res.checkBienesExistBySerie || [];
 } catch (e) {
 console.error('Error al verificar series existentes:', e);
 }
 }

 const rowsWithUpdateFlag = mappedRows.map(r => ({
 ...r,
 isUpdate: r.num_serie && existingSeries.includes(r.num_serie)
 }));

 setRows(rowsWithUpdateFlag);
 showToast(`Se cargaron ${mappedRows.length} registros del Excel. Por favor revisa y guarda.`, 'success');

 } catch (err) {
 showToast('Error al leer el archivo Excel', 'error');
 console.error(err);
 }
 };
 reader.readAsBinaryString(file);
 };

 const handleSaveRow = (updatedRow) => {
 setRows(prev => prev.map((r, i) => i === editingRowIndex ? updatedRow : r));
 setEditingRowIndex(null);
 };

 const handleRemoveRow = (index) => {
 setRows(prev => prev.filter((_, i) => i !== index));
 };

 const handleSaveAll = () => {
 if (rows.length === 0) return;
 
 // Check for errors first
 const hasErrors = rows.some(r => !r.id_categoria || !r.id_unidad_medida || r.invalidModelo);
 if (hasErrors) {
 return showToast('Hay filas con errores (faltan campos o el modelo no existe). Por favor corrígelas antes de registrar.', 'warning');
 }
 
 // Preparar el payload con conversión explícita a enteros para evitar errores en GraphQL
 const payload = rows.map(r => {
 const { _tmpId, invalidModelo, tmp_marca, tmp_tipo, tmp_descrip, isUpdate, ...data } = r;
 return {
 ...data,
 id_categoria: data.id_categoria ? parseInt(data.id_categoria) : null,
 id_unidad_medida: data.id_unidad_medida ? parseInt(data.id_unidad_medida) : null,
 id_ubicacion: data.id_ubicacion ? parseInt(data.id_ubicacion) : null,
 id_usuario_resguardo: data.id_usuario_resguardo ? parseInt(data.id_usuario_resguardo) : null,
 cantidad: data.cantidad ? parseFloat(data.cantidad) : 1,
 id_monitor: (!data.id_monitor || String(data.id_monitor).trim() === '') ? null : data.id_monitor
 };
 });

 createBienesBulk(payload);
 };

 return (
 <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 overflow-hidden fade-in">
 
 {/* Header Panel */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
 <div>
 <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
 <FileSpreadsheet className="text-green-600 dark:text-green-400" size={24} />
 Carga Masiva de Bienes
 </h2>
 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
 Descarga la plantilla, llénala, y sube el archivo para registrar múltiples bienes a la vez.
 </p>
 </div>
 
 <div className="flex flex-wrap items-center gap-3">
 <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 ">
 <button 
 onClick={() => handleDownloadTemplate('general')}
 className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
 title="Plantilla Básica"
 >
 <Download size={16} /> Básica
 </button>
 <div className="w-px h-5 bg-gray-300" />
 <button 
 onClick={() => handleDownloadTemplate('computo')}
 className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-blue-700 dark:text-blue-400 dark:text-blue-300"
 title="Incluye Especificaciones TI"
 >
 <Download size={16} /> Cómputo / Redes
 </button>
 </div>

 <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50">
 <Upload size={16} />
 Subir Excel
 <input 
 type="file" 
 ref={fileInputRef}
 accept=".xlsx, .xls" 
 className="hidden" 
 onChange={handleFileUpload}
 disabled={catalogsLoading}
 />
 </label>
 </div>
 </div>

 {/* Main Content */}
 <div className="flex-1 overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg">
 {rows.length === 0 ? (
 <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
 <FileSpreadsheet size={48} className="text-gray-300 mb-4" />
 <p className="text-gray-500 dark:text-gray-400 font-medium">No hay registros cargados</p>
 <p className="text-sm text-gray-400 mt-1">Sube un archivo de Excel para comenzar</p>
 </div>
 ) : (
 <>
 <div className="bg-green-50 dark:bg-green-900/20 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
 <span className="text-sm font-semibold text-green-800 dark:text-green-300 flex gap-4">
 <span>{rows.length} {rows.length === 1 ? 'registro en memoria' : 'registros en memoria'}</span>
 <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-400"></div> Nuevos</span>
 <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-400"></div> Actualizaciones</span>
 </span>
 <button 
 onClick={handleSaveAll}
 disabled={isSaving}
 className="flex items-center gap-2 px-5 py-1.5 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors shadow-sm disabled:opacity-50"
 >
 {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
 {isSaving ? 'Registrando...' : 'Registrar Todos'}
 </button>
 </div>
 
 <div className="flex-1 overflow-auto bg-white dark:bg-gray-800 ">
 <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
 <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
 <tr>
 <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 border-b">Serie</th>
 <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 border-b">Inventario</th>
 <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 border-b">Modelo</th>
 <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 border-b text-center">Cant.</th>
 <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 border-b">Cat/UM</th>
 <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 border-b text-center">TI Specs</th>
 <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 border-b text-center w-24">Acciones</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
 {rows.map((row, index) => {
 // Verificaciones simples visuales
 const hasErrors = !row.id_categoria || !row.id_unidad_medida || row.invalidModelo;
 
 return (
 <tr key={row._tmpId} className={`transition-colors ${hasErrors ? 'bg-red-50 dark:bg-red-900/20' : row.isUpdate ? 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100/50' : 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100/50'}`}>
 <td className="px-4 py-3 font-mono text-xs">{row.num_serie || '—'}</td>
 <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 ">{row.num_inv || '—'}</td>
 <td className="px-4 py-3 text-xs">
 {row.invalidModelo ? (
 <span className="text-red-500 font-bold" title="Modelo no existe en el catálogo">! {row.clave_modelo || 'Invalido'}</span>
 ) : (
 <span className="text-gray-700 dark:text-gray-300 ">{row.clave_modelo || '—'}</span>
 )}
 </td>
 <td className="px-4 py-3 text-center">{row.cantidad}</td>
 <td className="px-4 py-3 text-xs">
 {row.id_categoria ? <span className="text-green-600 dark:text-green-400">✔ Cat</span> : <span className="text-red-500 font-bold" title="Categoría es requerida">! Cat</span>}
 {' | '}
 {row.id_unidad_medida ? <span className="text-green-600 dark:text-green-400">✔ UM</span> : <span className="text-red-500 font-bold" title="Unidad de Medida es requerida">! UM</span>}
 </td>
 <td className="px-4 py-3 text-center text-xs">
 {row.especificacionTI ? (
 <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 dark:text-blue-300">Sí</span>
 ) : (
 <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 ">No</span>
 )}
 </td>
 <td className="px-4 py-3 text-center">
 <div className="flex items-center justify-center gap-2">
 <button 
 onClick={() => setEditingRowIndex(index)}
 className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 rounded transition-colors"
 title="Editar fila"
 >
 <Edit2 size={16} />
 </button>
 <button 
 onClick={() => handleRemoveRow(index)}
 className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
 title="Eliminar fila"
 >
 <Trash2 size={16} />
 </button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </>
 )}
 </div>

 {/* Render Modal */}
 {editingRowIndex !== null && (
 <CargaMasivaRowModal 
 row={rows[editingRowIndex]} 
 onSave={handleSaveRow}
 onClose={() => setEditingRowIndex(null)}
 />
 )}
 </div>
 );
}
