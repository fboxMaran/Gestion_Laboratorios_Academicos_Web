/**
 * Utilidades para exportación de datos (PDF, Excel)
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

/**
 * Genera un PDF con el historial del laboratorio
 */
function generateHistoryPDF(history, labName) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'LETTER'
      });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Encabezado
      doc.fontSize(20).text('Historial de Laboratorio', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`Laboratorio: ${labName || 'N/A'}`, { align: 'center' });
      doc.fontSize(10).text(`Generado: ${new Date().toLocaleString('es-CR')}`, { align: 'center' });
      doc.moveDown(2);

      // Tabla de historial
      if (history.length === 0) {
        doc.fontSize(12).text('No hay registros en el historial.', { align: 'center' });
        doc.end();
        return;
      }

      // Encabezados de tabla
      const tableTop = doc.y;
      const itemHeight = 20;
      const pageHeight = 750;
      let y = tableTop;

      // Encabezados
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Fecha', 50, y);
      doc.text('Usuario', 150, y);
      doc.text('Acción', 300, y);
      doc.text('Detalle', 450, y, { width: 200, ellipsis: true });

      y += itemHeight;
      doc.moveTo(50, y).lineTo(650, y).stroke();
      y += 5;

      // Filas
      doc.font('Helvetica').fontSize(9);
      history.forEach((item, index) => {
        // Verificar si necesitamos una nueva página
        if (y > pageHeight - 50) {
          doc.addPage();
          y = 50;
        }

        const date = new Date(item.created_at || item.date).toLocaleString('es-CR');
        const user = item.user_name || item.user || 'Sistema';
        const action = item.action || item.action_type || 'N/A';
        const detail = item.detail ? (typeof item.detail === 'string' ? item.detail : JSON.stringify(item.detail)) : '-';
        const detailText = detail.length > 50 ? detail.substring(0, 50) + '...' : detail;

        doc.text(date, 50, y, { width: 100 });
        doc.text(user, 150, y, { width: 150 });
        doc.text(action, 300, y, { width: 150 });
        doc.text(detailText, 450, y, { width: 200, ellipsis: true });

        y += itemHeight;
        
        // Línea separadora
        if (index < history.length - 1) {
          doc.moveTo(50, y).lineTo(650, y).stroke();
          y += 5;
        }
      });

      // Pie de página
      doc.fontSize(8).text(
        `Total de registros: ${history.length}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Genera un archivo Excel con el historial del laboratorio
 */
async function generateHistoryExcel(history, labName) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Historial');

  // Estilos
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  };

  // Encabezados
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Fecha y Hora', key: 'date', width: 20 },
    { header: 'Usuario', key: 'user', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Acción', key: 'action', width: 25 },
    { header: 'Detalle', key: 'detail', width: 50 }
  ];

  // Aplicar estilo a encabezados
  worksheet.getRow(1).eachCell((cell) => {
    cell.style = headerStyle;
  });

  // Datos
  history.forEach((item) => {
    const date = new Date(item.created_at || item.date);
    const user = item.user_name || item.user || 'Sistema';
    const email = item.user_email || '';
    const action = item.action || item.action_type || 'N/A';
    let detail = item.detail || '-';
    
    // Si detail es JSON, intentar parsearlo
    if (typeof detail === 'string') {
      try {
        const parsed = JSON.parse(detail);
        detail = typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : parsed;
      } catch (e) {
        // Mantener como string si no es JSON válido
      }
    } else if (typeof detail === 'object') {
      detail = JSON.stringify(detail, null, 2);
    }

    worksheet.addRow({
      id: item.id,
      date: date.toLocaleString('es-CR'),
      user: user,
      email: email,
      action: action,
      detail: detail
    });
  });

  // Aplicar bordes a todas las celdas con datos
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Información del laboratorio en una hoja adicional
  const infoSheet = workbook.addWorksheet('Información');
  infoSheet.columns = [
    { header: 'Campo', key: 'field', width: 20 },
    { header: 'Valor', key: 'value', width: 50 }
  ];
  
  infoSheet.getRow(1).eachCell((cell) => {
    cell.style = headerStyle;
  });

  infoSheet.addRow({ field: 'Laboratorio', value: labName || 'N/A' });
  infoSheet.addRow({ field: 'Fecha de Generación', value: new Date().toLocaleString('es-CR') });
  infoSheet.addRow({ field: 'Total de Registros', value: history.length });

  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = {
  generateHistoryPDF,
  generateHistoryExcel
};

