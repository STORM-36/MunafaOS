import React, { useState } from "react";
import SmartForm from "../components/SmartForm";
import OrderList from "../components/OrderList";

// Simple Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("❌ Error caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 text-red-700 border border-red-300 rounded">
          <strong>Error:</strong> {this.state.error?.message || "Unknown error"}
        </div>
      );
    }

    return this.props.children;
  }
}

const OrdersPage = () => {
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);

  console.log("📄 OrdersPage component mounted and rendering");
  
  return (
    <div className="min-h-screen bg-[#F6F8FC]">
      <div className="px-4 md:px-8 py-6">
        <ErrorBoundary>
          <OrderList onOpenNewOrder={() => setIsNewOrderOpen(true)} />
        </ErrorBoundary>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-[rgba(10,20,40,0.35)] transition-opacity duration-300 ${
          isNewOrderOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsNewOrderOpen(false)}
      />

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full sm:w-[440px] bg-white border-l border-[rgba(15,31,61,0.09)] transition-transform duration-300 [transition-timing-function:cubic-bezier(.4,0,.2,1)] ${
          isNewOrderOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="px-5 py-4 border-b border-[rgba(15,31,61,0.09)] flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-bold text-[#0F1F3D]">💼 New Order</h3>
              <p className="text-[11px] text-[#6D7690]">Paste customer message - AI fills the form</p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewOrderOpen(false)}
              className="h-8 w-8 rounded-lg border border-[rgba(15,31,61,0.09)] text-[#6D7690] hover:text-[#0F1F3D]"
              aria-label="Close new order panel"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#F6F8FC] p-3">
            <ErrorBoundary>
              <SmartForm />
            </ErrorBoundary>
          </div>

          <div className="border-t border-[rgba(15,31,61,0.09)] bg-white px-4 py-3 flex gap-2">
            <button
              type="button"
              onClick={() => setIsNewOrderOpen(false)}
              className="flex-1 h-10 rounded-lg border border-[rgba(15,31,61,0.15)] text-[#0F1F3D] text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const saveButton = Array.from(document.querySelectorAll('button')).find(
                  (button) => button.textContent?.includes('Save Order')
                );
                if (saveButton) saveButton.click();
              }}
              className="flex-[2] h-10 rounded-lg bg-[#0F1F3D] text-[#E8B84B] text-sm font-bold"
            >
              Save Order
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default OrdersPage;
