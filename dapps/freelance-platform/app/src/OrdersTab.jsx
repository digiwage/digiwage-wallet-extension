import React, { useCallback, useEffect, useState } from 'react';
import PersonTag from './PersonTag.jsx';
import { readContract, writeContract, fromSatoshi } from './sdk.js';

const STATUS_LABELS = ['Placed', 'Delivered', 'Completed', 'Cancelled'];

function OrderCard({ orderId, myAddressHex, onChanged }) {
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setOrder(await readContract('getOrder', [orderId]));
    } catch (err) {
      setError(err.message);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  if (error) return <div className="card error">Order #{orderId}: {error}</div>;
  if (!order) return null;

  const isBuyer = order.buyer === myAddressHex;
  const isFreelancer = order.freelancer === myAddressHex;
  if (!isBuyer && !isFreelancer) return null;

  const act = async method => {
    setBusy(true);
    setError(null);
    try {
      await writeContract({ method, args: [orderId] });
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card job-card">
      <div className="job-header">
        <h3>Order #{orderId} (service #{order.serviceId})</h3>
        <span className={`status status-${order.status}`}>{STATUS_LABELS[order.status]}</span>
      </div>
      <p className="budget">{fromSatoshi(order.amount)} WAGE</p>
      <p className="muted">Buyer: <PersonTag addressHex={order.buyer} /></p>
      <p className="muted">Freelancer: <PersonTag addressHex={order.freelancer} /></p>
      {error && <div className="error">{error}</div>}
      <div className="row">
        {isFreelancer && order.status === 0 && (
          <button disabled={busy} onClick={() => act('deliverOrder')}>Mark delivered</button>
        )}
        {isBuyer && (order.status === 0 || order.status === 1) && (
          <button disabled={busy} onClick={() => act('completeOrder')}>Release payment</button>
        )}
        {order.status === 0 && (
          <button disabled={busy} onClick={() => act('cancelOrder')}>Cancel &amp; refund</button>
        )}
      </div>
    </div>
  );
}

export default function OrdersTab({ myAddressHex }) {
  const [orderCount, setOrderCount] = useState(null);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const { value } = await readContract('orderCount');
      setOrderCount(value);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <section>
      <h2>Your orders</h2>
      <p className="muted">Orders where you're the buyer or the freelancer, across every service.</p>
      {error && <div className="error">{error}</div>}
      {orderCount === null && !error && <p>Loading orders...</p>}
      {orderCount === 0 && <p className="muted">No orders on the marketplace yet.</p>}
      {orderCount > 0 && Array.from({ length: orderCount }, (_, i) => orderCount - 1 - i).map(id => (
        <OrderCard key={`${id}-${refreshKey}`} orderId={id} myAddressHex={myAddressHex}
          onChanged={() => setRefreshKey(k => k + 1)} />
      ))}
    </section>
  );
}
