import { PDFDocument, StandardFonts, rgb, TextAlignment } from 'pdf-lib';

export const ROWS_PER_PAGE = 5;

/**
 * Genera el PDF de Préstamo de Bienes.
 * @param {object} form - Valores del formulario general.
 * @param {array} bienesSeleccionados - Lista de bienes seleccionados.
 */
export const buildPDFPrestamoBytes = async (form, bienesSeleccionados) => {
  const templateBytes = await fetch('/Formatos/FormatoPrestamos.pdf').then((r) => {
    if (!r.ok) throw new Error('No se encontró el archivo PDF base');
    return r.arrayBuffer();
  });

  const pageGroups = [];
  for (let i = 0; i < bienesSeleccionados.length; i += ROWS_PER_PAGE) {
    pageGroups.push(bienesSeleccionados.slice(i, i + ROWS_PER_PAGE));
  }
  if (pageGroups.length === 0) pageGroups.push([]); // al menos una página

  const fillDoc = async (pageItems) => {
    const doc = await PDFDocument.load(templateBytes);
    const pdfForm = doc.getForm();
    const timesFont = await doc.embedFont(StandardFonts.TimesRoman);

    const setTextField = (name, value, alignCenter = false) => {
      try {
        const f = pdfForm.getTextField(name);
        if (f) {
          f.setText(value || '');
          if (alignCenter) f.setAlignment(TextAlignment.Center);
        }
      } catch { /* campo no existe en PDF */ }
    };

    const padTextCenter = (text, minLength) => {
      if (!text) return '';
      if (text.length >= minLength) return text;
      const pad = minLength - text.length;
      return ' '.repeat(Math.floor(pad / 2)) + text + ' '.repeat(Math.ceil(pad / 2));
    };

    const padTextRight = (text, minLength) => {
      if (!text) return '';
      if (text.length >= minLength) return text;
      const pad = minLength - text.length;
      return text + ' '.repeat(pad);
    };

    setTextField('AdminBien', form.adminBien || 'ANA LUISA GONZALEZ CERVANTES', true);
    setTextField('estadobien', padTextRight(form.estadoBien, 60));
    setTextField('Ubicacionprestamo', padTextRight(form.ubicacionPrestamo, 60));
    setTextField('EntregaResponsable', padTextCenter(form.entregaResponsable, 40), true);
    setTextField('RecibeResponsable', padTextCenter(form.recibeResponsable, 40), true);
    setTextField('MatriculaEntrega', padTextCenter(form.matriculaEntrega, 20), true);
    setTextField('MatriculaRecibe', padTextCenter(form.matriculaRecibe, 20), true);
    setTextField('LugarFecha', form.lugarFecha);

    // Bienes
    pageItems.forEach((bien, i) => {
      const row = i + 1;
      setTextField(`f${row}c1`, padTextCenter(String(bien.cantidad || bien.cantidad_o_id || ''), 35), true);
      setTextField(`f${row}c2`, padTextCenter(bien.naturaleza || '', 35), true);
      setTextField(`f${row}c3`, padTextCenter(bien.descripcion || '', 90), true);
    });

    pdfForm.getFields().forEach((f) => {
      try { f.enableReadOnly(); } catch {}
    });

    try {
      pdfForm.updateFieldAppearances(timesFont);
    } catch (e) {
      console.warn('No se pudieron actualizar todas las apariencias con TimesRoman', e);
    }

    pdfForm.flatten();
    return doc.save();
  };

  const pageBytesList = [];
  for (let i = 0; i < pageGroups.length; i++) {
    pageBytesList.push(await fillDoc(pageGroups[i]));
  }

  const finalDoc = await PDFDocument.create();
  for (const bytes of pageBytesList) {
    const tempDoc = await PDFDocument.load(bytes);
    const copiedPages = await finalDoc.copyPages(tempDoc, [0]);
    finalDoc.addPage(copiedPages[0]);
  }

  return finalDoc.save();
};
