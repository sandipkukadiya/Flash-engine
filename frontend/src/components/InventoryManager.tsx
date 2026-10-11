import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Warehouse, Plus, ArrowRightLeft, RefreshCw, Package, Layers } from 'lucide-react';

export const InventoryManager: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form states
  const [sku, setSku] = useState('');
  const [prodName, setProdName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whName, setWhName] = useState('');

  // Stock Movement states
  const [selectedProduct, setSelectedProduct] = useState('');
  const [fromWarehouse, setFromWarehouse] = useState('');
  const [toWarehouse, setToWarehouse] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [movementType, setMovementType] = useState<'RECEIVE' | 'ADJUSTMENT' | 'TRANSFER'>('RECEIVE');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, wRes, iRes] = await Promise.all([
        api.get('/inventory/products'),
        api.get('/inventory/warehouses'),
        api.get('/inventory'),
      ]);
      setProducts(pRes.data.data);
      setWarehouses(wRes.data.data);
      setInventory(iRes.data.data);
    } catch (err) {
      console.error('Error fetching inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/inventory/products', { sku, name: prodName });
    setSku('');
    setProdName('');
    fetchData();
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/inventory/warehouses', { code: whCode, name: whName });
    setWhCode('');
    setWhName('');
    fetchData();
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/inventory/movements', {
      productId: selectedProduct,
      fromWarehouseId: fromWarehouse || undefined,
      toWarehouseId: toWarehouse || undefined,
      quantity: Number(quantity),
      movementType,
    });
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Creation Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Product */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center space-x-2.5 mb-5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">Create SKU / Product</h3>
          </div>
          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="SKU Code (e.g. SNEAKER-RED-42)"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner font-mono"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Product Name"
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </form>
        </div>

        {/* Create Warehouse */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center space-x-2.5 mb-5">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
              <Warehouse className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">Create Warehouse Location</h3>
          </div>
          <form onSubmit={handleCreateWarehouse} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Warehouse Code (e.g. WH-SURAT-01)"
                value={whCode}
                onChange={(e) => setWhCode(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 shadow-inner font-mono"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Warehouse Name"
                value={whName}
                onChange={(e) => setWhName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-cyan-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Warehouse</span>
            </button>
          </form>
        </div>
      </div>

      {/* Record Stock Movements */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center space-x-2.5 mb-5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">Record Stock Movements (Receive, Adjust, Transfer)</h3>
        </div>

        <form onSubmit={handleMovement} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Movement Type</label>
            <select
              value={movementType}
              onChange={(e: any) => setMovementType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner"
            >
              <option value="RECEIVE">RECEIVE (Inbound)</option>
              <option value="ADJUSTMENT">ADJUSTMENT (Damaged/Found)</option>
              <option value="TRANSFER">TRANSFER (Warehouse to Warehouse)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Select Product</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner"
            >
              <option value="">-- Choose Product SKU --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 shadow-inner"
            />
          </div>

          {movementType !== 'RECEIVE' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">From Warehouse</label>
              <select
                value={fromWarehouse}
                onChange={(e) => setFromWarehouse(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner"
              >
                <option value="">-- From Warehouse --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {movementType !== 'ADJUSTMENT' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">To Warehouse</label>
              <select
                value={toWarehouse}
                onChange={(e) => setToWarehouse(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner"
              >
                <option value="">-- To Warehouse --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="md:col-span-3 pt-2">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-8 rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/20"
            >
              Record Movement
            </button>
          </div>
        </form>
      </div>

      {/* Inventory Table */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Live Physical Inventory Levels (MySQL)</span>
          </h3>
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-colors shadow-inner flex items-center space-x-1.5 text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading stock levels...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-4 rounded-l-xl">Warehouse</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Product Name</th>
                  <th className="p-4">Available Qty</th>
                  <th className="p-4 rounded-r-xl">Reserved Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {inventory.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-semibold text-cyan-400">{item.warehouse_code}</td>
                    <td className="p-4 font-mono text-indigo-400">{item.sku}</td>
                    <td className="p-4 text-white">{item.product_name}</td>
                    <td className="p-4 font-bold font-mono text-emerald-400">{item.quantity}</td>
                    <td className="p-4 font-bold font-mono text-amber-400">{item.reserved_quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};