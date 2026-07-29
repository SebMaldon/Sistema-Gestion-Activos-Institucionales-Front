import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_BIENES_QUERY, GET_BIEN_BY_SERIE_QUERY } from '../api/inventario.queries';
import { CREATE_MULTIPLE_PRESTAMOS_MUTATION } from '../api/prestamos.queries';
import { GET_USUARIOS, GET_CAT_UNIDADES_FISICAS } from '../api/usuarios.queries';
import { useAuthStore } from '../store/auth.store';
import { useApp } from '../context/AppContext';
import {
  FileText, Trash2, Loader2, Download, Eye, Check,
  Edit2, X, Printer, ChevronRight, AlertCircle,
  UserCheck, Plus, Upload, User, Package, Monitor
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import * as XLSX from 'xlsx';
import { buildPDFPrestamoBytes, ROWS_PER_PAGE } from '../utils/pdfPrestamos';

export default function PrestamosForm({ onClose, onSuccessCallback }) {
  const { showToast } = useApp();
  const usuario = useAuthStore((s) => s.usuario);
  const queryClient = useQueryClient();

  const getToday = () => {
    const d = new Date();
    // Ajustar a timezone local
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  };

  const [form, setForm] = useState({
    adminBien: 'ANA LUISA GONZALEZ CERVANTES',
    estadoBien: '',
    ubicacionPrestamo: '',
    entregaResponsable: 'ANA LUISA GONZALEZ CERVANTES',
    matriculaEntrega: '99191688',
    recibeResponsable: '',
    matriculaRecibe: '',
    lugar: 'Tepic, Nayarit.',
    fecha: getToday(),
  });

  const [bienesSeleccionados, setBienesSeleccionados] = useState([]);
  const [incluirMonitores, setIncluirMonitores] = useState(false);
  const [bienesSearch, setBienesSearch] = useState('');
  const [debouncedBienesSearch, setDebouncedBienesSearch] = useState('');
  
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('');
  
  const [bienesSearchFocus, setBienesSearchFocus] = useState(false);

  const [isGenerando, setIsGenerando] = useState(false);
  
  // States for system registration
  const [registrarEnSistema, setRegistrarEnSistema] = useState(true);
  const [fechaEstimada, setFechaEstimada] = useState('');
  const [detallesRegistro, setDetallesRegistro] = useState('');

  const descripcionDefault = `Préstamo a: ${form.recibeResponsable || 'No especificado'}. Estado físico: ${form.estadoBien || 'No especificado'}.`;
  
  const registrarPrestamosMutation = useMutation({
    mutationFn: async (variables) => gqlClient.request(CREATE_MULTIPLE_PRESTAMOS_MUTATION, variables)
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedBienesSearch(bienesSearch), 400);
    return () => clearTimeout(timer);
  }, [bienesSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUserSearch(userSearchTerm), 400);
    return () => clearTimeout(timer);
  }, [userSearchTerm]);

  const { data: bienesData, isLoading: isLoadingBienes } = useQuery({
    queryKey: ['bienes', 'TODOS', debouncedBienesSearch],
    queryFn: () => gqlClient.request(GET_BIENES_QUERY, {
      filter: { search: debouncedBienesSearch },
      pagination: { first: 20 },
    }),
  });

  const { data: unidadesData } = useQuery({
    queryKey: ['catUnidadesFisicas'],
    queryFn: () => gqlClient.request(GET_CAT_UNIDADES_FISICAS),
    staleTime: 5 * 60 * 1000,
  });
  const unidadesList = React.useMemo(() => unidadesData?.catUnidades || [], [unidadesData]);

  const { data: usuariosData, isLoading: isLoadingUsuarios } = useQuery({
    queryKey: ['usuariosList', debouncedUserSearch],
    queryFn: () => gqlClient.request(GET_USUARIOS, {
      estatus: true,
      search: debouncedUserSearch,
      pagination: { first: 50 },
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

  const unidadesOptions = React.useMemo(() => {
    return unidadesList.map(u => ({
      value: u.descripcion,
      label: `${u.clave} - ${u.descripcion}`,
      searchKey: `${u.clave} ${u.descripcion}`
    }));
  }, [unidadesList]);

  const crearPrestamoMutation = useMutation({
    mutationFn: (variables) => gqlClient.request(CREATE_PRESTAMO_MUTATION, variables),
  });


  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
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

  const handleGenerarPDF = async () => {
    if (bienesSeleccionados.length === 0) {
        showToast('Selecciona al menos un bien', 'warning');
        return;
    }
    if (!form.matriculaEntrega || !form.entregaResponsable) {
        showToast('Datos de quien entrega incompletos', 'warning');
        return;
    }
    if (!form.matriculaRecibe || !form.recibeResponsable) {
        showToast('Datos de quien recibe incompletos', 'warning');
        return;
    }

    try {
      setIsGenerando(true);
      
      if (registrarEnSistema) {
        const ids = bienesSeleccionados
          .filter(b => b.id_bien && !b.id_bien.toString().startsWith('manual_'))
          .map(b => b.id_bien);
          
        if (ids.length > 0) {
          try {
            const result = await registrarPrestamosMutation.mutateAsync({
              ids_bienes: ids,
              fecha_inicio_prestamo: new Date().toISOString(),
              fecha_a_terminar_prestamo: fechaEstimada ? new Date(fechaEstimada).toISOString() : null,
              descripcion_prestamo_inicio: detallesRegistro || descripcionDefault
            });
            if (result.crearMultiplesPrestamosBienes > 0) {
              showToast(`✅ Se actualizaron/registraron ${result.crearMultiplesPrestamosBienes} bienes en préstamo.`, 'success');
              // Optionally invalidate queries here so the inventory view updates
              queryClient.invalidateQueries(['bienes']);
            }
          } catch (regErr) {
            console.error('Error al registrar en BD:', regErr);
            showToast('El PDF se generará, pero hubo un error registrando en el sistema.', 'warning');
          }
        }
      }

      let formattedDate = form.fecha;
      if (formattedDate && formattedDate.includes('-')) {
        const [y, m, d] = formattedDate.split('-');
        formattedDate = `${d}/${m}/${y}`;
      }
      const dataForPDF = {
        ...form,
        lugarFecha: `${form.lugar} ${formattedDate}`.trim(),
      };

      const pdfBytes = await buildPDFPrestamoBytes(dataForPDF, bienesSeleccionados);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      showToast('Formato generado y abierto en nueva pestaña', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error generando PDF', 'error');
    } finally {
      setIsGenerando(false);
    }
  };

  const totalBienes = bienesSeleccionados.length;
  const paginasNecesarias = Math.max(1, Math.ceil(totalBienes / ROWS_PER_PAGE));

  return (
    <div className="flex flex-col h-[calc(100vh-230px)] space-y-4 pb-4">
      <div className="flex items-center justify-between bg-gradient-to-r from-teal-50 dark:from-teal-900/20 to-emerald-50 dark:to-emerald-900/20 border border-teal-100 dark:border-teal-800/50 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center shadow-sm">
              <FileText size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold uppercase tracking-wide">
                Nuevo Formato de Préstamo
              </p>
              <p className="text-2xl font-black text-teal-800 dark:text-teal-300 leading-none">
                Préstamos
              </p>
            </div>
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
        <div className="space-y-6 overflow-y-auto pr-3 pb-8 custom-scrollbar">
          <div className="bg-white dark:bg-gray-800 border border-teal-100 dark:border-teal-800/50 shadow-sm rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-teal-800 dark:text-teal-300 border-b border-teal-100 dark:border-teal-800/50 pb-2 flex items-center gap-2">
              <User size={16} className="text-teal-600 dark:text-teal-400" /> Información del Formato
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Responsable Administrativo de Bienes (AdminBien)
                </label>
                <input type="text" name="adminBien" value={form.adminBien} onChange={handleChange}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors" />
              </div>
              
              <div className="bg-teal-50 dark:bg-teal-900/20 p-3 rounded-lg border border-teal-100 dark:border-teal-800/50">
                <label className="block text-xs font-semibold text-teal-800 dark:text-teal-300 mb-1">Buscar Usuario (Autocompletar Quien Recibe)</label>
                <SearchableSelect
                  value=""
                  onChange={(matricula) => {
                    const user = usuariosList.find(u => u.matricula === matricula);
                    if (user) {
                      setForm(p => ({ ...p, matriculaRecibe: user.matricula, recibeResponsable: user.nombre_completo }));
                    }
                  }}
                  onInputChange={setUserSearchTerm}
                  options={usuariosOptionsMatricula}
                  placeholder="Busca por nombre o matrícula…"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Recibe el responsable (Nombre)
                </label>
                <input type="text" name="recibeResponsable" value={form.recibeResponsable} onChange={handleChange}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 outline-none focus:border-teal-500 transition-colors" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Recibe el responsable (Matrícula)
                </label>
                <input type="text" name="matriculaRecibe" value={form.matriculaRecibe} onChange={handleChange}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 outline-none focus:border-teal-500 transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Entrega el responsable (Nombre)
                </label>
                <input type="text" name="entregaResponsable" value={form.entregaResponsable} onChange={handleChange}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 outline-none focus:border-teal-500 transition-colors" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Entrega el responsable (Matrícula)
                </label>
                <input type="text" name="matriculaEntrega" value={form.matriculaEntrega} onChange={handleChange}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 outline-none focus:border-teal-500 transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Durante el tiempo que los bienes permanezcan en (Ubicación)
                </label>
                <SearchableSelect
                  value={form.ubicacionPrestamo}
                  onChange={(val) => setForm(p => ({ ...p, ubicacionPrestamo: val }))}
                  options={unidadesOptions}
                  placeholder="Selecciona o escribe una unidad..."
                  allowCustom={true}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Estado Físico (Observaciones)
                  </label>
                  <input type="text" name="estadoBien" value={form.estadoBien} onChange={handleChange}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 outline-none focus:border-teal-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Lugar
                  </label>
                  <input type="text" name="lugar" value={form.lugar} onChange={handleChange}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 outline-none focus:border-teal-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Fecha
                  </label>
                  <input type="date" name="fecha" value={form.fecha} onChange={handleChange}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 outline-none focus:border-teal-500 transition-colors" />
                </div>
              </div>

              {/* Sección Registro en Sistema */}
              <div className="mt-4 pt-4 border-t border-teal-100 dark:border-teal-800/50 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input type="checkbox" className="sr-only" 
                           checked={registrarEnSistema} onChange={(e) => setRegistrarEnSistema(e.target.checked)} />
                    <div className={`w-10 h-5.5 rounded-full transition-colors ${registrarEnSistema ? 'bg-teal-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                    <div className={`absolute left-1 top-1 w-3.5 h-3.5 bg-white rounded-full transition-transform ${registrarEnSistema ? 'translate-x-4.5' : 'translate-x-0'}`}></div>
                  </div>
                  <span className="text-sm font-bold text-teal-800 dark:text-teal-300 group-hover:text-teal-600 transition-colors">
                    Registrar Préstamo en el Sistema
                  </span>
                </label>
                
                {registrarEnSistema && (
                  <div className="bg-teal-50/50 dark:bg-teal-900/10 p-3 rounded-lg border border-teal-100 dark:border-teal-800/30 space-y-3">
                    <p className="text-xs text-teal-700 dark:text-teal-400/80">
                      Al generar el formato, los bienes que no estén en préstamo cambiarán su estatus a <strong>"PRESTAMO"</strong>. Si un bien ya está en préstamo, <strong>se actualizará/extenderá</strong> su registro con la nueva fecha y detalles.
                    </p>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-teal-800 dark:text-teal-300 mb-1">Detalles para el historial del bien</label>
                        <textarea 
                          rows="2"
                          value={detallesRegistro !== '' ? detallesRegistro : descripcionDefault}
                          onChange={(e) => setDetallesRegistro(e.target.value)}
                          className="w-full text-xs border border-teal-200 dark:border-teal-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-1.5 outline-none focus:border-teal-500 transition-colors resize-none" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-teal-800 dark:text-teal-300 mb-1">Devolución estimada (Opcional)</label>
                        <input type="date" value={fechaEstimada} onChange={(e) => setFechaEstimada(e.target.value)}
                          className="w-full text-xs border border-teal-200 dark:border-teal-700/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-1.5 outline-none focus:border-teal-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-4 bg-white dark:bg-gray-800 border border-teal-100 dark:border-teal-800/50 shadow-sm rounded-xl p-5 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between border-b border-teal-100 dark:border-teal-800/50 pb-2">
            <h3 className="text-sm font-bold text-teal-800 dark:text-teal-300 flex items-center gap-2">
              <Package size={16} className="text-teal-600 dark:text-teal-400" /> Bienes a Prestar
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="incMonitores" checked={incluirMonitores} onChange={(e) => setIncluirMonitores(e.target.checked)} className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
              <label htmlFor="incMonitores" className="text-xs text-gray-600 dark:text-gray-400 font-medium">Incluir monitores automáticamente (si tienen)</label>
            </div>
            <div className="flex gap-2 relative">
              <div className="flex-1 relative group">
                <input type="text" placeholder="Buscar modelo, N/S o N/I..." value={bienesSearch} onChange={(e) => setBienesSearch(e.target.value)}
                  onFocus={() => setBienesSearchFocus(true)}
                  onBlur={() => setTimeout(() => setBienesSearchFocus(false), 200)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg pl-3 pr-10 py-2 outline-none focus:border-teal-500 transition-colors" />
                {isLoadingBienes && (
                  <div className="absolute right-3 top-2.5 text-gray-400 animate-spin">
                    <Loader2 size={16} />
                  </div>
                )}
                {bienesList.length > 0 && (bienesSearch || bienesSearchFocus) && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                    {bienesList.map((b) => (
                      <div key={b.id_bien} onClick={() => { handleAddBien(b.id_bien); setBienesSearch(''); }}
                        className="px-4 py-2 hover:bg-teal-50 dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{b.modelo?.descrip_disp || 'Sin descripción'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          S/N: {b.num_serie || 'N/A'} • INV: {b.num_inv || 'N/A'} • Edo: {b.estatus_operativo}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={handleAddManualBien} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors border border-gray-300 dark:border-gray-600 flex items-center gap-1.5" title="Agregar fila manual">
                <Plus size={16} /> Fila Libre
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg custom-scrollbar">
            {bienesSeleccionados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 p-6 text-center">
                <Package size={48} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">No hay bienes seleccionados</p>
                <p className="text-xs mt-1">Busca un bien arriba o agrega filas manuales.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300 relative">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase sticky top-0 z-10 shadow-sm backdrop-blur-md">
                  <tr>
                    <th className="px-4 py-3 font-semibold w-16">Cant.</th>
                    <th className="px-4 py-3 font-semibold w-24">Naturaleza</th>
                    <th className="px-4 py-3 font-semibold">Descripción (Se imprime en PDF)</th>
                    <th className="px-4 py-3 font-semibold w-12 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {bienesSeleccionados.map((bien, idx) => (
                    <tr key={`${bien.id_bien}_${idx}`} className="hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-colors group">
                      <td className="px-3 py-2 align-top">
                        <input type="text" value={bien.cantidad} onChange={(e) => handleUpdateBien(idx, 'cantidad', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs text-center border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded focus:border-teal-500 outline-none" />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input type="text" value={bien.naturaleza} onChange={(e) => handleUpdateBien(idx, 'naturaleza', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs text-center border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded focus:border-teal-500 outline-none" />
                      </td>
                      <td className="px-3 py-2">
                        <textarea value={bien.descripcion} onChange={(e) => handleUpdateBien(idx, 'descripcion', e.target.value)}
                          rows={2} className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded focus:border-teal-500 outline-none resize-none" />
                        {bien.originalData && (
                          <div className="flex gap-2 mt-1 px-1 opacity-60 text-[10px]">
                            {bien.originalData.num_serie && <span className="bg-gray-100 dark:bg-gray-700 px-1.5 rounded">S/N: {bien.originalData.num_serie}</span>}
                            {bien.originalData.num_inv && <span className="bg-gray-100 dark:bg-gray-700 px-1.5 rounded">INV: {bien.originalData.num_inv}</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <button onClick={() => handleRemoveBien(idx)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors opacity-50 group-hover:opacity-100">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── FAB ── */}
      <div className="fixed bottom-6 right-6 z-[90] flex items-center gap-3">
        <button onClick={handleGenerarPDF} disabled={bienesSeleccionados.length === 0 || isGenerando}
          className="px-6 py-4 rounded-full text-white text-sm font-bold flex items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.25)] disabled:opacity-50 disabled:shadow-none transition-all transform hover:-translate-y-1 active:translate-y-0"
          style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
          {isGenerando 
            ? <><Loader2 size={20} className="animate-spin" /> Generando PDF…</> 
            : <><FileText size={20} /> Generar Formato PDF <ChevronRight size={16} /></>}
        </button>
      </div>
    </div>
  );
}
