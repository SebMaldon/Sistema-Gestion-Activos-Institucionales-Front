import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_BIENES_QUERY, GET_BIEN_BY_SERIE_QUERY } from '../api/inventario.queries';
import {
 GET_FOLIO_SALIDAS,
 REGISTRAR_SALIDA,
 SET_FOLIO_MANUAL,
 GET_USUARIO_POR_MATRICULA,
 ACTUALIZAR_SALIDA,
} from '../api/salidas.queries';
import { GET_USUARIOS } from '../api/usuarios.queries';
import { useAuthStore } from '../store/auth.store';
import { useApp } from '../context/AppContext';
import { useCatalogosBienes } from '../hooks/useCatalogosBienes';
import {
 FileText, Trash2, Loader2, Download, Eye, Check,
 Hash, Edit2, X, Printer, ChevronRight, AlertCircle,
 UserCheck, Plus, Upload, HelpCircle, MonitorUp,
 User, Package, Monitor
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import * as XLSX from 'xlsx';
import { buildPDFBytes, ROWS_PER_PAGE } from '../utils/pdfSalidas';

// ── Constantes ────────────────────────────────────────────────────────────────
const ROLES_MAP = { MAESTRO: 1 };

// Nombre del campo PDF para fila i (1-indexed), columna col (1-3)
const pdfRowField = (row, col) => {
 if (col === 1 && row === 5) return 'f451'; // typo histórico en el PDF
 return `f${row}c${col}`;
};

// ── Componente ────────────────────────────────────────────────────────────────
export default function SalidasForm({ isEditMode = false, initialData = null, onClose, onSuccessCallback }) {
 const { showToast } = useApp();
 const usuario = useAuthStore((s) => s.usuario);
 const isMaestro = usuario?.id_rol === ROLES_MAP.MAESTRO;
 const queryClient = useQueryClient();
 const { data: catalogos } = useCatalogosBienes();

 // ─── Formulario ────────────────────────────────────────────
 const [form, setForm] = useState({
 solicitante: initialData?.solicitante || '',
 matricula: initialData?.matricula || '',
 adscripcion: initialData?.adscripcion || '',
 identificacion: initialData?.identificacion || '',
 empresa: initialData?.empresa || 'IMSS',
 telefono: initialData?.telefono || '',
 motivo: initialData?.motivo || '',
 observaciones: initialData?.observaciones || '',
 devolucion: initialData?.sujeto_devolucion ? 'SI' : 'NO',
 fechaDevolucion: initialData?.fecha_devolucion ? new Date(initialData.fecha_devolucion).toISOString().split('T')[0] : '',
 responsable: initialData?.responsable || '',
 origenBienes: initialData?.origen_bienes || 'COORDINACIÓN DELEGACIONAL DE INFORMÁTICA',
 fechaSalidaDia: initialData?.fecha_salida ? new Date(initialData.fecha_salida).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
 });

 const [bienesSeleccionados, setBienesSeleccionados] = useState(
 initialData?.bienes ? initialData.bienes.map(b => ({
 id_bien: b.id_bien,
 originalData: {
 id_bien: b.id_bien,
 modelo: b.bienRef?.modelo,
 num_serie: b.bienRef?.num_serie,
 num_inv: b.bienRef?.num_inv,
 },
 cantidad: b.cantidad_o_id,
 naturaleza: b.naturaleza,
 descripcion: b.descripcion,
 })) : []
 );
 const fileInputRef = useRef(null);
 const [incluirMonitores, setIncluirMonitores] = useState(false);
 const [bienesSearch, setBienesSearch] = useState('');
 const [debouncedBienesSearch, setDebouncedBienesSearch] = useState('');

 // Debounce para bienes
 useEffect(() => {
 const timer = setTimeout(() => setDebouncedBienesSearch(bienesSearch), 400);
 return () => clearTimeout(timer);
 }, [bienesSearch]);

 // ─── Flujo PDF ─────────────────────────────────────────────
 const [etapa, setEtapa] = useState('formulario'); // 'formulario'|'preview'|'confirmado'
 const [isGenerando, setIsGenerando] = useState(false);
 const [isConfirmando, setIsConfirmando] = useState(false);
 const [previewUrl, setPreviewUrl] = useState(null);
 const [finalUrl, setFinalUrl] = useState(null);
 const [folioUsado, setFolioUsado] = useState(null);

 // ─── Panel Maestro ─────────────────────────────────────────
 const [showGestionFolio, setShowGestionFolio] = useState(false);
 const [folioManualInput, setFolioManualInput] = useState('');
 const [isSettingFolio, setIsSettingFolio] = useState(false);

 // ─── Autocompletado matrícula ──────────────────────────────
 const [matriculaQuery, setMatriculaQuery] = useState('');
 const [nombreAutoFilled, setNombreAutoFilled] = useState(false);
 const matriculaTimer = useRef(null);

 // ─── Queries ──────────────────────────────────────────────
 const { data: folioData, refetch: refetchFolio } = useQuery({
 queryKey: ['folioSalidas'],
 queryFn: () => gqlClient.request(GET_FOLIO_SALIDAS),
 });

 const { data: bienesData, isLoading: isLoadingBienes } = useQuery({
 queryKey: ['bienes', 'TODOS', debouncedBienesSearch],
 queryFn: () => gqlClient.request(GET_BIENES_QUERY, {
 filter: { search: debouncedBienesSearch },
 pagination: { first: 20 },
 }),
 });

 const { data: usuarioMatData } = useQuery({
 queryKey: ['usuarioPorMatricula', matriculaQuery],
 queryFn: () => gqlClient.request(GET_USUARIO_POR_MATRICULA, { matricula: matriculaQuery }),
 enabled: matriculaQuery.length >= 3,
 staleTime: 30_000,
 });

  const { data: usuariosData, isLoading: isLoadingUsuarios } = useQuery({
    queryKey: ['usuariosListAll'],
    queryFn: () => gqlClient.request(GET_USUARIOS, {
      estatus: true,
      pagination: { first: 20000 },
    }),
    staleTime: 5 * 60 * 1000,
  });
  const usuariosList = React.useMemo(() => usuariosData?.usuarios?.edges?.map((e) => e.node) || [], [usuariosData]);

  const usuariosOptionsMatricula = React.useMemo(() => {
    return usuariosList.map((u) => ({
      value: u.matricula,
      label: `${u.matricula} — ${u.nombre_completo}`,
      searchKey: `${u.matricula} ${u.nombre_completo}`,
    }));
  }, [usuariosList]);

  const usuariosOptionsNombre = React.useMemo(() => {
    return usuariosList.map((u) => ({
      value: u.nombre_completo,
      label: `${u.matricula} — ${u.nombre_completo}`,
      searchKey: `${u.matricula} ${u.nombre_completo}`,
    }));
  }, [usuariosList]);

 // ─── Mutations ────────────────────────────────────────────
 const registrarSalidaMutation = useMutation({
 mutationFn: (input) => gqlClient.request(REGISTRAR_SALIDA, { input }),
 onSuccess: () => queryClient.invalidateQueries({ queryKey: ['folioSalidas'] }),
 });

 const actualizarSalidaMutation = useMutation({
 mutationFn: (vars) => gqlClient.request(ACTUALIZAR_SALIDA, vars),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['registroSalidas'] });
 showToast('Registro de salida actualizado exitosamente', 'success');
 if (onSuccessCallback) onSuccessCallback();
 if (onClose) onClose();
 },
 onError: (e) => {
 console.error("Mutation Error:", e);
 let errorDetail = 'Error al actualizar el registro';
 if (e?.response?.errors?.length > 0) {
 errorDetail = e.response.errors[0].message;
 } else if (e.message) {
 errorDetail = e.message;
 }
 showToast(errorDetail, 'error');
 },
 });

 const setFolioManualMutation = useMutation({
 mutationFn: (folio) => gqlClient.request(SET_FOLIO_MANUAL, { folio }),
 onSuccess: (data) => {
 queryClient.invalidateQueries({ queryKey: ['folioSalidas'] });
 showToast(`✅ Folio actualizado. Siguiente: ${data.setFolioManual.siguiente}`, 'success');
 setShowGestionFolio(false);
 setFolioManualInput('');
 },
 onError: (e) => {
 const msg = e?.response?.errors?.[0]?.message || e?.message || 'Error al actualizar el folio';
 showToast(msg, 'error');
 },
 });

 // ── Efectos ──
 useEffect(() => {
 if (!form.responsable) {
 setForm((p) => ({ ...p, responsable: 'GONZALEZ CERVANTES ANA LUISA' }));
 }
 }, []);

 useEffect(() => {
 const u = usuarioMatData?.usuarioPorMatricula;
 if (u?.nombre_completo) {
 setForm((p) => {
 const next = { ...p, solicitante: u.nombre_completo };
 if (u.unidadFisica) {
 next.adscripcion = u.unidadFisica.descripcion || u.unidadFisica.desc_corta || next.adscripcion;
 }
 return next;
 });
 setNombreAutoFilled(true);
 } else if (matriculaQuery.length >= 3) {
 setNombreAutoFilled(false);
 }
 }, [usuarioMatData, matriculaQuery]);

 useEffect(() => () => {
 if (previewUrl) URL.revokeObjectURL(previewUrl);
 if (finalUrl) URL.revokeObjectURL(finalUrl);
 }, []);

 // ─── Interceptar Ctrl+P para imprimir PDF ─────────────────
 useEffect(() => {
 const handlePrint = (e) => {
 if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
 if (etapa === 'confirmado' && finalUrl) {
 e.preventDefault();
 window.open(finalUrl);
 } else if (etapa === 'preview') {
 e.preventDefault();
 showToast('Debes confirmar el folio antes de poder imprimir.', 'warning');
 }
 }
 };
 window.addEventListener('keydown', handlePrint);
 return () => window.removeEventListener('keydown', handlePrint);
 }, [etapa, finalUrl, previewUrl, showToast]);

 // ─── Handlers form ────────────────────────────────────────
 const handleChange = (e) => {
 const { name, value } = e.target;
 setForm((p) => ({ ...p, [name]: value }));
 if (name === 'matricula') {
 setNombreAutoFilled(false);
 clearTimeout(matriculaTimer.current);
 matriculaTimer.current = setTimeout(() => {
 setMatriculaQuery(value.trim().length >= 3 ? value.trim() : '');
 }, 600);
 }
 };

 const bienesList = bienesData?.bienes?.edges?.map((e) => e.node) || [];

 const handleAddBien = (idBien) => {
 if (!idBien) return;
 if (bienesSeleccionados.some((b) => b.id_bien === idBien)) {
 showToast('El bien ya está en la lista.', 'warning');
 return;
 }
 const bien = bienesList.find((b) => b.id_bien === idBien);
 if (bien) {
 setBienesSeleccionados((p) => {
 const updated = [...p];
 const newItems = [];
 const nat = (bien.num_inv && bien.num_inv.trim() !== '') ? 'BMC' : 'BMNC';
 newItems.push({
 id_bien: bien.id_bien,
 cantidad: '1',
 naturaleza: nat,
 descripcion: `${bien.modelo?.descrip_disp || ''}${bien.num_serie ? ` - S/N: ${bien.num_serie}` : ''}${bien.num_inv ? ` - INV: ${bien.num_inv}` : ''}`,
 originalData: bien,
 });

 if (incluirMonitores && bien.monitores && bien.monitores.length > 0) {
 bien.monitores.forEach(rel => {
 const monitorBien = rel.monitor;
 if (monitorBien && !updated.some(b => b.id_bien === monitorBien.id_bien)) {
 const natMon = (monitorBien.num_inv && monitorBien.num_inv.trim() !== '') ? 'BMC' : 'BMNC';
 newItems.push({
 id_bien: monitorBien.id_bien,
 cantidad: '1',
 naturaleza: natMon,
 descripcion: `${monitorBien.modelo?.descrip_disp || ''}${monitorBien.num_serie ? ` - S/N: ${monitorBien.num_serie}` : ''}${monitorBien.num_inv ? ` - INV: ${monitorBien.num_inv}` : ''}`,
 originalData: monitorBien,
 });
 }
 });
 }
 return [...newItems, ...updated];
 });
 }
 };

 const handleAddManualBien = () => {
 setBienesSeleccionados((p) => [
 {
 id_bien: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
 cantidad: '1',
 naturaleza: 'BMNC',
 descripcion: '',
 originalData: null,
 },
 ...p
 ]);
 };

 const handleUpdateBien = (idx, field, value) => {
 const copia = [...bienesSeleccionados];
 copia[idx] = { ...copia[idx], [field]: value };
 setBienesSeleccionados(copia);
 };

 const handleRemoveBien = (idx) => {
 setBienesSeleccionados((p) => p.filter((_, i) => i !== idx));
 };

 const handleDownloadTemplate = () => {
 const ws = XLSX.utils.aoa_to_sheet([['numero de serie']]);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, 'Equipos');
 XLSX.writeFile(wb, 'plantilla_equipos.xlsx');
 };

 const handleImportExcel = (e) => {
 const file = e.target.files[0];
 if (!file) return;

 const reader = new FileReader();
 reader.onload = async (evt) => {
 try {
 const bstr = evt.target.result;
 const wb = XLSX.read(bstr, { type: 'binary' });
 const wsname = wb.SheetNames[0];
 const ws = wb.Sheets[wsname];
 const data = XLSX.utils.sheet_to_json(ws);

 let agregados = 0;
 let noEncontrados = [];

 // 1. Extract serial numbers carefully to avoid matching wrong columns
 const serialsToFetch = [];
 data.forEach(row => {
 const key = Object.keys(row).find(k => {
 const lower = k.toLowerCase().trim();
 return lower === 'numero de serie' || lower === 'serie' || lower === 'num_serie' || lower === 'no. serie';
 });
 if (key && row[key]) {
 const snStr = String(row[key]).trim();
 if (snStr.length > 0) {
 serialsToFetch.push({ rawValue: snStr });
 }
 }
 });

 if (serialsToFetch.length === 0) {
 showToast('No se encontró una columna válida ("numero de serie") o el archivo está vacío.', 'warning');
 e.target.value = null;
 return;
 }

 showToast(`Procesando ${serialsToFetch.length} números de serie...`, 'info');

 // 2. Fetch directly from DB to bypass the 1000 items limitation of the local list
 const fetchPromises = serialsToFetch.map(async item => {
 try {
 const res = await gqlClient.request(GET_BIEN_BY_SERIE_QUERY, { num_serie: item.rawValue });
 return { ...item, bienFound: res.bienByNumSerie };
 } catch (err) {
 return { ...item, bienFound: null };
 }
 });

 const results = await Promise.all(fetchPromises);

 let monitoresAgregados = 0;

 setBienesSeleccionados(prev => {
 let updated = [...prev];
 let newItems = [];
 results.forEach(({ rawValue, bienFound }) => {
 if (bienFound) {
 if (!updated.some(p => p.id_bien === bienFound.id_bien) && !newItems.some(p => p.id_bien === bienFound.id_bien)) {
 agregados++;
 const nat = (bienFound.num_inv && bienFound.num_inv.trim() !== '') ? 'BMC' : 'BMNC';
 newItems.push({
 id_bien: bienFound.id_bien,
 cantidad: bienFound.num_serie || '1',
 naturaleza: nat,
 descripcion: `${bienFound.modelo?.descrip_disp || ''}${bienFound.num_inv ? ` - INV: ${bienFound.num_inv}` : ''}`,
 originalData: bienFound,
 });
 }

 if (incluirMonitores && bienFound.monitores && bienFound.monitores.length > 0) {
 bienFound.monitores.forEach(rel => {
 const monitorBien = rel.monitor;
 if (monitorBien && !updated.some(b => b.id_bien === monitorBien.id_bien) && !newItems.some(b => b.id_bien === monitorBien.id_bien)) {
 monitoresAgregados++;
 const natMon = (monitorBien.num_inv && monitorBien.num_inv.trim() !== '') ? 'BMC' : 'BMNC';
 newItems.push({
 id_bien: monitorBien.id_bien,
 cantidad: monitorBien.num_serie || '1',
 naturaleza: natMon,
 descripcion: `${monitorBien.modelo?.descrip_disp || ''}${monitorBien.num_inv ? ` - INV: ${monitorBien.num_inv}` : ''}`,
 originalData: monitorBien,
 });
 }
 });
 }
 } else {
 noEncontrados.push(rawValue);
 }
 });
 return [...newItems, ...updated];
 });

 setTimeout(() => {
 if (agregados > 0 || monitoresAgregados > 0) {
 const msgs = [];
 if (agregados > 0) msgs.push(`${agregados} equipos`);
 if (monitoresAgregados > 0) msgs.push(`${monitoresAgregados} monitores`);
 showToast(`Se agregaron ${msgs.join(' y ')}.`, 'success');
 } else if (noEncontrados.length === 0) {
 showToast('No se agregaron nuevos equipos (tal vez ya estaban en la lista).', 'info');
 }
 if (noEncontrados.length > 0) {
 showToast(`No se encontraron ${noEncontrados.length} números de serie (revisa la consola).`, 'warning');
 console.warn('Números de serie no encontrados en la base de datos:', noEncontrados);
 }
 }, 300);

 } catch (err) {
 console.error(err);
 showToast('Error al procesar el archivo Excel', 'error');
 }
 e.target.value = null;
 };
 reader.readAsBinaryString(file);
 };

 const handleAgregarMonitoresFaltantes = () => {
 let agregados = 0;
 setBienesSeleccionados(prev => {
 let updated = [...prev];
 let newItems = [];
 prev.forEach(bienSel => {
 const original = bienSel.originalData;
 if (original && original.monitores && original.monitores.length > 0) {
 original.monitores.forEach(rel => {
 const monitorBien = rel.monitor;
 if (monitorBien && !updated.some(b => b.id_bien === monitorBien.id_bien) && !newItems.some(b => b.id_bien === monitorBien.id_bien)) {
 agregados++;
 const natMon = (monitorBien.num_inv && monitorBien.num_inv.trim() !== '') ? 'BMC' : 'BMNC';
 newItems.push({
 id_bien: monitorBien.id_bien,
 cantidad: monitorBien.num_serie || '1',
 naturaleza: natMon,
 descripcion: `${monitorBien.modelo?.descrip_disp || ''}${monitorBien.num_inv ? ` - INV: ${monitorBien.num_inv}` : ''}`,
 originalData: monitorBien,
 });
 }
 });
 }
 });
 return [...newItems, ...updated];
 });

 if (agregados > 0) {
 showToast(`Se agregaron ${agregados} monitores a la lista.`, 'success');
 } else {
 showToast('No se encontraron monitores faltantes para los equipos actuales.', 'info');
 }
 };

 // ─── Handlers flujo PDF ────────────────────────────────────
 const handlePrevisualizar = async () => {
 if (bienesSeleccionados.length === 0) {
 showToast('Agrega al menos un bien para la salida.', 'warning');
 return;
 }
 setIsGenerando(true);
 try {
 const siguiente = folioData?.folioSalidas?.siguiente ?? '1';
 const bytes = await buildPDFBytes(siguiente, form, bienesSeleccionados);

 if (previewUrl) URL.revokeObjectURL(previewUrl);
 setPreviewUrl(URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })));
 setFolioUsado(siguiente);
 setEtapa('preview');
 showToast('Vista previa lista. Confirma para registrar el folio.', 'info');
 } catch (err) {
 console.error(err);
 showToast('Error al generar la previsualización', 'error');
 } finally {
 setIsGenerando(false);
 }
 };

 const handleGuardarCambios = async () => {
 if (bienesSeleccionados.length === 0) {
 showToast('Agrega al menos un bien para la salida.', 'warning');
 return;
 }

 // Create input for mutation
 const input = {
 folio: initialData?.folio,
 fecha_salida: form.fechaSalidaDia,
 matricula: form.matricula,
 solicitante: form.solicitante,
 adscripcion: form.adscripcion,
 empresa: form.empresa,
 identificacion: form.identificacion,
 telefono: form.telefono,
 motivo: form.motivo,
 origen_bienes: form.origenBienes,
 responsable: form.responsable,
 sujeto_devolucion: form.devolucion === 'SI',
 fecha_devolucion: form.devolucion === 'SI' ? (form.fechaDevolucion || null) : null,
 observaciones: form.observaciones,
 bienes: bienesSeleccionados.map((b) => ({
 id_bien: (b.id_bien && b.id_bien.toString().startsWith('manual_')) ? null : b.id_bien,
 cantidad_o_id: String(b.cantidad),
 naturaleza: b.naturaleza,
 descripcion: b.descripcion,
 })),
 };

 const user = usuariosList.find(u => u.matricula === form.matricula);
 if (user) {
 input.id_usuario_solicitante = parseInt(user.id_usuario);
 }

 actualizarSalidaMutation.mutate({
 id_salida: parseInt(initialData.id_salida),
 input
 });
 };

 const handleConfirmar = async () => {
 setIsConfirmando(true);
 try {
 // Create input for mutation
 const input = {
 folio: null, // Let backend decide or use provided
 fecha_salida: form.fechaSalidaDia,
 matricula: form.matricula,
 solicitante: form.solicitante,
 adscripcion: form.adscripcion,
 empresa: form.empresa,
 identificacion: form.identificacion,
 telefono: form.telefono,
 motivo: form.motivo,
 origen_bienes: form.origenBienes,
 responsable: form.responsable,
 sujeto_devolucion: form.devolucion === 'SI',
 fecha_devolucion: form.devolucion === 'SI' ? (form.fechaDevolucion || null) : null,
 observaciones: form.observaciones,
 bienes: bienesSeleccionados.map((b) => ({
 id_bien: (b.id_bien && b.id_bien.toString().startsWith('manual_')) ? null : b.id_bien,
 cantidad_o_id: String(b.cantidad),
 naturaleza: b.naturaleza,
 descripcion: b.descripcion,
 })),
 };

 const user = usuariosList.find(u => u.matricula === form.matricula);
 if (user) {
 input.id_usuario_solicitante = parseInt(user.id_usuario);
 }

 const result = await registrarSalidaMutation.mutateAsync(input);
 const folioReal = result.registrarSalida.folio;

 const bytes = await buildPDFBytes(folioReal, form, bienesSeleccionados);
 if (finalUrl) URL.revokeObjectURL(finalUrl);
 setFinalUrl(URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })));
 setFolioUsado(folioReal);
 setEtapa('confirmado');
 showToast(`✅ Folio ${folioReal} registrado`, 'success');
 } catch (err) {
 console.error(err);
 showToast('Error al registrar la salida', 'error');
 } finally {
 setIsConfirmando(false);
 }
 };

 const handleNuevoFormato = () => {
 if (previewUrl) URL.revokeObjectURL(previewUrl);
 if (finalUrl) URL.revokeObjectURL(finalUrl);
 setPreviewUrl(null);
 setFinalUrl(null);
 setFolioUsado(null);
 setEtapa('formulario');
 setBienesSeleccionados([]);
 refetchFolio();
 };

 const handleSetFolioManual = async () => {
 const num = Number(folioManualInput);
 if (!folioManualInput || !Number.isInteger(num) || num < 1) {
 showToast('Ingresa un número de folio válido', 'warning');
 return;
 }
 setIsSettingFolio(true);
 try { await setFolioManualMutation.mutateAsync(folioManualInput.trim()); }
 finally { setIsSettingFolio(false); }
 };

 // ─── Datos derivados ──────────────────────────────────────
 const folioSiguiente = folioData?.folioSalidas?.siguiente ?? '…';
 const folioActualDB = folioData?.folioSalidas?.folio_actual ?? '0';
 const totalBienes = bienesSeleccionados.length;
 const paginasNecesarias = Math.max(1, Math.ceil(totalBienes / ROWS_PER_PAGE));

 // ── Etapa PREVIEW ─────────────────────────────────────────
 if (etapa === 'preview' && previewUrl) {
 return (
 <div className="fixed inset-0 z-[100] flex flex-col bg-gray-950/95 backdrop-blur-sm">
 <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
 <div className="flex items-center gap-3">
 <Eye size={20} className="text-teal-600 dark:text-teal-400" />
 <div>
 <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 ">Vista Previa — Salida de Bienes</h2>
 <p className="text-xs text-gray-500 dark:text-gray-400 ">
 Folio estimado: <span className="font-bold text-teal-700 dark:text-teal-400">#{folioUsado}</span> — Revisa antes de confirmar
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 dark:border-amber-800/50 rounded-lg text-xs text-amber-700 dark:text-amber-400 dark:text-amber-300">
 <AlertCircle size={13} />
 Solo previsualización — confirma para habilitar descarga
 </div>
 <button onClick={() => setEtapa('formulario')}
 className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold transition-colors">
 ← Regresar
 </button>
 <button onClick={handleConfirmar} disabled={isConfirmando}
 className="flex items-center gap-2 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-60">
 {isConfirmando
 ? <><Loader2 size={16} className="animate-spin" /> Confirmando…</>
 : <><Check size={16} /> Confirmar y Registrar Folio</>}
 </button>
 </div>
 </div>
 <div className="relative flex-1 overflow-hidden bg-gray-800">
 <iframe src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
 className="w-full h-full border-0" title="Vista Previa PDF" />
 {/* Overlays que bloquean el toolbar del visor del navegador */}
 <div className="absolute top-0 left-0 right-0 h-12 z-10 cursor-not-allowed" />
 <div className="absolute bottom-0 left-0 right-0 h-10 z-10 cursor-not-allowed" />
 </div>
 </div>
 );
 }

 // ── Etapa CONFIRMADO ──────────────────────────────────────
 if (etapa === 'confirmado' && finalUrl) {
 return (
 <div className="fixed inset-0 z-[100] flex flex-col bg-gray-950/95 backdrop-blur-sm">
 <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-800 border-b border-green-100 dark:border-green-800/50 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
 <Check size={18} className="text-green-600 dark:text-green-400" />
 </div>
 <div>
 <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 ">Folio Confirmado</h2>
 <p className="text-xs text-gray-500 dark:text-gray-400 ">
 Folio <span className="font-bold text-green-700 dark:text-green-400 dark:text-green-300">#{folioUsado}</span> registrado en el sistema
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <a href={finalUrl} download={`Salida_Bienes_Folio_${folioUsado}.pdf`}
 className="flex items-center gap-2 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold transition-colors">
 <Download size={16} /> Descargar PDF
 </a>
 <button onClick={() => window.open(finalUrl)}
 className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold transition-colors">
 <Printer size={16} /> Imprimir
 </button>
 <button onClick={handleNuevoFormato}
 className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold transition-colors">
 <Plus size={16} /> Nuevo formato
 </button>
 </div>
 </div>
 <div className="flex-1 overflow-hidden bg-gray-800">
 <iframe src={finalUrl} className="w-full h-full border-0" title="PDF Final Salida de Bienes" />
 </div>
 </div>
 );
 }

 // ── Etapa FORMULARIO ──────────────────────────────────────
 return (
 <div className="flex flex-col h-[calc(100vh-230px)] space-y-4 pb-4">

 {/* ── Barra de folio ── */}
 <div className="flex items-center justify-between bg-gradient-to-r from-teal-50 dark:from-teal-900/20 to-emerald-50 dark:to-emerald-900/20 border border-teal-100 dark:border-teal-800/50 rounded-xl px-4 py-3">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center shadow-sm">
 <Hash size={18} className="text-white" />
 </div>
 <div>
 <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold uppercase tracking-wide">
 {isEditMode ? 'Editando Folio' : 'Próximo folio a emitir'}
 </p>
 <p className="text-2xl font-black text-teal-800 dark:text-teal-300 leading-none">
 #{isEditMode ? initialData?.folio : folioSiguiente}
 </p>
 </div>
 {paginasNecesarias > 1 && (
 <div className="ml-4 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 dark:border-amber-800/50 rounded-lg px-2.5 py-1">
 <FileText size={13} />
 {paginasNecesarias} páginas ({ROWS_PER_PAGE} bienes/pág.)
 </div>
 )}
 </div>
 {isMaestro && !isEditMode && (
 <button onClick={() => setShowGestionFolio((v) => !v)}
 className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-800/50 rounded-lg transition-colors border border-teal-200 dark:border-teal-800/50">
 <Edit2 size={13} /> Gestionar folio
 </button>
 )}
 </div>

 {/* ── Panel Maestro ── */}
 {isMaestro && !isEditMode && showGestionFolio && (
 <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 dark:border-amber-800/50 rounded-xl p-4 space-y-3">
 <div className="flex items-center gap-2">
 <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />
 <h3 className="text-sm font-bold text-amber-800">Gestión de Folio — Solo Maestro</h3>
 </div>
 <p className="text-xs text-amber-700 dark:text-amber-400 dark:text-amber-300">
 Folio actual (último emitido): <strong>#{folioActualDB}</strong>. Ingresa un número para marcarlo
 como "ya emitido"; el siguiente folio será mayor a ese valor.
 </p>
 <div className="flex items-center gap-2">
 <input type="number" min="1" value={folioManualInput}
 onChange={(e) => setFolioManualInput(e.target.value)}
 placeholder="Ej: 50 → el próximo será 51"
 className="flex-1 text-sm border border-amber-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-amber-500 outline-none bg-white dark:bg-gray-800 " />
 <button onClick={handleSetFolioManual}
 disabled={isSettingFolio || !folioManualInput}
 className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-60">
 {isSettingFolio ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
 Aplicar
 </button>
 <button onClick={() => { setShowGestionFolio(false); setFolioManualInput(''); }}
 className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
 <X size={16} />
 </button>
 </div>
 </div>
 )}

 {/* ── Grid principal ── */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">

 {/* ─ Izquierda: datos del solicitante ─ */}
 <div className="space-y-6 overflow-y-auto pr-3 pb-8 custom-scrollbar">

 <div className="bg-white dark:bg-gray-800 border border-teal-100 dark:border-teal-800/50/60 dark:border-teal-800/50 shadow-sm rounded-xl p-5 space-y-4">
 <h3 className="text-sm font-bold text-teal-800 dark:text-teal-300 border-b border-teal-100 dark:border-teal-800/50 pb-2 flex items-center gap-2">
 <User size={16} className="text-teal-600 dark:text-teal-400" /> Información del Solicitante
 </h3>

 {/* Autocompletado de Usuario */}
 <div className="bg-teal-50 dark:bg-teal-900/20 p-3 rounded-lg border border-teal-100 dark:border-teal-800/50">
 <label className="block text-xs font-semibold text-teal-800 dark:text-teal-300 mb-1">Buscar Usuario (Opcional)</label>
 {isLoadingUsuarios ? (
 <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 ">
 <Loader2 size={14} className="animate-spin mr-2" /> Cargando usuarios…
 </div>
 ) : (
 <SearchableSelect
 value=""
 onChange={(matricula) => {
 const user = usuariosList.find(u => u.matricula === matricula);
 if (user) {
 setForm(p => {
 const next = { ...p, matricula: user.matricula, solicitante: user.nombre_completo };
 if (user.unidadFisica) {
 next.adscripcion = user.unidadFisica.descripcion || user.unidadFisica.desc_corta || next.adscripcion;
 }
 return next;
 });
 setNombreAutoFilled(true);
 }
 }}
 options={usuariosOptionsMatricula}
 placeholder="Busca por nombre o matrícula para autollenar…"
 />
 )}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

 {/* Matrícula + autocompletado */}
 <div className="sm:col-span-2">
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
 Matrícula <span className="font-normal text-gray-400">(si aplica)</span>
 </label>
 <div className="relative">
 <input type="text" name="matricula" value={form.matricula} onChange={handleChange}
 placeholder="Escribe la matrícula para autocompletar el nombre…"
 className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-9 focus:ring-1 focus:ring-teal-500 outline-none" />
 {nombreAutoFilled && (
 <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500">
 <UserCheck size={16} />
 </span>
 )}
 </div>
 {nombreAutoFilled && (
 <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5">
 ✓ Nombre autocompletado desde el sistema — puedes editarlo
 </p>
 )}
 </div>

 {/* Nombre */}
 <div className="sm:col-span-2">
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Nombre (El que suscribe)</label>
 <input type="text" name="solicitante" value={form.solicitante}
 onChange={(e) => { handleChange(e); setNombreAutoFilled(false); }}
 className={`w-full text-sm border rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none transition-colors ${nombreAutoFilled ? 'border-green-300 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 '}`} />
 </div>

 <div>
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Adscrito a</label>
 <SearchableSelect
 value={form.adscripcion}
 onChange={(val) => setForm(p => ({ ...p, adscripcion: val }))}
 options={catalogos?.unidades?.map(u => ({ value: u.descripcion || u.desc_corta, label: u.descripcion || u.desc_corta })) || []}
 placeholder="Seleccionar o escribir..."
 allowCustom={true}
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Trabajador de</label>
 <input type="text" name="empresa" value={form.empresa} onChange={handleChange}
 className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Identificación</label>
 <input type="text" name="identificacion" value={form.identificacion} onChange={handleChange}
 placeholder="INE / Pasaporte / Gafete"
 className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Teléfono</label>
 <input type="text" name="telefono" value={form.telefono} onChange={handleChange}
 className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
 </div>
 </div>
 </div>

 <div className="bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-800/50/60 dark:border-emerald-800/50 shadow-sm rounded-xl p-5 space-y-4">
 <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 border-b border-emerald-100 dark:border-emerald-800/50 pb-2 flex items-center gap-2">
 <Package size={16} className="text-emerald-600 dark:text-emerald-400" /> Detalles de Salida
 </h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="sm:col-span-2">
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Motivo / Razón de salida</label>
 <input type="text" name="motivo" value={form.motivo} onChange={handleChange}
 className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Día de Salida</label>
 <input type="date" name="fechaSalidaDia" value={form.fechaSalidaDia} onChange={handleChange}
 className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
 </div>

 <div>
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Retirar bienes del:</label>
 <SearchableSelect
 value={form.origenBienes}
 onChange={(val) => setForm(p => ({ ...p, origenBienes: val }))}
 options={catalogos?.unidades?.map(u => ({ value: u.descripcion || u.desc_corta, label: u.descripcion || u.desc_corta })) || []}
 placeholder="Seleccionar o escribir..."
 allowCustom={true}
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Nombre Responsable (Autoriza)</label>
 <SearchableSelect
 value={form.responsable}
 onChange={(val) => setForm(p => ({ ...p, responsable: val }))}
 options={usuariosOptionsNombre}
 placeholder="Seleccionar o escribir..."
 allowCustom={true}
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">¿Sujeto a Devolución?</label>
 <select name="devolucion" value={form.devolucion} onChange={handleChange}
 className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none bg-white dark:bg-gray-800 ">
 <option value="SI">SÍ</option>
 <option value="NO">NO</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Fecha de Devolución</label>
 <input type="date" name="fechaDevolucion" value={form.fechaDevolucion} onChange={handleChange}
 disabled={form.devolucion === 'NO'}
 className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:text-gray-400" />
 </div>
 <div className="sm:col-span-2">
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Observaciones</label>
 <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={2}
 className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none resize-none" />
 </div>
 </div>
 </div>
 </div>

 {/* ─ Derecha: bienes ─ */}
 <div className="overflow-y-auto pr-3 pb-8 custom-scrollbar flex flex-col">
 <div className="bg-white dark:bg-gray-800 border border-teal-100 dark:border-teal-800/50/60 dark:border-teal-800/50 shadow-sm rounded-xl p-5 space-y-4 flex flex-col flex-1">
 <h3 className="text-sm font-bold text-teal-800 dark:text-teal-300 border-b border-teal-100 dark:border-teal-800/50 pb-2 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-end">
 <div className="flex flex-col">
 <span className="flex items-center gap-2"><Monitor size={16} className="text-teal-600 dark:text-teal-400" /> Bienes a Retirar</span>
 <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-500 dark:text-gray-400 font-normal">
 <HelpCircle size={12} className="text-teal-600 dark:text-teal-400" />
 <span><strong className="text-teal-700 dark:text-teal-400">BMC:</strong> C/Inventario</span>
 <span>• <strong className="text-teal-700 dark:text-teal-400">BMNC:</strong> S/Inventario</span>
 <span>• <strong className="text-teal-700 dark:text-teal-400">BC:</strong> Consumo</span>
 <span>• <strong className="text-teal-700 dark:text-teal-400">BPS:</strong> Servicios</span>
 </div>
 </div>
 <span className="text-xs font-normal bg-teal-100 dark:bg-teal-900/20 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-full w-max">
 {totalBienes} bien{totalBienes !== 1 ? 'es' : ''} · {paginasNecesarias} pág.
 </span>
 </h3>

 {/* Excel Controls */}
 <div className="flex flex-col sm:flex-row gap-2 bg-teal-50 dark:bg-teal-900/20 p-2 rounded-lg border border-teal-100 dark:border-teal-800/50">
 <button onClick={handleDownloadTemplate}
 className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-teal-200 dark:border-teal-800/50 text-teal-700 dark:text-teal-400 rounded-md text-xs font-semibold hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
 <Download size={14} /> Plantilla Excel
 </button>
 <button onClick={() => fileInputRef.current?.click()}
 className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-teal-600 border border-teal-600 text-white rounded-md text-xs font-semibold hover:bg-teal-700 transition-colors">
 <Upload size={14} /> Importar Excel
 </button>
 <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
 </div>

 <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1 pb-1">
 <div className="flex items-center gap-2">
 <input
 type="checkbox"
 id="incluirMonitores"
 checked={incluirMonitores}
 onChange={(e) => setIncluirMonitores(e.target.checked)}
 className="w-4 h-4 text-teal-600 dark:text-teal-400 rounded border-gray-300 dark:border-gray-600 focus:ring-teal-500 cursor-pointer"
 />
 <label htmlFor="incluirMonitores" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none">
 Auto-incluir monitores al agregar
 </label>
 </div>

 <button
 onClick={handleAgregarMonitoresFaltantes}
 disabled={bienesSeleccionados.length === 0}
 className="flex items-center gap-1 text-[10px] px-2 py-1 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-800/50 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50 rounded font-semibold transition-colors disabled:opacity-50"
 title="Añade a la lista los monitores de los equipos que ya tienes seleccionados"
 >
 <MonitorUp size={12} /> Traer monitores faltantes
 </button>
 </div>

 {/* Selector */}
 <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 ">
 <div className="flex items-center justify-between mb-1">
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 ">Buscar y Agregar Bien (Manual)</label>
 <button
 type="button"
 onClick={handleAddManualBien}
 className="flex items-center gap-1 text-[10px] px-2 py-1 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 text-green-700 dark:text-green-400 dark:text-green-300 border border-green-200 dark:border-green-800/50 dark:border-green-800/50 rounded font-semibold transition-colors"
 title="Añadir una fila vacía para un bien que no está registrado en el sistema"
 >
 <Plus size={12} /> Agregar Bien No Registrado
 </button>
 </div>
 <SearchableSelect
 value=""
 onChange={handleAddBien}
 onInputChange={setBienesSearch}
 options={bienesList.map((b) => ({
 value: b.id_bien,
 label: `${b.modelo?.descrip_disp || 'Desconocido'} — S/N: ${b.num_serie || 'N/A'}`,
 }))}
 placeholder="Escribe el modelo, serie o inventario..."
 isLoading={isLoadingBienes}
 />
 </div>

 {/* Lista */}
 <div className="space-y-2 pr-1">
 {bienesSeleccionados.length === 0 ? (
 <div className="text-center py-6 text-gray-400 text-xs italic border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
 No hay bienes seleccionados. Busca y selecciona uno arriba.
 </div>
 ) : (
 bienesSeleccionados.map((bien, i) => {
 const pagBien = Math.floor(i / ROWS_PER_PAGE) + 1;
 const slotBien = (i % ROWS_PER_PAGE) + 1; // 1..11, donde 1 = fila del encabezado

 return (
 <div key={bien.id_bien}
 className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm relative group">
 {/* Badges de página */}
 {paginasNecesarias > 1 && (
 <span className="absolute top-2 left-2 text-[9px] font-bold bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 px-1.5 py-0.5 rounded">
 Pág. {pagBien}
 </span>
 )}
 <button onClick={() => handleRemoveBien(i)}
 className="absolute top-2 right-2 text-red-400 hover:text-red-600 bg-red-50 dark:bg-red-900/20 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
 <Trash2 size={14} />
 </button>

 <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-2 pr-6 line-clamp-2 pt-4" title={bien.descripcion}>
 {bien.descripcion}
 </p>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Identificación o Cant.</label>
 <input type="text" value={bien.cantidad}
 onChange={(e) => handleUpdateBien(i, 'cantidad', e.target.value)}
 className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1 outline-none" />
 </div>
 <div>
 <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Naturaleza</label>
 <select value={bien.naturaleza}
 onChange={(e) => handleUpdateBien(i, 'naturaleza', e.target.value)}
 className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded px-1 py-1 outline-none bg-white dark:bg-gray-800 ">
 <option value="BMC">BMC</option>
 <option value="BC">BC</option>
 <option value="BMNC">BMNC</option>
 <option value="BPS">BPS</option>
 </select>
 </div>
 </div>
 <div className="mt-2">
 <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Detalle (Visible en PDF)</label>
 <input type="text" value={bien.descripcion}
 onChange={(e) => handleUpdateBien(i, 'descripcion', e.target.value)}
 className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1 outline-none" />
 </div>
 </div>
 );
 })
 )}
 </div>
 </div>
 </div>
 </div>

 {/* ── FAB ── */}
 <div className="fixed bottom-6 right-6 z-[90] flex items-center gap-3">
 {isEditMode ? (
 <>
 <button onClick={onClose}
 className="px-6 py-4 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-sm font-bold shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-all">
 Cancelar
 </button>
 <button onClick={handleGuardarCambios}
 disabled={actualizarSalidaMutation.isPending || bienesSeleccionados.length === 0}
 className="px-6 py-4 rounded-full text-white text-sm font-bold flex items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.25)] disabled:opacity-50 disabled:shadow-none transition-all transform hover:-translate-y-1 active:translate-y-0"
 style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
 {actualizarSalidaMutation.isPending
 ? <><Loader2 size={20} className="animate-spin" /> Guardando…</>
 : <><Check size={20} /> Guardar Cambios</>}
 </button>
 </>
 ) : (
 <button onClick={handlePrevisualizar}
 disabled={isGenerando || bienesSeleccionados.length === 0}
 className="px-6 py-4 rounded-full text-white text-sm font-bold flex items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.25)] disabled:opacity-50 disabled:shadow-none transition-all transform hover:-translate-y-1 active:translate-y-0"
 style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
 {isGenerando
 ? <><Loader2 size={20} className="animate-spin" /> Generando…</>
 : <><Eye size={20} /> Previsualizar Formato <ChevronRight size={16} /></>}
 </button>
 )}
 </div>
 </div>
 );
}
