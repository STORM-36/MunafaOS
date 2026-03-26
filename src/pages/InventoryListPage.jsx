import React from "react";
import InventoryList from "../components/InventoryList";

const InventoryListPage = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">📋 Inventory List</h2>
        <p className="text-xs text-gray-400">View and manage your stock items.</p>
      </div>
      <InventoryList />
    </div>
  );
};

export default InventoryListPage;
