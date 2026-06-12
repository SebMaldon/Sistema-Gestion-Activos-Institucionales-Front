import { PDFDocument, StandardFonts, rgb, TextAlignment } from 'pdf-lib';

export const ROWS_PER_PAGE = 11;

const pdfRowField = (row, col) => {
  if (col === 1 && row === 5) return 'f451'; // typo histórico en el PDF
  return `f${row}c${col}`;
};

/**
 * Genera el PDF de Salida de Bienes.
 * @param {string} folioStr - Folio a mostrar.
 * @param {object} form - Valores del formulario general.
 * @param {array} bienesSeleccionados - Lista de bienes seleccionados.
 */
export const buildPDFBytes = async (folioStr, form, bienesSeleccionados) => {
  const templateBytes = await fetch('/Formatos/FormatoRellenableSalidaBienes.pdf').then((r) => {
    if (!r.ok) throw new Error('No se encontró el archivo PDF base');
    return r.arrayBuffer();
  });

  const pageGroups = [];
  for (let i = 0; i < bienesSeleccionados.length; i += ROWS_PER_PAGE) {
    pageGroups.push(bienesSeleccionados.slice(i, i + ROWS_PER_PAGE));
  }
  if (pageGroups.length === 0) pageGroups.push([]); // al menos una página

  const fillDoc = async (pageItems, pageNum, isFirstPage) => {
    const doc = await PDFDocument.load(templateBytes);
    const pdfForm = doc.getForm();
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const regFont = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.getPages()[0];

    const setTextField = (name, value, alignCenter = false) => {
      try {
        const f = pdfForm.getTextField(name);
        if (f) {
          f.setText(value || '');
          if (alignCenter) f.setAlignment(TextAlignment.Center);
        }
      } catch { /* campo no existe en PDF */ }
    };

    const drawXOnCheckbox = (fieldName, shouldCheck) => {
      try {
        const field = pdfForm.getCheckBox(fieldName);
        const widgets = field.acroField.getWidgets();
        if (widgets?.length > 0 && shouldCheck) {
          const rect = widgets[0].getRectangle();
          page.drawText('X', { x: rect.x + 3, y: rect.y + 2, size: 10, font: boldFont, color: rgb(0, 0, 0) });
        }
        pdfForm.removeField(field);
      } catch { /* checkbox no existe */ }
    };

    // Folio
    const folioFormat = `FOLIO: ${folioStr}`;
    try {
      const ff = pdfForm.getTextField('Folio');
      if (ff) pdfForm.removeField(ff);
    } catch { /* no existe campo Folio en el PDF */ }

    page.drawText(folioFormat, {
      x: 440, y: 732,
      size: 9.5, font: regFont, color: rgb(0, 0, 0),
    });

    // Datos generales
    let fmtDate = form.fecha_salida || form.fechaSalidaDia || '';
    if (fmtDate && fmtDate.includes('-')) {
      const dp = fmtDate.split('-');
      if (dp.length === 3) fmtDate = `${dp[2]}/${dp[1]}/${dp[0]}`;
    }

    setTextField('Elc', form.solicitante);
    setTextField('NombreSolicitante', form.solicitante);
    setTextField('AdscritoA', form.adscripcion);
    setTextField('Identificacion', form.identificacion);
    setTextField('TrabajadorDe', form.empresa);
    setTextField('Matricula', form.matricula);
    setTextField('Telefono', form.telefono);
    setTextField('RazonSalida', form.motivo);
    setTextField('ObservacionesBienes', form.observaciones);
    setTextField('FechaSalida', fmtDate);
    setTextField('NombreResponsable', form.responsable || 'Usuario Maestro');
    
    let originBase = form.origen_bienes || form.origenBienes || '';
    if (originBase && !originBase.toUpperCase().startsWith('DEL ')) {
      originBase = `DEL ${originBase}`;
    }
    
    let origin1 = originBase;
    let origin2 = '';
    if (origin1.length > 55) {
      let splitIndex = origin1.lastIndexOf(' ', 55);
      if (splitIndex === -1 || splitIndex < 20) splitIndex = 55;
      origin2 = origin1.substring(splitIndex).trim();
      origin1 = origin1.substring(0, splitIndex).trim();
    }
    setTextField('OrigenBienes', origin1);
    setTextField('OrigenBienes2', origin2);

    const isDevolucion = form.devolucion === 'SI' || form.sujeto_devolucion === true;
    if (isDevolucion) {
      drawXOnCheckbox('DevolucionCheck1', true);
      drawXOnCheckbox('DevolucionCheck2', false);
      let fd = form.fecha_devolucion || form.fechaDevolucion || '';
      if (fd && fd.includes('-')) {
        const fdp = fd.split('-');
        if (fdp.length === 3) fd = `${fdp[2]}/${fdp[1]}/${fdp[0]}`;
      }
      setTextField('FechaDevolucion', fd);
    } else {
      drawXOnCheckbox('DevolucionCheck1', false);
      drawXOnCheckbox('DevolucionCheck2', true);
      setTextField('FechaDevolucion', '');
    }

    // Bienes
    pageItems.forEach((bien, i) => {
      const row = i;
      setTextField(pdfRowField(row, 1), String(bien.cantidad || bien.cantidad_o_id || ''), true);
      setTextField(pdfRowField(row, 2), bien.naturaleza || '', true);
      setTextField(pdfRowField(row, 3), bien.descripcion || '', true);
    });

    pdfForm.getFields().forEach((f) => {
      try { f.enableReadOnly(); } catch {}
    });

    pdfForm.flatten();
    return doc.save();
  };

  const pageBytesList = [];
  for (let i = 0; i < pageGroups.length; i++) {
    pageBytesList.push(await fillDoc(pageGroups[i], i + 1, i === 0));
  }

  const finalDoc = await PDFDocument.create();
  for (const bytes of pageBytesList) {
    const tempDoc = await PDFDocument.load(bytes);
    const copiedPages = await finalDoc.copyPages(tempDoc, [0]);
    finalDoc.addPage(copiedPages[0]);
  }

  return finalDoc.save();
};
