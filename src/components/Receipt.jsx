import React from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const Receipt = ({ order }) => {
    const handlePrint = () => {
        const printContent = document.getElementById('receipt');
        const win = window.open('', '_blank');
        win.document.write('<html><head><title>Print Receipt</title>');
        win.document.write('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">');
        win.document.write('</head><body>');
        win.document.write(printContent.innerHTML);
        win.document.write('</body></html>');
        win.document.close();
        win.print();
    };

    const handleWhatsApp = () => {
        const customerPhone = (order.phone || '')
            .replace(/\D/g, '')
            .replace(/^0/, '880');
        const total = (
            parseFloat(order.sellingPrice || 0) +
            parseFloat(order.deliveryCost || 0)
        ).toFixed(0);
        const message =
            `আপনার অর্ডার কনফার্ম হয়েছে! ✅\n\n` +
            `নাম: ${order.customerName}\n` +
            `পণ্য: ${order.items?.[0]?.name || 'পণ্য'}\n` +
            `ডেলিভারি চার্জ: ৳${parseFloat(order.deliveryCost || 0).toFixed(0)}\n` +
            `মোট: ৳${total}\n\n` +
            `ধন্যবাদ আপনার অর্ডারের জন্য! 🙏`;
        const url = `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleDownloadPDF = async () => {
        const receiptElement = document.getElementById('receipt');
        const buttonsElement = document.getElementById('receipt-buttons');
        
        try {
            // Hide buttons before capture
            if (buttonsElement) {
                buttonsElement.style.display = 'none';
            }

            await new Promise(resolve => setTimeout(resolve, 100));

            // Clone the element to measure its true size
            const clonedElement = receiptElement.cloneNode(true);
            clonedElement.style.position = 'fixed';
            clonedElement.style.left = '-10000px';
            clonedElement.style.top = '-10000px';
            clonedElement.style.width = receiptElement.offsetWidth + 'px';
            document.body.appendChild(clonedElement);

            // Wait for cloned element to render
            await new Promise(resolve => setTimeout(resolve, 200));

            // Capture the cloned element
            const canvas = await html2canvas(clonedElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                allowTaint: true
            });

            // Remove cloned element
            document.body.removeChild(clonedElement);

            // Show buttons again
            if (buttonsElement) {
                buttonsElement.style.display = 'flex';
            }

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 80;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [imgWidth, imgHeight]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`receipt-${order.id || 'download'}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF: ' + error.message);
            
            // Make sure buttons are visible again
            const buttonsElement = document.getElementById('receipt-buttons');
            if (buttonsElement) {
                buttonsElement.style.display = 'flex';
            }
        }
    };

    return (
        <div id="receipt" className="w-80 bg-white font-sans">
            {/* HEADER — Brand */}
            <div className="bg-[#0F1F3D] text-white text-center py-4 px-6">
                <p className="text-[10px] font-bold tracking-[3px] text-[#E8B84B] uppercase">MunafaOS</p>
                <h1 className="text-lg font-extrabold mt-0.5">Customer Receipt</h1>
                <p className="text-[10px] text-white/60 mt-0.5">{order.date}</p>
            </div>

            {/* CUSTOMER INFO */}
            <div className="px-5 py-4 border-b border-dashed border-gray-200">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Customer Details</p>
                <p className="text-sm font-bold text-[#0F1F3D]">{order.customerName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{order.phone}</p>
                <p className="text-xs text-gray-500 mt-0.5">{order.address}</p>
            </div>

            {/* ORDER INFO */}
            <div className="px-5 py-4 border-b border-dashed border-gray-200">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Order Details</p>
                {order.items?.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm py-1">
                        <span className="text-[#0F1F3D] font-medium">{item.name}</span>
                    </div>
                ))}
                {order.category && (
                    <p className="text-xs text-gray-400 mt-1">
                        {order.category}{order.subcategory ? ` • ${order.subcategory}` : ''}
                    </p>
                )}
                {order.sku && (
                    <p className="text-xs text-gray-400">SKU: {order.sku}</p>
                )}
            </div>

            {/* PAYMENT SUMMARY — Customer visible */}
            <div className="px-5 py-4 border-b border-dashed border-gray-200 space-y-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Summary</p>

                {/* Original price before discount */}
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Product Price</span>
                    <span className="font-semibold text-[#0F1F3D]">
                        ৳{(
                            parseFloat(order.unitSellingPrice || 0) *
                            parseFloat(order.qty || order.quantity || 1)
                        ).toFixed(0)}
                    </span>
                </div>

                {/* Discount — only if exists */}
                {parseFloat(order.discountPrice || order.totalDiscount || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount</span>
                        <span className="font-semibold text-green-600">
                            -৳{parseFloat(order.totalDiscount || order.discountPrice || 0).toFixed(0)}
                        </span>
                    </div>
                )}

                {/* After discount subtotal */}
                <div className="flex justify-between text-sm text-gray-500">
                    <span>After Discount</span>
                    <span>৳{parseFloat(order.grossRevenue || order.totalRevenue || order.sellingPrice || 0).toFixed(0)}</span>
                </div>

                {/* Delivery — only if customer pays (not free delivery) */}
                {!order.freeDelivery && parseFloat(order.deliveryCost || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Delivery Charge</span>
                        <span className="font-semibold text-[#0F1F3D]">
                            ৳{parseFloat(order.deliveryCost || 0).toFixed(0)}
                        </span>
                    </div>
                )}

                {/* Free delivery badge */}
                {order.freeDelivery && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Delivery</span>
                        <span className="font-semibold text-green-600">FREE ✓</span>
                    </div>
                )}

                {/* Total Paid */}
                <div className="flex justify-between text-sm font-extrabold border-t border-gray-200 pt-2 mt-1">
                    <span className="text-[#0F1F3D]">Total Paid</span>
                    <span className="text-[#0F1F3D]">
                        ৳{(
                            parseFloat(order.grossRevenue || order.totalRevenue || order.sellingPrice || 0) +
                            (order.freeDelivery ? 0 : parseFloat(order.deliveryCost || 0))
                        ).toFixed(0)}
                    </span>
                </div>
            </div>

            {/* FOOTER */}
            <div className="px-5 py-3 text-center">
                <p className="text-[10px] text-gray-400">Thank you for your order!</p>
                <p className="text-[9px] text-gray-300 mt-0.5">Powered by MunafaOS</p>
            </div>

            {/* ACTION BUTTONS — hidden from PDF */}
            <div id="receipt-buttons" className="flex flex-col gap-2 px-5 pb-5">
                <button
                    onClick={handleDownloadPDF}
                    className="w-full bg-[#0F1F3D] text-[#E8B84B] font-bold py-2.5 rounded-lg text-sm"
                >
                    📥 Download PDF
                </button>
                <button
                    onClick={handleWhatsApp}
                    className="w-full font-bold py-2.5 rounded-lg text-sm text-white"
                    style={{ background: '#1A9E6A' }}
                >
                    💬 Send on WhatsApp
                </button>
                <button
                    onClick={handlePrint}
                    className="w-full bg-white border border-[rgba(15,31,61,0.15)] text-[#0F1F3D] font-bold py-2.5 rounded-lg text-sm"
                >
                    🖨️ Print
                </button>
            </div>
        </div>
    );
};

export default Receipt;
