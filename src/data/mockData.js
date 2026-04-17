// Mock data for IMSS Asset Management System

export const ROLES = {
  COMMON: 'usuario_comun',
  ADMIN: 'administrador',
  SUPERADMIN: 'usuario_maestro',
};

export const mockAssets = [
  {
    id: 'ACT-001', numSerie: 'SN-DL8X92K741', tipo: 'Capitalizable', equipo: 'Laptop Dell Latitude 5540',
    marca: 'Dell', modelo: 'Latitude 5540', ubicacion: 'Coordinación de Informática',
    resguardo: 'Ing. Carlos Morales Vega', estatus: 'Activo', fechaAdquisicion: '2023-03-15',
    fechaVencimientoGarantia: '2026-03-15', proveedor: 'SOLUCIONES TI S.A. de C.V.',
    costoAdquisicion: '$22,500.00', partida: '5150 - Equipo de Cómputo',
    specs: { cpu: 'Intel Core i7-1365U', ram: '16 GB DDR5', storage: '512 GB SSD NVMe', ip: '192.168.1.24', so: 'Windows 11 Pro' },
    qrCode: 'ACT-001-SN-DL8X92K741',
  },
  {
    id: 'ACT-002', numSerie: 'SN-LN5P30X882', tipo: 'Capitalizable', equipo: 'Laptop Lenovo ThinkPad E14',
    marca: 'Lenovo', modelo: 'ThinkPad E14 Gen 4', ubicacion: 'Jefatura de Afiliación y Vigencia',
    resguardo: 'L.C. Patricia Ríos Hernández', estatus: 'Activo', fechaAdquisicion: '2022-09-10',
    fechaVencimientoGarantia: '2025-09-10', proveedor: 'INFOCÓMPUTO DEL NORTE S.A.',
    costoAdquisicion: '$19,800.00', partida: '5150 - Equipo de Cómputo',
    specs: { cpu: 'AMD Ryzen 5 5625U', ram: '8 GB DDR4', storage: '256 GB SSD', ip: '192.168.1.45', so: 'Windows 11 Pro' },
    qrCode: 'ACT-002-SN-LN5P30X882',
  },
  {
    id: 'ACT-003', numSerie: 'SN-HP4Z10W563', tipo: 'Capitalizable', equipo: 'Impresora HP LaserJet M404dw',
    marca: 'HP', modelo: 'LaserJet Pro M404dw', ubicacion: 'Jefatura de Finanzas',
    resguardo: 'C.P. Roberto Guzmán Torres', estatus: 'En Reparación', fechaAdquisicion: '2021-06-20',
    fechaVencimientoGarantia: '2024-06-20', proveedor: 'REPRESENTACIONES HEWLETT S.A.',
    costoAdquisicion: '$8,500.00', partida: '5150 - Equipo de Cómputo',
    specs: { cpu: 'N/A', ram: 'N/A', storage: 'N/A', ip: '192.168.1.80', so: 'N/A' },
    qrCode: 'ACT-003-SN-HP4Z10W563',
  },
  {
    id: 'ACT-004', numSerie: 'SN-DL7R55J294', tipo: 'Capitalizable', equipo: 'Desktop Dell OptiPlex 7010',
    marca: 'Dell', modelo: 'OptiPlex 7010 SFF', ubicacion: 'Subdelegación Médica',
    resguardo: 'Dr. Alejandro Soto Ramírez', estatus: 'Activo', fechaAdquisicion: '2023-07-05',
    fechaVencimientoGarantia: '2026-07-05', proveedor: 'SOLUCIONES TI S.A. de C.V.',
    costoAdquisicion: '$17,200.00', partida: '5150 - Equipo de Cómputo',
    specs: { cpu: 'Intel Core i7-12700', ram: '16 GB DDR4', storage: '512 GB SSD', ip: '192.168.1.91', so: 'Windows 11 Pro' },
    qrCode: 'ACT-004-SN-DL7R55J294',
  },
  {
    id: 'ACT-005', numSerie: 'SN-LX2M78A031', tipo: 'No Capitalizable', equipo: 'Impresora Lexmark MS431dn',
    marca: 'Lexmark', modelo: 'MS431dn', ubicacion: 'Coordinación de Prestaciones Económicas',
    resguardo: 'Lic. María Sandoval Cruz', estatus: 'Activo', fechaAdquisicion: '2022-01-18',
    fechaVencimientoGarantia: '2025-01-18', proveedor: 'COMPUMAX TECNOLOGÍA S.A.',
    costoAdquisicion: '$6,300.00', partida: 'No Capitalizable',
    specs: { cpu: 'N/A', ram: 'N/A', storage: 'N/A', ip: '192.168.1.102', so: 'N/A' },
    qrCode: 'ACT-005-SN-LX2M78A031',
  },
  {
    id: 'ACT-006', numSerie: 'SN-DL9T12B847', tipo: 'No Capitalizable', equipo: 'Laptop Dell Inspiron 15',
    marca: 'Dell', modelo: 'Inspiron 3520', ubicacion: 'Recursos Humanos',
    resguardo: 'Lic. Jorge Espinoza Nuñez', estatus: 'Baja', fechaAdquisicion: '2019-05-30',
    fechaVencimientoGarantia: '2022-05-30', proveedor: 'MULTITEC S.A. de C.V.',
    costoAdquisicion: '$14,100.00', partida: 'No Capitalizable',
    specs: { cpu: 'Intel Core i5-8250U', ram: '8 GB DDR4', storage: '256 GB SSD', ip: 'N/A', so: 'Windows 10 Pro' },
    qrCode: 'ACT-006-SN-DL9T12B847',
  },
  {
    id: 'ACT-007', numSerie: 'SN-LN3K67G492', tipo: 'Capitalizable', equipo: 'Laptop Lenovo IdeaPad 5',
    marca: 'Lenovo', modelo: 'IdeaPad 5 Pro', ubicacion: 'Auditoría Médica',
    resguardo: 'Dr. Ana González Flores', estatus: 'Activo', fechaAdquisicion: '2024-01-12',
    fechaVencimientoGarantia: '2027-01-12', proveedor: 'TECNOLOGÍA INTEGRAL S.A.',
    costoAdquisicion: '$21,000.00', partida: '5150 - Equipo de Cómputo',
    specs: { cpu: 'AMD Ryzen 7 5800H', ram: '16 GB DDR4', storage: '512 GB SSD NVMe', ip: '192.168.1.133', so: 'Windows 11 Pro' },
    qrCode: 'ACT-007-SN-LN3K67G492',
  },
  {
    id: 'ACT-008', numSerie: 'SN-HP8V24C615', tipo: 'No Capitalizable', equipo: 'Impresora HP OfficeJet Pro',
    marca: 'HP', modelo: 'OfficeJet Pro 9015e', ubicacion: 'Jefatura de Servicios Generales',
    resguardo: 'T.A. Fernanda López Díaz', estatus: 'En Reparación', fechaAdquisicion: '2021-11-03',
    fechaVencimientoGarantia: '2024-11-03', proveedor: 'REPRESENTACIONES HEWLETT S.A.',
    costoAdquisicion: '$5,800.00', partida: 'No Capitalizable',
    specs: { cpu: 'N/A', ram: 'N/A', storage: 'N/A', ip: '192.168.1.145', so: 'N/A' },
    qrCode: 'ACT-008-SN-HP8V24C615',
  },
];

export const mockIncidencias = [
  {
    id: 'INC-001', assetId: 'ACT-003', equipo: 'Impresora HP LaserJet M404dw', numSerie: 'SN-HP4Z10W563',
    falla: 'Error de calibración de papel — Código 79.00FE', estatus: 'En Revisión',
    fecha: '2026-03-04',
    tecnico: 'Ing. Mario Quiñones', notas: 'Se solicitó refacción de fusor al proveedor.',
  },
  {
    id: 'INC-002', assetId: 'ACT-008', equipo: 'Impresora HP OfficeJet Pro', numSerie: 'SN-HP8V24C615',
    falla: 'Atasco de papel recurrente en bandeja 2', estatus: 'Pendiente',
    fecha: '2026-03-06',
    tecnico: 'Sin asignar', notas: '',
  },
  {
    id: 'INC-003', assetId: 'ACT-002', equipo: 'Laptop Lenovo ThinkPad E14', numSerie: 'SN-LN5P30X882',
    falla: 'Pantalla con líneas horizontales intermitentes', estatus: 'Resuelto',
    fecha: '2026-02-28',
    tecnico: 'Ing. Carlos Morales Vega', notas: 'Se reemplazó cable de pantalla LVDS. Garantía aplicada.',
  },
  {
    id: 'INC-004', assetId: 'ACT-001', equipo: 'Laptop Dell Latitude 5540', numSerie: 'SN-DL8X92K741',
    falla: 'Batería no carga correctamente, tiempo de vida reducido', estatus: 'Pendiente',
    fecha: '2026-03-07',
    tecnico: 'Sin asignar', notas: '',
  },
  {
    id: 'INC-005', assetId: 'ACT-006', equipo: 'Laptop Dell Inspiron 15', numSerie: 'SN-DL9T12B847',
    falla: 'Falla total de disco duro — S.O. no arranca', estatus: 'Resuelto',
    fecha: '2026-01-15',
    tecnico: 'Ing. Mario Quiñones', notas: 'Dado de baja por obsolescencia y costo de reparación elevado.',
  },
];

export const mockUsers = [
  { id: 'USR-001', nombre: 'Ing. Carlos Morales Vega', area: 'Coordinación de Informática', rol: 'Administrador', activo: true, email: 'c.morales@imss.gob.mx' },
  { id: 'USR-002', nombre: 'L.C. Patricia Ríos Hernández', area: 'Jefatura de Afiliación y Vigencia', rol: 'Usuario Común', activo: true, email: 'p.rios@imss.gob.mx' },
  { id: 'USR-003', nombre: 'C.P. Roberto Guzmán Torres', area: 'Jefatura de Finanzas', rol: 'Usuario Común', activo: true, email: 'r.guzman@imss.gob.mx' },
  { id: 'USR-004', nombre: 'Dr. Alejandro Soto Ramírez', area: 'Subdelegación Médica', rol: 'Usuario Común', activo: true, email: 'a.soto@imss.gob.mx' },
  { id: 'USR-005', nombre: 'Lic. María Sandoval Cruz', area: 'Coordinación de Prestaciones Económicas', rol: 'Usuario Común', activo: false, email: 'm.sandoval@imss.gob.mx' },
  { id: 'USR-006', nombre: 'Lic. Jorge Espinoza Nuñez', area: 'Recursos Humanos', rol: 'Usuario Común', activo: true, email: 'j.espinoza@imss.gob.mx' },
  { id: 'USR-007', nombre: 'Ing. Mario Quiñones', area: 'Coordinación de Informática', rol: 'Administrador', activo: true, email: 'm.quinones@imss.gob.mx' },
  { id: 'USR-008', nombre: 'Admin. Sistema IMSS', area: 'Dirección General', rol: 'SuperAdmin', activo: true, email: 'admin@imss.gob.mx' },
];

export const mockActivityLog = [
  { id: 1, fecha: '2026-03-07 18:45', usuario: 'Ing. Carlos Morales Vega', accion: 'Alta de activo', detalle: 'Registró Laptop Lenovo IdeaPad 5 (ACT-007)', tipo: 'create' },
  { id: 2, fecha: '2026-03-07 15:22', usuario: 'L.C. Patricia Ríos Hernández', accion: 'Reporte de incidencia', detalle: 'INC-004: Falla de batería en ACT-001', tipo: 'incident' },
  { id: 3, fecha: '2026-03-06 12:10', usuario: 'T.A. Fernanda López Díaz', accion: 'Reporte de incidencia', detalle: 'INC-002: Atasco de papel en ACT-008', tipo: 'incident' },
  { id: 4, fecha: '2026-03-05 09:33', usuario: 'Ing. Mario Quiñones', accion: 'Actualización de activo', detalle: 'Modificó estado de ACT-003 a "En Reparación"', tipo: 'edit' },
  { id: 5, fecha: '2026-03-04 16:55', usuario: 'Admin. Sistema IMSS', accion: 'Traspaso autorizado', detalle: 'Traslado de ACT-004 de Finanzas a Subdelegación Médica', tipo: 'transfer' },
  { id: 6, fecha: '2026-03-03 11:20', usuario: 'Admin. Sistema IMSS', accion: 'Usuario creado', detalle: 'Nuevo usuario: Dr. Ana González Flores (Auditoría Médica)', tipo: 'user' },
  { id: 7, fecha: '2026-03-02 08:45', usuario: 'Ing. Carlos Morales Vega', accion: 'QR generado', detalle: 'Código QR generado para ACT-007', tipo: 'qr' },
];

export const mockEquiposPorJefatura = [
  { jefatura: 'C. Informática', equipos: 8 },
  { jefatura: 'Jef. Afiliación', equipos: 5 },
  { jefatura: 'Jef. Finanzas', equipos: 7 },
  { jefatura: 'Subdeleg. Médica', equipos: 12 },
  { jefatura: 'C. Prestaciones', equipos: 4 },
  { jefatura: 'Rec. Humanos', equipos: 3 },
  { jefatura: 'Aud. Médica', equipos: 6 },
  { jefatura: 'Serv. Generales', equipos: 2 },
];

export const mockAuditLog = [
  { id: 1, fecha: '2026-03-07 19:01', usuario: 'Admin. Sistema IMSS', ip: '192.168.1.1', accion: 'LOGIN', modulo: 'Autenticación', resultado: 'Exitoso' },
  { id: 2, fecha: '2026-03-07 18:45', usuario: 'Ing. Carlos Morales Vega', ip: '192.168.1.24', accion: 'CREATE', modulo: 'Inventario', resultado: 'Exitoso' },
  { id: 3, fecha: '2026-03-07 17:30', usuario: 'Ing. Mario Quiñones', ip: '192.168.1.22', accion: 'UPDATE', modulo: 'Incidencias', resultado: 'Exitoso' },
  { id: 4, fecha: '2026-03-07 16:15', usuario: 'L.C. Patricia Ríos Hernández', ip: '192.168.1.45', accion: 'READ', modulo: 'Inventario', resultado: 'Exitoso' },
  { id: 5, fecha: '2026-03-06 14:00', usuario: 'USR-DESCONOCIDO', ip: '10.0.0.55', accion: 'LOGIN', modulo: 'Autenticación', resultado: 'Fallido' },
  { id: 6, fecha: '2026-03-05 09:20', usuario: 'Admin. Sistema IMSS', ip: '192.168.1.1', accion: 'DELETE', modulo: 'Usuarios', resultado: 'Exitoso' },
  { id: 7, fecha: '2026-03-04 11:45', usuario: 'Ing. Carlos Morales Vega', ip: '192.168.1.24', accion: 'EXPORT', modulo: 'Reportes', resultado: 'Exitoso' },
];

export const UBICACIONES = [
  'Coordinación de Informática',
  'Jefatura de Afiliación y Vigencia',
  'Jefatura de Finanzas',
  'Subdelegación Médica',
  'Coordinación de Prestaciones Económicas',
  'Recursos Humanos',
  'Auditoría Médica',
  'Jefatura de Servicios Generales',
  'Dirección General',
  'Unidad de Medicina Familiar 01',
];
