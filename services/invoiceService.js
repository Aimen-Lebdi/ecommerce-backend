const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

class InvoiceService {
  /**
   * Generate invoice PDF for an order using pdf-lib
   * @param {Object} order - Order document from MongoDB
   * @returns {Promise<Buffer>} - PDF buffer
   */
  static async generateInvoice(order) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();

    // Load fonts
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Company/Store Information
    const storeInfo = {
      name: "Your Store Name",
      address: "123 Business Street",
      city: "City, State 12345",
      phone: "+1 (800) 123-4567",
      email: "support@yourstore.com",
    };

    let yPosition = height - 50;

    // Header - Store Info
    page.drawText(storeInfo.name, {
      x: 50,
      y: yPosition,
      size: 20,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    yPosition -= 20;
    page.drawText(storeInfo.address, {
      x: 50,
      y: yPosition,
      size: 10,
      font: regularFont,
    });

    yPosition -= 15;
    page.drawText(storeInfo.city, {
      x: 50,
      y: yPosition,
      size: 10,
      font: regularFont,
    });

    yPosition -= 15;
    page.drawText(`Phone: ${storeInfo.phone}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: regularFont,
    });

    yPosition -= 15;
    page.drawText(`Email: ${storeInfo.email}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: regularFont,
    });

    // Invoice Title (right side)
    page.drawText("INVOICE", {
      x: width - 150,
      y: height - 50,
      size: 26,
      font: boldFont,
      color: rgb(0, 0.4, 0.8),
    });

    // Horizontal line
    yPosition -= 30;
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: width - 50, y: yPosition },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Invoice Information
    yPosition -= 30;
    const invoiceInfoY = yPosition;

    page.drawText("Invoice Number:", {
      x: 50,
      y: invoiceInfoY,
      size: 10,
      font: regularFont,
    });
    page.drawText(`INV-${order._id.toString().slice(-8).toUpperCase()}`, {
      x: 150,
      y: invoiceInfoY,
      size: 10,
      font: boldFont,
    });

    page.drawText("Invoice Date:", {
      x: 50,
      y: invoiceInfoY - 15,
      size: 10,
      font: regularFont,
    });
    page.drawText(this.formatDate(order.createdAt), {
      x: 150,
      y: invoiceInfoY - 15,
      size: 10,
      font: regularFont,
    });

    page.drawText("Order ID:", {
      x: 50,
      y: invoiceInfoY - 30,
      size: 10,
      font: regularFont,
    });
    page.drawText(order._id.toString().substring(0, 20) + "...", {
      x: 150,
      y: invoiceInfoY - 30,
      size: 9,
      font: regularFont,
    });

    page.drawText("Payment Method:", {
      x: 50,
      y: invoiceInfoY - 45,
      size: 10,
      font: regularFont,
    });
    page.drawText(
      order.paymentMethodType === "cash" ? "Cash on Delivery" : "Card Payment",
      {
        x: 150,
        y: invoiceInfoY - 45,
        size: 10,
        font: regularFont,
      }
    );

    page.drawText("Payment Status:", {
      x: 50,
      y: invoiceInfoY - 60,
      size: 10,
      font: regularFont,
    });
    page.drawText(order.paymentStatus.toUpperCase(), {
      x: 150,
      y: invoiceInfoY - 60,
      size: 10,
      font: boldFont,
      color: order.isPaid ? rgb(0.06, 0.72, 0.51) : rgb(0.96, 0.62, 0),
    });

    // Customer Information (right side)
    page.drawText("Bill To:", {
      x: 320,
      y: invoiceInfoY,
      size: 10,
      font: boldFont,
    });
    
    // FIX: Add defensive checks for user data
    const userName = order.user?.name || "N/A";
    const userEmail = order.user?.email || "N/A";
    const userPhone = order.user?.phone || "N/A";
    
    page.drawText(userName, {
      x: 320,
      y: invoiceInfoY - 15,
      size: 10,
      font: regularFont,
    });
    page.drawText(userEmail, {
      x: 320,
      y: invoiceInfoY - 30,
      size: 9,
      font: regularFont,
    });
    page.drawText(userPhone, {
      x: 320,
      y: invoiceInfoY - 45,
      size: 10,
      font: regularFont,
    });

    // Shipping Address
    page.drawText("Ship To:", {
      x: 320,
      y: invoiceInfoY - 75,
      size: 10,
      font: boldFont,
    });

    const shippingDetails = order.shippingAddress?.details || "N/A";
    const maxShippingWidth = 200;
    const shippingLines = this.wrapText(
      shippingDetails,
      maxShippingWidth,
      regularFont,
      9
    );

    let shippingY = invoiceInfoY - 90;
    shippingLines.forEach((line) => {
      page.drawText(line, {
        x: 320,
        y: shippingY,
        size: 9,
        font: regularFont,
      });
      shippingY -= 12;
    });

    const wilaya = order.shippingAddress?.wilaya || "N/A";
    const dayra = order.shippingAddress?.dayra || "N/A";
    page.drawText(`${wilaya}, ${dayra}`, {
      x: 320,
      y: shippingY,
      size: 9,
      font: regularFont,
    });

    // Items Table
    yPosition = invoiceInfoY - 150;

    // Table header
    page.drawRectangle({
      x: 50,
      y: yPosition - 5,
      width: width - 100,
      height: 20,
      color: rgb(0, 0.4, 0.8),
    });

    page.drawText("Item", {
      x: 55,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
    page.drawText("Description", {
      x: 150,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
    page.drawText("Qty", {
      x: 350,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
    page.drawText("Price", {
      x: 410,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
    page.drawText("Amount", {
      x: 480,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    yPosition -= 25;

    // Table rows - FIX: Add defensive checks
    order.cartItems.forEach((item, index) => {
      const itemTotal = (item.price || 0) * (item.quantity || 0);

      // Alternate row background
      if (index % 2 === 1) {
        page.drawRectangle({
          x: 50,
          y: yPosition - 5,
          width: width - 100,
          height: 25,
          color: rgb(0.98, 0.98, 0.98),
        });
      }

      page.drawText(`#${index + 1}`, {
        x: 55,
        y: yPosition,
        size: 9,
        font: regularFont,
      });

      // FIX: Handle missing product data
      const productTitle = item.product?.title || "Product Unavailable";
      const title =
        productTitle.substring(0, 25) +
        (productTitle.length > 25 ? "..." : "");
      
      page.drawText(title, {
        x: 150,
        y: yPosition,
        size: 9,
        font: regularFont,
      });

      page.drawText((item.quantity || 0).toString(), {
        x: 360,
        y: yPosition,
        size: 9,
        font: regularFont,
      });

      page.drawText(`$${(item.price || 0).toFixed(2)}`, {
        x: 410,
        y: yPosition,
        size: 9,
        font: regularFont,
      });

      page.drawText(`$${itemTotal.toFixed(2)}`, {
        x: 480,
        y: yPosition,
        size: 9,
        font: regularFont,
      });

      if (item.color) {
        page.drawText(`Color: ${item.color}`, {
          x: 150,
          y: yPosition - 12,
          size: 8,
          font: regularFont,
          color: rgb(0.4, 0.4, 0.4),
        });
      }

      yPosition -= 30;
    });

    // Totals section
    yPosition -= 20;
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: width - 50, y: yPosition },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });

    const subtotal = order.cartItems.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
      0
    );
    const shipping = order.shippingPrice || 0;
    const tax = order.taxPrice || 0;
    const total = order.totalOrderPrice || 0;

    yPosition -= 20;

    page.drawText("Subtotal:", {
      x: 380,
      y: yPosition,
      size: 10,
      font: regularFont,
    });
    page.drawText(`$${subtotal.toFixed(2)}`, {
      x: 490,
      y: yPosition,
      size: 10,
      font: regularFont,
    });

    yPosition -= 20;
    page.drawText("Shipping:", {
      x: 380,
      y: yPosition,
      size: 10,
      font: regularFont,
    });
    page.drawText(`$${shipping.toFixed(2)}`, {
      x: 490,
      y: yPosition,
      size: 10,
      font: regularFont,
    });

    yPosition -= 20;
    page.drawText("Tax:", {
      x: 380,
      y: yPosition,
      size: 10,
      font: regularFont,
    });
    page.drawText(`$${tax.toFixed(2)}`, {
      x: 490,
      y: yPosition,
      size: 10,
      font: regularFont,
    });

    yPosition -= 30;
    // Total background
    page.drawRectangle({
      x: 360,
      y: yPosition - 5,
      width: 185,
      height: 25,
      color: rgb(0, 0.4, 0.8),
    });

    page.drawText("Total:", {
      x: 380,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
    page.drawText(`$${total.toFixed(2)}`, {
      x: 480,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    // COD notice
    if (order.paymentMethodType === "cash" && order.codAmount) {
      yPosition -= 30;
      page.drawText(
        `* Amount to be collected on delivery: $${order.codAmount.toFixed(2)}`,
        {
          x: 50,
          y: yPosition,
          size: 9,
          font: regularFont,
          color: rgb(0.96, 0.62, 0),
        }
      );
    }

    // Footer
    const footerY = 80;
    page.drawText("Thank you for your business!", {
      x: width / 2 - 80,
      y: footerY,
      size: 10,
      font: boldFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText("For questions, contact: support@yourstore.com", {
      x: width / 2 - 110,
      y: footerY - 15,
      size: 8,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText(`Generated on ${this.formatDate(new Date())}`, {
      x: width / 2 - 70,
      y: footerY - 30,
      size: 8,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Save and return
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  static formatDate(date) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  }

  static wrapText(text, maxWidth, font, fontSize) {
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";

    words.forEach((word) => {
      const testLine = currentLine + (currentLine ? " " : "") + word;
      if (testLine.length * fontSize * 0.5 < maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines;
  }
}

module.exports = InvoiceService;