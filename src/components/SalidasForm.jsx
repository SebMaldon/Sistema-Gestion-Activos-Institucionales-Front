import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_BIENES_QUERY } from '../api/inventario.queries';
import { useAuthStore } from '../store/auth.store';
import { useApp } from '../context/AppContext';
import { FileText, Plus, Trash2, Loader2, Download, Eye, AlertTriangle } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export default function SalidasForm() {
  const { showToast } = useApp();
  const usuario = useAuthStore((s) => s.usuario);
  
  const [form, setForm] = useState({
    solicitante: '',
    matricula: '',
    adscripcion: '',
    identificacion: '',
    empresa: 'IMSS', // Default
    telefono: '',
    motivo: '',
    observaciones: '',
    devolucion: 'NO',
    fechaDevolucion: '',
    responsable: '', // Inicializado más adelante
    fechaSalidaDia: new Date().toISOString().split('T')[0],
    fechaSalidaHora: new Date().toTimeString().split(' ')[0].slice(0, 5),
  });

  const [bienesSeleccionados, setBienesSeleccionados] = useState([]);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Inicializar responsable con el usuario actual
  useEffect(() => {
    if (usuario?.nombre_completo && !form.responsable) {
      setForm(prev => ({ ...prev, responsable: usuario.nombre_completo }));
    }
  }, [usuario]);

  // Cargar bienes activos
  const { data: bienesData, isLoading: isLoadingBienes } = useQuery({
    queryKey: ['bienes', { estatus_operativo: 'ACTIVO' }],
    queryFn: () => gqlClient.request(GET_BIENES_QUERY, {
      filter: { estatus_operativo: 'ACTIVO' },
      pagination: { first: 1000 } // Cargamos una lista grande para el selector
    }),
  });

  const bienesList = bienesData?.bienes?.edges?.map(e => e.node) || [];

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddBien = (idBien) => {
    if (!idBien) return;
    if (bienesSeleccionados.length >= 10) {
      showToast('Solo puedes agregar hasta 10 bienes por formato.', 'warning');
      return;
    }
    if (bienesSeleccionados.some(b => b.id_bien === idBien)) {
      showToast('El bien ya está en la lista.', 'warning');
      return;
    }

    const bien = bienesList.find(b => b.id_bien === idBien);
    if (bien) {
      const isComputer = bien.categoria?.nombre_categoria?.toLowerCase().includes('cómputo') || 
                         bien.modelo?.tipoDispositivo?.nombre_tipo?.toLowerCase().includes('pc');
      
      setBienesSeleccionados(prev => [...prev, {
        id_bien: bien.id_bien,
        cantidad: bien.num_serie ? bien.num_serie : '1',
        unidad: 'PZA', // Ya no va al PDF, pero se deja por si acaso
        naturaleza: 'BMC', // Default
        descripcion: `${bien.modelo?.descrip_disp || ''}${bien.num_inv ? ` - INV: ${bien.num_inv}` : ''}`,
        originalData: bien
      }]);
    }
  };

  const handleUpdateBien = (index, field, value) => {
    const nuevos = [...bienesSeleccionados];
    nuevos[index][field] = value;
    setBienesSeleccionados(nuevos);
  };

  const handleRemoveBien = (index) => {
    setBienesSeleccionados(prev => prev.filter((_, i) => i !== index));
  };

  const handleGeneratePDF = async () => {
    if (bienesSeleccionados.length === 0) {
      showToast('Agrega al menos un bien para la salida.', 'warning');
      return;
    }

    setIsGenerating(true);
    try {
      // 1. Fetch el PDF original
      const url = '/Formatos/FormatoRellenableSalidaBienes.pdf';
      const existingPdfBytes = await fetch(url).then(res => {
        if (!res.ok) throw new Error('No se encontró el archivo PDF base');
        return res.arrayBuffer();
      });

      // 2. Cargar documento con pdf-lib
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pdfForm = pdfDoc.getForm();

      // Helper para setear texto si el campo existe
      const setTextField = (name, value) => {
        try {
          const field = pdfForm.getTextField(name);
          if (field) field.setText(value || '');
        } catch (e) { console.warn(`Campo no encontrado: ${name}`); }
      };

      // Helper para checkbox
      const setCheckField = (name, check) => {
        try {
          const field = pdfForm.getCheckBox(name);
          if (field) {
            if (check) field.check();
            else field.uncheck();
          }
        } catch (e) { console.warn(`Checkbox no encontrado: ${name}`); }
      };

      // 3. Rellenar campos de texto
      setTextField('Elc', form.solicitante);
      setTextField('NombreSolicitante', form.solicitante);
      setTextField('AdscritoA', form.adscripcion);
      setTextField('Identificacion', form.identificacion);
      setTextField('TrabajadorDe', form.empresa);
      setTextField('Matricula', form.matricula);
      setTextField('Telefono', form.telefono);
      setTextField('RazonSalida', form.motivo);
      setTextField('ObservacionesBienes', form.observaciones);
      
      // Formatear fecha y hora
      // form.fechaSalidaDia es YYYY-MM-DD, form.fechaSalidaHora es HH:MM
      const dateParts = form.fechaSalidaDia.split('-');
      let formattedDate = form.fechaSalidaDia; // fallback
      if (dateParts.length === 3) {
        formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
      }
      
      let formattedTime = form.fechaSalidaHora;
      if (form.fechaSalidaHora) {
        let [hh, mm] = form.fechaSalidaHora.split(':');
        let h = parseInt(hh, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        const hhStr = h.toString().padStart(2, '0');
        formattedTime = `${hhStr}:${mm} ${ampm}`;
      }

      const fechaCompleta = `${formattedDate} ${formattedTime}`;
      setTextField('FechaSalida', fechaCompleta);
      
      setTextField('NombreResponsable', form.responsable || 'Usuario Maestro');

      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Helper para dibujar una "X" sobre el checkbox en vez de usar la palomita por defecto
      const drawXOnCheckbox = (fieldName, shouldCheck) => {
        try {
          const field = pdfForm.getCheckBox(fieldName);
          const widgets = field.acroField.getWidgets();
          if (widgets && widgets.length > 0) {
            const rect = widgets[0].getRectangle();
            const pages = pdfDoc.getPages();
            const page = pages[0]; // Las casillas están en la primera página
            
            if (shouldCheck) {
              page.drawText('X', {
                x: rect.x + 3,
                y: rect.y + 2,
                size: 10,
                font: helveticaFont,
                color: rgb(0, 0, 0)
              });
            }
          }
          // Removemos el campo para que su fondo/widget no tape la X
          pdfForm.removeField(field);
        } catch (e) {
          console.warn(`No se pudo procesar checkbox ${fieldName}`, e);
        }
      };

      // 4. Checkboxes de devolución
      if (form.devolucion === 'SI') {
        drawXOnCheckbox('DevolucionCheck1', true);
        drawXOnCheckbox('DevolucionCheck2', false);
        
        let fdParts = form.fechaDevolucion.split('-');
        if (fdParts.length === 3) {
           setTextField('FechaDevolucion', `${fdParts[2]}/${fdParts[1]}/${fdParts[0]}`);
        } else {
           setTextField('FechaDevolucion', form.fechaDevolucion);
        }
      } else {
        drawXOnCheckbox('DevolucionCheck1', false);
        drawXOnCheckbox('DevolucionCheck2', true);
        setTextField('FechaDevolucion', 'N/A');
      }

      // 5. Rellenar la tabla (hasta 10 filas)
      bienesSeleccionados.forEach((bien, i) => {
        const row = i + 1; // f1, f2, etc.
        const c1Name = row === 5 ? 'f451' : `f${row}c1`; // Manejo del typo en f5c1
        const c2Name = `f${row}c2`;
        const c3Name = `f${row}c3`;

        setTextField(c1Name, String(bien.cantidad));
        setTextField(c2Name, bien.naturaleza); // Solo las siglas (BMC, BC, etc.)
        setTextField(c3Name, bien.descripcion);
      });

      // 6. Hacer read-only en lugar de flatten para preservar el renderizado visual de checkboxes en pdf-lib
      pdfForm.getFields().forEach(f => {
        f.enableReadOnly();
      });
      // pdfForm.flatten(); // Eliminado para no romper los checkboxes
      const pdfBytes = await pdfDoc.save();

      // 7. Crear Blob y URL
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(blobUrl);
      setShowPreview(true);
      showToast('Formato generado correctamente', 'success');

    } catch (error) {
      console.error(error);
      showToast('Error al generar el formato PDF', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lado Izquierdo: Info General */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-teal-800 border-b pb-2">Información del Solicitante</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre (El que suscribe)</label>
              <input type="text" name="solicitante" value={form.solicitante} onChange={handleChange}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Matrícula (Si aplica)</label>
              <input type="text" name="matricula" value={form.matricula} onChange={handleChange}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Adscrito a (Área/Servicio)</label>
              <input type="text" name="adscripcion" value={form.adscripcion} onChange={handleChange}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Trabajador de (Empresa/IMSS)</label>
              <input type="text" name="empresa" value={form.empresa} onChange={handleChange}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Identificación</label>
              <input type="text" name="identificacion" value={form.identificacion} onChange={handleChange} placeholder="INE / Pasaporte / Gafete"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
              <input type="text" name="telefono" value={form.telefono} onChange={handleChange}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none" />
            </div>
          </div>

          <h3 className="text-sm font-bold text-teal-800 border-b pb-2 pt-2">Detalles de Salida</h3>
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
              <input type="date" name="fechaDevolucion" value={form.fechaDevolucion} onChange={handleChange} disabled={form.devolucion === 'NO'}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none disabled:bg-gray-100 disabled:text-gray-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones</label>
              <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none resize-none" />
            </div>
          </div>
        </div>

        {/* Lado Derecho: Bienes */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-teal-800 border-b pb-2 flex justify-between items-center">
            Bienes a Retirar
            <span className="text-xs font-normal bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">{bienesSeleccionados.length}/10</span>
          </h3>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Buscar y Agregar Bien</label>
            {isLoadingBienes ? (
              <div className="flex items-center text-xs text-gray-500"><Loader2 size={14} className="animate-spin mr-2" /> Cargando inventario...</div>
            ) : (
              <SearchableSelect
                value=""
                onChange={handleAddBien}
                options={bienesList.map(b => ({
                  value: b.id_bien,
                  label: `${b.modelo?.descrip_disp || 'Desconocido'} - S/N: ${b.num_serie || 'N/A'}`
                }))}
                placeholder="Escribe el modelo o S/N..."
              />
            )}
          </div>

          {/* Lista de Bienes */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {bienesSeleccionados.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs italic border-2 border-dashed border-gray-200 rounded-xl">
                No hay bienes seleccionados. Busca y selecciona uno arriba.
              </div>
            ) : (
              bienesSeleccionados.map((bien, i) => (
                <div key={bien.id_bien} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative group">
                  <button onClick={() => handleRemoveBien(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 bg-red-50 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                  <p className="text-xs font-bold text-gray-800 mb-2 pr-6 line-clamp-2" title={bien.descripcion}>{bien.descripcion}</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Identificación o Cant.</label>
                      <input type="text" value={bien.cantidad} onChange={e => handleUpdateBien(i, 'cantidad', e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Naturaleza</label>
                      <select value={bien.naturaleza} onChange={e => handleUpdateBien(i, 'naturaleza', e.target.value)}
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
                    <input type="text" value={bien.descripcion} onChange={e => handleUpdateBien(i, 'descripcion', e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button para Generar */}
      <div className="fixed bottom-6 right-6 z-[90]">
        <button
          onClick={handleGeneratePDF}
          disabled={isGenerating || bienesSeleccionados.length === 0}
          className="px-6 py-4 rounded-full text-white text-sm font-bold flex items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] disabled:opacity-50 disabled:shadow-none transition-all transform hover:-translate-y-1"
          style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}
        >
          {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
          Generar Formato PDF
        </button>
      </div>

      {/* Modal Preview PDF */}
      {showPreview && pdfBlobUrl && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900/90 backdrop-blur-sm p-4">
          <div className="bg-white rounded-t-xl shadow-2xl w-full h-14 flex items-center justify-between px-4 max-w-5xl mx-auto">
            <h2 className="font-bold text-gray-800 flex items-center gap-2"><Eye size={18} className="text-teal-600"/> Vista Previa - Salida de Bienes</h2>
            <div className="flex gap-2">
              <a href={pdfBlobUrl} download="Salida_Bienes.pdf" className="px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-sm font-semibold flex items-center gap-1">
                <Download size={14} /> Descargar
              </a>
              <button onClick={() => setShowPreview(false)} className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-semibold">
                Cerrar
              </button>
            </div>
          </div>
          <div className="w-full max-w-5xl mx-auto flex-1 bg-gray-100 rounded-b-xl overflow-hidden">
            <iframe src={pdfBlobUrl} className="w-full h-full border-0" title="PDF Preview" />
          </div>
        </div>
      )}
    </div>
  );
}
