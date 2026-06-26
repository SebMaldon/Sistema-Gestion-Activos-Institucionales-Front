import React from 'react';
import MermaidDiagram from '../components/MermaidDiagram';
import { BookOpen, ShieldCheck, Database, FileText, ArrowLeft, Users, Monitor, Package, AlertTriangle, ArrowLeftRight, Mail, QrCode, ClipboardList, Settings, Shield, Building2, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════════════════════════
 DIAGRAMA 1 — Casos de Uso Completo (3 actores + 4 subsistemas)
 ═══════════════════════════════════════════════════════════════════════════════ */
const diagramaCasosUso = `
flowchart LR
 %% ─── ACTORES ───
 Estandar(["👤 Usuario Estándar\\n(Técnico / Auditor)"])
 Admin(["🛡️ Administrador\\n(Jefe / Coordinador)"])
 Maestro(["⚙️ Usuario Maestro\\n(SuperAdmin)"])
 AgenteWin(["🖥️ Agente Windows\\n(.exe Autónomo)"])

 subgraph SIS ["Ecosistema de Gestión de Activos Institucionales — IMSS"]
 direction TB

 subgraph AUTH ["🔐 Autenticación y Seguridad"]
 direction TB
 UC_LOGIN(["Iniciar Sesión\\n(JWT HS256)"])
 UC_LOGOUT(["Cerrar Sesión"])
 UC_CAMBIAR_PASS(["Cambiar Mi Contraseña"])
 end

 subgraph INV ["📦 Gestión de Inventario"]
 direction TB
 UC_CONSULTAR_INV(["Consultar Inventario\\nde Bienes"])
 UC_FILTRAR_BIENES(["Filtrar y Buscar Bienes\\n(Multi-filtro Avanzado)"])
 UC_CREAR_BIEN(["Registrar Nuevo Bien\\n(Capitalizable / No Cap.)"])
 UC_EDITAR_BIEN(["Editar Información\\ndel Bien"])
 UC_ELIMINAR_BIEN(["Eliminar Bien\\ndel Inventario"])
 UC_CARGA_MASIVA(["Carga Masiva de Bienes\\n(Importar Excel)"])
 UC_EXPORTAR_EXCEL(["Exportar Inventario\\na Excel"])
 UC_GEN_QR(["Generar Etiquetas QR\\ny Códigos de Barras"])
 UC_IMPRIMIR_STICKERS(["Imprimir Hojas\\nde Stickers QR"])
 UC_ESCANEAR_QR(["Escanear QR / Buscar\\npor Serie, IP, Inv."])
 UC_VER_FICHA(["Consultar Ficha Técnica\\nCompleta del Bien"])
 UC_CREAR_NOTA(["Registrar Nota\\nde Observación"])
 UC_SPECS_TI(["Gestionar Especificaciones TI\\n(CPU, RAM, IP, MAC)"])
 UC_CUENTAS_PC(["Gestionar Cuentas de\\nUsuario del Equipo"])
 UC_ASIGNAR_MONITOR(["Asignar / Desasignar\\nMonitores a Equipos"])
 UC_ATRIBUTOS_DINAMICOS(["Gestionar Atributos\\nDinámicos (EAV)"])
 UC_SYNC_PENDIENTES(["Marcar Bienes para\\nSincronización"])
 UC_REPORTE_PANEL(["Generar Reportes\\nde Inventario"])
 end

 subgraph OPS ["🔧 Operaciones y Movimientos"]
 direction TB
 UC_INCIDENCIA_CREAR(["Reportar Incidencia\\nTécnica"])
 UC_INCIDENCIA_CONSULTAR(["Consultar Mis\\nIncidencias"])
 UC_INCIDENCIA_GESTIONAR(["Gestionar Ciclo de Vida\\nde Incidencia"])
 UC_INCIDENCIA_ESTATUS(["Cambiar Estatus\\n(Pendiente → Proceso → Resuelto)"])
 UC_GARANTIA_CONSULTAR(["Consultar Pólizas\\nde Garantía"])
 UC_GARANTIA_CREAR(["Registrar Nueva\\nGarantía"])
 UC_GARANTIA_EDITAR(["Editar / Eliminar\\nGarantía"])
 UC_SALIDA_BIENES(["Generar Formato de\\nSalida de Bienes (PDF)"])
 UC_CONFIRMAR_FOLIO(["Confirmar y Registrar\\nFolio de Salida"])
 UC_IMPORTAR_EXCEL_SALIDA(["Importar Equipos\\npor Excel para Salida"])
 UC_CORRESPONDENCIA_VER(["Consultar Mesa de\\nCorrespondencia"])
 UC_CORRESPONDENCIA_CREAR(["Registrar Nuevo\\nOficio (Enviado/Recibido)"])
 UC_SOLICITUD_CAMBIO(["Solicitar Cambio\\n(Flujo de Aprobación)"])
 UC_APROBAR_CAMBIO(["Aprobar / Rechazar\\nSolicitud de Cambio"])
 end

 subgraph ADM ["⚙️ Administración del Sistema"]
 direction TB
 UC_GESTION_USUARIOS(["Gestionar Usuarios\\n(CRUD Completo)"])
 UC_ASIGNAR_ROL(["Asignar Rol y\\nPermisos"])
 UC_RESET_PASS(["Resetear Contraseña\\nde Usuario"])
 UC_TOGGLE_ESTATUS(["Activar / Desactivar\\nUsuario"])
 UC_ELIMINAR_USUARIO(["Eliminar Usuario\\nPermanentemente"])
 UC_GESTION_UNIDADES(["Gestionar Catálogo\\nde Unidades Físicas"])
 UC_VER_DETALLE_UNIDAD(["Consultar Detalle\\nde Unidad Física"])
 UC_AUDITORIA(["Consultar Bitácora\\nde Auditoría"])
 UC_INSPECCIONAR_LOG(["Inspeccionar Detalle\\nde Evento Auditado"])
 UC_GESTION_CATALOGOS(["Gestionar Catálogos\\n(Marcas, Modelos, Tipos)"])
 UC_GESTION_PROVEEDORES(["Gestionar Catálogo\\nde Proveedores"])
 UC_GESTION_UBICACIONES(["Gestionar Catálogo\\nde Ubicaciones"])
 UC_ATRIBUTOS_CAT(["Administrar Catálogo\\nde Atributos EAV"])
 UC_CONFIG_SISTEMA(["Configuración del\\nSistema"])
 UC_GESTION_FOLIO(["Gestionar Folio\\nManual de Salidas"])
 end
 end

 %% ─── RELACIONES: Usuario Estándar ───
 Estandar --> UC_LOGIN
 Estandar --> UC_LOGOUT
 Estandar --> UC_CAMBIAR_PASS
 Estandar --> UC_CONSULTAR_INV
 Estandar --> UC_FILTRAR_BIENES
 Estandar --> UC_ESCANEAR_QR
 Estandar --> UC_VER_FICHA
 Estandar --> UC_INCIDENCIA_CREAR
 Estandar --> UC_INCIDENCIA_CONSULTAR
 Estandar --> UC_VER_DETALLE_UNIDAD
 Estandar --> UC_SOLICITUD_CAMBIO

 %% ─── RELACIONES: Administrador ───
 Admin --> UC_LOGIN
 Admin --> UC_LOGOUT
 Admin --> UC_CAMBIAR_PASS
 Admin --> UC_CONSULTAR_INV
 Admin --> UC_FILTRAR_BIENES
 Admin --> UC_CREAR_BIEN
 Admin --> UC_EDITAR_BIEN
 Admin --> UC_CARGA_MASIVA
 Admin --> UC_EXPORTAR_EXCEL
 Admin --> UC_GEN_QR
 Admin --> UC_IMPRIMIR_STICKERS
 Admin --> UC_ESCANEAR_QR
 Admin --> UC_VER_FICHA
 Admin --> UC_CREAR_NOTA
 Admin --> UC_SPECS_TI
 Admin --> UC_CUENTAS_PC
 Admin --> UC_ASIGNAR_MONITOR
 Admin --> UC_ATRIBUTOS_DINAMICOS
 Admin --> UC_REPORTE_PANEL
 Admin --> UC_INCIDENCIA_CREAR
 Admin --> UC_INCIDENCIA_GESTIONAR
 Admin --> UC_INCIDENCIA_ESTATUS
 Admin --> UC_GARANTIA_CONSULTAR
 Admin --> UC_GARANTIA_CREAR
 Admin --> UC_GARANTIA_EDITAR
 Admin --> UC_SALIDA_BIENES
 Admin --> UC_CONFIRMAR_FOLIO
 Admin --> UC_IMPORTAR_EXCEL_SALIDA
 Admin --> UC_CORRESPONDENCIA_VER
 Admin --> UC_CORRESPONDENCIA_CREAR
 Admin --> UC_GESTION_UNIDADES

 %% ─── RELACIONES: Maestro (hereda de Admin + extras) ───
 Maestro --> UC_LOGIN
 Maestro --> UC_LOGOUT
 Maestro --> UC_CAMBIAR_PASS
 Maestro --> UC_CONSULTAR_INV
 Maestro --> UC_CREAR_BIEN
 Maestro --> UC_EDITAR_BIEN
 Maestro --> UC_ELIMINAR_BIEN
 Maestro --> UC_CARGA_MASIVA
 Maestro --> UC_EXPORTAR_EXCEL
 Maestro --> UC_GEN_QR
 Maestro --> UC_ESCANEAR_QR
 Maestro --> UC_SYNC_PENDIENTES
 Maestro --> UC_INCIDENCIA_GESTIONAR
 Maestro --> UC_GARANTIA_CREAR
 Maestro --> UC_SALIDA_BIENES
 Maestro --> UC_GESTION_FOLIO
 Maestro --> UC_CORRESPONDENCIA_VER
 Maestro --> UC_CORRESPONDENCIA_CREAR
 Maestro --> UC_APROBAR_CAMBIO
 Maestro --> UC_GESTION_USUARIOS
 Maestro --> UC_ASIGNAR_ROL
 Maestro --> UC_RESET_PASS
 Maestro --> UC_TOGGLE_ESTATUS
 Maestro --> UC_ELIMINAR_USUARIO
 Maestro --> UC_GESTION_UNIDADES
 Maestro --> UC_AUDITORIA
 Maestro --> UC_INSPECCIONAR_LOG
 Maestro --> UC_GESTION_CATALOGOS
 Maestro --> UC_GESTION_PROVEEDORES
 Maestro --> UC_GESTION_UBICACIONES
 Maestro --> UC_ATRIBUTOS_CAT
 Maestro --> UC_CONFIG_SISTEMA

 %% ─── RELACIONES: Agente Windows ───
 AgenteWin --> UC_SPECS_TI
 AgenteWin --> UC_CUENTAS_PC

 %% ─── INCLUDES / EXTENDS ───
 UC_ESCANEAR_QR -.->|"<<include>>"| UC_VER_FICHA
 UC_SALIDA_BIENES -.->|"<<include>>"| UC_CONFIRMAR_FOLIO
 UC_CREAR_BIEN -.->|"<<extend>>"| UC_SOLICITUD_CAMBIO
 UC_EDITAR_BIEN -.->|"<<extend>>"| UC_SOLICITUD_CAMBIO
 UC_AUDITORIA -.->|"<<include>>"| UC_INSPECCIONAR_LOG
 UC_GESTION_USUARIOS -.->|"<<include>>"| UC_ASIGNAR_ROL
 UC_INCIDENCIA_GESTIONAR -.->|"<<include>>"| UC_INCIDENCIA_ESTATUS

 %% ─── ESTILOS ───
 classDef actor fill:#f8fafc,stroke:#334155,stroke-width:2px,color:#1e293b,font-weight:bold
 classDef sistema fill:#f0fdf4,stroke:#166534,stroke-width:1px,color:#14532d
 classDef agente fill:#fef3c7,stroke:#92400e,stroke-width:2px,color:#78350f,font-weight:bold

 class Estandar,Admin,Maestro actor
 class AgenteWin agente
`;

/* ═══════════════════════════════════════════════════════════════════════════════
 DIAGRAMA 2 — Arquitectura de Alto Nivel
 ═══════════════════════════════════════════════════════════════════════════════ */
const diagramaArquitectura = `
flowchart TB
 subgraph CLIENTES ["Clientes"]
 direction LR
 WEB["🌐 Aplicación Web\\n(React + Vite)"]
 AGENTE["🖥️ Agente Windows\\n(.exe C#)"]
 MOVIL["📱 Escáner QR\\nMóvil (PWA)"]
 end

 subgraph BACKEND ["Servidor Backend"]
 direction TB
 GQL["GraphQL API\\n(Apollo Server)"]
 AUTH_MW["Middleware JWT\\nHS256 Auth"]
 RESOLVERS["Resolvers\\n(Bienes, Usuarios,\\nIncidencias, etc.)"]
 BITACORA["Motor de\\nAuditoría"]
 end

 subgraph DATA ["Capa de Datos"]
 direction LR
 DB[("MySQL / MariaDB\\nBase de Datos")]
 FILES["📁 Archivos\\n(PDFs, Plantillas)"]
 end

 WEB -->|"HTTP/S"| GQL
 AGENTE -->|"HTTP/S"| GQL
 MOVIL -->|"HTTP/S"| GQL

 GQL --> AUTH_MW
 AUTH_MW --> RESOLVERS
 RESOLVERS --> BITACORA
 RESOLVERS --> DB
 BITACORA --> DB
 GQL -.->|"Plantillas PDF"| FILES

 classDef cliente fill:#dbeafe,stroke:#1e40af,stroke-width:2px,color:#1e3a5f
 classDef backend fill:#f0fdf4,stroke:#166534,stroke-width:2px,color:#14532d
 classDef data fill:#fef3c7,stroke:#92400e,stroke-width:2px,color:#78350f

 class WEB,AGENTE,MOVIL cliente
 class GQL,AUTH_MW,RESOLVERS,BITACORA backend
 class DB,FILES data
`;

/* ═══════════════════════════════════════════════════════════════════════════════
 DIAGRAMA 3 — Ciclo de Vida de un Bien (Activo)
 ═══════════════════════════════════════════════════════════════════════════════ */
const diagramaCicloVida = `
stateDiagram-v2
 [*] --> Registro: Crear / Importar Bien
 Registro --> Activo: Aprobado o Directo

 state Activo {
 [*] --> EnOperacion
 EnOperacion --> ConIncidencia: Se reporta fallo
 ConIncidencia --> EnOperacion: Incidencia resuelta
 EnOperacion --> EnPrestamo: Formato de Salida
 EnPrestamo --> EnOperacion: Devolución
 EnOperacion --> EnReparacion: Requiere servicio
 EnReparacion --> EnOperacion: Reparación completada
 }

 Activo --> Baja: Dictamen de baja
 Activo --> Traspaso: Cambio de unidad
 Traspaso --> Activo: Reasignación

 Baja --> [*]: Fin del ciclo

 note right of Registro
 Puede requerir aprobación
 del Maestro (flujo de cambios)
 end note

 note right of Activo
 El Agente Windows actualiza
 specs TI automáticamente
 end note
`;

/* ═══════════════════════════════════════════════════════════════════════════════
 DIAGRAMA 4 — Flujo de Aprobación de Cambios
 ═══════════════════════════════════════════════════════════════════════════════ */
const diagramaAprobacion = `
flowchart TD
 A["Usuario Estándar\\nregistra/edita bien"] --> B{"¿El rol requiere\\naprobación?"}
 B -->|"Maestro/Admin"| C["Cambio aplicado\\ndirectamente"]
 B -->|"Estándar"| D["Se crea Solicitud\\nde Cambio"]
 D --> E["Solicitud en\\nBandeja de Aprobaciones"]
 E --> F{"Maestro\\nrevisa solicitud"}
 F -->|"Aprobar"| G["Cambios aplicados\\nal bien"]
 F -->|"Aprobar parcial"| H["Solo campos\\nseleccionados"]
 F -->|"Rechazar"| I["Solicitud rechazada\\ncon motivo"]
 G --> J["Bitácora actualizada"]
 H --> J
 C --> J

 classDef decision fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e
 classDef action fill:#f0fdf4,stroke:#16a34a,stroke-width:1px,color:#166534
 classDef reject fill:#fee2e2,stroke:#dc2626,stroke-width:1px,color:#991b1b

 class B,F decision
 class C,G,H,J action
 class I reject
`;

/* ═══════════════════════════════════════════════════════════════════════════════
 DATOS DE MÓDULOS DEL SISTEMA
 ═══════════════════════════════════════════════════════════════════════════════ */
const modulos = [
 {
 nombre: 'Dashboard (Panel Principal)',
 icon: Monitor,
 color: '#006341',
 descripcion: 'Vista consolidada con métricas clave: total de bienes, incidencias activas, garantías próximas a vencer y actividad reciente del sistema (Bitácora).',
 roles: ['Todos los roles'],
 },
 {
 nombre: 'Inventario de Bienes',
 icon: Package,
 color: '#1d4ed8',
 descripcion: 'Módulo central del sistema. Gestión completa del ciclo de vida de activos capitalizables y no capitalizables. Incluye filtrado avanzado, vista de tabla/detalle, CRUD completo, carga masiva por Excel, exportación, generación de etiquetas QR/código de barras, impresión de hojas de stickers, gestión de especificaciones TI, cuentas de usuario de equipo, asignación de monitores, atributos dinámicos EAV, notas de observación, reportes y flujo de aprobación para cambios.',
 roles: ['Consulta: Todos', 'CRUD: Admin + Maestro', 'Eliminar: Solo Maestro'],
 },
 {
 nombre: 'Incidencias Técnicas',
 icon: AlertTriangle,
 color: '#ea580c',
 descripcion: 'Gestión del ciclo de vida de incidencias: reporte, asignación de prioridad, seguimiento de estatus (Pendiente → En Proceso → Resuelto) y cierre. Filtrado por estado y búsqueda integrada.',
 roles: ['Reportar: Todos', 'Gestionar: Admin + Maestro'],
 },
 {
 nombre: 'Garantías',
 icon: Shield,
 color: '#7c3aed',
 descripcion: 'Control de pólizas de garantía asociadas a bienes. Registro de fechas de vigencia, proveedor, condiciones. Alertas de vencimiento. Vinculación por número de serie o inventario.',
 roles: ['Consultar: Admin + Maestro', 'CRUD: Admin + Maestro'],
 },
 {
 nombre: 'Salidas de Bienes',
 icon: ArrowLeftRight,
 color: '#0d9488',
 descripcion: 'Generación de formatos oficiales PDF para salida de equipos. Control automático de folios, importación de equipos por Excel, selección de bienes del inventario, inclusión automática de monitores asignados, previsualización PDF, confirmación y descarga/impresión.',
 roles: ['Generar: Admin + Maestro', 'Gestión de folio: Solo Maestro'],
 },
 {
 nombre: 'Catálogo de Unidades Físicas',
 icon: Building2,
 color: '#2563eb',
 descripcion: 'Gestión de unidades físicas (clínicas, hospitales, delegaciones). Datos de ubicación geográfica, zona, régimen, nivel de atención, segmentos de red asociados, encargados. Filtrado avanzado multi-criterio.',
 roles: ['Consultar: Todos', 'CRUD: Admin + Maestro'],
 },
 {
 nombre: 'Correspondencia',
 icon: Mail,
 color: '#8b5cf6',
 descripcion: 'Mesa de control de correspondencia. Registro de oficios enviados y recibidos con folio, número de oficio, remitente, fecha, unidad, ubicación, descripción y archivo adjunto. Filtrado por tipo y búsqueda integrada.',
 roles: ['Consultar: Admin + Maestro', 'Crear: Admin + Maestro'],
 },
 {
 nombre: 'Escáner QR',
 icon: QrCode,
 color: '#059669',
 descripcion: 'Módulo de identificación rápida de activos. Escaneo mediante cámara del dispositivo o búsqueda manual por IP, número de serie, número de inventario, ID o hash QR. Muestra ficha técnica completa con pestañas: información básica, datos técnicos/atributos y software instalado.',
 roles: ['Todos los roles'],
 },
 {
 nombre: 'Aprobaciones',
 icon: ClipboardList,
 color: '#d97706',
 descripcion: 'Bandeja de solicitudes de cambio pendientes. El Maestro puede revisar las modificaciones propuestas por usuarios estándar, comparar datos anteriores vs. nuevos, y aprobar (total o parcialmente) o rechazar con motivo.',
 roles: ['Solo Maestro'],
 },
 {
 nombre: 'Gestión de Usuarios',
 icon: Users,
 color: '#6d28d9',
 descripcion: 'Administración completa de usuarios del sistema. CRUD de usuarios con asignación de matrícula, rol, unidad física y segmento de red. Reseteo de contraseña, activación/desactivación de cuentas, eliminación permanente con confirmación. Filtrado por rol, estatus, unidad y segmento.',
 roles: ['Solo Admin + Maestro'],
 },
 {
 nombre: 'Bitácora de Auditoría',
 icon: ShieldCheck,
 color: '#0369a1',
 descripcion: 'Registro inmutable de toda la actividad del sistema: creaciones, ediciones, eliminaciones e inicios de sesión. Inspección detallada de cada evento con comparativa de cambios (antes/después). Filtros por acción, módulo, usuario, plataforma de origen (web/Windows) y rango de fechas.',
 roles: ['Solo Maestro'],
 },
 {
 nombre: 'Configuración',
 icon: Settings,
 color: '#475569',
 descripcion: 'Configuración del perfil personal (cambio de contraseña) y parámetros globales del sistema como institución, delegación y alertas.',
 roles: ['Todos los roles (contraseña)', 'Parámetros: Solo Maestro'],
 },
];

export default function Documentacion() {
 return (
 <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans">
 {/* Navbar */}
 <nav className="bg-[#00472e] dark:bg-[#002618] text-white shadow-lg px-6 py-4 flex items-center gap-4 sticky top-0 z-50">
 <Link to="/" className="p-2 hover:bg-white/20 dark:hover:bg-gray-700/10 rounded-xl transition-colors" title="Volver al inicio">
 <ArrowLeft className="w-5 h-5" />
 </Link>
 <div className="flex items-center gap-3 flex-1">
 <BookOpen className="w-6 h-6 text-green-200" />
 <div>
 <h1 className="text-lg font-bold tracking-wide">Documentación del Sistema</h1>
 <p className="text-green-200/60 text-xs">Ecosistema de Gestión de Activos — IMSS Delegación Nayarit</p>
 </div>
 </div>
 <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg text-xs font-semibold text-green-100">
 <Layers size={13} /> v2.4.1
 </span>
 </nav>

 <div className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-8 flex flex-col gap-10">

 {/* ═══ CABECERA ═══ */}
 <section className="bg-white dark:bg-gray-800 p-8 md:p-12 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden">
 <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-green-50 dark:from-green-900/40 to-transparent rounded-bl-full opacity-50" />
 <div className="relative z-10">
 <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 dark:text-gray-200 mb-4 tracking-tight">
 Arquitectura y Casos de Uso
 </h2>
 <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed max-w-4xl">
 Documentación técnica del <strong>Ecosistema de Gestión de Activos del IMSS</strong>.
 Este documento describe la arquitectura del sistema, los casos de uso funcionales por actor,
 el ciclo de vida de los activos, los flujos de aprobación, y las capacidades de cada módulo.
 </p>
 <div className="flex flex-wrap gap-3 mt-6">
 {[
 { label: '4 Actores', color: '#006341' },
 { label: '12 Módulos', color: '#1d4ed8' },
 { label: '50+ Casos de Uso', color: '#7c3aed' },
 { label: '4 Roles', color: '#d97706' },
 ].map(b => (
 <span key={b.label} className="px-3 py-1.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: b.color }}>
 {b.label}
 </span>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ DIAGRAMA DE CASOS DE USO ═══ */}
 <section className="bg-white dark:bg-gray-800 p-6 md:p-10 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 ">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b pb-4">
 <div>
 <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 ">Diagrama de Casos de Uso</h3>
 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Interacciones funcionales por actor — Diagrama UML completo</p>
 </div>
 <span className="px-4 py-1.5 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 font-semibold rounded-full text-sm">
 UML / Funcional
 </span>
 </div>
 <div className="w-full overflow-x-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 min-h-[600px]">
 <MermaidDiagram chart={diagramaCasosUso} id="diagrama-casos-uso-completo" />
 </div>
 <p className="text-xs text-gray-400 mt-4 italic">
 * Las líneas punteadas representan relaciones «include» y «extend» entre casos de uso.
 El Agente Windows es un actor externo (software de escritorio) que se comunica con la API GraphQL.
 </p>
 </section>

 {/* ═══ DIAGRAMA DE ARQUITECTURA ═══ */}
 <section className="bg-white dark:bg-gray-800 p-6 md:p-10 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 ">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b pb-4">
 <div>
 <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 ">Arquitectura del Sistema</h3>
 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Componentes de alto nivel y flujo de comunicación</p>
 </div>
 <span className="px-4 py-1.5 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 font-semibold rounded-full text-sm">
 Infraestructura
 </span>
 </div>
 <div className="w-full overflow-x-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 min-h-[350px] flex items-center justify-center">
 <MermaidDiagram chart={diagramaArquitectura} id="diagrama-arquitectura" />
 </div>
 </section>

 {/* ═══ CICLO DE VIDA DE UN BIEN ═══ */}
 <section className="bg-white dark:bg-gray-800 p-6 md:p-10 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 ">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b pb-4">
 <div>
 <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 ">Ciclo de Vida de un Activo</h3>
 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Estados y transiciones de un bien en el sistema</p>
 </div>
 <span className="px-4 py-1.5 bg-amber-100 dark:bg-amber-900/20 text-amber-800 font-semibold rounded-full text-sm">
 State Machine
 </span>
 </div>
 <div className="w-full overflow-x-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 min-h-[300px] flex items-center justify-center">
 <MermaidDiagram chart={diagramaCicloVida} id="diagrama-ciclo-vida" />
 </div>
 </section>

 {/* ═══ FLUJO DE APROBACIÓN ═══ */}
 <section className="bg-white dark:bg-gray-800 p-6 md:p-10 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 ">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b pb-4">
 <div>
 <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 ">Flujo de Aprobación de Cambios</h3>
 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Proceso de solicitud, revisión y aprobación de modificaciones</p>
 </div>
 <span className="px-4 py-1.5 bg-orange-100 dark:bg-orange-900/20 text-orange-800 font-semibold rounded-full text-sm">
 Workflow
 </span>
 </div>
 <div className="w-full overflow-x-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 min-h-[300px] flex items-center justify-center">
 <MermaidDiagram chart={diagramaAprobacion} id="diagrama-aprobacion" />
 </div>
 </section>

 {/* ═══ DESCRIPCIÓN DE ROLES ═══ */}
 <section>
 <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Roles del Sistema</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
 {[
 {
 role: 'Usuario Estándar',
 id: 3,
 icon: FileText,
 color: '#1d4ed8',
 bg: '#dbeafe',
 desc: 'Técnico o auditor de campo. Acceso de consulta al inventario, reporte de incidencias, escaneo QR y consulta de unidades.',
 permisos: [
 'Iniciar sesión y cambiar contraseña',
 'Consultar inventario de bienes',
 'Escanear QR / buscar activos',
 'Reportar incidencias técnicas',
 'Consultar catálogo de unidades',
 'Solicitar cambios (requiere aprobación)',
 ],
 },
 {
 role: 'Administrador',
 id: 2,
 icon: ShieldCheck,
 color: '#166534',
 bg: '#dcfce7',
 desc: 'Jefe de unidad o coordinador. Gestiona bienes, incidencias, garantías, salidas, correspondencia y unidades.',
 permisos: [
 'Todo lo del Usuario Estándar',
 'CRUD completo de bienes',
 'Carga masiva y exportación Excel',
 'Generación de etiquetas QR',
 'Gestión de incidencias y garantías',
 'Generar formatos de salida PDF',
 'Registrar correspondencia',
 'Administrar unidades físicas',
 ],
 },
 {
 role: 'Maestro (SuperAdmin)',
 id: 1,
 icon: Database,
 color: '#6d28d9',
 bg: '#ede9fe',
 desc: 'Control total del sistema. Administra usuarios, catálogos base, auditoría, aprobaciones y configuración.',
 permisos: [
 'Todo lo del Administrador',
 'Eliminar bienes permanentemente',
 'Gestión completa de usuarios',
 'Resetear contraseñas',
 'Aprobar/rechazar solicitudes de cambio',
 'Bitácora de auditoría completa',
 'Gestionar catálogos del sistema',
 'Administrar folios de salida',
 'Configuración del sistema',
 ],
 },
 {
 role: 'Agente Windows',
 id: 0,
 icon: Monitor,
 color: '#92400e',
 bg: '#fef3c7',
 desc: 'Software autónomo (.exe) que se ejecuta en equipos de cómputo para recolectar datos de hardware y software automáticamente.',
 permisos: [
 'Reportar especificaciones de hardware',
 'Enviar información de CPU, RAM, disco',
 'Registrar dirección IP y MAC',
 'Listar software instalado',
 'Reportar cuentas de usuario Windows',
 'Sincronización automática con la API',
 ],
 },
 ].map(r => (
 <div key={r.role} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 border-t-4 hover:shadow-md transition-shadow flex flex-col" style={{ borderTopColor: r.color }}>
 <div className="flex items-center gap-3 mb-4">
 <div className="p-3 rounded-xl" style={{ backgroundColor: r.bg, color: r.color }}>
 <r.icon className="w-6 h-6" />
 </div>
 <div>
 <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 ">{r.role}</h4>
 {r.id > 0 && <p className="text-xs text-gray-400 font-mono">id_rol: {r.id}</p>}
 </div>
 </div>
 <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 leading-relaxed">{r.desc}</p>
 <ul className="space-y-2 flex-1">
 {r.permisos.map((p, i) => (
 <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 ">
 <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: r.color }} />
 <span>{p}</span>
 </li>
 ))}
 </ul>
 </div>
 ))}
 </div>
 </section>

 {/* ═══ CATÁLOGO DE MÓDULOS ═══ */}
 <section>
 <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Módulos del Sistema</h3>
 <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Descripción funcional detallada de cada módulo y sus capacidades por rol</p>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {modulos.map(m => (
 <div key={m.nombre} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all group">
 <div className="flex items-start gap-4">
 <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: m.color + '15', color: m.color }}>
 <m.icon className="w-6 h-6" />
 </div>
 <div className="flex-1 min-w-0">
 <h4 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">{m.nombre}</h4>
 <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">{m.descripcion}</p>
 <div className="flex flex-wrap gap-1.5">
 {m.roles.map((r, i) => (
 <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-[10px] font-semibold uppercase tracking-wide">
 {r}
 </span>
 ))}
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </section>

 {/* ═══ TABLA DE ENTIDADES ═══ */}
 <section className="bg-white dark:bg-gray-800 p-6 md:p-10 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 ">
 <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Entidades Principales del Sistema</h3>
 <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Resumen de las tablas y entidades que conforman el modelo de datos</p>
 <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 ">
 <table className="w-full text-sm text-left">
 <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 ">
 <tr>
 <th className="px-5 py-3.5 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Entidad</th>
 <th className="px-5 py-3.5 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Tabla BD</th>
 <th className="px-5 py-3.5 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Descripción</th>
 <th className="px-5 py-3.5 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Módulo</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
 {[
 ['Bien (Activo)', 'Bienes', 'Activo institucional con número de serie, inventario, ubicación, modelo, categoría y estatus operativo', 'Inventario'],
 ['Especificación TI', 'Especificaciones_TI', 'Datos técnicos de equipos de cómputo: CPU, RAM, disco, IP, MAC, S.O.', 'Inventario'],
 ['Cuenta PC', 'Cuentas_PC', 'Cuentas de usuario Windows asociadas a un equipo', 'Inventario'],
 ['Programa PC', 'Programas_PC', 'Software instalado detectado por el agente Windows', 'Inventario'],
 ['Nota de Bien', 'Notas', 'Observaciones y anotaciones libres asociadas a un activo', 'Inventario / QR'],
 ['Incidencia', 'Incidencias', 'Reporte de fallo técnico con ciclo de vida y prioridad', 'Incidencias'],
 ['Garantía', 'Garantias', 'Póliza de garantía con fechas de vigencia y proveedor', 'Garantías'],
 ['Movimiento Inventario', 'Movimientos_Inventario', 'Registro de traspasos, salidas y movimientos de activos', 'Salidas'],
 ['Mesa Correspondencia', 'MesaCorrespondencia', 'Oficio enviado o recibido con folio, remitente y descripción', 'Correspondencia'],
 ['Solicitud de Cambio', 'solicitudes_cambio', 'Propuesta de modificación pendiente de aprobación por el Maestro', 'Aprobaciones'],
 ['Usuario', 'Usuarios', 'Cuenta de usuario del sistema con matrícula, rol y unidad', 'Usuarios'],
 ['Unidad Física', 'unidades', 'Clínica, hospital o delegación con datos geográficos', 'Unidades'],
 ['Segmento de Red', 'Segmentos', 'Segmento de red IP asociado a una unidad física', 'Unidades'],
 ['Bitácora', 'Bitacora', 'Log inmutable de acciones: creación, edición, eliminación, login', 'Auditoría'],
 ['Proveedor', 'Proveedores', 'Empresa proveedora de equipos y servicios de garantía', 'Catálogos'],
 ['Marca', 'marcas', 'Marca comercial de equipos (Dell, HP, Lenovo, etc.)', 'Catálogos'],
 ['Modelo', 'Cat_Modelos', 'Modelo específico de dispositivo con descripción y tipo', 'Catálogos'],
 ['Categoría Activo', 'Cat_CategoriasActivo', 'Clasificación de bienes: Cómputo, Telecomunicaciones, etc.', 'Catálogos'],
 ['Tipo Dispositivo', 'tipo_dispositivos', 'Clasificación técnica: PC, Laptop, Monitor, Impresora, etc.', 'Catálogos'],
 ['Atributo EAV', 'Cat_Atributos', 'Definición dinámica de atributos técnicos para tipos de dispositivo', 'Catálogos'],
 ].map(([entidad, tabla, desc, modulo], i) => (
 <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50/80 dark:hover:bg-gray-700/80 transition-colors">
 <td className="px-5 py-3 font-semibold text-gray-800 dark:text-gray-200 ">{entidad}</td>
 <td className="px-5 py-3 font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20">{tabla}</td>
 <td className="px-5 py-3 text-gray-600 dark:text-gray-400 ">{desc}</td>
 <td className="px-5 py-3">
 <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-[10px] font-bold uppercase">{modulo}</span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </section>

 {/* ═══ TECNOLOGÍAS ═══ */}
 <section className="bg-white dark:bg-gray-800 p-6 md:p-10 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 ">
 <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Stack Tecnológico</h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
 {[
 { cat: 'Frontend', items: ['React 18', 'Vite', 'React Router v6', 'TanStack Query (React Query)', 'Lucide React (íconos)', 'qrcode.react + react-barcode', 'Mermaid.js (diagramas)'] },
 { cat: 'Backend', items: ['Node.js', 'Apollo Server (GraphQL)', 'Sequelize ORM', 'JWT (jsonwebtoken)', 'bcrypt (hash)', 'pdf-lib (PDF generation)'] },
 { cat: 'Base de Datos', items: ['MySQL / MariaDB', 'Migraciones Sequelize', 'Relay-style Pagination', 'Cursor-based paging'] },
 { cat: 'Infraestructura', items: ['Agente Windows (.exe C#)', 'HTTPS / TLS', 'CORS configurado', 'Bitácora automática', 'Roles RBAC (4 niveles)'] },
 ].map(s => (
 <div key={s.cat} className="bg-gray-50 dark:bg-gray-900 p-5 rounded-xl border border-gray-100 dark:border-gray-800 ">
 <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 ">{s.cat}</h4>
 <ul className="space-y-1.5">
 {s.items.map((item, i) => (
 <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
 <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0" />
 {item}
 </li>
 ))}
 </ul>
 </div>
 ))}
 </div>
 </section>

 {/* Footer */}
 <footer className="text-center py-6 text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700 ">
 <p>© 2026 IMSS — SIIT · Ecosistema de Gestión de Activos · Delegación Nayarit</p>
 <p className="mt-1">Documentación generada automáticamente a partir del análisis del código fuente</p>
 </footer>
 </div>
 </div>
 );
}
