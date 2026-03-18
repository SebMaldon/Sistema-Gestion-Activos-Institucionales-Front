# Sistema de Gestión de Activos Institucionales — Front-End (IMSS)

Interfaz de usuario del **Sistema de Gestión de Activos Institucionales** del IMSS. Aplicación web de nivel empresarial, formal y ágil, construida con los lineamientos visuales de la institución y orientada al uso en producción.

## Tecnologías Utilizadas

- **React 19**: Biblioteca principal para la interfaz de usuario.
- **Vite**: Entorno de desarrollo rápido y empaquetador.
- **Tailwind CSS v4**: Para un diseño responsivo, moderno y escalable.
- **Radix UI**: Componentes base accesibles y robustos.
- **Lucide React**: Biblioteca de íconos vectoriales claros y consistentes.
- **Recharts**: Herramienta para la generación de gráficas y reportes visuales.

## Características Principales

- **Gestión de Roles**: Vistas y permisos que se adaptan automáticamente según el tipo de usuario autenticado:
  - *Usuario Común*
  - *Administrador*
  - *Usuario Maestro*
- **Panel de Control (Dashboard)**: Gráficas interactivas y métricas generales del estado de los activos institucionales.
- **Gestión de Inventario**: Módulo para la administración, búsqueda avanzada y control de los bienes.
- **Ficha Técnica (Detalle de Activos)**: Vista específica de cada bien, incluyendo su estado, ubicación e historial.
- **Gestión de Incidencias**: Sistema de tickets para el reporte y seguimiento de problemas técnicos o mantenimiento.
- **Autorización de Traslados**: Flujo seguro para gestionar la reubicación de activos entre diferentes áreas, departamentos o unidades de la entidad.
- **Escáner QR**: Interfaz móvil diseñada para la lectura ágil de códigos en dispositivos físicos.

## Instalación y Uso

Asegúrate de tener [Node.js](https://nodejs.org/) instalado en tu máquina.

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/SebMaldon/Sistema-Gestion-Activos-Institucionales-Front.git
   cd Sistema-Gestion-Activos-Institucionales-Front
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:5173](http://localhost:5173) para visualizar la aplicación en tu navegador.

## Comandos Adicionales

- `npm run build`: Compila la aplicación, optimizada para su despliegue en producción dentro de la carpeta `dist`.
- `npm run lint`: Ejecuta el linter (ESLint) para analizar el código en busca de posibles errores de sintaxis o formato.
- `npm run preview`: Permite previsualizar localmente la versión compilada (`dist`) antes de subirla a producción.

---

*Sistema de Gestión de Activos Institucionales — Front-End desarrollado para el control, seguimiento y auditoría del patrimonio informático del IMSS · Delegación Nayarit.*
