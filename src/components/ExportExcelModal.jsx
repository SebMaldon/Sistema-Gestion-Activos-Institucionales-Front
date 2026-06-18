import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import * as XLSX from 'xlsx';
import { X, FileSpreadsheet, FileText, Loader2, Download } from 'lucide-react';
import { gqlClient } from '../api/client';
import { GET_BIENES_QUERY } from '../api/inventario.queries';
import { mapBienNode } from '../hooks/useBienes';

// ── Paleta IMSS ───────────────────────────────────────────────────────────────
const COLOR_VERDE   = '006341';
const COLOR_VERDE_M = '004d32';
const COLOR_GRIS    = 'F3F4F6';
const COLOR_AZUL    = 'DBEAFE';
const COLOR_CIAN    = 'CFFAFE';
const COLOR_AMBER   = 'FEF3C7';
const COLOR_PURP    = 'EDE9FE';
const COLOR_WHITE   = 'FFFFFF';
const COLOR_TEXT    = '111827';

// ── Helper: formatear fecha legible ──────────────────────────────────────────
function fmtFecha(val) {
  if (!val) return '';
  try {
    const d = new Date(isNaN(Number(val)) ? val : Number(val));
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return String(val); }
}

// ── Construir texto descriptivo ───────────────────────────────────────────────
export function buildDescription({ activeTab, advFilters, filterStatus, search, catalogos }) {
  const partes = [];

  // Tipo de bien (base)
  const tipoBase =
    activeTab === 'Capitalizable'    ? 'Bienes Capitalizables'
    : activeTab === 'No Capitalizable' ? 'Bienes No Capitalizables'
    : 'Bienes';

  // Unidades
  if (advFilters.clave_unidad_ref?.length) {
    const names = advFilters.clave_unidad_ref.map(clave => {
      const u = (catalogos?.unidades ?? []).find(x => x.clave === clave);
      return u?.desc_corta || u?.descripcion || clave;
    });
    partes.push(`de la(s) unidad(es): ${names.join(', ')}`);
  }

  // Segmentos
  if (advFilters.id_segmento?.length) {
    const names = advFilters.id_segmento.map(id => {
      const s = (catalogos?.segmentos ?? []).find(x => String(x.id_segmento) === String(id));
      return s?.nombre || s?.clave || id;
    });
    partes.push(`del segmento: ${names.join(', ')}`);
  }

  // Ubicaciones físicas
  if (advFilters.id_ubicacion?.length) {
    const names = advFilters.id_ubicacion.map(id => {
      const u = (catalogos?.ubicaciones ?? []).find(x => String(x.id_ubicacion) === String(id));
      return u?.nombre_ubicacion || id;
    });
    partes.push(`en la ubicación física: ${names.join(', ')}`);
  }

  // Tipo dispositivo
  if (advFilters.tipo_disp?.length) {
    const names = advFilters.tipo_disp.map(id => {
      const t = (catalogos?.tipos ?? []).find(x => String(x.tipo_disp) === String(id));
      return t?.nombre_tipo || id;
    });
    partes.push(`de tipo: ${names.join(', ')}`);
  }

  // Marcas
  if (advFilters.clave_marca?.length) {
    const names = advFilters.clave_marca.map(id => {
      const m = (catalogos?.marcas ?? []).find(x => String(x.clave_marca) === String(id));
      return m?.marca || id;
    });
    partes.push(`marca: ${names.join(', ')}`);
  }

  // Categorías
  if (advFilters.id_categoria?.length) {
    const names = advFilters.id_categoria.map(id => {
      const c = (catalogos?.categorias ?? []).find(x => String(x.id_categoria) === String(id));
      return c?.nombre_categoria || id;
    });
    partes.push(`categoría: ${names.join(', ')}`);
  }

  // RAM
  if (advFilters.ram_min || advFilters.ram_max) {
    const min = advFilters.ram_min || '0';
    const max = advFilters.ram_max || '∞';
    partes.push(`con RAM entre ${min}–${max} GB`);
  }

  // Almacenamiento
  if (advFilters.almacenamiento_min || advFilters.almacenamiento_max) {
    const min = advFilters.almacenamiento_min || '0';
    const max = advFilters.almacenamiento_max || '∞';
    partes.push(`con almacenamiento entre ${min}–${max} GB`);
  }

  // SO
  if (advFilters.modelo_so) partes.push(`con S.O.: ${advFilters.modelo_so}`);

  // CPU
  if (advFilters.cpu_info) partes.push(`con CPU: ${advFilters.cpu_info}`);

  // IP
  if (advFilters.dir_ip) partes.push(`con IP: ${advFilters.dir_ip}`);

  // Garantía
  if (advFilters.tiene_garantia === 'true') {
    let g = 'con garantía';
    if (advFilters.garantia_vigente === 'true') g = 'con garantía vigente';
    if (advFilters.garantia_fin_desde || advFilters.garantia_fin_hasta) {
      const desde = advFilters.garantia_fin_desde || '—';
      const hasta = advFilters.garantia_fin_hasta || '—';
      g += ` (vence entre ${desde} y ${hasta})`;
    }
    partes.push(g);
  } else if (advFilters.tiene_garantia === 'false') {
    partes.push('sin garantía');
  }

  // Notas recientes
  if (advFilters.con_notas_recientes) partes.push('con advertencia reciente');

  // Sin inventario
  if (advFilters.inconvenientes) partes.push('con inconvenientes (Sin inventario o IP Duplicada)');

  // Estatus
  const estatusMap = {
    'ACTIVO': 'Activo', 'INACTIVO': 'Inactivo', 'DAÑADO': 'Dañado',
    'DEVOLUCIÓN': 'Devolución', 'OTRO': 'Otro', 'P_BAJA': 'Pre-Baja',
    'PRESTAMO': 'Préstamo', 'SINIESTRADO': 'Siniestrado',
    'SUSTITUIDO': 'Sustituido', 'TRASPASO OOAD': 'Traspaso OOAD',
    'TRASPASO_FORANEO': 'Traspaso Foráneo'
  };
  if (filterStatus) partes.push(`estatus: ${estatusMap[filterStatus] || filterStatus}`);

  // Búsqueda
  if (search) partes.push(`búsqueda: "${search}"`);

  if (partes.length === 0) return `Todos los ${tipoBase}`;
  return `${tipoBase} — ${partes.join(', ')}`;
}

// ── Fetch de todos los bienes con el filtro actual ────────────────────────────
async function fetchAllBienes(serverFilter) {
  // Paginamos de 500 en 500 hasta obtener todos
  let allBienes = [];
  let after = undefined;
  let hasNext = true;
  while (hasNext) {
    const data = await gqlClient.request(GET_BIENES_QUERY, {
      filter: serverFilter,
      pagination: { first: 500, after },
    });
    const edges = data.bienes.edges ?? [];
    const pageInfo = data.bienes.pageInfo ?? {};
    allBienes = allBienes.concat(edges.map(({ node }) => mapBienNode(node)));
    hasNext = pageInfo.hasNextPage && pageInfo.endCursor;
    after = pageInfo.endCursor;
  }
  return allBienes;
}

// ── Construir el libro Excel ──────────────────────────────────────────────────
function buildWorkbook(bienes, { withDescription, descripcion, totalCount, catalogosMarcas }) {
  const wb = XLSX.utils.book_new();

  // ─── Hoja 1: Inventario ───────────────────────────────────────────────────
  const wsData = [];

  // Encabezado institucional (solo con descripción)
  let dataStartRow = 0;
  if (withDescription) {
    wsData.push(['SISTEMA INTEGRAL DE INFRAESTRUCTURA TECNOLOGICA — IMSS Delegación Nayarit']);
    wsData.push([`Reporte de: ${descripcion}`]);
    wsData.push([`Fecha de exportación: ${new Date().toLocaleString('es-MX')}`]);
    wsData.push([`Total de registros: ${totalCount}`]);
    wsData.push([]); // fila vacía
    dataStartRow = 5;
  }

  // Sub-encabezados de grupo (fila de grupo visual)
  // Columnas por grupo:
  //   N° (1) | IDENTIFICACIÓN (3) | DESCRIPCIÓN (6) | UBICACIÓN (4) | GENERAL (4) | TI (12) | GARANTÍA (3)
  //   col 0  | 1-3               | 4-9             | 10-13         | 14-17       | 18-29   | 30-32
  const groupRow = [
    '', // N°
    // Identificación (3 cols: Serie, Inv, Clave Presupuestal)
    'IDENTIFICACIÓN', '', '',
    // Descripción (6 cols: Clave Modelo, Descripción Disp., Categoría, Tipo Disp., Marca, Unidad Medida)
    'DESCRIPCIÓN DEL BIEN', '', '', '', '', '',
    // Ubicación (4 cols: Unidad, Segmento, Ubicación Física, Resguardo)
    'UBICACIÓN', '', '', '',
    // General (4 cols: Estatus, Fecha Adq., Capitalizable, Cantidad)
    'GENERAL', '', '', '',
    // TI (14 cols: 18-31)
    'ESPECIFICACIONES TI', '', '', '', '', '', '', '', '', '', '', '', '', '',
    // Garantía (3 cols: 32-34)
    'GARANTÍA', '', '',
  ];
  wsData.push(groupRow);

  // Columnas de datos
  const headers = [
    'N°',
    // Identificación
    'N° de Serie', 'N° de Inventario', 'Clave Presupuestal',
    // Descripción
    'Clave Modelo', 'Descripción Dispositivo', 'Categoría',
    'Tipo de Dispositivo', 'Marca', 'Unidad de Medida',
    // Ubicación
    'Unidad', 'Segmento', 'Ubicación Física', 'Resguardo',
    // General
    'Estatus', 'Fecha Adquisición', 'Capitalizable', 'Cantidad',
    // TI
    'CPU', 'RAM (GB)', 'Almacenamiento (GB)', 'Dir. IP', 'Dir. MAC',
    'MAC Address', 'Nombre Host', 'S.O.', 'Office', 'Puerto Red', 'Switch',
    'N° Serie Windows', 'Último Escaneo',
    'Cuentas Registradas (Usuario | Correo | Tipo)',
    // Garantía
    'Garantía', 'Garantía Vence', 'Proveedor Garantía',
  ];
  wsData.push(headers);

  // Filas de datos
  bienes.forEach((b, i) => {
    const g = b.garantias?.[0] ?? null;
    // Marca: buscar en catalogos por clave_marca del modelo
    const marcaNombre = (() => {
      const claveMarca = b.modelo?.clave_marca;
      if (!claveMarca) return '';
      const m = (catalogosMarcas ?? []).find(x => String(x.clave_marca) === String(claveMarca));
      return m?.marca || String(claveMarca);
    })();
    // Unidad de medida
    const umNombre = b.unidadMedida?.nombre_unidad
      ? `${b.unidadMedida.nombre_unidad} (${b.unidadMedida.abreviatura || ''})`
      : (b.unidadMedida?.abreviatura || '');
    // Segmento: viene en originalNode.segmento
    const segmentoNombre = b.originalNode?.segmento?.nombre || b.originalNode?.segmento?.clave || '';

    wsData.push([
      i + 1,
      // Identificación
      b.numSerie === 'N/D' ? '' : (b.numSerie || ''),
      b.numInv   === 'N/D' ? '' : (b.numInv || ''),
      b.clavePresupuestal === '—' ? '' : (b.clavePresupuestal || ''),
      // Descripción
      b.modelo?.clave_modelo || b.claveModelo || '',
      b.modelo?.descrip_disp || '',
      b.categoria?.nombre_categoria || '',
      b.modelo?.tipoDispositivo?.nombre_tipo || '',
      marcaNombre,
      umNombre,
      // Ubicación
      b.unidadFisica || '',
      segmentoNombre,
      b.ubicacion || '',
      b.resguardo || '',
      // General
      b.estatusOperativo || '',
      fmtFecha(b.fechaAdquisicion),
      b.esCapitalizable ? 'Sí' : 'No',
      b.cantidad ?? 1,
      // TI
      b.especificacionTI?.cpu_info || '',
      b.especificacionTI?.ram_gb ?? '',
      b.especificacionTI?.almacenamiento_gb ?? '',
      b.especificacionTI?.dir_ip || '',
      b.especificacionTI?.dir_mac || '',
      b.especificacionTI?.mac_address || '',
      b.especificacionTI?.nombre_host || '',
      b.especificacionTI?.modelo_so || '',
      b.especificacionTI?.version_office || '',
      b.especificacionTI?.puerto_red || '',
      b.especificacionTI?.switch_red || '',
      b.especificacionTI?.windows_serial || '',
      fmtFecha(b.especificacionTI?.last_scan),
      (b.cuentasPC || []).map(c => `• ${c.cuenta_windows || 'Sin usuario'} | ${c.correo || 'Sin correo'} | ${c.tipo_user || 'Sin rol'}`).join('\n') || '',
      // Garantía
      g ? 'Sí' : 'No',
      g ? fmtFecha(g.fecha_fin) : '',
      g?.proveedorObj?.nombre_proveedor || '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // ── Estilos ───────────────────────────────────────────────────────────────
  // Ancho de columnas
  ws['!cols'] = [
    { wch: 4 },   // N°
    // Identificación
    { wch: 18 }, { wch: 18 }, { wch: 20 },
    // Descripción
    { wch: 16 }, { wch: 30 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    // Ubicación
    { wch: 24 }, { wch: 18 }, { wch: 22 }, { wch: 28 },
    // General
    { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 10 },
    // TI
    { wch: 24 }, { wch: 10 }, { wch: 18 }, { wch: 14 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 },
    { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 18 },
    { wch: 45 },
    // Garantía
    { wch: 10 }, { wch: 16 }, { wch: 26 },
  ];

  const totalCols = headers.length;

  // Merges
  const merges = [];
  if (withDescription) {
    for (let r = 0; r < 4; r++) {
      merges.push({ s: { r, c: 0 }, e: { r, c: totalCols - 1 } });
    }
  }

  // Rangos de grupos: [colStart, colEnd] (0-indexed)
  // N°(0) | ID(1-3) | DESC(4-9) | UBIC(10-13) | GEN(14-17) | TI(18-31) | GAR(32-34)
  const groupRowIdx = dataStartRow;
  const groupRanges = [
    [1, 3], [4, 9], [10, 13], [14, 17], [18, 31], [32, 34],
  ];
  groupRanges.forEach(([start, end]) => {
    merges.push({ s: { r: groupRowIdx, c: start }, e: { r: groupRowIdx, c: end } });
  });

  ws['!merges'] = merges;

  // Aplicar estilos celda a celda
  const groupColors = [COLOR_GRIS, COLOR_AZUL, COLOR_CIAN, COLOR_AMBER, COLOR_PURP, COLOR_AZUL];
  const groupBorders = ['006341','1D4ED8','0E7490','B45309','7C3AED','1D4ED8'];

  // Estilo: encabezado institucional
  if (withDescription) {
    for (let r = 0; r < 4; r++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c: 0 });
      if (!ws[cellAddr]) ws[cellAddr] = { v: wsData[r][0] };
      ws[cellAddr].s = {
        font: { bold: r === 0, sz: r === 0 ? 13 : 11, color: { rgb: r === 0 ? COLOR_VERDE_M : '374151' } },
        fill: { fgColor: { rgb: r === 0 ? 'E8F5E9' : COLOR_WHITE } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      };
    }
  }

  // Estilo: fila de grupos
  for (let c = 0; c < totalCols; c++) {
    const grpIdx = groupRanges.findIndex(([s, e]) => c >= s && c <= e);
    const cellAddr = XLSX.utils.encode_cell({ r: groupRowIdx, c });
    if (!ws[cellAddr]) ws[cellAddr] = { v: '' };
    ws[cellAddr].s = {
      font: { bold: true, sz: 9, color: { rgb: grpIdx >= 0 ? groupBorders[grpIdx] : '6B7280' } },
      fill: { fgColor: { rgb: grpIdx >= 0 ? groupColors[grpIdx] : COLOR_GRIS } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        bottom: { style: 'thin', color: { rgb: grpIdx >= 0 ? groupBorders[grpIdx] : 'D1D5DB' } },
      },
    };
  }

  // Estilo: fila de headers de columna
  const headerRowIdx = dataStartRow + 1;
  for (let c = 0; c < totalCols; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    if (!ws[cellAddr]) ws[cellAddr] = { v: headers[c] };
    ws[cellAddr].s = {
      font: { bold: true, sz: 10, color: { rgb: COLOR_WHITE } },
      fill: { fgColor: { rgb: COLOR_VERDE } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        bottom: { style: 'medium', color: { rgb: COLOR_VERDE_M } },
        right:  { style: 'thin',   color: { rgb: '004d32' } },
      },
    };
  }

  // Estilo: filas de datos (alternadas)
  const dataFirstRow = dataStartRow + 2;
  for (let r = dataFirstRow; r < dataFirstRow + bienes.length; r++) {
    const isEven = (r - dataFirstRow) % 2 === 0;
    for (let c = 0; c < totalCols; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellAddr]) ws[cellAddr] = { v: '' };
      const grpIdx = groupRanges.findIndex(([s, e]) => c >= s && c <= e);
      const baseFill = isEven ? COLOR_WHITE : COLOR_GRIS;
      ws[cellAddr].s = {
        font: { sz: 9, color: { rgb: COLOR_TEXT } },
        fill: { fgColor: { rgb: c === 0 ? (isEven ? 'F0FDF4' : 'DCFCE7') : baseFill } },
        alignment: {
          horizontal: c === 0 ? 'center' : (c >= 18 && c <= 31 ? 'center' : 'left'),
          vertical: 'center',
          wrapText: (c === 31),
        },
        border: {
          right:  { style: 'hair', color: { rgb: 'E5E7EB' } },
          bottom: { style: 'hair', color: { rgb: 'E5E7EB' } },
        },
      };
      // Resaltar columna Estatus (col 14 en el nuevo layout)
      if (c === 14) {
        const v = String(ws[cellAddr].v || '');
        const colorMap = { 'ACTIVO': '15803D', 'INACTIVO': 'B91C1C', 'DAÑADO': 'D97706', 'DEVOLUCIÓN': '7E22CE', 'OTRO': '374151', 'P_BAJA': 'C2410C', 'PRESTAMO': '1D4ED8', 'SINIESTRADO': '991B1B', 'SUSTITUIDO': '4338CA', 'TRASPASO OOAD': '0F766E', 'TRASPASO_FORANEO': '0369A1' };
        const bgMap   = { 'ACTIVO': 'DCFCE7', 'INACTIVO': 'FEE2E2', 'DAÑADO': 'FEF3C7', 'DEVOLUCIÓN': 'F3E8FF', 'OTRO': 'F3F4F6', 'P_BAJA': 'FFEDD5', 'PRESTAMO': 'DBEAFE', 'SINIESTRADO': 'FEF2F2', 'SUSTITUIDO': 'E0E7FF', 'TRASPASO OOAD': 'CCFBF1', 'TRASPASO_FORANEO': 'CFFAFE' };
        ws[cellAddr].s.font.color.rgb = colorMap[v] || COLOR_TEXT;
        ws[cellAddr].s.fill.fgColor.rgb = bgMap[v] || baseFill;
        ws[cellAddr].s.font.bold = true;
      }
    }
  }

  // Congelar paneles: columnas A-B y filas de header
  ws['!freeze'] = { xSplit: 2, ySplit: dataFirstRow };

  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

  // ─── Hoja 2: Resumen ──────────────────────────────────────────────────────
  const estatusMap2 = { 'ACTIVO': 'Activo', 'INACTIVO': 'Inactivo', 'DAÑADO': 'Dañado', 'DEVOLUCIÓN': 'Devolución', 'OTRO': 'Otro', 'P_BAJA': 'Pre-Baja', 'PRESTAMO': 'Préstamo', 'SINIESTRADO': 'Siniestrado', 'SUSTITUIDO': 'Sustituido', 'TRASPASO OOAD': 'Traspaso OOAD', 'TRASPASO_FORANEO': 'Traspaso Foráneo' };
  const byEstatus = {};
  bienes.forEach(b => {
    const key = estatusMap2[b.estatusOperativo] || b.estatusOperativo || 'Desconocido';
    byEstatus[key] = (byEstatus[key] || 0) + 1;
  });

  const byTipo = {};
  bienes.forEach(b => {
    const key = b.modelo?.tipoDispositivo?.nombre_tipo || 'Sin tipo';
    byTipo[key] = (byTipo[key] || 0) + 1;
  });

  const conGarantia = bienes.filter(b => b.garantias?.length > 0).length;
  const sinGarantia = bienes.length - conGarantia;
  const conInv      = bienes.filter(b => b.numInv && b.numInv !== 'N/D').length;
  const sinInv      = bienes.length - conInv;
  const conAdvertencia = bienes.filter(b => b.notas?.some(n => {
    const d = new Date(isNaN(Number(n.fecha_creacion)) ? n.fecha_creacion : Number(n.fecha_creacion));
    return (new Date() - d) < 86400000 * 30;
  })).length;

  const rsData = [
    ['RESUMEN DEL REPORTE'],
    [`Descripción: ${withDescription ? descripcion : 'Sin descripción específica'}`],
    [`Exportado: ${new Date().toLocaleString('es-MX')}`],
    [],
    ['TOTAL DE REGISTROS', bienes.length],
    [],
    ['DESGLOSE POR ESTATUS'],
    ...Object.entries(byEstatus).map(([k, v]) => [k, v]),
    [],
    ['DESGLOSE POR TIPO DE DISPOSITIVO'],
    ...Object.entries(byTipo).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v]),
    [],
    ['GARANTÍA'],
    ['Con garantía', conGarantia],
    ['Sin garantía', sinGarantia],
    [],
    ['INVENTARIO'],
    ['Con N° de inventario', conInv],
    ['Sin N° de inventario', sinInv],
    [],
    ['NOTAS / ADVERTENCIAS'],
    ['Con advertencia reciente (últ. 30 días)', conAdvertencia],
  ];

  const wsR = XLSX.utils.aoa_to_sheet(rsData);
  wsR['!cols'] = [{ wch: 40 }, { wch: 12 }];

  // Estilos básicos en Resumen
  [[0, COLOR_VERDE, COLOR_WHITE, 14], [6, COLOR_GRIS, COLOR_VERDE_M, 10],
   [10, COLOR_GRIS, COLOR_VERDE_M, 10], [14, COLOR_GRIS, COLOR_VERDE_M, 10],
   [18, COLOR_GRIS, COLOR_VERDE_M, 10], [22, COLOR_GRIS, COLOR_VERDE_M, 10]].forEach(([rowIdx, bg, fg, sz]) => {
    const cellAddr = XLSX.utils.encode_cell({ r: rowIdx, c: 0 });
    if (wsR[cellAddr]) {
      wsR[cellAddr].s = {
        font: { bold: true, sz: sz || 10, color: { rgb: fg } },
        fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: 'left', vertical: 'center' },
      };
    }
  });

  XLSX.utils.book_append_sheet(wb, wsR, 'Resumen');

  return wb;
}

// ── Componente Modal ──────────────────────────────────────────────────────────
export default function ExportExcelModal({
  onClose,
  serverFilter,
  advFilters,
  activeTab,
  filterStatus,
  search,
  catalogos,
  pageInfo,
}) {
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(null);

  const descripcion = buildDescription({ activeTab, advFilters, filterStatus, search, catalogos });

  const handleExport = async (withDescription) => {
    setLoadingType(withDescription ? 'desc' : 'data');
    setLoading(true);
    try {
      const allBienes = await fetchAllBienes(serverFilter);
      const wb = buildWorkbook(allBienes, {
        withDescription,
        descripcion,
        totalCount: allBienes.length,
        catalogosMarcas: catalogos?.marcas ?? [],
      });
      const fecha = new Date().toISOString().split('T')[0];
      const nombre = withDescription
        ? `Inventario_con_desc_${fecha}.xlsx`
        : `Inventario_datos_${fecha}.xlsx`;
      XLSX.writeFile(wb, nombre);
      onClose();
    } catch (e) {
      console.error('Error exportando Excel:', e);
      alert('Ocurrió un error al generar el archivo. Intenta de nuevo.');
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-gray-900/60 fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
             style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Exportar a Excel</h2>
              <p className="text-[11px] text-green-200 mt-0.5">
                {pageInfo?.totalCount ?? '?'} registros con los filtros actuales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Vista previa de descripción */}
          <div className="rounded-xl border border-green-100 bg-green-50 p-3">
            <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <FileText size={11} /> Descripción del reporte
            </p>
            <p className="text-xs text-green-900 leading-relaxed font-medium">
              {descripcion}
            </p>
          </div>

          {/* Opción 1: Con descripción */}
          <button
            onClick={() => handleExport(true)}
            disabled={loading}
            className="w-full flex items-start gap-3.5 p-4 rounded-xl border-2 border-green-200 hover:border-green-400 hover:bg-green-50 transition-all text-left group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-green-100 group-hover:bg-green-200 transition-colors">
              {loadingType === 'desc' && loading
                ? <Loader2 size={18} className="text-green-700 animate-spin" />
                : <FileText size={18} className="text-green-700" />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Exportar con Descripción</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Incluye un encabezado con el detalle de los filtros aplicados antes de la tabla de datos. Ideal para reportes formales.
              </p>
            </div>
          </button>

          {/* Opción 2: Solo datos */}
          <button
            onClick={() => handleExport(false)}
            disabled={loading}
            className="w-full flex items-start gap-3.5 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all text-left group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 group-hover:bg-gray-200 transition-colors">
              {loadingType === 'data' && loading
                ? <Loader2 size={18} className="text-gray-600 animate-spin" />
                : <Download size={18} className="text-gray-600" />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Exportar Solo Datos</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Genera un archivo limpio con la tabla de datos directamente, sin encabezado descriptivo. Útil para análisis en Excel.
              </p>
            </div>
          </button>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-500">
              <Loader2 size={13} className="animate-spin text-green-600" />
              Descargando todos los registros filtrados, por favor espera…
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
