import React, { useCallback, useEffect, useState } from 'react';
import PersonTag from './PersonTag.jsx';
import { readContract, writeContract, fromSatoshi } from './sdk.js';

function ServiceForm({ onPosted }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await writeContract({ method: 'postService', args: [title, description, Math.round(parseFloat(price) * 1e8)] });
      setTitle(''); setDescription(''); setPrice('');
      onPosted();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={submit}>
      <h2>List a service</h2>
      <label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. I will design a logo" required /></label>
      <label>Description<textarea value={description} onChange={e => setDescription(e.target.value)} required /></label>
      <label>Price (WAGE)
        <input type="number" step="0.00000001" min="0.00000001" value={price} onChange={e => setPrice(e.target.value)} required />
      </label>
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={busy}>{busy ? 'Listing...' : 'List service'}</button>
    </form>
  );
}

function OrderButton({ serviceId, price, isOwnService, onOrdered }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const order = async () => {
    setBusy(true);
    setError(null);
    try {
      await writeContract({ method: 'orderService', args: [serviceId], amountWage: fromSatoshi(price) });
      onOrdered();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (isOwnService) return <p className="muted">This is your own listing.</p>;

  return (
    <>
      {error && <div className="error">{error}</div>}
      <button disabled={busy} onClick={order}>{busy ? 'Ordering...' : `Order for ${fromSatoshi(price)} WAGE`}</button>
    </>
  );
}

function ServiceCard({ serviceId, myAddressHex, onChanged }) {
  const [service, setService] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setService(await readContract('getService', [serviceId]));
    } catch (err) {
      setError(err.message);
    }
  }, [serviceId]);

  useEffect(() => { load(); }, [load]);

  if (error) return <div className="card error">Service #{serviceId}: {error}</div>;
  if (!service) return <div className="card">Loading service #{serviceId}...</div>;
  if (!service.active && service.freelancer !== myAddressHex) return null;

  const isOwn = myAddressHex && service.freelancer === myAddressHex;

  return (
    <div className="card job-card">
      <div className="job-header">
        <h3>{service.title}</h3>
        {!service.active && <span className="status status-3">Paused</span>}
      </div>
      <p>{service.description}</p>
      <p className="budget">{fromSatoshi(service.price)} WAGE</p>
      <p className="muted">By <PersonTag addressHex={service.freelancer} /></p>
      {isOwn ? (
        <button onClick={async () => {
          await writeContract({ method: 'setServiceActive', args: [serviceId, !service.active] });
          load(); onChanged();
        }}>
          {service.active ? 'Pause listing' : 'Resume listing'}
        </button>
      ) : (
        service.active && <OrderButton serviceId={serviceId} price={service.price} isOwnService={isOwn} onOrdered={() => { load(); onChanged(); }} />
      )}
    </div>
  );
}

export default function MarketplaceTab({ myAddressHex }) {
  const [serviceCount, setServiceCount] = useState(null);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const { value } = await readContract('serviceCount');
      setServiceCount(value);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <div>
      <ServiceForm onPosted={() => setRefreshKey(k => k + 1)} />
      <section>
        <h2>Marketplace</h2>
        {error && <div className="error">{error}</div>}
        {serviceCount === null && !error && <p>Loading services...</p>}
        {serviceCount === 0 && <p className="muted">No services listed yet -- be the first.</p>}
        {serviceCount > 0 && Array.from({ length: serviceCount }, (_, i) => serviceCount - 1 - i).map(id => (
          <ServiceCard key={`${id}-${refreshKey}`} serviceId={id} myAddressHex={myAddressHex}
            onChanged={() => setRefreshKey(k => k + 1)} />
        ))}
      </section>
    </div>
  );
}
