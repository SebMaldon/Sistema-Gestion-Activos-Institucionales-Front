import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_BIENES_QUERY } from '../api/inventario.queries';
import {
  GET_FOLIO_SALIDAS,
  CONFIRMAR_FOLIO,
  SET_FOLIO_MANUAL,
  GET_USUARIO_POR_MATRICULA,
} from '../api/salidas.queries';
import { GET_USUARIOS } from '../api/usuarios.queries';
import { useAuthStore } from '../store/auth.store';
import { useApp } from '../context/AppContext';
import {
  FileText, Trash2, Loader2, Download, Eye, Check,
  Hash, Edit2, X, Printer, ChevronRight, AlertCircle,
  UserCheck, Plus,
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// ── Constantes ────────────────────────────────────────────────────────────────
// Por página: 1 slot en la fila del encabezado del PDF (que se borra y rellena)
//           + 10 slots en los campos f1c1..f10c1 = 11 total por página.
const ROWS_PER_PAGE = 11;
const ROLES_MAP     = { MAESTRO: 1 };

// Nombre del campo PDF para fila i (1-indexed), columna col (1-3)
const pdfRowField = (row, col) => {
  if (col === 1 && row === 5) return 'f451'; // typo histórico en el PDF
  return `f${row}c${col}`;
};

// ── Componente ────────────────────────────────────────────────────────────────
export default function SalidasForm() {
  const { showToast } = useApp();
  const usuario   = useAuthStore((s) => s.usuario);
  const isMaestro = usuario?.id_rol === ROLES_MAP.MAESTRO;
  const queryClient = useQueryClient();

  // ─── Formulario ────────────────────────────────────────────
  const [form, setForm] = useState({
    solicitante:     '',
    matricula:       '',
    adscripcion:     '',
    identificacion:  '',
    empresa:         'IMSS',
    telefono:        '',
    motivo:          '',
    observaciones:   '',
    devolucion:      'NO',
    fechaDevolucion: '',
    responsable:     '',
    fechaSalidaDia:  new Date().toISOString().split('T')[0],
    fechaSalidaHora: new Date().toTimeString().split(' ')[0].slice(0, 5),
  });

  const [bienesSeleccionados, setBienesSeleccionados] = useState([]);

  // ─── Flujo PDF ─────────────────────────────────────────────
  const [etapa, setEtapa]                 = useState('formulario'); // 'formulario'|'preview'|'confirmado'
  const [isGenerando, setIsGenerando]     = useState(false);
  const [isConfirmando, setIsConfirmando] = useState(false);
  const [previewUrl, setPreviewUrl]       = useState(null);
  const [finalUrl, setFinalUrl]           = useState(null);
  const [folioUsado, setFolioUsado]       = useState(null);

  // ─── Panel Maestro ─────────────────────────────────────────
  const [showGestionFolio, setShowGestionFolio] = useState(false);
  const [folioManualInput, setFolioManualInput] = useState('');
  const [isSettingFolio, setIsSettingFolio]     = useState(false);

  // ─── Autocompletado matrícula ──────────────────────────────
  const [matriculaQuery, setMatriculaQuery]     = useState('');
  const [nombreAutoFilled, setNombreAutoFilled] = useState(false);
  const matriculaTimer = useRef(null);

  // ─── Queries ──────────────────────────────────────────────
  const { data: folioData, refetch: refetchFolio } = useQuery({
    queryKey: ['folioSalidas'],
    queryFn:  () => gqlClient.request(GET_FOLIO_SALIDAS),
  });

  const { data: bienesData, isLoading: isLoadingBienes } = useQuery({
    queryKey: ['bienes', { estatus_operativo: 'ACTIVO' }],
    queryFn:  () => gqlClient.request(GET_BIENES_QUERY, {
      filter: { estatus_operativo: 'ACTIVO' },
      pagination: { first: 1000 },
    }),
  });

  const { data: usuarioMatData } = useQuery({
    queryKey: ['usuarioPorMatricula', matriculaQuery],
    queryFn:  () => gqlClient.request(GET_USUARIO_POR_MATRICULA, { matricula: matriculaQuery }),
    enabled:  matriculaQuery.length >= 3,
    staleTime: 30_000,
  });

  const { data: usuariosData, isLoading: isLoadingUsuarios } = useQuery({
    queryKey: ['usuariosActivos'],
    queryFn:  () => gqlClient.request(GET_USUARIOS, {
      estatus: true,
      pagination: { first: 1000 },
    }),
  });
  const usuariosList = usuariosData?.usuarios?.edges?.map((e) => e.node) || [];

  // ─── Mutations ────────────────────────────────────────────
  const confirmarFolioMutation = useMutation({
    mutationFn: () => gqlClient.request(CONFIRMAR_FOLIO),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['folioSalidas'] }),
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

  // ─── Efectos ──────────────────────────────────────────────
  useEffect(() => {
    if (usuario?.nombre_completo && !form.responsable) {
      setForm((p) => ({ ...p, responsable: usuario.nombre_completo }));
    }
  }, [usuario]);

  useEffect(() => {
    const u = usuarioMatData?.usuarioPorMatricula;
    if (u?.nombre_completo) {
      setForm((p) => ({ ...p, solicitante: u.nombre_completo }));
      setNombreAutoFilled(true);
    } else if (matriculaQuery.length >= 3) {
      setNombreAutoFilled(false);
    }
  }, [usuarioMatData, matriculaQuery]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (finalUrl)   URL.revokeObjectURL(finalUrl);
  }, []);

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
      setBienesSeleccionados((p) => [...p, {
        id_bien:     bien.id_bien,
        cantidad:    bien.num_serie || '1',
        naturaleza:  'BMC',
        descripcion: `${bien.modelo?.descrip_disp || ''}${bien.num_inv ? ` - INV: ${bien.num_inv}` : ''}`,
        originalData: bien,
      }]);
    }
  };

  const handleUpdateBien = (idx, field, value) => {
    const copia = [...bienesSeleccionados];
    copia[idx] = { ...copia[idx], [field]: value };
    setBienesSeleccionados(copia);
  };

  const handleRemoveBien = (idx) => {
    setBienesSeleccionados((p) => p.filter((_, i) => i !== idx));
  };

  // ─── Generación del PDF ───────────────────────────────────
  /**
   * Rellena un PDFDocument cargado desde la plantilla.
   * - bien en posición 0 de pageItems → dibuja sobre la fila del encabezado estático del PDF.
   * - bienes en posición 1-10  → campos f1c1..f10c1 normales.
   */
  const buildPDFBytes = async (folioStr) => {
    const templateBytes = await fetch('/Formatos/FormatoRellenableSalidaBienes.pdf').then((r) => {
      if (!r.ok) throw new Error('No se encontró el archivo PDF base');
      return r.arrayBuffer();
    });

    // Dividir bienes en grupos de ROWS_PER_PAGE (11)
    const pageGroups = [];
    for (let i = 0; i < bienesSeleccionados.length; i += ROWS_PER_PAGE) {
      pageGroups.push(bienesSeleccionados.slice(i, i + ROWS_PER_PAGE));
    }
    if (pageGroups.length === 0) pageGroups.push([]); // al menos una página
    const totalPages = pageGroups.length;

    const fillDoc = async (pageItems, pageNum, isFirstPage) => {
      const doc      = await PDFDocument.load(templateBytes);
      const pdfForm  = doc.getForm();
      const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
      const regFont  = await doc.embedFont(StandardFonts.Helvetica);
      const page     = doc.getPages()[0];
      const { width, height } = page.getSize();

      const setTextField = (name, value) => {
        try {
          const f = pdfForm.getTextField(name);
          if (f) f.setText(value || '');
        } catch { /* campo no existe en PDF */ }
      };

      const drawXOnCheckbox = (fieldName, shouldCheck) => {
        try {
          const field   = pdfForm.getCheckBox(fieldName);
          const widgets = field.acroField.getWidgets();
          if (widgets?.length > 0 && shouldCheck) {
            const rect = widgets[0].getRectangle();
            page.drawText('X', { x: rect.x + 3, y: rect.y + 2, size: 10, font: boldFont, color: rgb(0, 0, 0) });
          }
          pdfForm.removeField(field);
        } catch { /* checkbox no existe */ }
      };

      // ── Folio (esquina superior derecha) ──────────────────
      let folioSet = false;
      const folioFormat = `FOLIO:${folioStr}`;
      
      try {
        const ff = pdfForm.getTextField('Folio');
        if (ff) { ff.setText(folioFormat); folioSet = true; }
      } catch { /* no existe campo Folio en el PDF */ }

      if (!folioSet) {
        page.drawText(folioFormat, {
          x: width - 105, y: height - 26,
          size: 9, font: boldFont, color: rgb(0, 0, 0),
        });
      }

      // ── Datos generales (en todas las páginas) ────────────
      const dp = form.fechaSalidaDia.split('-');
      const fmtDate = dp.length === 3 ? `${dp[2]}/${dp[1]}/${dp[0]}` : form.fechaSalidaDia;
      let fmtTime = form.fechaSalidaHora;
      if (form.fechaSalidaHora) {
        const [hh, mm] = form.fechaSalidaHora.split(':');
        let h = parseInt(hh, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        fmtTime = `${String(h).padStart(2, '0')}:${mm} ${ampm}`;
      }

      setTextField('Elc',               form.solicitante);
      setTextField('NombreSolicitante', form.solicitante);
      setTextField('AdscritoA',         form.adscripcion);
      setTextField('Identificacion',    form.identificacion);
      setTextField('TrabajadorDe',      form.empresa);
      setTextField('Matricula',         form.matricula);
      setTextField('Telefono',          form.telefono);
      setTextField('RazonSalida',       form.motivo);
      setTextField('ObservacionesBienes', form.observaciones);
      setTextField('FechaSalida',       `${fmtDate} ${fmtTime}`);
      setTextField('NombreResponsable', form.responsable || 'Usuario Maestro');

      if (form.devolucion === 'SI') {
        drawXOnCheckbox('DevolucionCheck1', true);
        drawXOnCheckbox('DevolucionCheck2', false);
        const fdp = form.fechaDevolucion.split('-');
        setTextField('FechaDevolucion',
          fdp.length === 3 ? `${fdp[2]}/${fdp[1]}/${fdp[0]}` : form.fechaDevolucion);
      } else {
        drawXOnCheckbox('DevolucionCheck1', false);
        drawXOnCheckbox('DevolucionCheck2', true);
        setTextField('FechaDevolucion', 'N/A');
      }
      // ── Bienes en campos f0c1..f10c1 (slots 0-10) ─────────
      pageItems.forEach((bien, i) => {
        const row = i; // f0 a f10
        setTextField(pdfRowField(row, 1), String(bien.cantidad || ''));
        setTextField(pdfRowField(row, 2), bien.naturaleza  || '');
        setTextField(pdfRowField(row, 3), bien.descripcion || '');
      });

      // Hacer campos de solo lectura
      pdfForm.getFields().forEach((f) => {
        try { f.enableReadOnly(); } catch { /* campo ya eliminado */ }
      });

      return doc.save();
    };

    // Generar cada página
    const pageBytesList = [];
    for (let i = 0; i < pageGroups.length; i++) {
      pageBytesList.push(await fillDoc(pageGroups[i], i + 1, i === 0));
    }

    // Si es solo 1 página, devolver directo
    if (pageBytesList.length === 1) return pageBytesList[0];

    // Combinar páginas en un único documento
    const finalDoc = await PDFDocument.create();
    for (const bytes of pageBytesList) {
      const src    = await PDFDocument.load(bytes);
      const [page] = await finalDoc.copyPages(src, [0]);
      finalDoc.addPage(page);
    }
    return finalDoc.save();
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
      const bytes     = await buildPDFBytes(siguiente);

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

  const handleConfirmar = async () => {
    setIsConfirmando(true);
    try {
      const result   = await confirmarFolioMutation.mutateAsync();
      const folioReal = result.confirmarFolio.folio_actual;

      const bytes = await buildPDFBytes(folioReal);
      if (finalUrl) URL.revokeObjectURL(finalUrl);
      setFinalUrl(URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })));
      setFolioUsado(folioReal);
      setEtapa('confirmado');
      showToast(`✅ Folio ${folioReal} registrado`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al confirmar el folio', 'error');
    } finally {
      setIsConfirmando(false);
    }
  };

  const handleNuevoFormato = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (finalUrl)   URL.revokeObjectURL(finalUrl);
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
  const folioSiguiente  = folioData?.folioSalidas?.siguiente    ?? '…';
  const folioActualDB   = folioData?.folioSalidas?.folio_actual ?? '0';
  const totalBienes     = bienesSeleccionados.length;
  const paginasNecesarias = Math.max(1, Math.ceil(totalBienes / ROWS_PER_PAGE));

  // ── Etapa PREVIEW ─────────────────────────────────────────
  if (etapa === 'preview' && previewUrl) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-gray-950/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Eye size={20} className="text-teal-600" />
            <div>
              <h2 className="text-sm font-bold text-gray-800">Vista Previa — Salida de Bienes</h2>
              <p className="text-xs text-gray-500">
                Folio estimado: <span className="font-bold text-teal-700">#{folioUsado}</span> — Revisa antes de confirmar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <AlertCircle size={13} />
              Solo previsualización — confirma para habilitar descarga
            </div>
            <button onClick={() => setEtapa('formulario')}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors">
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
        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-green-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Check size={18} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Folio Confirmado</h2>
              <p className="text-xs text-gray-500">
                Folio <span className="font-bold text-green-700">#{folioUsado}</span> registrado en el sistema
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={finalUrl} download={`Salida_Bienes_Folio_${folioUsado}.pdf`}
              className="flex items-center gap-2 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold transition-colors">
              <Download size={16} /> Descargar PDF
            </a>
            <button onClick={() => window.open(finalUrl)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors">
              <Printer size={16} /> Imprimir
            </button>
            <button onClick={handleNuevoFormato}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors">
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
    <div className="space-y-5 pb-24">

      {/* ── Barra de folio ── */}
      <div className="flex items-center justify-between bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center shadow-sm">
            <Hash size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide">Próximo folio a emitir</p>
            <p className="text-2xl font-black text-teal-800 leading-none">#{folioSiguiente}</p>
          </div>
          {paginasNecesarias > 1 && (
            <div className="ml-4 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
              <FileText size={13} />
              {paginasNecesarias} páginas ({ROWS_PER_PAGE} bienes/pág.)
            </div>
          )}
        </div>
        {isMaestro && (
          <button onClick={() => setShowGestionFolio((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 rounded-lg transition-colors border border-teal-200">
            <Edit2 size={13} /> Gestionar folio
          </button>
        )}
      </div>

      {/* ── Panel Maestro ── */}
      {isMaestro && showGestionFolio && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600" />
            <h3 className="text-sm font-bold text-amber-800">Gestión de Folio — Solo Maestro</h3>
          </div>
          <p className="text-xs text-amber-700">
            Folio actual (último emitido): <strong>#{folioActualDB}</strong>. Ingresa un número para marcarlo
            como "ya emitido"; el siguiente folio será mayor a ese valor.
          </p>
          <div className="flex items-center gap-2">
            <input type="number" min="1" value={folioManualInput}
              onChange={(e) => setFolioManualInput(e.target.value)}
              placeholder="Ej: 50  →  el próximo será 51"
              className="flex-1 text-sm border border-amber-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-amber-500 outline-none bg-white" />
            <button onClick={handleSetFolioManual}
              disabled={isSettingFolio || !folioManualInput}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-60">
              {isSettingFolio ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Aplicar
            </button>
            <button onClick={() => { setShowGestionFolio(false); setFolioManualInput(''); }}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Grid principal ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ─ Izquierda: datos del solicitante ─ */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-teal-800 border-b border-teal-100 pb-2">
            Información del Solicitante
          </h3>

          {/* Autocompletado de Usuario */}
          <div className="bg-teal-50/50 p-3 rounded-lg border border-teal-100">
            <label className="block text-xs font-semibold text-teal-800 mb-1">Buscar Usuario (Opcional)</label>
            {isLoadingUsuarios ? (
              <div className="flex items-center text-xs text-gray-500">
                <Loader2 size={14} className="animate-spin mr-2" /> Cargando usuarios…
              </div>
            ) : (
              <SearchableSelect
                value=""
                onChange={(matricula) => {
                  const user = usuariosList.find(u => u.matricula === matricula);
                  if (user) {
                    setForm(p => ({ ...p, matricula: user.matricula, solicitante: user.nombre_completo }));
                    setNombreAutoFilled(true);
                  }
                }}
                options={usuariosList.map((u) => ({
                  value: u.matricula,
                  label: `${u.matricula} — ${u.nombre_completo}`,
                  searchKey: `${u.matricula} ${u.nombre_completo}`
                }))}
                placeholder="Busca por nombre o matrícula para autollenar…"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Matrícula + autocompletado */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Matrícula <span className="font-normal text-gray-400">(si aplica)</span>
              </label>
              <div className="relative">
                <input type="text" name="matricula" value={form.matricula} onChange={handleChange}
                  placeholder="Escribe la matrícula para autocompletar el nombre…"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-9 focus:ring-1 focus:ring-teal-500 outline-none" />
                {nombreAutoFilled && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500">
                    <UserCheck size={16} />
                  </span>
                )}
              </div>
              {nombreAutoFilled && (
                <p className="text-[10px] text-green-600 mt-0.5">
                  ✓ Nombre autocompletado desde el sistema — puedes editarlo
                </p>
              )}
            </div>

            {/* Nombre */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre (El que suscribe)</label>
              <input type="text" name="solicitante" value={form.solicitante}
                onChange={(e) => { handleChange(e); setNombreAutoFilled(false); }}
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none transition-colors ${nombreAutoFilled ? 'border-green-300 bg-green-50' : 'border-gray-200'}`} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Adscrito a</label>
              <input type="text" name="adscripcion" value={form.adscripcion} onChange={handleChange}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Trabajador de</label>
              <input type="text" name="empresa" value={form.empresa} onChange={handleChange}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Identificación</label>
              <input type="text" name="identificacion" value={form.identificacion} onChange={handleChange}
                placeholder="INE / Pasaporte / Gafete"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
              <input type="text" name="telefono" value={form.telefono} onChange={handleChange}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
            </div>
          </div>

          <h3 className="text-sm font-bold text-teal-800 border-b border-teal-100 pb-2 pt-1">Detalles de Salida</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Motivo / Razón de salida</label>
              <input type="text" name="motivo" value={form.motivo} onChange={handleChange}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Día de Salida</label>
              <input type="date" name="fechaSalidaDia" value={form.fechaSalidaDia} onChange={handleChange}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Hora de Salida</label>
              <input type="time" name="fechaSalidaHora" value={form.fechaSalidaHora} onChange={handleChange}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre Responsable (Autoriza)</label>
              <input type="text" name="responsable" value={form.responsable} onChange={handleChange}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">¿Sujeto a Devolución?</label>
              <select name="devolucion" value={form.devolucion} onChange={handleChange}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none bg-white">
                <option value="SI">SÍ</option>
                <option value="NO">NO</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha de Devolución</label>
              <input type="date" name="fechaDevolucion" value={form.fechaDevolucion} onChange={handleChange}
                disabled={form.devolucion === 'NO'}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none disabled:bg-gray-100 disabled:text-gray-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones</label>
              <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none resize-none" />
            </div>
          </div>
        </div>

        {/* ─ Derecha: bienes ─ */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-teal-800 border-b border-teal-100 pb-2 flex justify-between items-center">
            Bienes a Retirar
            <span className="text-xs font-normal bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
              {totalBienes} bien{totalBienes !== 1 ? 'es' : ''} · {paginasNecesarias} pág.
            </span>
          </h3>

          {/* Selector */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Buscar y Agregar Bien</label>
            {isLoadingBienes ? (
              <div className="flex items-center text-xs text-gray-500">
                <Loader2 size={14} className="animate-spin mr-2" /> Cargando inventario…
              </div>
            ) : (
              <SearchableSelect
                value=""
                onChange={handleAddBien}
                options={bienesList.map((b) => ({
                  value: b.id_bien,
                  label: `${b.modelo?.descrip_disp || 'Desconocido'} — S/N: ${b.num_serie || 'N/A'}`,
                }))}
                placeholder="Escribe el modelo o S/N…"
              />
            )}
          </div>

          {/* Lista */}
          <div className="space-y-2 pr-1">
            {bienesSeleccionados.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs italic border-2 border-dashed border-gray-200 rounded-xl">
                No hay bienes seleccionados. Busca y selecciona uno arriba.
              </div>
            ) : (
              bienesSeleccionados.map((bien, i) => {
                const pagBien = Math.floor(i / ROWS_PER_PAGE) + 1;
                const slotBien = (i % ROWS_PER_PAGE) + 1; // 1..11, donde 1 = fila del encabezado

                return (
                  <div key={bien.id_bien}
                    className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative group">
                    {/* Badges de página */}
                    {paginasNecesarias > 1 && (
                      <span className="absolute top-2 left-2 text-[9px] font-bold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">
                        Pág. {pagBien}
                      </span>
                    )}
                    <button onClick={() => handleRemoveBien(i)}
                      className="absolute top-2 right-2 text-red-400 hover:text-red-600 bg-red-50 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={14} />
                    </button>

                    <p className="text-xs font-bold text-gray-800 mb-2 pr-6 line-clamp-2 pt-4" title={bien.descripcion}>
                      {bien.descripcion}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Identificación o Cant.</label>
                        <input type="text" value={bien.cantidad}
                          onChange={(e) => handleUpdateBien(i, 'cantidad', e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Naturaleza</label>
                        <select value={bien.naturaleza}
                          onChange={(e) => handleUpdateBien(i, 'naturaleza', e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded px-1 py-1 outline-none bg-white">
                          <option value="BMC">BMC</option>
                          <option value="BC">BC</option>
                          <option value="BMNC">BMNC</option>
                          <option value="BPS">BPS</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="block text-[10px] text-gray-500 mb-0.5">Detalle (Visible en PDF)</label>
                      <input type="text" value={bien.descripcion}
                        onChange={(e) => handleUpdateBien(i, 'descripcion', e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── FAB ── */}
      <div className="fixed bottom-6 right-6 z-[90]">
        <button onClick={handlePrevisualizar}
          disabled={isGenerando || bienesSeleccionados.length === 0}
          className="px-6 py-4 rounded-full text-white text-sm font-bold flex items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.25)] disabled:opacity-50 disabled:shadow-none transition-all transform hover:-translate-y-1 active:translate-y-0"
          style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
          {isGenerando
            ? <><Loader2 size={20} className="animate-spin" /> Generando…</>
            : <><Eye size={20} /> Previsualizar Formato <ChevronRight size={16} /></>}
        </button>
      </div>
    </div>
  );
}
